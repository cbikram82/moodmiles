import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { supabase, supabaseConfigured } from "./supabase";
import { mixpanel } from "./mixpanel";

let lastProcessedCode: string | null = null;

function checkIsNative() {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);

  // Sync user authentication state with Mixpanel identities
  useEffect(() => {
    if (!supabaseConfigured) return;

    if (user) {
      // 1. Identify user canonically via database unique ID (stable UUID)
      mixpanel.identify(user.id);

      // 2. Set key user properties for demographic analysis
      mixpanel.people.set({
        $email: user.email ?? "",
        $name: user.user_metadata?.full_name ?? "",
        $avatar: user.user_metadata?.avatar_url ?? "",
        $created: user.created_at,
        platform: checkIsNative() ? Capacitor.getPlatform() : "web",
      });

      // 3. Register persistent super properties auto-attached to all events
      mixpanel.register({
        platform: checkIsNative() ? Capacitor.getPlatform() : "web",
        environment: import.meta.env.PROD ? "production" : "development",
      });
    } else {
      // Clear Mixpanel identity on logout to start a fresh anonymous session
      mixpanel.reset();
    }
  }, [user]);

  useEffect(() => {
    if (!supabaseConfigured) return;

    // On web: check if we landed back with a ?code= param (PKCE callback)
    if (!checkIsNative()) {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        supabase.auth.exchangeCodeForSession(code).then(() => {
          window.history.replaceState({}, "", window.location.pathname);
        });
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for deep link callback on native
    let cleanupPromise: Promise<() => void> | undefined;
    if (checkIsNative()) {
      cleanupPromise = import("@capacitor/app").then(async ({ App }) => {
        const handle = await App.addListener("appUrlOpen", async ({ url }) => {
          if (url.includes("callback")) {
            try {
              // Convert custom scheme to https to ensure URL parses reliably
              const parsedUrl = url.startsWith("moodmiles://")
                ? url.replace("moodmiles://", "https://")
                : url;
              const parsed = new URL(parsedUrl);
              const code = parsed.searchParams.get("code");
              if (code) {
                if (code === lastProcessedCode) {
                  console.log("[DeepLink] Code already processed, skipping duplicate event.");
                  return;
                }
                lastProcessedCode = code;

                // Ensure SFSafariViewController/Browser is closed
                import("@capacitor/browser").then(({ Browser }) => {
                  Browser.close().catch(() => {});
                });
                await supabase.auth.exchangeCodeForSession(code);
              }
            } catch (e) {
              console.error("Deep link auth error:", e);
            }
          }
        });
        return () => {
          handle.remove();
        };
      });
    }

    return () => {
      subscription.unsubscribe();
      cleanupPromise?.then((cleanup) => cleanup());
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      if (!supabaseConfigured) {
        alert(
          "Google Sign-In Error: Supabase is not configured. Please check if VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in Railway's environment variables dashboard and that the application was rebuilt after setting them.",
        );
        return;
      }

      const isNative = checkIsNative();
      const redirectTo = isNative
        ? "moodmiles://callback"
        : `${window.location.origin}/auth/callback?source=web`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: isNative,
        },
      });

      if (error || !data.url) {
        alert(
          "OAuth initialization error: " +
            (error?.message || "No redirection URL returned from Supabase."),
        );
        console.error("OAuth error:", error?.message);
        return;
      }

      if (isNative) {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: data.url, presentationStyle: "popover" });
      } else {
        window.location.href = data.url;
      }
    } catch (err: any) {
      alert("Sign-In Exception: " + err.message);
      console.error("Google Sign-In Exception:", err);
    }
  };

  const signOut = async () => {
    if (!supabaseConfigured) return;
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Sign out exception:", e);
    }
    setUser(null);
  };

  useEffect(() => {
    if (!supabaseConfigured || !user) return;

    const upsertProfile = async () => {
      try {
        // Query to check if profile exists before upsert to detect net new signup
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        const { error } = await supabase
          .from("profiles")
          .upsert(
            {
              id: user.id,
              display_name: user.user_metadata?.full_name ?? null,
              avatar_url: user.user_metadata?.avatar_url ?? null,
            },
            { onConflict: "id" },
          );
        
        if (error) {
          console.error("Profile upsert error:", error.message);
        } else if (!existingProfile) {
          // Fire sign_up_completed event AFTER identify() has been called in the sibling useEffect
          mixpanel.track("sign_up_completed", {
            sign_up_method: "google",
            platform: checkIsNative() ? Capacitor.getPlatform() : "web",
          });
        }
      } catch (err) {
        console.error("Profile upsert exception:", err);
      }
    };

    upsertProfile();
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

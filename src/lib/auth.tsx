import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { supabase, supabaseConfigured } from "./supabase";

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

  useEffect(() => {
    if (!supabaseConfigured) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        const u = session.user;
        await supabase.from("profiles").upsert(
          {
            id: u.id,
            display_name: u.user_metadata?.full_name ?? null,
            avatar_url: u.user_metadata?.avatar_url ?? null,
          },
          { onConflict: "id" }
        );
      }
    });

    // Listen for deep link callback on native
    let cleanupPromise: Promise<() => void> | undefined;
    if (checkIsNative()) {
      cleanupPromise = import("@capacitor/app").then(async ({ App }) => {
        const handle = await App.addListener("appUrlOpen", async ({ url }) => {
          if (url.includes("callback")) {
            try {
              const parsed = new URL(url);
              const code = parsed.searchParams.get("code");
              if (code) {
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
    if (!supabaseConfigured) {
      console.error("Supabase not configured");
      return;
    }

    const native = checkIsNative();

    try {
      if (native) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
            skipBrowserRedirect: true,
          },
        });

        if (error || !data.url) {
          console.error("OAuth error:", error?.message);
          return;
        }

        try {
          const { Browser } = await import("@capacitor/browser");
          await Browser.open({ url: data.url });
        } catch {
          window.open(data.url, "_blank");
        }
      } else {
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: window.location.origin,
          },
        });
      }
    } catch (e) {
      console.error("Sign-in failed:", e);
    }
  };

  const signOut = async () => {
    if (!supabaseConfigured) return;
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

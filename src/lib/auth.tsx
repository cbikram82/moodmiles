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

const isNative = Capacitor.isNativePlatform();

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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Native deep link listener for OAuth callback
    let cleanupPromise: Promise<() => void> | undefined;
    if (isNative) {
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
              console.error("Failed to handle auth deep link:", e);
            }
            try {
              const { Browser } = await import("@capacitor/browser");
              await Browser.close();
            } catch {
              // Browser may already be closed
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
    if (!supabaseConfigured) return;

    if (isNative) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "com.moodmiles.app://callback",
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error("OAuth error:", error.message);
        return;
      }

      if (data.url) {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: data.url });
      }
    } else {
      const redirectTo =
        typeof window !== "undefined"
          ? window.location.origin
          : "https://moodmiles-production.up.railway.app";

      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
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

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase, supabaseConfigured } from "../lib/supabase";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const [status, setStatus] = useState<"processing" | "redirecting" | "fallback" | "error">(
    "processing",
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const source = params.get("source");

    if (!code) {
      setStatus("error");
      return;
    }

    let isNative = false;
    try {
      isNative = Capacitor.isNativePlatform();
    } catch {
      // not in Capacitor context
    }

    if ((isNative || source === "web") && supabaseConfigured) {
      // We're inside the web app or native Capacitor webview — exchange the code here
      // (the PKCE verifier is in this webview's localStorage)
      supabase.auth
        .exchangeCodeForSession(code)
        .then(() => {
          window.location.href = "/";
        })
        .catch(() => {
          setStatus("error");
        });
    } else {
      // We're in Safari — redirect to the app via custom URL scheme.
      // The app's deep-link handler will exchange the code.
      setStatus("redirecting");
      window.location.href = `moodmiles://callback?code=${code}`;

      const timer = setTimeout(() => setStatus("fallback"), 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  const code = (() => {
    try {
      return new URLSearchParams(window.location.search).get("code");
    } catch {
      return null;
    }
  })();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-sm text-center">
        {(status === "processing" || status === "redirecting") && (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              {status === "processing" ? "Signing you in..." : "Redirecting to MoodMiles..."}
            </p>
          </>
        )}

        {status === "fallback" && code && (
          <>
            <p className="mb-4 text-sm text-muted-foreground">Tap below to return to the app.</p>
            <a
              href={`moodmiles://callback?code=${code}`}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow transition hover:bg-primary/90"
            >
              Open MoodMiles
            </a>
          </>
        )}

        {status === "error" && (
          <p className="text-sm text-muted-foreground">
            Something went wrong. Please try signing in again.
          </p>
        )}
      </div>
    </div>
  );
}

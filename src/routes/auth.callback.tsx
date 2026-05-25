import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const [status, setStatus] = useState<"redirecting" | "fallback">("redirecting");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      window.location.href = `com.moodmiles.app://callback?code=${code}`;

      // If the redirect didn't work after 2s, show fallback button
      const timer = setTimeout(() => setStatus("fallback"), 2000);
      return () => clearTimeout(timer);
    } else {
      setStatus("fallback");
    }
  }, []);

  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );
  const code = params.get("code");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-sm text-center">
        {status === "redirecting" && (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              Redirecting to MoodMiles...
            </p>
          </>
        )}

        {status === "fallback" && code && (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Tap below to return to the app.
            </p>
            <a
              href={`com.moodmiles.app://callback?code=${code}`}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow transition hover:bg-primary/90"
            >
              Open MoodMiles
            </a>
          </>
        )}

        {status === "fallback" && !code && (
          <p className="text-sm text-muted-foreground">
            Something went wrong. Please try signing in again.
          </p>
        )}
      </div>
    </div>
  );
}

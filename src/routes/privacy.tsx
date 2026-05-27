import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Shield } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        {/* Navigation */}
        <Link
          to="/"
          className="group mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Home
        </Link>

        {/* Header */}
        <header className="mb-12 border-b border-border pb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Shield className="h-6 w-6" />
            </div>
            <span className="text-sm font-semibold tracking-wider uppercase text-primary">Legal</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">Privacy Policy</h1>
          <p className="mt-3 text-muted-foreground">Last updated: May 27, 2026</p>
        </header>

        {/* Content */}
        <div className="prose prose-neutral dark:prose-invert space-y-10">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">1. Introduction</h2>
            <p className="leading-relaxed text-muted-foreground">
              Welcome to <strong>MoodMiles</strong>. We value your privacy and are committed to protecting your personal data. This Privacy Policy describes how we collect, use, and handle your information when you use our mobile and web applications to track your walks and runs.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">2. Information We Collect</h2>
            <p className="leading-relaxed text-muted-foreground">
              To provide the core features of MoodMiles, we collect and process the following categories of information:
            </p>
            <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
              <li>
                <strong>Location Data:</strong> With your permission, we track your precise real-time location and coordinates to map your walked path, draw breadcrumb progress, and suggestions in nearby parks. This includes background location access when the screen is dimmed or locked.
              </li>
              <li>
                <strong>Motion and Fitness Data:</strong> We access your device's step counters and motion sensors to record steps taken during your journeys.
              </li>
              <li>
                <strong>Account Information:</strong> If you register or authenticate using Google OAuth or Supabase, we store your email address, name, and profile picture to sync your journey logs securely.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">3. How We Use Your Information</h2>
            <p className="leading-relaxed text-muted-foreground">
              We process your data for the following essential purposes:
            </p>
            <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
              <li>To map, log, and display your walks and fitness statistics in real-time.</li>
              <li>To detect and suggest nearby scenic parks or walking routes using localized queries.</li>
              <li>To synchronize your personal statistics and journey history across devices using your authenticated account.</li>
              <li>To support, troubleshoot, and optimize the performance of our application.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">4. Data Sharing and Security</h2>
            <p className="leading-relaxed text-muted-foreground">
              We do not sell, rent, or trade your personal information to third parties. We use highly secure standard hosting services like <strong>Supabase</strong> to store and protect your data, ensuring it remains private.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">5. Your Permissions & Controls</h2>
            <p className="leading-relaxed text-muted-foreground">
              You have full control over the permissions you grant:
            </p>
            <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
              <li><strong>Location permissions</strong> can be disabled or modified at any time in your device settings.</li>
              <li><strong>Motion tracking</strong> permissions can be revoked under system privacy settings.</li>
              <li>You may request the deletion of your account and all associated journey records by contacting support.</li>
            </ul>
          </section>

          <section className="space-y-4 border-t border-border pt-8">
            <h2 className="text-2xl font-bold tracking-tight">6. Contact Us</h2>
            <p className="leading-relaxed text-muted-foreground">
              If you have any questions or feedback regarding this Privacy Policy, please feel free to reach out to us at:
            </p>
            <p className="text-primary font-medium">support@moodmiles.app</p>
          </section>
        </div>
      </div>
    </div>
  );
}

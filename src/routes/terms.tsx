import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText } from "lucide-react";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

function TermsPage() {
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
              <FileText className="h-6 w-6" />
            </div>
            <span className="text-sm font-semibold tracking-wider uppercase text-primary">Legal</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">Terms of Service</h1>
          <p className="mt-3 text-muted-foreground">Last updated: May 27, 2026</p>
        </header>

        {/* Content */}
        <div className="prose prose-neutral dark:prose-invert space-y-10">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">1. Acceptance of Terms</h2>
            <p className="leading-relaxed text-muted-foreground">
              By accessing or using the <strong>MoodMiles</strong> mobile or web application, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, please do not use the app.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">2. Physical Activity & Health Disclaimer</h2>
            <p className="leading-relaxed text-muted-foreground">
              MoodMiles is designed to track walks, runs, and suggest nearby routes or parks. However:
            </p>
            <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
              <li>
                <strong>Consult Your Doctor:</strong> Any physical exercises, walks, or runs should be performed at your own physical discretion. We highly recommend consulting a physician before starting any new fitness routine.
              </li>
              <li>
                <strong>Inherent Risks:</strong> Physical activities carry inherent risks of injury. MoodMiles is not responsible or liable for any physical strains, accidents, injuries, or health conditions resulting from your use of the application.
              </li>
              <li>
                <strong>Safety First:</strong> Always pay attention to your surroundings, traffic, and environmental conditions when walking or running.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">3. Use of Location & GPS Services</h2>
            <p className="leading-relaxed text-muted-foreground">
              Our service relies on GPS signals, mobile data, and third-party APIs (like OpenStreetMap/Overpass) to map routes and suggest paths. We do not guarantee 100% accuracy of map coordinates, boundaries, trail routes, or elevation data, which are subject to satellite signal fluctuations and public data updates.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">4. Account Registration & Security</h2>
            <p className="leading-relaxed text-muted-foreground">
              To keep your journeys synchronized across your devices, you may authenticate through Google or Supabase. You are solely responsible for maintaining the confidentiality of your login credentials and are responsible for all actions taken under your account.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">5. User Feedback & Content</h2>
            <p className="leading-relaxed text-muted-foreground">
              We appreciate feedback and feature requests. Any ideas, suggestions, or materials sent to MoodMiles will be considered non-confidential and may be used without compensation to you.
            </p>
          </section>

          <section className="space-y-4 border-t border-border pt-8">
            <h2 className="text-2xl font-bold tracking-tight">6. Changes to These Terms</h2>
            <p className="leading-relaxed text-muted-foreground">
              We reserve the right, at our sole discretion, to modify or replace these Terms of Service at any time. When we make updates, we will post the revision date at the top of this page.
            </p>
            <p className="leading-relaxed text-muted-foreground">
              If you have any questions about these Terms, please contact us at:
            </p>
            <p className="text-primary font-medium">support@moodmiles.app</p>
          </section>
        </div>
      </div>
    </div>
  );
}

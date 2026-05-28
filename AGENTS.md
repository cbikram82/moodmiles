# Analytics Tracking — Mixpanel

This project uses **Mixpanel** for all product analytics. Mixpanel is the single source of truth for event tracking, user identification, and behavioral data. Do not introduce any other analytics tools, SDKs, or tracking libraries without explicit instruction from a user.

---

## Before You Add or Modify Any Tracking

⛔ **Do not write Mixpanel tracking code without reading this file first.**

Wrong assumptions about platform, identity, or consent will produce broken Mixpanel data that requires manual cleanup or data deletion requests.

### Mandatory checklist before writing any Mixpanel code

- [x] Confirm you are using the correct Mixpanel SDK for this project's platform (see Tech Stack below)
- [x] Check if this project routes data through a CDP — if yes, send Mixpanel events through the CDP, not the Mixpanel SDK directly
- [x] Check if consent gating is required — if this project serves EU or California users, no Mixpanel events may fire before user consent
- [x] Review the existing Mixpanel tracking plan below before adding new events

---

## Tech Stack

| Detail | Value |
|---|---|
| **Platform** | React (TypeScript) + Capacitor (iOS/Android) |
| **Mixpanel SDK** | `mixpanel-browser` |
| **SDK version** | `^2.55.0` |
| **Tracking method** | client-side (web interface within native webview) |
| **CDP (if any)** | none |
| **Consent required** | no |
| **Mixpanel project token location** | `src/lib/mixpanel.ts` (Project Token: `b7b27a20cbbcc087cdcc6656aa7ea472`) |

---

## Mixpanel Initialization

Mixpanel is initialized once at app startup in:

**File:** `src/lib/mixpanel.ts`

```typescript
import mixpanel from "mixpanel-browser";

const isProd = import.meta.env.PROD;

mixpanel.init("b7b27a20cbbcc087cdcc6656aa7ea472", {
  debug: !isProd,
  track_pageview: true,
  persistence: "localStorage",
});

export { mixpanel };
```

**Do not:**
- Initialize Mixpanel in multiple places
- Create separate Mixpanel instances per component or module
- Import Mixpanel directly in feature files — always import `{ mixpanel }` from `@/lib/mixpanel`

---

## Mixpanel Identity

Mixpanel identity is managed through two calls:

| Action | When to call | Code location |
|---|---|---|
| `mixpanel.identify(user.id)` | On login, signup, or session restore | `src/lib/auth.tsx` |
| `mixpanel.reset()` | On logout | `src/lib/auth.tsx` |

**Rules:**
- Call `mixpanel.identify()` with a stable, internal user ID (database UUID) — never use email addresses as the Mixpanel distinct_id.
- Call `mixpanel.identify()` **after** the user record is confirmed (after DB write, not on form submit).
- Call `mixpanel.reset()` on every logout path — this clears the Mixpanel distinct_id and generates a new anonymous ID.
- Never call `mixpanel.identify()` with a different user ID without calling `mixpanel.reset()` first.

---

## Mixpanel Tracking Plan

These are the Mixpanel events currently tracked in this project. **All new Mixpanel events must follow the same conventions.**

### Naming conventions

- Mixpanel event names: `snake_case`, past tense verb + noun (e.g., `walk_completed`, `sign_up_completed`)
- Mixpanel property names: `snake_case` (e.g., `sign_up_method`, `duration_minutes`)
- No abbreviations in Mixpanel event or property names — use full words
- Boolean Mixpanel properties: use `is_` prefix (e.g., `is_first_time`)

### Current Mixpanel events

| Mixpanel Event | Trigger | Key Properties | File |
|---|---|---|---|
| `sign_up_completed` | User completes account creation and profile upsert succeeds | `sign_up_method`, `platform` | `src/lib/auth.tsx` |
| `walk_started` | User starts tracking their walking or running route | `mood`, `duration_minutes`, `activity`, `route_title`, `route_variant`, `speed` | `src/routes/index.tsx` |
| `walk_completed` (Value Moment) | User completes their walking/running loop | `mood`, `duration_minutes`, `activity`, `elapsed_seconds`, `distance_km`, `step_count`, `route_variant`, `has_gps_track` | `src/routes/index.tsx` |
| `walk_survey_submitted` | User submits the post-walk empirical feedback survey | `mood`, `journey_id`, `mood_delta`, `perceived_feeling`, `felt_safe`, `cognitive_restoration`, `environmental_stimulation`, `willingness_to_repeat` | `src/routes/index.tsx` |

---

## How to Add a New Mixpanel Event

1. **Check the tracking plan above** — if the Mixpanel event already exists, use it. Do not create duplicate Mixpanel events.
2. **Name the Mixpanel event** using the conventions above: `snake_case`, past tense, descriptive.
3. **Define Mixpanel properties** — only include properties available at the moment the event fires. Do not fetch additional data just for Mixpanel tracking.
4. **Place the Mixpanel tracking call** at the right moment:
   - Track Mixpanel events **after** the action succeeds (after DB write, after API response), not on button click or form submit
   - Track Mixpanel events **after** `mixpanel.identify()` if the event is tied to a logged-in action
5. **Update this file** — add the new Mixpanel event to the tracking plan table above.
6. **Verify in Mixpanel Live View** — confirm the event appears in Mixpanel with correct properties before considering it done.

### Mixpanel event template

```typescript
// Track event in Mixpanel
mixpanel.track('event_name', {
  property_name: value,
  property_name: value,
});
```

---

## What Not to Do

- **Do not introduce other analytics tools.** This project uses Mixpanel. All tracking goes through Mixpanel.
- **Do not track Mixpanel events on page load** unless explicitly measuring page views. Mixpanel events represent user actions, not navigation.
- **Do not track PII as Mixpanel properties** — no emails, full names, phone numbers, IP addresses, or payment details in Mixpanel event properties.
- **Do not fire Mixpanel events inside loops** — each Mixpanel event call is a network request.
- **Do not hardcode the Mixpanel project token** — read it from environment config (if available).
- **Do not skip `mixpanel.reset()` on logout** — failing to reset causes Mixpanel to merge the next user's events with the previous user's profile.
- **Do not call `mixpanel.identify()` before the user is authenticated** — premature identification creates orphaned Mixpanel profiles.

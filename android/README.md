# LabSpark AI — Android (`android-app` branch)

This branch turns the existing LabSpark AI web app into a **Google Play Android app**
using **Google's Trusted Web Activity (TWA) + Bubblewrap** — reusing the one web codebase,
not a native rewrite.

## Read these first
- **[SPEC.md](./SPEC.md)** — the PRD (problem, goals, requirements, metrics, open questions).
- **[PLAN.md](./PLAN.md)** — the phased execution plan (Google-native TWA path).

## Non-disruption guarantee
The live web solution on Google Cloud (`gen-lang-client-0686614374.web.app`, Cloud Run
backend, Firestore) is **not changed or deleted**. All mobile/PWA work lives on this
branch and deploys to a **separate Firebase Hosting target**; the current site and `main`
stay untouched until the team explicitly decides otherwise. The only backend edit is an
**additive** origin allow-list entry (existing web origins keep working).

## Status
Planning only. No app code added yet — next step is Phase 1 (responsive + PWA manifest +
service worker) per PLAN.md.

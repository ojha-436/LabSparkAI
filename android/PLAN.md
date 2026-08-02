# LabSpark AI — Android App Plan (Google TWA path)

**Branch:** `android-app` · **Companion:** `android/SPEC.md`
**Strategy in one line:** turn the existing web app into an installable PWA, deploy that PWA to a **separate Firebase Hosting target**, wrap it with **Google Bubblewrap → Trusted Web Activity**, and publish the signed AAB on Google Play — **without changing the live site, `main`, or the Cloud Run backend's behaviour for existing web users**.

---

## 0. Guardrails (non-disruption)

- **The live web app stays as-is.** Current hosting (`gen-lang-client-0686614374.web.app`) serves from `main`'s last deploy. We do **not** modify or delete existing files on `main`.
- **All mobile/PWA work happens on this branch** and deploys to a **second Firebase Hosting site** (e.g. `labspark-app.web.app`) via a Hosting *target*. The TWA points at that URL. The original site is never touched.
- **Backend change is additive & safe:** the only backend edit is *adding* the app's origin to the CORS + WebSocket allow-lists in `server/index.js` (a superset — existing web origins keep working). No behaviour change for current users.
- If the team later decides the responsive/PWA upgrade should benefit the web too, the branch can be merged to `main` — an explicit, separate decision, not part of this plan.

## Why TWA/Bubblewrap (Google-native)

- One codebase; the app **is** the web app running in **real Chrome** (not System WebView) → `speechSynthesis`, WebGL, `getUserMedia`, and web auth all behave like desktop Chrome.
- Official Google toolchain: **Bubblewrap** (generate/build), **Digital Asset Links** (verify ownership), **Lighthouse** (audit), **Play Console** (publish), **Firebase** (FCM, Crashlytics, Test Lab).
- Hard prerequisite it cannot fix for us: the site must be a **responsive, installable PWA** first. That is the real work below.

---

## Phase 0 — Decisions & setup (1–2 days)

- Confirm the **blocking open questions** in the SPEC: Families/target-age, privacy-policy owner, v1-free, package id (`ai.labspark.app`), separate hosting target.
- Create the second **Firebase Hosting target**: `firebase hosting:sites:create labspark-app` and a `hosting` target in `firebase.json` (added on this branch only).
- Stand up a **Play Console** developer account if not already present; enable **Play App Signing**.
- **Kick off the privacy/Families track now** (longest pole).

**Exit:** decisions logged; empty second hosting site reachable; Play account ready.

## Phase 1 — Make it a mobile PWA (the 60% — ~1.5–2 wks)

*All changes on this branch. This is the bulk of the effort.*

1. **Responsive pass** (`src/*.jsx`): add a global `@media (max-width:768px)` layer + a `useIsMobile()` hook.
   - `dashboard.jsx`: 220 px sidebar → hamburger/bottom-nav; 4-col grids → 2-col; fix the 320 px profile dropdown overflow.
   - `genlab3d.jsx` / `lab3dscene.jsx`: Spark HUD side-`aside` → **collapsible bottom sheet**; canvas full-width; size with `dvh`; header condenses.
   - `classroom.jsx`: roster/marks/insights tables → horizontal-scroll containers or card reflow.
   - Enforce ≥44 dp touch targets on chips/icon buttons.
2. **3D on mobile:** confirm tap-to-examine + orbit/pinch; lock page scroll behind the canvas; **device-tier detection** (`navigator.deviceMemory`/heuristics) → cap `dpr` to 1, disable shadows, trim lights on low-end. (Seeds the future Lite mode.)
3. **PWA assets:** `public/manifest.webmanifest` (name, `ai.labspark.app` id, theme/bg colors, `display: standalone`, maskable icons 192/512), icon set, splash, and `<meta viewport-fit=cover>` + `env(safe-area-inset-*)` for notches.
4. **Service worker** (Workbox): precache app shell + `narration/` clips; network-first for API; offline fallback screen.
5. Deploy this build to the **separate hosting target**; run **Lighthouse** until "Installable" + PWA pass.

**Exit:** on a real phone, the deployed mobile PWA is usable end-to-end and Lighthouse-installable.

## Phase 2 — Auth + backend for the app origin (2–3 days)

- **Google Sign-In:** replace `signInWithPopup` (`src/login.jsx`) with `signInWithRedirect` + `getRedirectResult` (works in TWA/Chrome). Email/password already fine.
- **Backend allow-lists (additive):** add the app/PWA origin to `ALLOWED_ORIGINS` **and** the WS `origin` check in `server/index.js`; redeploy Cloud Run. Existing web origins remain.
- **Firebase Auth → Authorized domains:** add the new hosting domain.

**Exit:** sign-in, `/api/*`, grading, and live voice all succeed from the deployed mobile PWA.

## Phase 3 — Wrap as a TWA with Bubblewrap (3–5 days)

- `npx @bubblewrap/cli init --manifest https://labspark-app.web.app/manifest.webmanifest`.
- Configure package id, app name, colors, orientation, and **`RECORD_AUDIO`** permission; ensure the WebView permission bridge prompts for mic.
- Host **`/.well-known/assetlinks.json`** on the hosting target (Digital Asset Links) so the URL bar disappears and App Links verify.
- Handle **Android back** (in-app nav already uses `history` in `app.jsx`; add root double-back-to-exit).
- `bubblewrap build` → signed **AAB**; smoke-test on emulator + a real low-end device via **Firebase Test Lab**.

**Exit:** installable signed AAB launches full-screen, mic works, deep links open the app.

## Phase 4 — Store-ready & submit (3–5 days)

- **Remove/hide** the mock billing UI in `dashboard.jsx` for the app build (P0-10).
- Publish **privacy policy**; complete **Data Safety** (audio + personal data + third-party Gemini); set **content rating**; finalize **Families/target-age**.
- Store listing: title, short/long description, **screenshots** (phone + the 3D lab), feature graphic.
- Upload AAB to **internal testing** → closed test with a pilot school → production **staged rollout**.

**Exit:** app live on Play (internal/closed first), passing review.

## Phase 5 — Native polish (post-launch, ~1 wk)

- **FCM push:** Cloud Function on `classes/*/live/current` + `assignments` writes → "Join now" / new-assignment notifications.
- **Native TTS** fallback (`@capacitor-community/text-to-speech` *or* keep Chrome TTS since TWA is Chrome — validate first).
- **Crashlytics + Performance Monitoring**; watch crash-free rate on low-end devices.
- Iterate Lite/2D mode if low-end telemetry demands it.

---

## Effort & critical path

| Phase | Focus | Effort |
|---|---|---|
| 0 · Decisions/setup | scope, hosting target, Play account, privacy kickoff | 1–2 d |
| **1 · Mobile PWA** | **responsive + manifest + SW (the real work)** | **1.5–2 wk** |
| 2 · Auth/backend | redirect auth, CORS/WS/authorized domains | 2–3 d |
| 3 · TWA wrap | Bubblewrap, asset links, mic, back, AAB | 3–5 d |
| 4 · Store-ready | billing UI removal, privacy, Data Safety, listing | 3–5 d |
| 5 · Native polish | FCM, TTS, telemetry | ~1 wk (post-launch) |

- **Critical path:** Phase 1 gates everything — don't wrap a non-responsive site.
- **Parallel long-pole:** the Families/privacy track (Phase 0 → 4) is the likeliest launch-blocker; start it on day one.
- **Total to store-ready AAB:** ~3–5 focused weeks.

## Tooling checklist (all Google unless noted)

Bubblewrap (TWA build) · Digital Asset Links · Lighthouse/Chrome DevTools (PWA audit) · Workbox (service worker) · Android Studio (build/emulator) · Firebase Hosting target, FCM, Crashlytics, Performance, Test Lab, App Distribution · Play Console. *(Non-Google, optional later: Capacitor — only if we outgrow TWA for Play Billing/native depth.)*

## Definition of done (v1)

A **free**, installable **Play Store** app for Android 8.0+ that: is fully responsive incl. the 3D lab, runs or degrades gracefully on ≤3 GB-RAM devices, signs in and reaches the backend, handles mic permission, passes Lighthouse PWA + Digital Asset Links, and clears Play review for privacy/Families — **with the existing web app and backend serving unchanged throughout.**

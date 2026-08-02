# PRD — LabSpark AI for Android (Play Store)

**Status:** Draft v1 · **Branch:** `android-app` · **Owner:** Product
**Approach:** Ship the existing LabSpark AI web app as a native Android app using **Google's Trusted Web Activity (TWA) + Bubblewrap**, published on Google Play.
**Non-disruption guarantee:** The live web solution on Google Cloud (`https://gen-lang-client-0686614374.web.app`, Cloud Run backend, Firestore) is **not modified or deleted**. All Android/PWA work lives on this branch and (per the plan) deploys to a **separate Firebase Hosting target**, leaving the current site and `main` untouched.

---

## 1. Problem Statement

LabSpark AI is a live, deployed web app for CBSE/NCERT Class 6–10 virtual science labs (3D experiments + a conversational Gemini tutor + teacher tools). But our users — **students aged 11–16 and their teachers in Indian schools** — live on **Android phones**, not desktop browsers, and they discover software through the **Play Store**, not URLs. Today the app is desktop-first (no responsive layout, no installable presence), so on a phone it is cramped and unfindable. Without a Play Store Android app we are invisible to the exact segment (low-resource schools on cheap Android devices) our mission targets, and we cede that ground to incumbents' apps (OLabs, DIKSHA, Physics Wallah) that are already on phones.

## 2. Goals

1. **Be installable & discoverable:** a published Play Store listing for "LabSpark AI," installable on Android 8.0+ (API 26+).
2. **Preserve one codebase:** reuse the existing React/WebGL app via TWA — **no separate native rewrite**, no divergence from the web product.
3. **Run correctly on a phone:** the app is fully mobile-responsive and usable one-handed on a 360 dp screen, including the 3D lab.
4. **Work on low-end devices:** the flagship 3D lab loads and runs (or gracefully degrades) on a ₹6–10k Android with ≤3 GB RAM.
5. **Ship compliantly:** pass Play review including the **children's / Families** and **privacy (microphone + data)** requirements on the first or second submission.
6. **Zero regression to the live web app:** the current hosted site and backend keep serving unchanged throughout.

## 3. Non-Goals (v1)

- **No native rewrite** (Kotlin/Flutter/React Native) — TWA reuses the web app; a rewrite is out of scope and unjustified.
- **No in-app purchases / Google Play Billing** — v1 ships **free**. Monetization requires Play Billing and is a separate initiative (avoids the biggest review-risk surface).
- **No iOS app** — Android-only for v1 (our user base is overwhelmingly Android; iOS is a later effort).
- **No offline lab execution** — labs require the network (Gemini, Firestore). Offline is limited to cached shell/narration; full offline is future work.
- **No new product features** — this is a packaging/mobile-readiness effort, not a features release. Feature work continues on `main`.

## 4. User Stories

**Student (11–16, primary)**
- As a student, I want to **install LabSpark from the Play Store** so I can open it like any app, without typing a URL.
- As a student, I want the **3D lab and Spark tutor to work on my phone** in portrait, with touch controls, so I can do experiments on the device I actually own.
- As a student, I want to **tap a class join link and land in the app** so joining my teacher's class is one tap.
- As a student on a cheap phone, I want the lab to **still run (or offer a lighter mode)** so it doesn't crash or freeze.

**Teacher**
- As a teacher, I want the app on my phone so I can **start a live class, assign labs, and check the insights/marks** between periods without a laptop.
- As a teacher, I want to **share a Play Store link / join link** with my class so onboarding is fast.

**Parent**
- As a parent, I want to **install the app and follow my child's progress** from my phone.

**Edge / states**
- As any user, I want a **clear message when I'm offline** rather than a blank screen.
- As a first-time user, I want to **grant microphone permission with a clear prompt** the first time I use voice, and to use the app fully by text if I decline.
- As any user, the **Android back button** should navigate within the app and ask before exiting at the home screen.

## 5. Requirements

### Must-Have (P0) — cannot ship without these

| # | Requirement | Acceptance criteria |
|---|---|---|
| P0-1 | **Mobile-responsive UI** across dashboard, 3D lab, classroom, reports | Given a 360×640 dp screen, when I open any screen, then no horizontal overflow, all controls are tap-reachable (≥44 dp), and the 3D lab's Spark HUD reflows to a bottom sheet (not a side panel). |
| P0-2 | **Installable PWA**: web manifest, icons, service worker, `viewport-fit=cover` | Given the deployed mobile build, when audited by Lighthouse, then it passes "Installable" and PWA checks; a maskable adaptive icon and splash are present. |
| P0-3 | **TWA wrapper via Bubblewrap** producing a signed AAB | Given the PWA, when I run Bubblewrap, then I get a signed `.aab` that launches full-screen (no URL bar) and passes Digital Asset Links verification. |
| P0-4 | **Auth works in-app** | Given the Android app, when a user signs in with email/password or Google, then sign-in succeeds (Google via redirect/native, not popup) and session persists across launches. |
| P0-5 | **Backend reachable from the app origin** | Given the app's request origin, when it calls `/api/*` or the live-voice WS, then the backend accepts it (CORS + WS origin allow-list updated; Firebase Auth authorized domains updated). |
| P0-6 | **Microphone permission handled** | Given a voice action, when first invoked, then Android requests `RECORD_AUDIO` with a rationale; if denied, text chat still works and the app does not crash. |
| P0-7 | **Low-end device support / graceful degradation** | Given a device with ≤3 GB RAM, when I open a 3D lab, then it runs at usable FPS or offers a reduced-fidelity mode; it does not white-screen or crash. |
| P0-8 | **Android back-button behavior** | Given in-app navigation, when I press back, then it navigates to the previous view; at the root, it prompts/exits rather than closing abruptly. |
| P0-9 | **Play compliance pack** | App has a published **privacy policy**, a completed **Data Safety** form (declares audio + personal data + Gemini processing), a **content rating**, and a resolved **target-age / Families** classification. |
| P0-10 | **Billing surface removed from the app build** | The mock "Spark Pass / Stripe / **** 4242 / 1 Live Purchase" UI is hidden or removed so nothing implies external payment for digital goods. |

### Nice-to-Have (P1) — fast follow

- **Push notifications (FCM):** "Your teacher started a live lab — Join now" and new-assignment alerts (leverages the existing live-class/assignments backend).
- **Native TTS fallback** so Spark always speaks even where the engine lacks `speechSynthesis`.
- **Android App Links** so `?join=CODE` links open the app directly (verified `assetlinks.json`).
- **Offline shell + cached narration** for a usable "no network" state.
- **Crashlytics + Firebase Performance** for real-device telemetry.

### Future Considerations (P2) — design for, don't build now

- **Google Play Billing** for Spark Pass / school licensing.
- **Lite / 2D lab mode** for very low-end devices and low bandwidth (ties to the accessibility roadmap).
- **iOS (TWA has no iOS equivalent; would need PWA-via-WebClip or Capacitor).**
- **Regional-language UI** (pairs with the multilingual-Spark roadmap).

## 6. Success Metrics

**Leading (days–weeks)**
- **Install → sign-in activation:** ≥ 60% of installs complete sign-in. (Play Console + Firebase Auth)
- **Mobile lab completion:** ≥ 50% of started labs completed on Android. (Firestore)
- **Crash-free sessions:** ≥ 99.0% (Crashlytics), and **≥ 98%** on ≤3 GB-RAM devices specifically.
- **Lighthouse PWA/installable:** passing before every store upload.
- **Cold start:** ≤ 3 s to interactive on a mid-range device.

**Lagging (weeks–months)**
- **Play Store rating:** ≥ 4.2★.
- **Android share of active users:** Android becomes the majority platform within one term.
- **Teacher retention:** teachers who install use live-class/assign at least as often as web teachers.

**Targets to evaluate at:** 1 week (activation, crash-free), 1 month (completion, rating), 1 quarter (platform share, retention).

## 7. Open Questions

- **[Legal/Product — BLOCKING] Target age & Families program:** Do we classify as "Designed for Families" (stricter: vetted SDKs, no behavioral ads, verifiable parental consent for under-13 data) or a Teen-rated general app? Users are 11–16 and we record audio → this determines the privacy/SDK constraints. *Must resolve before store submission.*
- **[Legal — BLOCKING] Privacy policy:** Who authors/hosts the policy covering microphone capture, Gemini processing, Firestore data, and children's data? Required before Data Safety submission.
- **[Product] v1 = free confirmed?** Assumed yes. Confirm so we can skip Play Billing for v1.
- **[Eng] Hosting target for the mobile PWA:** Confirm a **separate Firebase Hosting site** (e.g. `labspark-app.web.app`) so the current site/`main` stay untouched, vs. merging responsive+PWA into `main` later. *(Plan assumes separate target.)*
- **[Eng] Package id & store identity:** proposed `ai.labspark.app`; confirm app name, developer account, and signing-key custody (Play App Signing).
- **[Design] 3D lab on phone:** portrait bottom-sheet HUD vs. landscape-encouraged? Decide the mobile lab layout.

## 8. Timeline Considerations

- **Dependency chain (hard):** Responsive + PWA (P0-1, P0-2) → deploy to separate hosting → Bubblewrap TWA (P0-3) → auth/CORS (P0-4/5) → compliance (P0-9). The TWA points at the *deployed* PWA, so the mobile build must be deployed (to the separate target) before the wrapper is meaningful.
- **Long-pole (non-eng):** the **Families/privacy** track (P0-9) can run in parallel from day one and is the most likely launch-blocker — start it immediately.
- **Suggested phasing:** see `android/PLAN.md`. Roughly **3–5 focused weeks** to a store-ready AAB, with the responsive pass consuming ~60% of engineering effort.
- **No hard external deadline** identified; pace against the school term for pilot timing.

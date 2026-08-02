# Build the LabSpark AI Android app (TWA → signed AAB)

This produces the Google Play `.aab` from the deployed PWA at **https://labspark-app.web.app**
using Google's **Bubblewrap** (Trusted Web Activity).

## What's already done (in this repo / cloud)
- ✅ PWA is live and installable at `https://labspark-app.web.app` (manifest, icons, service worker).
- ✅ Google sign-in uses **redirect** (TWA-safe); `labspark-app.web.app` is an authorized Firebase Auth domain; backend CORS/WS allow it.
- ✅ Digital Asset Links file served at `https://labspark-app.web.app/.well-known/assetlinks.json` (fingerprint placeholder — you fill it in step 5).
- ✅ TWA config reference: [`android/twa-manifest.json`](./twa-manifest.json) (package id `ai.labspark.app`).

## Prerequisites (on your build machine)
- **JDK 17+** (this repo's machine already has JDK 21).
- **Bubblewrap** will auto-download the Android SDK + build-tools on first run (accept the prompts). Needs internet + a few hundred MB.
- A **Google Play Console** developer account.

## Steps

### 1. Install Bubblewrap
```bash
npm install -g @bubblewrap/cli
```

### 2. Initialize the TWA project
From an **empty folder** (not this web repo), point Bubblewrap at the live manifest:
```bash
bubblewrap init --manifest https://labspark-app.web.app/manifest.webmanifest
```
Accept the Android SDK/JDK download when prompted. When asked, match these values
(see `android/twa-manifest.json` for the full set):
- Application ID / package: **ai.labspark.app**
- Host: **labspark-app.web.app**
- Launcher name: **LabSpark**
- Theme/background color: **#0f172a**
- Start URL: **/?source=twa**
- Include "Play Billing"? **No** (v1 is free)

> Tip: you can drop the provided `android/twa-manifest.json` into the init folder and
> edit to taste instead of answering every prompt.

### 3. Create an upload keystore (once)
```bash
keytool -genkeypair -v -keystore android.keystore -alias android \
  -keyalg RSA -keysize 2048 -validity 9125
```
Keep `android.keystore` and its passwords **safe and OUT of git** (never commit them).

### 4. Build the AAB
```bash
bubblewrap build
```
Output: **`app-release-bundle.aab`** (for Play) and a test `app-release-signed.apk`.

### 5. Create the app in Play Console + get the signing fingerprint
1. Play Console → **Create app** → upload the `.aab` to **Internal testing**.
2. Enable **Play App Signing** (default). Play now holds the real signing key.
3. Play Console → **Setup → App integrity → App signing** → copy the
   **SHA-256 certificate fingerprint** of the *app signing key*.

### 6. Finalize Digital Asset Links
Replace `REPLACE_WITH_PLAY_APP_SIGNING_SHA256_FINGERPRINT` in
`public/.well-known/assetlinks.json` with the SHA-256 from step 5, then redeploy the app site:
```bash
npm run build
npx firebase-tools deploy --only hosting:app --project gen-lang-client-0686614374
```
Verify: `https://labspark-app.web.app/.well-known/assetlinks.json` shows your real fingerprint.
(You can also add the local upload-key SHA-256 as a second entry for side-loaded test APKs.)

### 7. Ship
- Complete Play listing: **privacy policy**, **Data Safety** (declare microphone + personal data + Gemini processing), **content rating**, **target-age / Families** decision, screenshots (incl. a 3D lab), feature graphic.
- Remove/hide the mock billing UI in `src/dashboard.jsx` for the store build (see PLAN P0-10) before public release.
- Roll out: Internal testing → Closed test (a pilot school) → Production staged rollout.

## Notes
- **Microphone:** in a TWA, media capture is handled by the Chrome engine, so the Spark
  voice mic prompt works like Chrome. If a device build ever blocks it, add
  `RECORD_AUDIO` to the generated `AndroidManifest.xml`.
- **Back button & deep links:** the web app already handles in-app history; once
  assetlinks verifies, `https://labspark-app.web.app/?join=CODE` links open the app.
- **Updating the app content:** because this is a TWA, you ship most updates by just
  redeploying the PWA (`hosting:app`) — no new AAB needed unless you change native
  config (icon, package, permissions, version).

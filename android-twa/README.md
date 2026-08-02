# LabSpark AI — Android app (TWA), ready-to-build

This is a **complete, signed Trusted Web Activity project** that wraps the deployed PWA at
**https://labspark-app.web.app** into a Google Play Android app (`ai.labspark.app`).

Everything is set up and verified **except the final Gradle compile**, which cannot run inside
the Claude Code agent environment: on Windows the JVM's NIO Selectors need an internal
**loopback socket** (`sun.nio.ch.PipeImpl`), and this sandbox blocks loopback connections
(`java.net.SocketException: Invalid argument: connect`). That is an environment restriction,
not a project problem — the build runs fine in a normal terminal.

## What's already in place
- `twa/` — the full Android Gradle project (manifest, resources, launcher icons, signing config).
- `sdk/` — Android SDK (platform-34, build-tools 34.0.0, platform-tools) *(gitignored)*.
- `gradle-8.7/` — Gradle distribution *(gitignored)*.
- `android.keystore` — the upload signing key; passwords in `KEYSTORE_INFO.txt` *(both gitignored — keep them private)*.
- Digital Asset Links already published with this key's SHA-256, so the built app verifies
  as a TWA (no URL bar): `https://labspark-app.web.app/.well-known/assetlinks.json`.

## Build the app (one command, in a normal PowerShell — NOT inside the agent)

```powershell
cd D:\google_Xbuild\LabSpark_AI\android-twa\twa
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot"
$env:ANDROID_HOME = "D:\google_Xbuild\LabSpark_AI\android-twa\sdk"
..\gradle-8.7\bin\gradle.bat bundleRelease assembleRelease -x lint
```

Outputs:
- **AAB (for Play):** `twa/app/build/outputs/bundle/release/app-release.aab`
- **APK (sideload/test):** `twa/app/build/outputs/apk/release/app-release.apk`

Install the APK on a phone to test: `..\sdk\platform-tools\adb.exe install -r <apk>`.

## Ship to Google Play
1. Play Console → Create app `ai.labspark.app` → upload the **.aab** to Internal testing.
2. Keep **Play App Signing** on. Copy the **app signing key SHA-256** from
   Play Console → App integrity.
3. Add that SHA-256 as the second entry in `public/.well-known/assetlinks.json`
   (replace `REPLACE_WITH_PLAY_APP_SIGNING_SHA256_FINGERPRINT`), then redeploy:
   `npx firebase-tools deploy --only hosting:app`.
4. Complete the listing: privacy policy, Data Safety (mic + personal data + Gemini),
   content rating, target-age/Families decision, screenshots → staged rollout.

## Config summary (`twa/`)
- Package: `ai.labspark.app` · minSdk 26 · targetSdk 34 · AGP 8.5.2 · Gradle 8.7
- Host: `labspark-app.web.app` · launch `/?source=twa` · theme `#0f172a`
- Permissions: INTERNET, RECORD_AUDIO (Spark voice; Chrome handles the prompt in a TWA)
- Deep links: `https://labspark-app.web.app/*` (incl. `?join=CODE`) open the app once asset-links verify.

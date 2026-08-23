# Agora Conversational AI — live Spark voice

Branch `Agora`. Adds a **live, full-duplex voice mode** to Spark using Agora's
Conversational AI Engine, alongside the existing turn-based voice path.

## What this is (and isn't)

Agora is not a replacement for Gemini. It is the **voice pipeline**: transport,
ASR, TTS, voice-activity detection and interruption handling. Gemini remains
Spark's brain, reached through its OpenAI-compatible endpoint.

```
student mic ─► Agora RTC ─► ASR ─► Gemini (/v1beta/openai/chat/completions) ─► TTS ─► Agora RTC ─► speaker
                    ▲                                                                       │
                    └───────────────── student can interrupt mid-sentence ◄─────────────────┘
```

Every existing text route — `/api/spark/ask`, `/api/spark/react`,
`/api/spark/explain`, `/api/grade`, `/api/insights`, `/api/worksheet` — is
**untouched**. Grading, insights and worksheets still run on Gemini directly.

## What changed

### Backend (`server/`)
| File | Change |
|---|---|
| `agora.js` | **New.** Mints RTC tokens, starts/stops ConvoAI agents. Holds all privileged credentials. |
| `index.js` | Imports and mounts `registerAgoraRoutes(app, SPARK_SYSTEM)`; `/health` now reports `agoraConfigured`. |
| `agora.test.mjs` | **New.** 30 offline checks on validation + the exact ConvoAI payload. `node agora.test.mjs` |
| `package.json` | `+ agora-token ^2.0.5` |

Two new routes, both behind the existing Firebase-ID-token auth and per-user
rate limit:

- `POST /api/agora/start` → `{channel, uid, experiment}` → `{agentId, channel, token, uid, agentUid}`
- `POST /api/agora/stop` → `{agentId}` → `{ok: true}`

### App (`android-app/`)
| File | Change |
|---|---|
| `lib/core/api/agora_config.dart` | **New.** App ID via `--dart-define`, agent uid, join timeout. |
| `lib/features/spark/agora_session_repository.dart` | **New.** Calls the two backend routes; generates channel names and uids. |
| `lib/features/spark/agora_voice_service.dart` | **New.** Owns the `RtcEngine`, session lifecycle, speaking indicators. |
| `lib/features/labs/spark_lab_sheet.dart` | Live toggle in the header; `_LiveVoiceBar` replaces the composer while live. |
| `android/app/src/main/AndroidManifest.xml` | `+ ACCESS_WIFI_STATE, READ_PHONE_STATE, BLUETOOTH, BLUETOOTH_CONNECT`; strips the `CAMERA` and `FOREGROUND_SERVICE_MEDIA_PROJECTION` that the Agora plugin injects but Spark never uses |
| `android/app/proguard-rules.pro` | **New.** Keeps `io.agora.**` — without it the release build crashes on session start. |
| `android/app/build.gradle` | Wires `proguardFiles` into the release build type. |
| `pubspec.yaml` | `+ agora_rtc_engine ^6.6.3`, `− cached_network_image` (see note) |

**Note on `cached_network_image`:** removed, not downgraded. It was referenced
in zero files under `lib/`, and its `flutter_cache_manager → path_provider →
path_provider_windows` chain pins `ffi ^2.0.0`, which is incompatible with
`agora_rtc_engine`'s `ffi ^1.1.2`. Dropping dead weight beat downgrading the
Agora SDK.

## Setup

### 1. Generate the ConvoAI REST credentials

App ID and App Certificate are not enough. The REST API authenticates with a
separate Customer Key / Customer Secret:

> Agora Console → **Developer Toolkit** → **RESTful API** → *Add a secret*

Copy both immediately — the secret is shown once.

### 2. Configure the backend

```bash
cd server
cat > .env <<'ENV'
GEMINI_API_KEY=<existing key>
AGORA_APP_ID=<your app id>
AGORA_APP_CERTIFICATE=<your app certificate>
AGORA_CUSTOMER_ID=<from step 1>
AGORA_CUSTOMER_SECRET=<from step 1>
ENV
npm install
npm run dev
curl -s localhost:8787/health    # expect "agoraConfigured": true
```

Deploy. The live service is:

| | |
|---|---|
| Project | `gen-lang-client-0686614374` |
| Service | `labspark-backend` |
| Region | `asia-south1` |

```bash
cd /Users/princekumarojha/LabSparkAI/Agora
gcloud run deploy labspark-backend \
  --project gen-lang-client-0686614374 \
  --region asia-south1 \
  --source server \
  --update-env-vars \
AGORA_APP_ID=<app id>,\
AGORA_APP_CERTIFICATE=<app certificate>,\
AGORA_CUSTOMER_ID=<customer id>,\
AGORA_CUSTOMER_SECRET=<customer secret>
```

> **Use `--update-env-vars`, not `--set-env-vars`.** `--set-env-vars` *replaces*
> the whole environment, which would delete the existing `GEMINI_API_KEY` and
> `GEMINI_MODEL` literals already on the service and take Spark offline
> entirely. `--update-env-vars` merges.

Verify:

```bash
curl -s https://labspark-backend-6qifere4fa-el.a.run.app/health
# expect: "geminiConfigured": true, "agoraConfigured": true
```

`agoraConfigured` appearing at all is how you know the new code is live — the
old revision has no such field.

For anything beyond a demo, move the App Certificate, the Customer Secret and
the Gemini key into Secret Manager and reference them with `--set-secrets`.
All three are currently plain literals on the service.

### 3. Run the app

```bash
cd android-app
flutter pub get
flutter run --dart-define=AGORA_APP_ID=<your app id>
```

Without the `--dart-define` the live-voice button is **hidden** and Spark keeps
using the on-device `flutter_tts` + `speech_to_text` path. That is the intended
fallback, not a bug.

### Optional tuning (all backend env vars)

| Var | Default | Purpose |
|---|---|---|
| `AGORA_ASR_VENDOR` | `deepgram` | Managed-mode speech recognition vendor |
| `AGORA_ASR_LANGUAGE` | `en-IN` | Recognition locale |
| `AGORA_TTS_VENDOR` | `minimax` | Managed-mode voice vendor |
| `AGORA_TTS_MODEL` | `speech-2.6-turbo` | Voice model |
| `AGORA_TTS_VOICE` | `English_captivating_female1` | Voice id |
| `AGORA_LLM_MODEL` | `$GEMINI_MODEL` | Model the agent reasons with |
| `AGORA_IDLE_TIMEOUT` | `60` | Seconds of silence before the agent self-terminates |
| `AGORA_TOKEN_TTL` | `3600` | RTC token lifetime, seconds |

If the console exposes different managed vendors than the defaults, this is an
env change — no code edit required.

## Testing

```bash
cd server && node agora.test.mjs     # 30 checks, no credentials needed
cd android-app && flutter analyze    # expect 0 errors
```

Then, on a **physical Android phone** (Agora's Flutter web support is alpha —
Chrome cannot validate this):

1. Open a lab → Ask Spark → tap the 🎙 icon in the sheet header.
2. Grant the mic prompt.
3. Header should go `connecting… → waking Spark… → live · just start talking`.
4. Spark greets you unprompted. Talk over it mid-sentence — it should stop.
5. Tap the red end-call button. Confirm in the Agora Console that the agent
   count drops back to zero.

## Verified so far (no Agora credentials required)

| Check | Result |
|---|---|
| `flutter analyze` | 0 errors — 38 issues, identical to the pre-change baseline |
| `node agora.test.mjs` | 30/30 pass — validation + exact ConvoAI payload |
| RTC token minting | Real AccessToken2 produced (`007…` prefix) |
| `flutter build apk --debug` | Succeeds; all Agora native `.so` libs present for arm64-v8a, armeabi-v7a, x86_64 |
| `npm run smoke:agora` (live API) | `JOIN → 200 status:RUNNING`, `LEAVE → 200` |
| Cloud Run deploy | revision `labspark-backend-00010-sst`, `/health` reports `agoraConfigured: true` |
| **On-device, motorola edge 40 (Android 15)** | **Live voice confirmed working — Spark speaks, audio clear** |

### On-device trace from the working session

```
libAgoraRtcWrapper.so … ok
[Agora] connection: connectionStateConnecting
[Agora] joined spark-metals-nonmetals-9s77ys in 153ms
[Agora] connection: connectionStateConnected (connectionChangedJoinSuccess)
[Agora] Spark agent joined (uid 1000)
```

### Managed mode: the gotcha that cost four attempts

`credential_mode: "managed"` supplies the provider **credentials only**. The
endpoint URL and model are still required fields. Omitting any of them returns
`400 InvalidFieldValue` naming the exact path:

| Missing | Response |
|---|---|
| `asr.params.model` | `Invalid value at properties.asr.params.model: required field is missing` |
| `asr.params.url` | `Invalid value at properties.asr.params.url: required field is missing` |
| `tts.params.url` | `Invalid value at properties.tts.params.url: required field is missing` |

All three are now set with env-overridable defaults, and `agora.test.mjs` has
six regression checks so they cannot silently vanish again. `buildJoinPayload()`
is the single source of truth — the route and the live smoke test share it,
because holding the payload in two places is exactly how the omission survived.

## APK size

The fat 3-ABI debug APK is ~370 MB, because the Agora SDK ships ~20 extension
`.so` files per architecture (video, face capture, lip sync, segmentation,
clear vision — none of which Spark uses).

This is mostly an artefact of `flutter build apk`, which builds every ABI.
`flutter run` builds only the connected device's architecture, so what
actually installs is roughly a third of that. For release builds use
`--split-per-abi`.

If it still needs trimming, Agora's audio-only guidance is to exclude the
video/vision extension libraries via `packagingOptions` in
`android/app/build.gradle`. **Not applied here** — an exclusion that removes a
library the SDK does end up loading fails at session start, in release only,
and there is no device attached yet to verify it. Do this after live voice is
confirmed working, never before.

## Known limitations

- **No live captions.** ConvoAI streams transcripts over Agora's RTM signaling
  channel, and the convenience layer for that ships for Android/iOS/Web but
  not Flutter. Live-voice turns therefore do **not** appear in the persisted
  per-lab conversation history. Text-mode Q&A still does.
- **Gemini via the OpenAI-compat endpoint** is the one part of this that is
  unverified against real traffic. If the agent connects but never speaks,
  check the Cloud Run logs for the ConvoAI error body, then fall back to a
  managed LLM preset by setting `AGORA_LLM_URL` / `AGORA_LLM_MODEL`.
- **20 concurrent agents per App ID** by default. Fine for a demo, needs a
  support request for a classroom rollout.
- **Billing is per agent-minute.** The app stops the agent when the sheet
  closes and `idle_timeout` is the backstop, but do check the console after
  testing that nothing is left running.

## Rollback

Live voice is purely additive. To disable it without reverting any code, drop
the `--dart-define=AGORA_APP_ID=…` from the build — the button disappears and
the app behaves exactly as it does on `android-app`.

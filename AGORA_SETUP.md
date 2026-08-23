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

## Interruption (barge-in) and transcripts

Both were added in a second pass after on-device testing showed interruption
was unreliable and no transcript appeared. Both had the same root cause.

### Why interruption did not work

**The engine does not stop talking on its own when the student speaks.** There
is no automatic barge-in. The client has to notice the overlap and explicitly
cancel the agent's turn:

```
POST /api/conversational-ai-agent/v2/projects/{appId}/agents/{agentId}/interrupt
```

The first implementation never called it, so Spark talked over the student
until it finished its sentence.

To *notice* the overlap the client needs to know Spark is currently speaking,
and that state only arrives over Signaling (RTM) — which was also switched off.
So one missing flag disabled both features at once:

```js
advanced_features: { enable_rtm: true },
parameters: { data_channel: "rtm", ... },
turn_detection: { language: "en-US" },
```

### The self-speech echo trap

The phone's speaker sits centimetres from its microphone. Echo cancellation is
good, not perfect. What leaks through reaches ASR, comes back as a *user*
transcript, and — since a user transcript during agent speech is the barge-in
signal — makes **Spark interrupt itself** mid-sentence. To a student that reads
as Spark randomly stopping and losing the thread.

`agora_self_speech_filter.dart` (ported from the reference `SelfSpeechFilter
.kt`) holds Spark's live sentence and discards user partials that closely match
it. Critically, a whitelist of short cut-ins — *stop, wait, no, why, hold on,
slow down* — is never filtered, even when the same word appears in what Spark
is saying. Filtering those would swallow exactly the interruptions this whole
change exists to support.

### Interrupt debouncing

ASR emits a partial every few hundred milliseconds. Firing an interrupt per
partial would cancel the same turn a dozen times, so `_requestInterrupt` fires
at most once per `turn_id`, with a 1.2s floor when no turn id is available, and
only while the engine reports the agent as `speaking`.

### Transcripts

`user.transcription` and `assistant.transcription` arrive over RTM as JSON.
Each turn is sent repeatedly as it grows, so `agora_transcript.dart` upserts by
`speaker:turn_id:stream_id` — appending instead would render one sentence as
twenty bubbles. In-progress turns render italic with an outline; interrupted
agent turns are tagged *"you cut in"*.

**Correcting an earlier claim in this document:** transcripts were described as
impossible in Flutter because the convenience layer ships only for
Android/iOS/Web. That was wrong. `agora_rtm` ^2.2.6 is an official Agora
Flutter plugin with the full RTM 2.x API, and the transcript payloads are plain
JSON — no convenience layer needed. Live-voice turns are now also folded into
the lab's persisted history when the session ends.

### Audio configuration changes

| Setting | Before | Now | Why |
|---|---|---|---|
| Channel profile | `liveBroadcasting` | `communication` | Live-broadcasting optimises one-way quality; communication applies the AEC/AGC tuning a full-duplex exchange needs. |
| Audio scenario | `audioScenarioAiClient` | unchanged | Audio was confirmed clear on device; not worth regressing. |
| Agent-side scenario | — | `chorus` | What the reference uses: least processing, lowest latency. |
| Audio route | default | `setDefaultAudioRouteToSpeakerphone(true)` | A phone flat on a desk must still be audible. |

The mic is deliberately **left open while Spark speaks**. Muting it would kill
echo cheaply and make barge-in impossible.

### Reference

Ported from [AgoraIO-Conversational-AI/agent-quickstart-android](https://github.com/AgoraIO-Conversational-AI/agent-quickstart-android)
— specifically `TranscriptAssembler.kt`, `SelfSpeechFilter.kt`,
`AgoraConversationSessionManager.kt`, and the join payload in
`server/app/agora_client.py`.

## Viva voce mock exam

A spoken CBSE practical viva. An examiner persona asks six questions aloud,
the student answers by voice, and the transcript is marked out of 10 — the
marks CBSE actually allots to viva voce.

### Where it lives, and why

| Entry | Placement | Reasoning |
|---|---|---|
| **Primary** | Card at the top of **Practical file** | This is the exam-prep surface. The reports listed below it are exactly the labs a student can be examined on, and intent already exists when they open this screen. |
| **Contextual** | Tappable next-step on **Lab complete** | The moment the practical is freshest is the best time to be questioned on it. Deliberately *not* a third button — "View report" stays the single primary action. |
| Not on Home | — | Home is discovery, not task. Its 2×2 quick-action grid is full, and a 5th tile breaks the rhythm. |
| Not a new tab | — | Bottom nav is capped at 5 items and already has 5. |
| Not a bottom sheet | — | A swipe-dismissable sheet can drop an exam mid-answer. |

The route `/viva` is a **sibling of the ShellRoute, not a child**, so the
bottom nav is absent during an exam and cannot be tapped by accident. It has
its own confirm-before-exit on both the close button and the system back
gesture.

### Flow

`pick → brief → live → scoring → result`, with a `failed` branch that always
offers a retry.

The **brief** step is not filler. The examiner deliberately refuses to hint,
confirm, or praise, and without being told that first, a student reads it as
the app being broken rather than as realistic practice.

### Design decisions worth keeping

- Questions render as **text as well as speech**. An oral exam that exists
  only as audio is unusable for a hard-of-hearing student and unreadable in a
  noisy classroom.
- Progress is derived from counting the examiner's turns, so "Question 3 of 6"
  is honest rather than the model announcing numbers it may get wrong.
- Score uses **tabular figures** so the layout doesn't shift between a 7 and
  a 10.
- Every verdict carries **icon + text + colour**, never colour alone.
- Viva is gated on `agoraConfigured` — an exam that can only fail is worse
  than no exam — and on lab completion, since a viva on a practical you never
  performed is a guaranteed bad first impression.

### Scoring

`POST /api/viva/score` takes the transcript and returns
`{score, band, summary, questions[], strengths[], improve[]}`. The prompt
explicitly tells Gemini the transcript came from speech recognition and to
mark on evident understanding, **not** on exact terminology — otherwise every
ASR mangling of "litmus" costs the student marks.

## Multilingual voice

Three options in **Settings → SPARK VOICE**, persisted per device and applied
to every live session:

| Option | ASR locale | Behaviour |
|---|---|---|
| English | `en-IN` | Clear Indian English |
| हिंदी | `hi-IN` | Conversational Hindi |
| Hinglish | `en-IN` | The Hindi-English mix a real classroom uses |

**Scientific terms stay in English in every mode.** Students read "litmus",
"solubility" and "circuit" in their NCERT textbook, so translating them makes
the tutor harder to follow, not easier.

A radio group rather than a dropdown: three options fit on screen, and a
collapsed picker would hide Hindi from the students who most need it.

Note that the TTS `voice_id` does **not** change per language. MiniMax's
speech-2.6 models are multilingual and infer language from the text, and
inventing unverified voice ids is how you get a 400 on a student's first tap.
Override per language with `AGORA_TTS_VOICE_HI_IN` if a dedicated voice is
ever confirmed.

All three were verified against the live API (`SMOKE_LANG=hi-IN npm run
smoke:agora`).

## Interruption, second pass

Barge-in worked but felt wrong in two ways, both fixed.

### It cut in too early, or waited too long

`turn_detection` now carries real tuning instead of just a language. The
important field is `end_of_speech.mode: "semantic"`, which switches the engine
from raw silence-timing to AIVAD — it waits for a **complete thought** rather
than the first gap. A 13-year-old thinking aloud pauses mid-sentence, and
silence-timing answers half their question.

| Env var | Default | What it controls |
|---|---|---|
| `AGORA_INTERRUPT_MS` | 260 | Speech needed before the agent yields. 160 is instant but trips on a cough; 300–500 suits noisy rooms |
| `AGORA_SPEAKING_INTERRUPT_MS` | 380 | Same, while the agent is mid-sentence. Higher, so room noise doesn't chop Spark off |
| `AGORA_PREFIX_PADDING_MS` | 600 | Stops the first syllable being clipped — clipped first words are what make an interruption feel misheard |
| `AGORA_SILENCE_MS` | 620 | How long a pause counts as "finished" |
| `AGORA_MAX_WAIT_MS` | 3000 | Upper bound on waiting |

### It forgot the conversation

Stopping the audio is only half of barge-in. The real complaint — "it stops,
then answers as if the last two minutes never happened" — is a *prompt*
problem: the engine cancels the turn, the cancelled text stays in history as a
fragment, and with no instruction the model treats the new question as a fresh
conversation.

`INTERRUPTION_RULES` in `server/agora.js` now tells Spark to: stop
immediately, **not** restart the previous explanation, answer the new question
first, then reconnect briefly to what it was explaining, and treat short
signals ("wait", "slower", "I don't get it") as a cue to ask one clarifying
question rather than launch into new material. Five regression checks assert
those rules are present, and that the viva persona **excludes** them — an
examiner reconnecting to "what we were explaining" would be leaking answers.

## Known limitations

- **Transcript accuracy is ASR-bound.** Indian-English lab vocabulary
  ("litmus", "solubility") is sometimes misheard. The transcript shows what
  the ASR actually heard, which makes it the fastest way to diagnose why Spark
  answered oddly. Tune with `AGORA_ASR_MODEL` / `AGORA_ASR_LANGUAGE`.
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

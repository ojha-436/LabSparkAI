/// Agora credentials + tunables for the live Spark voice session.
///
/// ONLY the App ID lives on the device. The App Certificate, the ConvoAI
/// REST customer key/secret, and every provider key stay server-side in
/// Cloud Run — the phone never sees them. The client's flow is:
///
///   1. POST /api/agora/start  → backend mints tokens + starts the agent
///   2. joinChannel(token)     → audio flows both ways
///   3. POST /api/agora/stop   → backend tells the agent to leave
///
/// Override at run time with
/// `flutter run --dart-define=AGORA_APP_ID=your_app_id`.
const kAgoraAppId = String.fromEnvironment('AGORA_APP_ID', defaultValue: '');

/// Live voice is only offered in the UI when an App ID is actually present,
/// so a build without the dart-define silently keeps the existing on-device
/// `flutter_tts` + `speech_to_text` path instead of showing a button that
/// can only fail.
bool get agoraConfigured => kAgoraAppId.isNotEmpty;

/// The agent is given this uid by the backend. The client subscribes to it
/// to know when Spark has actually joined and is ready to talk.
const kAgoraAgentUid = 1000;

/// How long to wait for the agent to join the channel after the REST call
/// succeeds. The engine spins up ASR/LLM/TTS on Agora's side first, so a
/// couple of seconds is normal; past this we treat it as a failure and fall
/// back rather than leaving the student staring at a spinner.
const kAgoraAgentJoinTimeout = Duration(seconds: 12);

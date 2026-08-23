import 'dart:async';

import 'package:agora_rtc_engine/agora_rtc_engine.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../core/api/agora_config.dart';
import 'agora_self_speech_filter.dart';
import 'agora_session_repository.dart';
import 'agora_rtm_service.dart';
import 'agora_transcript.dart';

/// Lifecycle of one live Spark conversation.
enum SparkVoiceStatus {
  /// Nothing running. The on-device TTS/STT path is what's in use.
  idle,

  /// Backend is minting tokens and starting the ConvoAI agent.
  starting,

  /// We're in the channel; waiting for the agent to join it too.
  connecting,

  /// Full duplex. Student can talk, Spark answers, either can interrupt.
  live,

  /// Tearing down.
  ending,

  /// Failed. [SparkVoiceState.error] carries something showable to a student.
  error,
}

@immutable
class SparkVoiceState {
  const SparkVoiceState({
    this.status = SparkVoiceStatus.idle,
    this.sparkSpeaking = false,
    this.studentSpeaking = false,
    this.muted = false,
    this.error,
    this.agentState = AgentState.idle,
    this.transcript = const [],
  });

  final SparkVoiceStatus status;

  /// Driven by volume indication on the agent's uid — this is what makes the
  /// avatar pulse while Spark talks.
  final bool sparkSpeaking;
  final bool studentSpeaking;
  final bool muted;
  final String? error;

  /// What Spark is doing, straight from the engine over RTM. More reliable
  /// than inferring it from audio volume, and it is what barge-in keys off.
  final AgentState agentState;

  /// Live conversation transcript, oldest first.
  final List<TranscriptTurn> transcript;

  bool get isActive =>
      status == SparkVoiceStatus.starting ||
      status == SparkVoiceStatus.connecting ||
      status == SparkVoiceStatus.live;

  SparkVoiceState copyWith({
    SparkVoiceStatus? status,
    bool? sparkSpeaking,
    bool? studentSpeaking,
    bool? muted,
    String? error,
    bool clearError = false,
    AgentState? agentState,
    List<TranscriptTurn>? transcript,
  }) {
    return SparkVoiceState(
      status: status ?? this.status,
      sparkSpeaking: sparkSpeaking ?? this.sparkSpeaking,
      studentSpeaking: studentSpeaking ?? this.studentSpeaking,
      muted: muted ?? this.muted,
      error: clearError ? null : (error ?? this.error),
      agentState: agentState ?? this.agentState,
      transcript: transcript ?? this.transcript,
    );
  }
}

/// Owns the Agora [RtcEngine] and one live Spark session at a time.
///
/// Deliberately additive: this never touches [SparkTts] or `speech_to_text`.
/// If anything here fails, the caller drops back to the existing turn-based
/// voice path and the app still works.
class AgoraVoiceService {
  AgoraVoiceService(this._sessions);
  final AgoraSessionRepository _sessions;

  final ValueNotifier<SparkVoiceState> state =
      ValueNotifier(const SparkVoiceState());

  RtcEngine? _engine;
  AgoraSession? _session;

  final _rtm = AgoraRtmService();
  final _selfSpeech = SelfSpeechFilter();
  StreamSubscription<AgentStateEvent>? _agentStateSub;
  StreamSubscription<List<TranscriptTurn>>? _transcriptSub;

  /// Barge-in bookkeeping. The engine sends an ASR partial every few hundred
  /// ms, so without these we would fire an interrupt per partial and cancel
  /// the same turn a dozen times.
  int? _agentTurnId;
  int? _interruptedTurnId;
  int _lastInterruptAtMs = 0;

  /// True while the engine reports Spark's audio playing, from either source.
  /// Volume indication is the reliable one; `agentState` only contributes when
  /// the engine actually publishes it.
  bool get _isSparkAudible =>
      state.value.sparkSpeaking ||
      state.value.agentState == AgentState.speaking;

  /// Completes when the agent's uid shows up in the channel.
  Completer<void>? _agentJoined;

  bool get isActive => state.value.isActive;

  void _set(SparkVoiceState next) => state.value = next;

  /// Boots the engine once and keeps it. Creating/destroying an RtcEngine per
  /// session is slow (native init) and leaks on some Android devices, so we
  /// initialise lazily and only release on [dispose].
  Future<RtcEngine> _ensureEngine() async {
    final existing = _engine;
    if (existing != null) return existing;

    final engine = createAgoraRtcEngine();
    await engine.initialize(const RtcEngineContext(
      appId: kAgoraAppId,
      // Communication, not live-broadcasting: this is a two-way conversation,
      // and the communication profile applies the AEC/AGC tuning that a
      // full-duplex exchange needs. Live-broadcasting optimises one-way
      // quality, which actively hurts barge-in.
      channelProfile: ChannelProfileType.channelProfileCommunication,
      // `audioScenarioAiClient` is the scenario Agora ships specifically for
      // conversational-AI clients. Without it the agent's TTS audio arrives
      // choppy/artefacted on Android because the default scenario applies
      // aggressive processing tuned for human two-way calls.
      audioScenario: AudioScenarioType.audioScenarioAiClient,
    ));

    engine.registerEventHandler(RtcEngineEventHandler(
      onJoinChannelSuccess: (connection, elapsed) {
        debugPrint('[Agora] joined ${connection.channelId} in ${elapsed}ms');
        _engine?.setEnableSpeakerphone(true);
      },
      onUserJoined: (connection, remoteUid, elapsed) {
        // The only remote party we ever expect is the agent.
        if (remoteUid == (_session?.agentUid ?? kAgoraAgentUid)) {
          debugPrint('[Agora] Spark agent joined (uid $remoteUid)');
          if (_agentJoined?.isCompleted == false) _agentJoined!.complete();
          _set(state.value
              .copyWith(status: SparkVoiceStatus.live, clearError: true));
        }
      },
      onUserOffline: (connection, remoteUid, reason) {
        if (remoteUid == (_session?.agentUid ?? kAgoraAgentUid)) {
          debugPrint('[Agora] agent left (reason: $reason)');
          // Agent dropped out from under us — surface it rather than leaving
          // a "live" badge on a dead session.
          if (state.value.status == SparkVoiceStatus.live) {
            _set(state.value.copyWith(
              status: SparkVoiceStatus.error,
              error: 'Spark disconnected. Tap to reconnect.',
              sparkSpeaking: false,
            ));
          }
        }
      },
      onAudioVolumeIndication: (connection, speakers, speakerNumber, total) {
        // uid 0 in this callback is the local user; anything else is remote.
        var spark = false;
        var student = false;
        for (final s in speakers) {
          final volume = s.volume ?? 0;
          if (s.uid == 0) {
            student = volume > 15;
          } else if (volume > 15) {
            spark = true;
          }
        }
        final cur = state.value;
        if (cur.sparkSpeaking != spark || cur.studentSpeaking != student) {
          _set(cur.copyWith(sparkSpeaking: spark, studentSpeaking: student));
        }
      },
      onConnectionStateChanged: (connection, connState, reason) {
        debugPrint('[Agora] connection: $connState ($reason)');
        if (connState == ConnectionStateType.connectionStateFailed) {
          _set(state.value.copyWith(
            status: SparkVoiceStatus.error,
            error: 'Lost connection to Spark. Check your network.',
          ));
        }
      },
      onError: (err, msg) {
        debugPrint('[Agora] error: $err — $msg');
      },
    ));

    await engine.enableAudio();
    await engine.setClientRole(role: ClientRoleType.clientRoleBroadcaster);
    // Route to the loudspeaker, not the earpiece. A student holding the phone
    // flat on a desk must still hear Spark.
    await engine.setDefaultAudioRouteToSpeakerphone(true);
    // 200ms cadence is responsive enough to drive a talking indicator without
    // spamming the platform channel.
    await engine.enableAudioVolumeIndication(
      interval: 200,
      smooth: 3,
      reportVad: true,
    );

    _engine = engine;
    return engine;
  }

  /// Starts a live conversation about [labTitle].
  ///
  /// Returns true if the session went live. On false the caller should keep
  /// using the on-device voice path — [state] holds a student-readable reason.
  Future<bool> start({required String labId, required String labTitle}) async {
    if (!agoraConfigured) {
      _set(const SparkVoiceState(
        status: SparkVoiceStatus.error,
        error: 'Live voice is not configured in this build.',
      ));
      return false;
    }
    if (isActive) return state.value.status == SparkVoiceStatus.live;

    _set(const SparkVoiceState(status: SparkVoiceStatus.starting));

    // Mic permission first — no point provisioning a paid agent upstream if
    // the student is going to deny the mic.
    final mic = await Permission.microphone.request();
    if (!mic.isGranted) {
      _set(const SparkVoiceState(
        status: SparkVoiceStatus.error,
        error: 'Microphone permission is needed for live voice.',
      ));
      return false;
    }

    try {
      final engine = await _ensureEngine();

      final session = await _sessions.start(labId: labId, labTitle: labTitle);
      _session = session;

      _agentJoined = Completer<void>();
      _set(state.value.copyWith(status: SparkVoiceStatus.connecting));

      await engine.joinChannel(
        token: session.token,
        channelId: session.channel,
        uid: session.uid,
        options: const ChannelMediaOptions(
          clientRoleType: ClientRoleType.clientRoleBroadcaster,
          channelProfile: ChannelProfileType.channelProfileCommunication,
          publishMicrophoneTrack: true,
          autoSubscribeAudio: true,
          enableAudioRecordingOrPlayout: true,
          // Audio-only — Spark has no camera feed.
          publishCameraTrack: false,
          autoSubscribeVideo: false,
        ),
      );

      // Signaling is brought up before we wait for the agent, so the very
      // first thing Spark says already appears in the transcript.
      await _connectSignaling(session);

      // The REST call returning 200 only means the agent was accepted, not
      // that it's in the channel. Wait for the actual join before we tell the
      // student they can talk.
      await _agentJoined!.future.timeout(kAgoraAgentJoinTimeout);
      _set(state.value
          .copyWith(status: SparkVoiceStatus.live, clearError: true));
      return true;
    } on TimeoutException {
      await _teardown();
      _set(const SparkVoiceState(
        status: SparkVoiceStatus.error,
        error: 'Spark took too long to join. Using offline voice instead.',
      ));
      return false;
    } catch (e) {
      debugPrint('[Agora] start failed: $e');
      await _teardown();
      _set(const SparkVoiceState(
        status: SparkVoiceStatus.error,
        error: "Couldn't start live voice. Using offline voice instead.",
      ));
      return false;
    }
  }

  /// Connects the signaling channel that carries transcripts and agent state.
  ///
  /// Deliberately non-fatal: if this fails the voice session continues without
  /// captions and without barge-in detection, which is worse but still usable.
  Future<void> _connectSignaling(AgoraSession session) async {
    if (!session.supportsSignaling) {
      debugPrint('[RTM] backend returned no RTM token — captions disabled');
      return;
    }

    _rtm.localUid = session.uid;

    // Keep the self-speech filter fed with whatever Spark is currently saying,
    // so echo of that sentence can be recognised and dropped.
    _rtm.onAgentText = (text) {
      _selfSpeech.updateAgentText(text);
    };

    _rtm.onStudentSpeech = (payload, text, isFinal) {
      final decision = _selfSpeech.decide(text);
      if (decision.discard) {
        // This is Spark's own voice coming back through the mic. Rendering it
        // would show the student saying Spark's words, and acting on it would
        // make Spark interrupt itself mid-sentence.
        debugPrint('[Agora] dropped self-speech echo '
            '(${decision.reason}, sim=${decision.similarity.toStringAsFixed(2)})');
        return;
      }

      _rtm.ingest(payload);

      // A real student utterance arriving while Spark is audible IS the
      // barge-in signal.
      //
      // Deliberately does NOT rely on `agentState` alone: on-device testing
      // showed this engine configuration never publishes `message.state`, so
      // gating on it meant the client interrupt fired exactly zero times.
      // Volume indication on the agent's uid is the signal that always
      // arrives, because it is derived from audio actually playing.
      if (_isSparkAudible) _requestInterrupt(text);
    };

    _agentStateSub = _rtm.agentState.listen((event) {
      if (event.turnId != null) _agentTurnId = event.turnId;

      switch (event.state) {
        case AgentState.speaking:
          // The mic stays open while Spark talks. Muting it here would be the
          // easy way to stop echo and would also make barge-in impossible.
          break;
        case AgentState.listening:
        case AgentState.idle:
        case AgentState.silent:
          // Turn is over: clear the interrupt latch and stop comparing
          // against a sentence that is no longer being spoken.
          _agentTurnId = null;
          _interruptedTurnId = null;
          _selfSpeech.clear();
          break;
        case AgentState.thinking:
        case AgentState.unknown:
          break;
      }

      // Only agentState is set here. sparkSpeaking stays owned by volume
      // indication, which is the signal that actually arrives — letting this
      // listener claim it would blank the talking indicator on any engine
      // that publishes state sparsely.
      _set(state.value.copyWith(agentState: event.state));
    });

    _transcriptSub = _rtm.transcript.listen((turns) {
      _set(state.value.copyWith(transcript: turns));
    });

    _rtm.errors.listen((e) => debugPrint('[Agora] engine error: $e'));

    final ok = await _rtm.connect(
      appId: kAgoraAppId,
      userId: session.rtmUserId,
      token: session.rtmToken,
      channel: session.channel,
    );
    debugPrint('[Agora] signaling ${ok ? "connected" : "unavailable"}');
  }

  /// Cancels Spark's current turn so the student can be heard.
  ///
  /// Guarded three ways because ASR partials arrive every few hundred ms:
  ///   • once per turn id, and
  ///   • a 1.2s floor when there is no turn id to latch onto, and
  ///   • only while the engine actually reports the agent as speaking.
  void _requestInterrupt(String because) {
    final session = _session;
    if (session == null) return;

    final turnId = _agentTurnId;
    if (turnId != null && _interruptedTurnId == turnId) return;

    final now = DateTime.now().millisecondsSinceEpoch;
    if (turnId == null && now - _lastInterruptAtMs < 1200) return;

    _interruptedTurnId = turnId;
    _lastInterruptAtMs = now;

    debugPrint('[Agora] barge-in → interrupting turn ${turnId ?? "?"} '
        '("${because.length > 40 ? "${because.substring(0, 40)}…" : because}")');

    // A short buzz the instant the cut-in registers. Spark's audio takes a
    // moment to actually stop, and without this the student gets no feedback
    // in that gap — it reads as the app ignoring them.
    HapticFeedback.mediumImpact();

    // Fire and forget. Awaiting would add round-trip latency to the one
    // interaction where latency is the whole point.
    _sessions.interrupt(session.agentId);

    _set(state.value.copyWith(sparkSpeaking: false, studentSpeaking: true));
  }

  Future<void> setMuted(bool muted) async {
    try {
      await _engine?.muteLocalAudioStream(muted);
      _set(state.value.copyWith(muted: muted));
    } catch (e) {
      debugPrint('[Agora] mute failed: $e');
    }
  }

  /// Ends the session: leave the channel, then stop the agent so we aren't
  /// billed for an idle one.
  Future<void> stop() async {
    if (_session == null && _engine == null) return;
    _set(state.value.copyWith(status: SparkVoiceStatus.ending));
    await _teardown();
    _set(const SparkVoiceState());
  }

  Future<void> _teardown() async {
    final session = _session;
    _session = null;

    await _agentStateSub?.cancel();
    _agentStateSub = null;
    await _transcriptSub?.cancel();
    _transcriptSub = null;
    _rtm.onAgentText = null;
    _rtm.onStudentSpeech = null;
    await _rtm.disconnect();
    _selfSpeech.clear();
    _agentTurnId = null;
    _interruptedTurnId = null;
    _lastInterruptAtMs = 0;
    if (_agentJoined?.isCompleted == false) {
      _agentJoined!.completeError(StateError('torn down'));
    }
    _agentJoined = null;

    try {
      await _engine?.leaveChannel();
    } catch (e) {
      debugPrint('[Agora] leaveChannel failed: $e');
    }
    if (session != null) {
      await _sessions.stop(session.agentId);
    }
  }

  /// Release native resources. Called when the app is shutting the feature
  /// down for good, not between sessions.
  Future<void> dispose() async {
    await _teardown();
    await _rtm.dispose();
    try {
      await _engine?.release();
    } catch (_) {}
    _engine = null;
    state.dispose();
  }
}

final agoraVoiceServiceProvider = Provider<AgoraVoiceService>((ref) {
  final service = AgoraVoiceService(ref.watch(agoraSessionRepositoryProvider));
  ref.onDispose(service.dispose);
  return service;
});

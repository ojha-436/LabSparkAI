import 'dart:async';

import 'package:agora_rtc_engine/agora_rtc_engine.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../core/api/agora_config.dart';
import 'agora_session_repository.dart';

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
  });

  final SparkVoiceStatus status;

  /// Driven by volume indication on the agent's uid — this is what makes the
  /// avatar pulse while Spark talks.
  final bool sparkSpeaking;
  final bool studentSpeaking;
  final bool muted;
  final String? error;

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
  }) {
    return SparkVoiceState(
      status: status ?? this.status,
      sparkSpeaking: sparkSpeaking ?? this.sparkSpeaking,
      studentSpeaking: studentSpeaking ?? this.studentSpeaking,
      muted: muted ?? this.muted,
      error: clearError ? null : (error ?? this.error),
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
      channelProfile: ChannelProfileType.channelProfileLiveBroadcasting,
      // `audioScenarioAiClient` is the scenario Agora ships specifically for
      // conversational-AI clients. Without it the agent's TTS audio arrives
      // choppy/artefacted on Android because the default scenario applies
      // aggressive processing tuned for human two-way calls.
      audioScenario: AudioScenarioType.audioScenarioAiClient,
    ));

    engine.registerEventHandler(RtcEngineEventHandler(
      onJoinChannelSuccess: (connection, elapsed) {
        debugPrint('[Agora] joined ${connection.channelId} in ${elapsed}ms');
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
          channelProfile: ChannelProfileType.channelProfileLiveBroadcasting,
          publishMicrophoneTrack: true,
          autoSubscribeAudio: true,
          // Audio-only — Spark has no camera feed.
          publishCameraTrack: false,
          autoSubscribeVideo: false,
        ),
      );

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

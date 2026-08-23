import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/agora_config.dart';
import '../../core/api/api_client.dart';

/// What the backend hands back after it has started a ConvoAI agent.
class AgoraSession {
  const AgoraSession({
    required this.agentId,
    required this.channel,
    required this.token,
    required this.uid,
    required this.agentUid,
  });

  /// ConvoAI agent id — needed to stop the agent again. Leaking the channel
  /// without this means the agent idles until `idle_timeout` and bills for it.
  final String agentId;
  final String channel;

  /// RTC token minted for [uid] on [channel]. Short-lived.
  final String token;
  final int uid;
  final int agentUid;
}

/// Start/stop facade over the ConvoAI REST API, proxied through our own
/// Cloud Run backend.
///
/// The proxy is not optional: the ConvoAI REST API authenticates with a
/// Basic customer key/secret that grants full control of the Agora project,
/// and the RTC token needs the App Certificate. Neither can ship in an APK —
/// anyone can unzip it. So the phone asks our backend, which already
/// verifies the caller's Firebase ID token and rate-limits per user.
class AgoraSessionRepository {
  AgoraSessionRepository(this._api);
  final ApiClient _api;

  static final _rand = Random();

  /// Agora channel names are limited to 64 bytes of ASCII. Lab ids are
  /// already slug-safe, and the random suffix keeps two students in the same
  /// lab from colliding into one channel and hearing each other.
  String _channelFor(String labId) {
    final slug = labId.replaceAll(RegExp(r'[^A-Za-z0-9_-]'), '').toLowerCase();
    final suffix = _rand.nextInt(1 << 32).toRadixString(36);
    return 'spark-${slug.isEmpty ? 'lab' : slug}-$suffix';
  }

  /// Agora rejects uid 0 for our purposes (0 means "let the SDK pick") and
  /// the agent owns [kAgoraAgentUid], so draw from a range that avoids both.
  int _uid() => 100000 + _rand.nextInt(800000);

  /// Asks the backend to mint tokens and start a ConvoAI agent for [labTitle].
  ///
  /// Throws [ApiException] on any non-2xx so the caller can fall back to the
  /// on-device voice path instead of showing a dead session.
  Future<AgoraSession> start({
    required String labId,
    required String labTitle,
  }) async {
    final channel = _channelFor(labId);
    final uid = _uid();

    final res = await _api.postJson(
      '/api/agora/start',
      {
        'channel': channel,
        'uid': uid,
        'experiment': labTitle,
      },
      // Starting an agent provisions ASR/LLM/TTS upstream — slower than a
      // plain Gemini text call, so the 12s default is too tight.
      timeout: const Duration(seconds: 25),
    );

    final agentId = res['agentId'];
    final token = res['token'];
    if (agentId is! String || agentId.isEmpty) {
      throw ApiException('Backend did not return an agentId');
    }
    if (token is! String) {
      throw ApiException('Backend did not return an RTC token');
    }

    return AgoraSession(
      agentId: agentId,
      channel: res['channel'] as String? ?? channel,
      token: token,
      uid: res['uid'] as int? ?? uid,
      agentUid: res['agentUid'] as int? ?? kAgoraAgentUid,
    );
  }

  /// Tells the agent to leave. Best-effort by design: if this fails the agent
  /// still self-terminates on `idle_timeout`, and we must never block the
  /// student from closing the sheet on a failed network call.
  Future<void> stop(String agentId) async {
    try {
      await _api.postJson(
        '/api/agora/stop',
        {'agentId': agentId},
        timeout: const Duration(seconds: 8),
      );
    } catch (_) {
      // Swallowed on purpose — see above.
    }
  }
}

final agoraSessionRepositoryProvider = Provider<AgoraSessionRepository>((ref) {
  return AgoraSessionRepository(ref.watch(apiClientProvider));
});

import 'dart:async';
import 'dart:convert';

import 'package:agora_rtm/agora_rtm.dart';
import 'package:flutter/foundation.dart';

import 'agora_transcript.dart';

/// An agent-state change with the turn it refers to.
///
/// The turn id is what lets the client interrupt a given turn exactly once,
/// instead of firing an interrupt on every ASR partial that arrives while
/// Spark is talking.
class AgentStateEvent {
  const AgentStateEvent(this.state, this.turnId);
  final AgentState state;
  final int? turnId;
}

/// Receives the Conversational AI engine's signaling stream.
///
/// The engine publishes two things we cannot get from the RTC audio channel:
///
///   • **transcripts** — `user.transcription` / `assistant.transcription`,
///     which is the only way to show what was actually said, and
///   • **agent state** — `message.state` plus RTM presence, which tells us
///     when Spark is *speaking*. Without that the client cannot know there is
///     anything to interrupt.
///
/// Requires `advanced_features.enable_rtm: true` and
/// `parameters.data_channel: "rtm"` in the join payload (see server/agora.js),
/// and an RTM token — separate from the RTC token, bound to a string user id.
class AgoraRtmService {
  RtmClient? _client;
  String? _channel;

  final _assembler = TranscriptAssembler();

  final _transcript = StreamController<List<TranscriptTurn>>.broadcast();
  final _agentState = StreamController<AgentStateEvent>.broadcast();
  final _errors = StreamController<String>.broadcast();

  /// Ordered turn list, re-emitted on every update.
  Stream<List<TranscriptTurn>> get transcript => _transcript.stream;

  /// What Spark is doing. Drives both the UI and the barge-in decision.
  Stream<AgentStateEvent> get agentState => _agentState.stream;

  /// Engine-side errors (`message.error`), surfaced for logging.
  Stream<String> get errors => _errors.stream;

  bool get isConnected => _client != null;

  /// Logs in and subscribes. Returns false on any failure — the caller should
  /// carry on with the voice session regardless: losing transcripts degrades
  /// the experience, it should never abort a working conversation.
  Future<bool> connect({
    required String appId,
    required String userId,
    required String token,
    required String channel,
  }) async {
    await disconnect();
    _assembler.reset();

    try {
      final (status, client) = await RTM(appId, userId);
      if (status.error) {
        debugPrint('[RTM] create failed: ${status.reason}');
        return false;
      }

      client.addListener(
        message: _onMessage,
        presence: _onPresence,
        linkState: (e) => debugPrint('[RTM] link: ${e.currentState}'),
      );

      final (loginStatus, _) = await client.login(token);
      if (loginStatus.error) {
        debugPrint('[RTM] login failed: ${loginStatus.reason}');
        await client.release();
        return false;
      }

      final (subStatus, _) = await client.subscribe(
        channel,
        withMessage: true,
        withPresence: true,
      );
      if (subStatus.error) {
        debugPrint('[RTM] subscribe failed: ${subStatus.reason}');
        await client.logout();
        await client.release();
        return false;
      }

      _client = client;
      _channel = channel;
      debugPrint('[RTM] connected to $channel as $userId');
      return true;
    } catch (e) {
      debugPrint('[RTM] connect threw: $e');
      return false;
    }
  }

  /// The local RTC uid, needed to key the student's own transcript turns.
  int localUid = 0;

  /// Called by the voice service when the agent's spoken text changes, so the
  /// self-speech filter has something to compare against.
  void Function(String agentText)? onAgentText;

  /// Called for every student transcript. The voice service applies the
  /// self-speech filter, decides whether this is a real barge-in, and calls
  /// [ingest] itself for the turns worth rendering — hence the full payload.
  void Function(Map<String, dynamic> payload, String text, bool isFinal)?
      onStudentSpeech;

  void _onMessage(MessageEvent event) {
    final raw = event.message;
    if (raw == null) return;

    Map<String, dynamic> payload;
    try {
      final decoded = jsonDecode(utf8.decode(raw));
      if (decoded is! Map<String, dynamic>) return;
      payload = decoded;
    } catch (_) {
      // Non-JSON traffic on the channel is not ours.
      return;
    }

    final object = payload['object'];

    // Every inbound signaling payload, logged once. Cheap, and the difference
    // between "transcripts are broken" and "transcripts never arrived" is the
    // first thing you need to know when this misbehaves.
    if (kDebugMode && object != 'message.metrics') {
      final t = payload['text'];
      final preview = t is String && t.isNotEmpty
          ? ' "${t.length > 48 ? '${t.substring(0, 48)}…' : t}"'
          : '';
      debugPrint('[RTM] rx $object'
          '${payload['turn_id'] != null ? ' turn=${payload['turn_id']}' : ''}'
          '$preview');
    }

    switch (object) {
      case 'assistant.transcription':
        final text = payload['text'];
        if (text is String && text.isNotEmpty) onAgentText?.call(text);
        _emitTranscript(payload);
        break;

      case 'user.transcription':
        final text = payload['text'] is String ? payload['text'] as String : '';
        final isFinal =
            payload.containsKey('final') ? payload['final'] != false : true;
        // Hand it to the voice service first — it applies the self-speech
        // filter and decides whether this is a real barge-in. It also decides
        // whether the turn is worth rendering at all.
        onStudentSpeech?.call(payload, text, isFinal);
        break;

      case 'message.interrupt':
        _emitTranscript(payload);
        break;

      case 'message.state':
        final state = payload['state'];
        if (state is String) {
          _agentState.add(AgentStateEvent(
            agentStateFrom(state),
            _asInt(payload['turn_id']),
          ));
        }
        break;

      case 'message.metrics':
        // Latency/quality telemetry. Nothing to render.
        break;

      case 'message.error':
        final module = payload['module'] ?? 'engine';
        final message = payload['message'] ?? 'unknown error';
        debugPrint('[RTM] engine error: $module — $message');
        _errors.add('$module: $message');
        break;

      default:
        // An unrecognised signal is exactly how `message.state` went missing
        // unnoticed. Log the keys so the next surprise is visible.
        if (kDebugMode) {
          debugPrint('[RTM] UNHANDLED object=$object keys=${payload.keys.toList()}');
        }
    }
  }

  /// Presence carries agent state too, and arrives even when a `message.state`
  /// is dropped. Belt and braces on the one signal barge-in depends on.
  void _onPresence(PresenceEvent event) {
    final items = event.stateItems;
    if (items == null) return;
    int? turnId;
    for (final item in items) {
      if (item.key == 'turn_id') turnId = int.tryParse(item.value ?? '');
    }
    for (final item in items) {
      if (item.key == 'state' && item.value != null) {
        _agentState.add(AgentStateEvent(agentStateFrom(item.value!), turnId));
      }
    }
  }

  /// Renders a payload into the turn list. Public so the voice service can
  /// push through student transcripts that survived the self-speech filter.
  void ingest(Map<String, dynamic> payload) => _emitTranscript(payload);

  void _emitTranscript(Map<String, dynamic> payload) {
    final turns = _assembler.handlePayload(payload, localUid: localUid);
    if (turns != null && !_transcript.isClosed) _transcript.add(turns);
  }

  Future<void> disconnect() async {
    final client = _client;
    final channel = _channel;
    _client = null;
    _channel = null;
    _assembler.reset();
    if (client == null) return;

    try {
      client.removeListener(message: _onMessage, presence: _onPresence);
      if (channel != null) await client.unsubscribe(channel);
      await client.logout();
      await client.release();
    } catch (e) {
      debugPrint('[RTM] disconnect: $e');
    }
  }

  static int? _asInt(Object? v) {
    if (v is int) return v;
    if (v is num) return v.toInt();
    if (v is String) return int.tryParse(v);
    return null;
  }

  Future<void> dispose() async {
    await disconnect();
    await _transcript.close();
    await _agentState.close();
    await _errors.close();
  }
}

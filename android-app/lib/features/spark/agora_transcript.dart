import 'package:flutter/foundation.dart';

/// Who said it.
enum TranscriptSpeaker { student, spark }

/// Lifecycle of one turn.
enum TranscriptTurnStatus {
  /// Still streaming in — render it, but it will change.
  inProgress,

  /// Complete.
  end,

  /// The student cut Spark off partway through this turn.
  interrupted,
}

/// What the agent is doing right now, from RTM `message.state` and presence.
///
/// This is the signal that makes barge-in possible: without knowing that Spark
/// is *currently speaking*, the client has nothing to interrupt.
enum AgentState { idle, listening, thinking, speaking, silent, unknown }

AgentState agentStateFrom(String raw) {
  switch (raw.toLowerCase()) {
    case 'idle':
      return AgentState.idle;
    case 'listening':
      return AgentState.listening;
    case 'thinking':
      return AgentState.thinking;
    case 'speaking':
      return AgentState.speaking;
    case 'silent':
      return AgentState.silent;
    default:
      return AgentState.unknown;
  }
}

@immutable
class TranscriptTurn {
  const TranscriptTurn({
    required this.key,
    required this.turnId,
    required this.streamId,
    required this.speaker,
    required this.text,
    required this.status,
    required this.createdAtMillis,
  });

  /// `speaker:turnId:streamId` — stable across the partial updates that make
  /// up one turn, so streaming text replaces itself instead of appending a new
  /// bubble on every ASR partial.
  final String key;
  final int turnId;
  final int? streamId;
  final TranscriptSpeaker speaker;
  final String text;
  final TranscriptTurnStatus status;
  final int createdAtMillis;

  bool get isFinal => status != TranscriptTurnStatus.inProgress;

  TranscriptTurn copyWith({String? text, TranscriptTurnStatus? status}) {
    return TranscriptTurn(
      key: key,
      turnId: turnId,
      streamId: streamId,
      speaker: speaker,
      text: text ?? this.text,
      status: status ?? this.status,
      createdAtMillis: createdAtMillis,
    );
  }
}

/// Assembles the streaming RTM transcript payloads into an ordered turn list.
///
/// Ported from `TranscriptAssembler.kt` in AgoraIO-Conversational-AI's
/// agent-quickstart-android. The engine sends the *same* turn repeatedly as it
/// grows, so this upserts by key rather than appending — otherwise a single
/// sentence renders as twenty bubbles.
///
/// Payload shapes, all arriving on the RTM channel:
///   {"object":"user.transcription",      "turn_id":N,"text":"…","final":bool}
///   {"object":"assistant.transcription", "turn_id":N,"text":"…","turn_status":0|1|2}
///   {"object":"message.interrupt",       "turn_id":N}
class TranscriptAssembler {
  final List<TranscriptTurn> _turns = [];

  void reset() => _turns.clear();

  /// Returns the updated ordered snapshot, or null if the payload was not a
  /// transcript message (so callers can skip a pointless rebuild).
  List<TranscriptTurn>? handlePayload(
    Map<String, dynamic> payload, {
    required int localUid,
  }) {
    final object = _str(payload['object']);

    switch (object) {
      case 'user.transcription':
        // `final` absent is treated as final — matches the reference, and a
        // missing flag on a user turn means the ASR closed it out.
        final isFinal = payload.containsKey('final')
            ? payload['final'] != false
            : true;
        _upsert(
          payload: payload,
          speaker: TranscriptSpeaker.student,
          status: isFinal
              ? TranscriptTurnStatus.end
              : TranscriptTurnStatus.inProgress,
          localUid: localUid,
        );
        break;

      case 'assistant.transcription':
        _upsert(
          payload: payload,
          speaker: TranscriptSpeaker.spark,
          status: _statusFromTurnStatus(_int(payload['turn_status'])),
          localUid: localUid,
        );
        break;

      case 'message.interrupt':
        _markInterrupted(_int(payload['turn_id']));
        break;

      default:
        return null;
    }

    return snapshot();
  }

  List<TranscriptTurn> snapshot() {
    final sorted = List<TranscriptTurn>.of(_turns);
    sorted.sort((a, b) {
      final byTime = a.createdAtMillis.compareTo(b.createdAtMillis);
      if (byTime != 0) return byTime;
      final byTurn = a.turnId.compareTo(b.turnId);
      if (byTurn != 0) return byTurn;
      return a.key.compareTo(b.key);
    });
    return sorted;
  }

  void _upsert({
    required Map<String, dynamic> payload,
    required TranscriptSpeaker speaker,
    required TranscriptTurnStatus status,
    required int localUid,
  }) {
    final turnId = _int(payload['turn_id']) ?? DateTime.now().millisecondsSinceEpoch;
    final streamId = _int(payload['stream_id']);
    final speakerKey =
        speaker == TranscriptSpeaker.student ? '$localUid' : 'agent';
    final key = '$speakerKey:$turnId:${streamId ?? -1}';
    final text = _normalizeSpacing(_str(payload['text']));
    final createdAt = _normalizeTimestamp(
      _int(payload['send_ts']) ?? DateTime.now().millisecondsSinceEpoch,
    );

    final i = _turns.indexWhere((t) => t.key == key);
    if (i == -1) {
      _turns.add(TranscriptTurn(
        key: key,
        turnId: turnId,
        streamId: streamId,
        speaker: speaker,
        text: text,
        status: status,
        createdAtMillis: createdAt,
      ));
      return;
    }

    // A blank text update must not wipe what we already have — the engine
    // sends status-only updates with an empty text field.
    _turns[i] = _turns[i].copyWith(
      text: text.isEmpty ? _turns[i].text : text,
      status: status,
    );
  }

  void _markInterrupted(int? turnId) {
    for (var i = _turns.length - 1; i >= 0; i--) {
      final t = _turns[i];
      if (t.speaker != TranscriptSpeaker.spark) continue;
      if (turnId != null && t.turnId != turnId) continue;
      _turns[i] = t.copyWith(status: TranscriptTurnStatus.interrupted);
      return;
    }
  }

  static TranscriptTurnStatus _statusFromTurnStatus(int? code) {
    switch (code) {
      case 0:
        return TranscriptTurnStatus.inProgress;
      case 2:
        return TranscriptTurnStatus.interrupted;
      default:
        return TranscriptTurnStatus.end;
    }
  }

  /// The engine sends seconds on some events and milliseconds on others.
  static int _normalizeTimestamp(int ts) =>
      ts > 1000000000000 ? ts : ts * 1000;

  /// ASR output frequently runs punctuation into the next word
  /// ("dissolve.Sand"), which reads badly in a bubble.
  static String _normalizeSpacing(String text) {
    return text
        .replaceAllMapped(
            RegExp(r'([.!?])([A-Za-z])'), (m) => '${m[1]} ${m[2]}')
        .replaceAllMapped(RegExp(r',([A-Za-z])'), (m) => ', ${m[1]}')
        .replaceAll(RegExp(r'\s{2,}'), ' ')
        .trim();
  }

  static String _str(Object? v) => v is String ? v : '';

  static int? _int(Object? v) {
    if (v is int) return v;
    if (v is num) return v.toInt();
    if (v is String) return int.tryParse(v);
    return null;
  }
}

import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// A single chat message in the Spark conversation.
class SparkMessage {
  const SparkMessage({
    required this.text,
    required this.fromSpark,
    required this.timestamp,
    this.spoken = false,
  });

  final String text;
  final bool fromSpark;
  final DateTime timestamp;
  final bool spoken;

  Map<String, dynamic> toJson() => {
        'text': text,
        'fromSpark': fromSpark,
        'ts': timestamp.millisecondsSinceEpoch,
        'spoken': spoken,
      };

  factory SparkMessage.fromJson(Map<String, dynamic> j) => SparkMessage(
        text: j['text'] as String,
        fromSpark: j['fromSpark'] as bool,
        timestamp:
            DateTime.fromMillisecondsSinceEpoch(j['ts'] as int? ?? 0),
        spoken: j['spoken'] as bool? ?? false,
      );
}

/// Persistent per-lab conversation. Keyed by lab id so the student's chat
/// with Spark in the Solubility lab is separate from Circuits, etc.
///
/// Persisted to SharedPreferences on every mutation — cheap because each
/// conversation is capped at 50 messages (~10 KB max).
class SparkConversationNotifier
    extends FamilyNotifier<List<SparkMessage>, String> {
  static const _maxMessages = 50;
  String get _key => 'spark.chat.$arg';

  @override
  List<SparkMessage> build(String arg) {
    _load();
    return const [];
  }

  Future<void> _load() async {
    try {
      final p = await SharedPreferences.getInstance();
      final raw = p.getString(_key);
      if (raw == null || raw.isEmpty) return;
      final list = (jsonDecode(raw) as List<dynamic>)
          .map((e) => SparkMessage.fromJson(e as Map<String, dynamic>))
          .toList();
      state = list;
    } catch (_) {}
  }

  Future<void> _persist() async {
    try {
      final p = await SharedPreferences.getInstance();
      final trimmed = state.length > _maxMessages
          ? state.sublist(state.length - _maxMessages)
          : state;
      await p.setString(_key, jsonEncode(trimmed.map((m) => m.toJson()).toList()));
    } catch (_) {}
  }

  void append(SparkMessage msg) {
    state = [...state, msg];
    _persist();
  }

  void clear() {
    state = const [];
    _persist();
  }
}

final sparkConversationProvider = NotifierProvider.family<
    SparkConversationNotifier, List<SparkMessage>, String>(
  SparkConversationNotifier.new,
);

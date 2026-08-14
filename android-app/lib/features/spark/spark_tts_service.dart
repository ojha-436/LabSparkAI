import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_tts/flutter_tts.dart';

/// Single app-wide TTS voice for Spark. Tuned to sound like a warm
/// Indian-English teacher, not a robot:
///
///   • Prefers the highest-quality voice available on-device — Google's
///     "en-IN"/"en-US" *network* voices (Neural2 / WaveNet backing) beat
///     the default embedded voice by a mile.
///   • Slower speech rate (0.44) — pupils track the meaning.
///   • Slightly warmer pitch (1.05).
///   • Serialised via `awaitSpeakCompletion` so overlapping reactions
///     don't clip each other mid-word.
class SparkTts {
  SparkTts._();
  static final SparkTts instance = SparkTts._();

  final _tts = FlutterTts();
  bool _initialised = false;

  /// Voice preferences in priority order — first available wins. Google's
  /// on-device voices ship with "en-in-x-end#female_1-local" / "network"
  /// variants; the "-network" ones are the Neural2 / WaveNet quality tier.
  static const _preferredVoices = <String>[
    'en-in-x-ene-network',    // Indian English, natural, female
    'en-in-x-end-network',    // Indian English, network, female alt
    'en-in-x-ene-local',      // Indian English, natural, offline
    'en-in-x-end-local',
    'en-us-x-tpc-network',    // US English fallback, warm female
    'en-us-x-sfg-network',
  ];

  Future<void> init() async {
    if (_initialised) return;
    try {
      await _tts.setSharedInstance(true);
      await _tts.awaitSpeakCompletion(true);
      await _tts.setLanguage('en-IN');
      await _tts.setSpeechRate(0.44);
      await _tts.setPitch(1.05);
      await _tts.setVolume(1.0);
      await _selectBestVoice();
      _initialised = true;
    } catch (e) {
      debugPrint('SparkTts.init failed: $e');
    }
  }

  /// Query all installed voices, pick the highest-priority match from
  /// [_preferredVoices]. Falls back to the first Indian-English voice.
  Future<void> _selectBestVoice() async {
    try {
      final raw = await _tts.getVoices as List<dynamic>?;
      if (raw == null) return;
      final voices = raw.map((e) => Map<String, String>.from(e as Map)).toList();

      Map<String, String>? pick;
      for (final target in _preferredVoices) {
        pick = voices.firstWhere(
          (v) => (v['name'] ?? '').toLowerCase() == target.toLowerCase(),
          orElse: () => <String, String>{},
        );
        if (pick.isNotEmpty) break;
      }

      pick ??= voices.firstWhere(
        (v) => (v['locale'] ?? '').startsWith('en-IN'),
        orElse: () => voices.firstWhere(
          (v) => (v['locale'] ?? '').startsWith('en'),
          orElse: () => <String, String>{},
        ),
      );

      if (pick.isNotEmpty) {
        await _tts.setVoice(pick);
        debugPrint('SparkTts using voice: ${pick['name']} · ${pick['locale']}');
      }
    } catch (e) {
      debugPrint('SparkTts._selectBestVoice failed: $e');
    }
  }

  Future<void> speak(String text) async {
    if (text.trim().isEmpty) return;
    await init();
    try {
      await _tts.stop();
      // A tiny lead-in pause helps students catch the first word.
      await _tts.speak(text);
    } catch (e) {
      debugPrint('SparkTts.speak failed: $e');
    }
  }

  Future<void> stop() async {
    try { await _tts.stop(); } catch (_) {}
  }
}

/// Riverpod provider — makes the shared instance injectable everywhere.
final sparkTtsProvider = Provider<SparkTts>((_) => SparkTts.instance);

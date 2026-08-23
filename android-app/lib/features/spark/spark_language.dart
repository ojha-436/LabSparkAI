import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// The language Spark speaks in during a live session.
///
/// Many CBSE students in tier-2/3 India follow the science perfectly but lose
/// it in English phrasing. The [key] is sent to the backend, which maps it to
/// an ASR locale and a prompt instruction.
///
/// Scientific terms stay in English in every mode on purpose — students read
/// "litmus" and "solubility" in their NCERT textbook, so translating them
/// would make the tutor harder to follow, not easier.
enum SparkLanguage {
  english('en-IN', 'English', 'Clear Indian English'),
  hindi('hi-IN', 'हिंदी', 'Hindi, science terms in English'),
  hinglish('hinglish', 'Hinglish', 'The mix a real classroom uses');

  const SparkLanguage(this.key, this.label, this.blurb);

  /// Sent to `/api/agora/start` as `language`.
  final String key;

  /// Shown in the picker.
  final String label;
  final String blurb;

  static SparkLanguage fromKey(String? key) {
    for (final l in SparkLanguage.values) {
      if (l.key == key) return l;
    }
    return SparkLanguage.english;
  }
}

/// Persisted choice of voice language.
class SparkLanguageNotifier extends Notifier<SparkLanguage> {
  static const _prefKey = 'spark.voice.language';

  @override
  SparkLanguage build() {
    _load();
    return SparkLanguage.english;
  }

  Future<void> _load() async {
    try {
      final p = await SharedPreferences.getInstance();
      state = SparkLanguage.fromKey(p.getString(_prefKey));
    } catch (_) {
      // Keep the default; a missing preference is not worth surfacing.
    }
  }

  Future<void> set(SparkLanguage language) async {
    state = language;
    try {
      final p = await SharedPreferences.getInstance();
      await p.setString(_prefKey, language.key);
    } catch (_) {}
  }
}

final sparkLanguageProvider =
    NotifierProvider<SparkLanguageNotifier, SparkLanguage>(
  SparkLanguageNotifier.new,
);

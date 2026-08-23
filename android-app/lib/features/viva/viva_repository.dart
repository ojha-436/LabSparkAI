import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../data/labs_repository.dart';
import '../../data/models/lab.dart';
import '../spark/agora_transcript.dart';

/// How one question went.
@immutable
class VivaQuestionResult {
  const VivaQuestionResult({
    required this.question,
    required this.answered,
    required this.verdict,
    required this.note,
  });

  final String question;
  final bool answered;

  /// `correct` | `partial` | `incorrect` | `no answer`
  final String verdict;
  final String note;

  factory VivaQuestionResult.fromJson(Map<String, dynamic> j) {
    return VivaQuestionResult(
      question: (j['question'] as String? ?? '').trim(),
      answered: j['answered'] as bool? ?? false,
      verdict: (j['verdict'] as String? ?? 'no answer').toLowerCase().trim(),
      note: (j['note'] as String? ?? '').trim(),
    );
  }
}

/// Marked result of a completed viva.
@immutable
class VivaResult {
  const VivaResult({
    required this.score,
    required this.band,
    required this.summary,
    required this.questions,
    required this.strengths,
    required this.improve,
  });

  /// Out of 10 — the marks CBSE actually allots to viva voce. A score out of
  /// 10 means something to a student; a percentage does not.
  final int score;

  /// `Needs work` | `Good` | `Excellent`
  final String band;
  final String summary;
  final List<VivaQuestionResult> questions;
  final List<String> strengths;
  final List<String> improve;

  static const maxScore = 10;

  factory VivaResult.fromJson(Map<String, dynamic> j) {
    return VivaResult(
      score: (j['score'] as num? ?? 0).round().clamp(0, maxScore),
      band: j['band'] as String? ?? 'Needs work',
      summary: (j['summary'] as String? ?? '').trim(),
      questions: (j['questions'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(VivaQuestionResult.fromJson)
          .where((q) => q.question.isNotEmpty)
          .toList(),
      strengths: (j['strengths'] as List<dynamic>? ?? const [])
          .whereType<String>()
          .map((s) => s.trim())
          .where((s) => s.isNotEmpty)
          .toList(),
      improve: (j['improve'] as List<dynamic>? ?? const [])
          .whereType<String>()
          .map((s) => s.trim())
          .where((s) => s.isNotEmpty)
          .toList(),
    );
  }
}

class VivaRepository {
  VivaRepository(this._api);
  final ApiClient _api;

  /// Sends the oral-exam transcript for marking.
  ///
  /// Throws [ApiException] so the caller can offer a retry — a viva the
  /// student just sat through is expensive to lose, so failing silently is
  /// not an option here.
  Future<VivaResult> score({
    required Lab lab,
    required List<TranscriptTurn> turns,
  }) async {
    final settled = turns
        .where((t) => t.isFinal && t.text.trim().isNotEmpty)
        .map((t) => {
              'speaker': t.speaker == TranscriptSpeaker.spark ? 'spark' : 'student',
              'text': t.text,
            })
        .toList();

    if (settled.isEmpty) {
      throw ApiException('Nothing was recorded during the viva.');
    }

    final res = await _api.postJson(
      '/api/viva/score',
      {
        'title': lab.title,
        'cls': lab.grade,
        'subject': lab.subject.label,
        'chapter': lab.chapter,
        'turns': settled,
      },
      // Marking reads a whole transcript with thinking enabled — slower than
      // a single tutor reply.
      timeout: const Duration(seconds: 45),
    );

    return VivaResult.fromJson(res);
  }
}

final vivaRepositoryProvider = Provider<VivaRepository>((ref) {
  return VivaRepository(ref.watch(apiClientProvider));
});

/// Labs the student has finished, and can therefore be examined on.
///
/// Gating on completion is deliberate: a viva on a practical you have not
/// performed is not exam practice, it is a guaranteed bad first impression of
/// the feature.
final vivaEligibleLabsProvider = Provider<List<Lab>>((ref) {
  final done = ref.watch(completionsProvider).valueOrNull ?? const <String>{};
  final allowed = ref.watch(allowedLabsProvider);
  return allowed.where((l) => done.contains(l.id)).toList();
});

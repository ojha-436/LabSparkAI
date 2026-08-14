import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';

/// Chat/reaction facade over the LabSpark Cloud Run backend.
///
/// Every call has an offline-safe fallback so the UI never breaks when the
/// backend is unreachable (same behaviour as the web app in `src/api.js`).
class SparkRepository {
  SparkRepository(this._api);
  final ApiClient _api;

  Future<String> ask({required String question, String experiment = 'general science'}) async {
    try {
      final res = await _api.postJson('/api/spark/ask', {
        'question': question,
        'experiment': experiment,
        'labState': null,
      });
      final answer = res['answer'];
      if (answer is String && answer.isNotEmpty) return answer;
    } catch (_) {
      // fall through
    }
    return _cannedAnswer(question);
  }

  /// A small on-device fallback so Spark still feels alive even when the
  /// Cloud Run backend is unreachable. Same idea as the web app's built-in
  /// canned responses.
  String _cannedAnswer(String q) {
    final s = q.toLowerCase();
    if (s.contains('acid') || s.contains('base') || s.contains('litmus')) {
      return "Great question! Acids turn blue litmus red; bases turn red litmus blue; neutral solutions do neither. Try the Acids, Bases & Salts lab to see this live.";
    }
    if (s.contains('circuit') || s.contains('current') || s.contains('bulb')) {
      return "In a simple circuit, current flows from the battery's + terminal, through the wire, through the bulb, and back to the − terminal. Break the loop and the bulb goes off. Try the Series & Parallel Circuits lab.";
    }
    if (s.contains('magnet')) {
      return "Only iron, cobalt, nickel and steel are attracted to a magnet. Aluminium, copper, plastic and wood are not. Grade 6's Magnetism lab has the 6-material drill.";
    }
    if (s.contains('friction')) {
      return "Friction is the force that resists motion between two surfaces in contact. Rough surfaces have more friction than smooth ones. Grade 8's Friction lab compares 5 surfaces.";
    }
    if (s.trim().isEmpty) return 'Ask me anything about your lab — I can help.';
    return "That's a great question — I'll do my best. If you're mid-lab, tell me which one and what you're seeing, and I can guide you Socratically.";
  }
}

final sparkRepositoryProvider = Provider<SparkRepository>((ref) {
  return SparkRepository(ref.watch(apiClientProvider));
});

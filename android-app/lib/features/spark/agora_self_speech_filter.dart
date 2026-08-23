/// Decides whether an incoming user-transcript partial is really the student,
/// or just Spark's own voice leaking back through the microphone.
///
/// Ported from `SelfSpeechFilter.kt` in AgoraIO-Conversational-AI's
/// agent-quickstart-android.
///
/// Why this exists: the phone's speaker is centimetres from its microphone.
/// Echo cancellation is good, not perfect. What leaks through gets sent to
/// ASR, comes back as a "user" transcript, and — because the client treats a
/// user transcript during agent speech as a barge-in — makes Spark interrupt
/// *itself* mid-sentence. That reads to a student as Spark randomly stopping
/// and losing the thread.
///
/// The tell is that the leaked text closely matches what Spark is currently
/// saying. So we hold Spark's live sentence and discard user partials that
/// look like it.
class SelfSpeechFilter {
  SelfSpeechFilter({Set<String>? interruptCommands})
      : _interruptCommands = interruptCommands ?? defaultInterruptCommands;

  /// Short phrases that must NEVER be filtered, even if Spark happens to be
  /// saying the same word. These are how a student actually cuts in, and
  /// swallowing them would break the feature we're here to fix.
  static const defaultInterruptCommands = <String>{
    'stop',
    'wait',
    'no',
    'hold on',
    'hang on',
    'sorry',
    'but',
    'why',
    'what',
    'repeat',
    'repeat that',
    'say that again',
    'i don\'t understand',
    'slow down',
  };

  final Set<String> _interruptCommands;

  /// Whatever Spark is saying right now, normalised.
  String _currentAgentText = '';

  void updateAgentText(String text) => _currentAgentText = _normalize(text);

  void clear() => _currentAgentText = '';

  /// True when [partial] should be thrown away as echo.
  bool shouldDiscard(String partial) => decide(partial).discard;

  SelfSpeechDecision decide(String partial) {
    final p = _normalize(partial);
    final agent = _currentAgentText;

    if (p.isEmpty || agent.isEmpty) {
      return const SelfSpeechDecision(false, 'no-agent-context');
    }

    // Protected commands win outright.
    if (_isProtectedInterrupt(p)) {
      return const SelfSpeechDecision(false, 'protected-interrupt-command');
    }

    final pw = p.split(' ').where((w) => w.isNotEmpty).toList();
    final aw = agent.split(' ').where((w) => w.isNotEmpty).toList();

    // Short utterances are almost always the student cutting in. Judging them
    // by similarity produces false positives on common words ("the", "so"),
    // which would silently eat real interruptions.
    if (pw.length < 4) {
      return const SelfSpeechDecision(false, 'too-short-to-judge');
    }

    if (agent.contains(p)) {
      return const SelfSpeechDecision(true, 'verbatim-substring-of-agent', 1.0);
    }

    final similarity = _max(_overlapRatio(pw, aw), _windowSimilarity(pw, aw));
    if (similarity >= 0.86) {
      return SelfSpeechDecision(true, 'high-similarity-to-agent', similarity);
    }
    return SelfSpeechDecision(false, 'looks-student-originated', similarity);
  }

  bool _isProtectedInterrupt(String p) {
    for (final c in _interruptCommands) {
      if (p == c || p.startsWith('$c ')) return true;
    }
    return false;
  }

  static String _normalize(String text) => text
      .toLowerCase()
      .replaceAll(RegExp(r'[^a-z0-9\s]'), ' ')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();

  /// Fraction of the partial's words that appear anywhere in Spark's sentence.
  static double _overlapRatio(List<String> partial, List<String> agent) {
    if (partial.isEmpty || agent.isEmpty) return 0;
    final agentSet = agent.toSet();
    final matched = partial.where(agentSet.contains).length;
    return matched / partial.length;
  }

  /// Best positional match of the partial against any same-length window of
  /// Spark's sentence. Catches echo that lands mid-sentence, which a bag-of-
  /// words overlap alone would miss.
  static double _windowSimilarity(List<String> partial, List<String> agent) {
    if (partial.isEmpty || agent.isEmpty) return 0;
    final w = partial.length;
    var best = 0.0;
    final last = (agent.length - w) < 0 ? 0 : agent.length - w;
    for (var start = 0; start <= last; start++) {
      final window = agent.skip(start).take(w).toList();
      if (window.isEmpty) continue;
      var exact = 0;
      for (var i = 0; i < window.length && i < partial.length; i++) {
        if (partial[i] == window[i]) exact++;
      }
      final score = exact / partial.length;
      if (score > best) best = score;
    }
    return best;
  }

  static double _max(double a, double b) => a > b ? a : b;
}

class SelfSpeechDecision {
  const SelfSpeechDecision(this.discard, this.reason, [this.similarity = 0]);
  final bool discard;
  final String reason;
  final double similarity;
}

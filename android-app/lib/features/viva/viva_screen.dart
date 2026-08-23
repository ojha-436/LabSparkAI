import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/agora_config.dart';
import '../../core/theme/app_tokens.dart';
import '../../data/models/lab.dart';
import '../spark/agora_session_repository.dart';
import '../spark/agora_transcript.dart';
import '../spark/agora_voice_service.dart';
import '../spark/spark_language.dart';
import 'viva_repository.dart';

/// Where the student is in the flow.
enum _Phase { pick, brief, live, scoring, result, failed }

/// Viva voce mock exam.
///
/// A pushed full-screen route rather than a bottom sheet, for two reasons:
/// a swipe-dismissable sheet can drop an exam mid-answer, and an exam needs
/// the whole screen. It also sits outside the bottom-nav shell so the tabs
/// cannot pull the student out of a session by accident.
class VivaScreen extends ConsumerStatefulWidget {
  const VivaScreen({super.key, this.lab});

  /// Pre-selected when entered from a just-completed lab. Null when entered
  /// from the practical file, where the student picks first.
  final Lab? lab;

  @override
  ConsumerState<VivaScreen> createState() => _VivaScreenState();
}

class _VivaScreenState extends ConsumerState<VivaScreen> {
  static const _totalQuestions = 6;

  late AgoraVoiceService _voice;
  late _Phase _phase;
  Lab? _lab;
  VivaResult? _result;
  String? _error;

  @override
  void initState() {
    super.initState();
    _voice = ref.read(agoraVoiceServiceProvider);
    _lab = widget.lab;
    _phase = _lab == null ? _Phase.pick : _Phase.brief;
  }

  @override
  void dispose() {
    // An abandoned viva must not leave a paid agent running.
    if (_voice.isActive) _voice.stop();
    super.dispose();
  }

  // ── flow ───────────────────────────────────────────────────────────────

  Future<void> _start() async {
    final lab = _lab;
    if (lab == null) return;

    HapticFeedback.mediumImpact();
    setState(() {
      _phase = _Phase.live;
      _error = null;
    });

    final ok = await _voice.start(
      labId: 'viva-${lab.id}',
      labTitle: lab.title,
      mode: SparkVoiceMode.viva,
      language: ref.read(sparkLanguageProvider),
    );

    if (!mounted) return;
    if (!ok) {
      setState(() {
        _phase = _Phase.failed;
        _error = _voice.state.value.error ?? "Couldn't start the viva.";
      });
    }
  }

  /// Ends the exam and sends the transcript for marking.
  Future<void> _finish() async {
    final lab = _lab;
    if (lab == null) return;

    HapticFeedback.mediumImpact();
    setState(() => _phase = _Phase.scoring);

    await _voice.stop();
    final turns = _voice.lastTranscript;

    if (!mounted) return;
    if (turns.where((t) => t.isFinal).isEmpty) {
      setState(() {
        _phase = _Phase.failed;
        _error = 'Nothing was recorded — check your microphone and try again.';
      });
      return;
    }

    try {
      final result =
          await ref.read(vivaRepositoryProvider).score(lab: lab, turns: turns);
      if (!mounted) return;
      setState(() {
        _result = result;
        _phase = _Phase.result;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _phase = _Phase.failed;
        _error = "Couldn't mark your viva. Your answers are still here — "
            'tap retry.';
      });
    }
  }

  /// Guards the back button and the close affordance while an exam is live.
  Future<bool> _confirmLeave() async {
    if (_phase != _Phase.live) return true;

    final leave = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('End the viva?'),
        content: const Text(
          "You're mid-exam. Leaving now discards your answers and nothing "
          'gets marked.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Keep going'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(
              foregroundColor: LabSparkTokens.rose600,
            ),
            child: const Text('Discard'),
          ),
        ],
      ),
    );
    return leave ?? false;
  }

  // ── build ──────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _phase != _Phase.live,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final navigator = Navigator.of(context);
        if (!await _confirmLeave()) return;
        await _voice.stop();
        if (mounted) navigator.pop();
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(switch (_phase) {
            _Phase.pick => 'Viva practice',
            _Phase.brief => 'Viva practice',
            _Phase.live => 'Viva in progress',
            _Phase.scoring => 'Marking…',
            _Phase.result => 'Your viva result',
            _Phase.failed => 'Viva practice',
          }),
          leading: IconButton(
            icon: const Icon(Icons.close_rounded),
            tooltip: 'Close',
            onPressed: () async {
              final navigator = Navigator.of(context);
              if (!await _confirmLeave()) return;
              await _voice.stop();
              if (mounted) navigator.pop();
            },
          ),
        ),
        body: SafeArea(
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 220),
            child: switch (_phase) {
              _Phase.pick => _LabPicker(
                  key: const ValueKey('pick'),
                  onPick: (lab) => setState(() {
                    _lab = lab;
                    _phase = _Phase.brief;
                  }),
                ),
              _Phase.brief => _Brief(
                  key: const ValueKey('brief'),
                  lab: _lab!,
                  questionCount: _totalQuestions,
                  onStart: _start,
                ),
              _Phase.live => _LiveExam(
                  key: const ValueKey('live'),
                  lab: _lab!,
                  voice: _voice,
                  totalQuestions: _totalQuestions,
                  onFinish: _finish,
                ),
              _Phase.scoring => const _Scoring(key: ValueKey('scoring')),
              _Phase.result => _ResultView(
                  key: const ValueKey('result'),
                  lab: _lab!,
                  result: _result!,
                  onRetake: () => setState(() {
                    _result = null;
                    _phase = _Phase.brief;
                  }),
                  onDone: () => Navigator.of(context).pop(),
                ),
              _Phase.failed => _Failed(
                  key: const ValueKey('failed'),
                  message: _error ?? 'Something went wrong.',
                  onRetry: () => setState(() => _phase = _Phase.brief),
                ),
            },
          ),
        ),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════
// Phase 1 — pick a lab
// ══════════════════════════════════════════════════════════════════════════

class _LabPicker extends ConsumerWidget {
  const _LabPicker({super.key, required this.onPick});
  final ValueChanged<Lab> onPick;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final labs = ref.watch(vivaEligibleLabsProvider);
    final scheme = Theme.of(context).colorScheme;

    if (labs.isEmpty) {
      return const _Empty(
        icon: Icons.science_outlined,
        title: 'Finish a lab first',
        body: 'A viva is on a practical you have already performed. Complete '
            'any lab and it will appear here, ready to be examined on.',
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      children: [
        Text(
          'Which practical?',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
              ),
        ),
        const SizedBox(height: 6),
        Text(
          'Pick a lab you have completed. The examiner will ask six questions '
          'about it, out loud.',
          style: TextStyle(
            fontSize: 13,
            height: 1.45,
            color: scheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 16),
        for (final lab in labs)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Material(
              color: scheme.surfaceContainerHigh,
              borderRadius: BorderRadius.circular(18),
              child: InkWell(
                onTap: () => onPick(lab),
                borderRadius: BorderRadius.circular(18),
                child: Padding(
                  // 56dp of vertical room keeps the row well above the 48dp
                  // touch-target floor.
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 14),
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: lab.accent.withValues(alpha: 0.16),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(lab.icon, size: 20, color: lab.accent),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              lab.title,
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 14.5,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Class ${lab.grade} · ${lab.subject.label}',
                              style: TextStyle(
                                fontSize: 12,
                                color: scheme.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Icon(Icons.chevron_right_rounded,
                          color: scheme.onSurfaceVariant),
                    ],
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════
// Phase 2 — what to expect
// ══════════════════════════════════════════════════════════════════════════

/// Sets expectations before the exam starts.
///
/// Not decorative: the examiner deliberately refuses to help or confirm
/// answers, and without warning that reads as the app being broken rather
/// than as realistic practice.
class _Brief extends StatelessWidget {
  const _Brief({
    super.key,
    required this.lab,
    required this.questionCount,
    required this.onStart,
  });

  final Lab lab;
  final int questionCount;
  final VoidCallback onStart;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
            children: [
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: LabSparkTokens.indigo600.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: LabSparkTokens.indigo600.withValues(alpha: 0.22),
                  ),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.record_voice_over_rounded,
                        color: LabSparkTokens.indigo600, size: 26),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            lab.title,
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 15.5,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            'Class ${lab.grade} · ${lab.subject.label} · viva voce',
                            style: TextStyle(
                              fontSize: 12,
                              color: scheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 22),
              Text('HOW IT WORKS',
                  style: TextStyle(
                    color: scheme.onSurfaceVariant,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.4,
                    fontSize: 11,
                  )),
              const SizedBox(height: 12),
              _BriefItem(
                icon: Icons.mic_rounded,
                title: 'Answer out loud',
                body: 'The examiner asks $questionCount questions by voice. '
                    'You answer by speaking — there is no typing.',
              ),
              const _BriefItem(
                icon: Icons.do_not_disturb_on_outlined,
                title: 'No hints, no marks as you go',
                body: 'Just like the real thing, the examiner will not tell '
                    'you whether an answer was right. That is deliberate.',
              ),
              const _BriefItem(
                icon: Icons.timer_outlined,
                title: 'Take your time',
                body: 'Silence is fine. The examiner waits for you to finish '
                    'thinking before moving on.',
              ),
              const _BriefItem(
                icon: Icons.fact_check_outlined,
                title: 'Marked out of 10 at the end',
                body: 'You get a score, question-by-question feedback, and '
                    'what to revise — after the viva, not during.',
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
          child: SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: onStart,
              icon: const Icon(Icons.play_arrow_rounded),
              label: const Text('Start viva'),
              style: FilledButton.styleFrom(
                backgroundColor: LabSparkTokens.indigo600,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _BriefItem extends StatelessWidget {
  const _BriefItem({
    required this.icon,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 19, color: LabSparkTokens.teal600),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                    )),
                const SizedBox(height: 3),
                Text(body,
                    style: TextStyle(
                      fontSize: 12.5,
                      height: 1.45,
                      color: scheme.onSurfaceVariant,
                    )),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════
// Phase 3 — the exam
// ══════════════════════════════════════════════════════════════════════════

class _LiveExam extends StatelessWidget {
  const _LiveExam({
    super.key,
    required this.lab,
    required this.voice,
    required this.totalQuestions,
    required this.onFinish,
  });

  final Lab lab;
  final AgoraVoiceService voice;
  final int totalQuestions;
  final VoidCallback onFinish;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<SparkVoiceState>(
      valueListenable: voice.state,
      builder: (context, live, _) {
        final scheme = Theme.of(context).colorScheme;
        final connecting = live.status == SparkVoiceStatus.starting ||
            live.status == SparkVoiceStatus.connecting;

        // The examiner's turns are the questions, so counting them is the
        // honest progress signal — no need to have the model announce numbers.
        final asked = live.transcript
            .where((t) => t.speaker == TranscriptSpeaker.spark)
            .map((t) => t.turnId)
            .toSet()
            .length;
        final current = asked.clamp(0, totalQuestions);

        return Column(
          children: [
            // Progress: a multi-step flow must show where you are.
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
              child: Column(
                children: [
                  Row(
                    children: [
                      Text(
                        connecting
                            ? 'Connecting…'
                            : 'Question ${current == 0 ? 1 : current} of $totalQuestions',
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 13,
                          fontFeatures: [FontFeature.tabularFigures()],
                        ),
                      ),
                      const Spacer(),
                      Text(
                        lab.title,
                        style: TextStyle(
                          fontSize: 12,
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: connecting ? null : current / totalQuestions,
                      minHeight: 5,
                      backgroundColor: scheme.surfaceContainerHighest,
                      color: LabSparkTokens.indigo600,
                    ),
                  ),
                ],
              ),
            ),

            // Transcript. The questions are shown as text as well as spoken —
            // an oral exam that only exists as audio is unusable for anyone
            // hard of hearing, and unreadable in a noisy classroom.
            Expanded(
              child: live.transcript.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(32),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const _ExaminerOrb(speaking: false, connecting: true),
                            const SizedBox(height: 18),
                            Text(
                              connecting
                                  ? 'Setting up the examiner…'
                                  : 'Listen for the first question.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 13.5,
                                color: scheme.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.fromLTRB(20, 18, 20, 8),
                      itemCount: live.transcript.length,
                      itemBuilder: (context, i) =>
                          _ExamTurn(turn: live.transcript[i]),
                    ),
            ),

            // Controls. Mute plus a single primary action — no text input,
            // because this is an oral exam.
            Container(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
              decoration: BoxDecoration(
                color: scheme.surface,
                border: Border(top: BorderSide(color: scheme.outlineVariant)),
              ),
              child: Row(
                children: [
                  _ExaminerOrb(
                    speaking: live.sparkSpeaking,
                    connecting: connecting,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(
                      live.muted
                          ? 'Mic off — the examiner cannot hear you'
                          : (live.sparkSpeaking
                              ? 'Examiner speaking'
                              : 'Your turn — answer out loud'),
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        color: live.muted
                            ? LabSparkTokens.rose600
                            : scheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: connecting
                        ? null
                        : () => voice.setMuted(!live.muted),
                    tooltip: live.muted ? 'Unmute microphone' : 'Mute microphone',
                    icon: Icon(
                      live.muted ? Icons.mic_off_rounded : Icons.mic_rounded,
                      color: live.muted
                          ? LabSparkTokens.rose600
                          : scheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(width: 4),
                  FilledButton.icon(
                    onPressed: connecting ? null : onFinish,
                    icon: const Icon(Icons.check_rounded, size: 18),
                    label: const Text('Finish'),
                    style: FilledButton.styleFrom(
                      backgroundColor: LabSparkTokens.teal600,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 12),
                    ),
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}

class _ExamTurn extends StatelessWidget {
  const _ExamTurn({required this.turn});
  final TranscriptTurn turn;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final fromExaminer = turn.speaker == TranscriptSpeaker.spark;
    final streaming = turn.status == TranscriptTurnStatus.inProgress;

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                fromExaminer
                    ? Icons.record_voice_over_rounded
                    : Icons.person_rounded,
                size: 13,
                color: fromExaminer
                    ? LabSparkTokens.indigo600
                    : LabSparkTokens.teal600,
              ),
              const SizedBox(width: 6),
              Text(
                fromExaminer ? 'EXAMINER' : 'YOU',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.1,
                  color: fromExaminer
                      ? LabSparkTokens.indigo600
                      : LabSparkTokens.teal600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 5),
          Text(
            turn.text.isEmpty ? '…' : turn.text,
            style: TextStyle(
              fontSize: 15,
              height: 1.45,
              fontWeight: fromExaminer ? FontWeight.w600 : FontWeight.w400,
              fontStyle: streaming ? FontStyle.italic : FontStyle.normal,
              color: streaming ? scheme.onSurfaceVariant : scheme.onSurface,
            ),
          ),
        ],
      ),
    );
  }
}

class _ExaminerOrb extends StatelessWidget {
  const _ExaminerOrb({required this.speaking, required this.connecting});
  final bool speaking;
  final bool connecting;

  @override
  Widget build(BuildContext context) {
    if (connecting) {
      return const SizedBox(
        width: 40,
        height: 40,
        child: Center(
          child: SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(strokeWidth: 2.2),
          ),
        ),
      );
    }
    final color =
        speaking ? LabSparkTokens.indigo600 : LabSparkTokens.slate400;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        boxShadow: speaking
            ? [
                BoxShadow(
                  color: color.withValues(alpha: 0.45),
                  blurRadius: 14,
                  spreadRadius: 2,
                ),
              ]
            : null,
      ),
      child: const Icon(Icons.record_voice_over_rounded,
          color: Colors.white, size: 19),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════
// Phase 4 — marking
// ══════════════════════════════════════════════════════════════════════════

class _Scoring extends StatelessWidget {
  const _Scoring({super.key});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(
              width: 34,
              height: 34,
              child: CircularProgressIndicator(strokeWidth: 3),
            ),
            const SizedBox(height: 22),
            const Text('Marking your viva',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            const SizedBox(height: 8),
            Text(
              'Reading back what you said and checking it against the '
              'syllabus. This takes a few seconds.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                height: 1.45,
                color: scheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════
// Phase 5 — result
// ══════════════════════════════════════════════════════════════════════════

class _ResultView extends StatelessWidget {
  const _ResultView({
    super.key,
    required this.lab,
    required this.result,
    required this.onRetake,
    required this.onDone,
  });

  final Lab lab;
  final VivaResult result;
  final VoidCallback onRetake;
  final VoidCallback onDone;

  /// Band colour AND icon AND label — never colour alone, so the result is
  /// legible to a colourblind student and in a screen reader.
  (Color, IconData) get _band {
    if (result.score >= 8) {
      return (LabSparkTokens.green600, Icons.workspace_premium_rounded);
    }
    if (result.score >= 5) {
      return (LabSparkTokens.amber600, Icons.trending_up_rounded);
    }
    return (LabSparkTokens.rose600, Icons.school_rounded);
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final (bandColor, bandIcon) = _band;

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
            children: [
              // Score
              Container(
                padding: const EdgeInsets.symmetric(vertical: 24),
                decoration: BoxDecoration(
                  color: bandColor.withValues(alpha: 0.09),
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: bandColor.withValues(alpha: 0.25)),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        Text(
                          '${result.score}',
                          style: TextStyle(
                            fontSize: 46,
                            fontWeight: FontWeight.w900,
                            height: 1,
                            color: bandColor,
                            // Tabular so the number doesn't shift the layout
                            // between a 7 and a 10.
                            fontFeatures: const [FontFeature.tabularFigures()],
                          ),
                        ),
                        Text(
                          ' / ${VivaResult.maxScore}',
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                            color: scheme.onSurfaceVariant,
                            fontFeatures: const [FontFeature.tabularFigures()],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(bandIcon, size: 16, color: bandColor),
                        const SizedBox(width: 6),
                        Text(
                          result.band,
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 13.5,
                            color: bandColor,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Viva voce · ${lab.title}',
                      style: TextStyle(
                        fontSize: 11.5,
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),

              if (result.summary.isNotEmpty) ...[
                const SizedBox(height: 18),
                Text(
                  result.summary,
                  style: const TextStyle(fontSize: 14.5, height: 1.5),
                ),
              ],

              if (result.questions.isNotEmpty) ...[
                const SizedBox(height: 24),
                const _Label('QUESTION BY QUESTION'),
                const SizedBox(height: 10),
                for (final q in result.questions) _QuestionRow(q: q),
              ],

              if (result.strengths.isNotEmpty) ...[
                const SizedBox(height: 20),
                const _Label('WHAT YOU DID WELL'),
                const SizedBox(height: 8),
                for (final s in result.strengths)
                  _Bullet(
                    icon: Icons.check_circle_rounded,
                    color: LabSparkTokens.green600,
                    text: s,
                  ),
              ],

              if (result.improve.isNotEmpty) ...[
                const SizedBox(height: 20),
                const _Label('REVISE THIS BEFORE THE EXAM'),
                const SizedBox(height: 8),
                for (final s in result.improve)
                  _Bullet(
                    icon: Icons.arrow_circle_right_rounded,
                    color: LabSparkTokens.amber600,
                    text: s,
                  ),
              ],
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: onDone,
                  icon: const Icon(Icons.check_rounded),
                  label: const Text('Done'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: FilledButton.icon(
                  onPressed: onRetake,
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Retake viva'),
                  style: FilledButton.styleFrom(
                    backgroundColor: LabSparkTokens.indigo600,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _QuestionRow extends StatelessWidget {
  const _QuestionRow({required this.q});
  final VivaQuestionResult q;

  (Color, IconData, String) _verdict(BuildContext context) {
    switch (q.verdict) {
      case 'correct':
        return (LabSparkTokens.green600, Icons.check_circle_rounded, 'Correct');
      case 'partial':
        return (LabSparkTokens.amber600, Icons.adjust_rounded, 'Partly right');
      case 'incorrect':
        return (LabSparkTokens.rose600, Icons.cancel_rounded, 'Incorrect');
      default:
        return (
          Theme.of(context).colorScheme.onSurfaceVariant,
          Icons.remove_circle_outline_rounded,
          'No answer',
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final (color, icon, label) = _verdict(context);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 15, color: color),
              const SizedBox(width: 6),
              // Text label as well as the icon and colour.
              Text(
                label,
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.8,
                  color: color,
                ),
              ),
            ],
          ),
          const SizedBox(height: 7),
          Text(
            q.question,
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5),
          ),
          if (q.note.isNotEmpty) ...[
            const SizedBox(height: 5),
            Text(
              q.note,
              style: TextStyle(
                fontSize: 12.5,
                height: 1.45,
                color: scheme.onSurfaceVariant,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _Label extends StatelessWidget {
  const _Label(this.text);
  final String text;
  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: TextStyle(
        color: Theme.of(context).colorScheme.onSurfaceVariant,
        fontWeight: FontWeight.w800,
        letterSpacing: 1.4,
        fontSize: 11,
      ),
    );
  }
}

class _Bullet extends StatelessWidget {
  const _Bullet({
    required this.icon,
    required this.color,
    required this.text,
  });
  final IconData icon;
  final Color color;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 10),
          Expanded(
            child: Text(text,
                style: const TextStyle(fontSize: 13.5, height: 1.45)),
          ),
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════
// Shared states
// ══════════════════════════════════════════════════════════════════════════

class _Failed extends StatelessWidget {
  const _Failed({
    super.key,
    required this.message,
    required this.onRetry,
  });
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline_rounded,
                size: 40, color: LabSparkTokens.rose600),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                height: 1.5,
                color: scheme.onSurface,
              ),
            ),
            const SizedBox(height: 22),
            // Every error state needs a way forward, not just a description.
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Try again'),
              style: FilledButton.styleFrom(
                backgroundColor: LabSparkTokens.indigo600,
                padding: const EdgeInsets.symmetric(
                    horizontal: 22, vertical: 14),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty({
    required this.icon,
    required this.title,
    required this.body,
  });
  final IconData icon;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(36),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 44, color: scheme.onSurfaceVariant),
            const SizedBox(height: 18),
            Text(title,
                style: const TextStyle(
                    fontWeight: FontWeight.w800, fontSize: 16.5)),
            const SizedBox(height: 8),
            Text(
              body,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13.5,
                height: 1.5,
                color: scheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Guard so the viva is hidden entirely when live voice isn't configured —
/// an exam that can only fail is worse than no exam.
bool get vivaAvailable => agoraConfigured;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_tokens.dart';
import '../../core/theme/logo.dart';
import '../../data/models/lab.dart';
import '../spark/spark_tts_service.dart';

/// Full-screen celebration shown when a student finishes a lab. Displays
/// Spark's feedback, score, XP earned, and shortcuts to the practical file
/// + next lab.
class LabCompleteScreen extends ConsumerStatefulWidget {
  const LabCompleteScreen({
    super.key,
    required this.lab,
    required this.score,
    required this.total,
    required this.feedback,
    this.badge,
  });

  final Lab lab;
  final int score;
  final int total;
  final String feedback;
  final String? badge;

  @override
  ConsumerState<LabCompleteScreen> createState() => _LabCompleteScreenState();
}

class _LabCompleteScreenState extends ConsumerState<LabCompleteScreen> {
  @override
  void initState() {
    super.initState();
    HapticFeedback.mediumImpact();
    // Read feedback aloud so Spark celebrates the student.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      SparkTts.instance.speak(widget.feedback);
    });
  }

  @override
  void dispose() {
    SparkTts.instance.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final percent = widget.total > 0 ? widget.score / widget.total : 0.0;
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // ── Hero card with score + badge ──
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [LabSparkTokens.teal500, LabSparkTokens.teal600],
                ),
              ),
              child: Column(
                children: [
                  const SizedBox(height: 8),
                  const LabSparkLogoTile(size: 64),
                  const SizedBox(height: 20),
                  const Text('Lab complete 🎉',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                      )),
                  const SizedBox(height: 4),
                  Text(
                    widget.lab.title,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.85),
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _Stat(
                        big: '${widget.score}/${widget.total}',
                        small: 'CORRECT',
                      ),
                      _Stat(
                        big: '${(percent * 100).round()}%',
                        small: 'SCORE',
                      ),
                      const _Stat(big: '+30', small: 'XP EARNED'),
                    ],
                  ),
                  if (widget.badge != null) ...[
                    const SizedBox(height: 20),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(100),
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.4),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.emoji_events_rounded,
                              color: Colors.white, size: 16),
                          const SizedBox(width: 6),
                          Text(widget.badge!,
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                                fontSize: 12,
                                letterSpacing: 0.4,
                              )),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),

            // ── Spark's feedback ──
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
                children: [
                  Row(
                    children: [
                      Icon(Icons.auto_awesome_rounded,
                          color: LabSparkTokens.teal600, size: 18),
                      const SizedBox(width: 8),
                      Text('SPARK\'S FEEDBACK',
                          style: TextStyle(
                            color: scheme.onSurfaceVariant,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.4,
                            fontSize: 11,
                          )),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: scheme.surfaceContainerHigh,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Text(
                      widget.feedback,
                      style: const TextStyle(
                        fontSize: 14.5,
                        height: 1.5,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Icon(Icons.menu_book_rounded,
                          color: LabSparkTokens.indigo600, size: 18),
                      const SizedBox(width: 8),
                      Text('WHAT HAPPENS NEXT',
                          style: TextStyle(
                            color: scheme.onSurfaceVariant,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.4,
                            fontSize: 11,
                          )),
                    ],
                  ),
                  const SizedBox(height: 10),
                  _NextItem(
                    icon: Icons.description_rounded,
                    title: 'Added to your practical file',
                    body:
                        'This lab report is now saved with your observations, ready to share with your teacher.',
                  ),
                  _NextItem(
                    icon: Icons.workspace_premium_rounded,
                    title: '+30 XP added to your profile',
                    body:
                        'Keep completing labs to level up and earn badges.',
                  ),
                ],
              ),
            ),

            // ── Action buttons ──
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {
                          Navigator.of(context).pop();
                          context.go('/labs');
                        },
                        icon: const Icon(Icons.science_rounded),
                        label: const Text('More labs'),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 2,
                      child: FilledButton.icon(
                        onPressed: () {
                          Navigator.of(context).pop();
                          // Navigate to the practical file first, then the
                          // fresh report — so the back stack is [practical
                          // list → this report].
                          context.go('/practical');
                          Future<void>.delayed(
                              const Duration(milliseconds: 240), () {
                            if (context.mounted) {
                              context.push(
                                '/practical/report',
                                extra: {
                                  'id': widget.lab.id,
                                  'title': widget.lab.title,
                                  'grade': widget.lab.grade,
                                  'subject': widget.lab.subject.label,
                                  'chapter': widget.lab.chapter,
                                  'score': widget.score,
                                  'total': widget.total,
                                  'feedback': widget.feedback,
                                  'badge': widget.badge,
                                  // Freshly finished — Firestore will overwrite
                                  // shortly with the same fields.
                                },
                              );
                            }
                          });
                        },
                        icon: const Icon(Icons.menu_book_rounded),
                        label: const Text('View report'),
                        style: FilledButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          backgroundColor: LabSparkTokens.teal600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.big, required this.small});
  final String big;
  final String small;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(big,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 26,
              fontWeight: FontWeight.w800,
            )),
        const SizedBox(height: 2),
        Text(small,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.7),
              fontSize: 9.5,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.4,
            )),
      ],
    );
  }
}

class _NextItem extends StatelessWidget {
  const _NextItem({
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
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: scheme.surface,
        border: Border.all(color: scheme.outlineVariant),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(
              color: LabSparkTokens.teal600.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: LabSparkTokens.teal600, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    )),
                const SizedBox(height: 3),
                Text(body,
                    style: TextStyle(
                      fontSize: 12.5,
                      height: 1.4,
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

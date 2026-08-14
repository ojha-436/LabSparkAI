import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/theme/app_tokens.dart';
import '../../data/models/lab.dart';
import 'lab_runner_screen.dart';

/// Bottom-sheet detail view shown when a student taps a lab card in the
/// catalog. Displays aim, chapter, materials, and an "Open experiment"
/// button that (in Phase 3) will launch the WebView-hosted R3F 3D scene.
void showLabDetailSheet(BuildContext context, Lab lab) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    useRootNavigator: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => _LabDetailSheet(lab: lab),
  );
}

class _LabDetailSheet extends StatelessWidget {
  const _LabDetailSheet({required this.lab});
  final Lab lab;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return DraggableScrollableSheet(
      initialChildSize: 0.72,
      maxChildSize: 0.94,
      minChildSize: 0.5,
      expand: false,
      builder: (context, scroll) {
        return Container(
          decoration: BoxDecoration(
            color: scheme.surface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            children: [
              // Drag handle
              Container(
                margin: const EdgeInsets.only(top: 10, bottom: 6),
                width: 40, height: 4,
                decoration: BoxDecoration(
                  color: scheme.outlineVariant,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Expanded(
                child: ListView(
                  controller: scroll,
                  padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
                  children: [
                    // Hero row
                    Row(
                      children: [
                        Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [
                                lab.accent.withValues(alpha: 0.22),
                                lab.accent.withValues(alpha: 0.08),
                              ],
                            ),
                            borderRadius: BorderRadius.circular(18),
                          ),
                          child: Icon(lab.icon, color: lab.accent, size: 36),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _MetaTag(
                                'Class ${lab.grade} · ${lab.subject.label}',
                                color: lab.accent,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                lab.title,
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                  height: 1.2,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        _Stat(icon: Icons.menu_book_rounded, label: lab.chapter),
                        const SizedBox(width: 16),
                        _Stat(
                          icon: Icons.schedule_rounded,
                          label: '${lab.estimatedMinutes} min',
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    const _SectionTitle('What you\'ll do'),
                    const SizedBox(height: 8),
                    Text(
                      _aimFor(lab),
                      style: TextStyle(
                        fontSize: 14.5, height: 1.5,
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 24),
                    const _SectionTitle('Learning objectives'),
                    const SizedBox(height: 8),
                    for (final b in _bulletsFor(lab))
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              margin: const EdgeInsets.only(top: 6, right: 10),
                              width: 6, height: 6,
                              decoration: BoxDecoration(
                                color: lab.accent,
                                shape: BoxShape.circle,
                              ),
                            ),
                            Expanded(
                              child: Text(
                                b,
                                style: TextStyle(
                                  fontSize: 14, height: 1.5,
                                  color: scheme.onSurface,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: LabSparkTokens.teal600.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: LabSparkTokens.teal600.withValues(alpha: 0.24),
                        ),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.auto_awesome_rounded,
                              size: 18, color: LabSparkTokens.teal600),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Spark will narrate each step, ask conceptual questions along the way, and grade your lab automatically at the end.',
                              style: TextStyle(
                                fontSize: 12.5,
                                height: 1.4,
                                color: scheme.onSurface,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                  child: Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => Navigator.of(context).pop(),
                          icon: const Icon(Icons.close_rounded),
                          label: const Text('Close'),
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
                            HapticFeedback.mediumImpact();
                            Navigator.of(context).pop();
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => LabRunnerScreen(lab: lab),
                                fullscreenDialog: true,
                              ),
                            );
                          },
                          icon: const Icon(Icons.play_arrow_rounded),
                          label: const Text('Start experiment'),
                          style: FilledButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            backgroundColor: lab.accent,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  String _aimFor(Lab lab) {
    // Bespoke summaries for the most-tapped labs; generic template otherwise.
    switch (lab.id) {
      case 'acids-bases':
        return 'Dip blue and red litmus paper into 6 everyday solutions — lemon juice, vinegar, soap, salt water, and more. Sort each into acid, base, or neutral by observing the colour change.';
      case 'solubility':
        return 'Add sugar, salt, sand, chalk and oil to water. Watch which dissolve into a clear solution (soluble) and which stay visible (insoluble).';
      case 'magnetism':
        return 'Bring a bar magnet near an iron nail, steel pin, nickel coin, aluminium foil, copper wire and plastic scale. Sort each material into magnetic vs non-magnetic.';
      case 'circuits':
        return 'Wire up a battery, switch, and bulb into a circuit board. Compare series vs parallel setups and observe the effect on brightness when a bulb is removed.';
      case 'friction':
        return 'Slide a block over 5 different surfaces (glass, wood, sandpaper, ice, carpet). Rank each by how quickly the block stops — that\'s their friction.';
      default:
        return 'A guided CBSE practical for the "${lab.chapter}" chapter. Spark walks you through each step, asks Socratic questions, and grades your observations at the end.';
    }
  }

  List<String> _bulletsFor(Lab lab) {
    return const [
      'Follow the guided experiment step-by-step with Spark narrating.',
      'Answer conceptual questions after each observation to lock in understanding.',
      'Submit for AI grading — get a rubric-based score + feedback.',
      'The completed lab auto-compiles into your CBSE practical file.',
    ];
  }
}

class _MetaTag extends StatelessWidget {
  const _MetaTag(this.label, {required this.color});
  final String label;
  final Color color;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(100),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.4,
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.icon, required this.label});
  final IconData icon;
  final String label;
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Flexible(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: scheme.onSurfaceVariant),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: scheme.onSurfaceVariant,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);
  final String text;
  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: TextStyle(
        color: Theme.of(context).colorScheme.onSurfaceVariant,
        fontWeight: FontWeight.w800,
        letterSpacing: 1.4,
        fontSize: 11,
      ),
    );
  }
}

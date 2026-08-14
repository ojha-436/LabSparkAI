import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_repository.dart';
import '../../core/theme/app_tokens.dart';
import '../../core/theme/logo.dart';

/// Shown right after role selection when the student needs to pick their
/// CBSE class. This locks the labs catalog — a Class 8 student will only
/// see Class 8 labs, keeping the app focused on their syllabus.
class ClassSelectionScreen extends ConsumerStatefulWidget {
  const ClassSelectionScreen({super.key});

  @override
  ConsumerState<ClassSelectionScreen> createState() =>
      _ClassSelectionScreenState();
}

class _ClassSelectionScreenState extends ConsumerState<ClassSelectionScreen> {
  int? _picked;
  bool _busy = false;

  Future<void> _submit() async {
    if (_picked == null) return;
    HapticFeedback.mediumImpact();
    setState(() => _busy = true);
    try {
      await ref.read(authRepositoryProvider).setGrade(_picked!);
      if (!mounted) return;
      context.go('/home');
    } catch (_) {
      if (!mounted) return;
      setState(() => _busy = false);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Couldn\'t save your class. Try again.'),
        behavior: SnackBarBehavior.floating,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const LabSparkLogoTile(size: 56),
              const SizedBox(height: 20),
              Text('Which class are you in?',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                      )),
              const SizedBox(height: 6),
              Text(
                'We\'ll show you the labs from your NCERT syllabus so nothing feels overwhelming.',
                style: TextStyle(
                  color: scheme.onSurfaceVariant,
                  fontSize: 14,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 24),
              Expanded(
                child: ListView(
                  children: [
                    for (final g in const [6, 7, 8, 9, 10])
                      Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _ClassCard(
                          grade: g,
                          selected: _picked == g,
                          onTap: () => setState(() => _picked = g),
                        ),
                      ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: LabSparkTokens.amber500.withValues(alpha: 0.10),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color:
                              LabSparkTokens.amber500.withValues(alpha: 0.28),
                        ),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.info_outline_rounded,
                              size: 18, color: LabSparkTokens.amber600),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'You can change your class later from Profile → Settings.',
                              style: TextStyle(
                                fontSize: 12.5,
                                height: 1.5,
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
              FilledButton(
                onPressed: (_picked == null || _busy) ? null : _submit,
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: LabSparkTokens.teal600,
                  disabledBackgroundColor:
                      scheme.onSurface.withValues(alpha: 0.12),
                ),
                child: _busy
                    ? const SizedBox(
                        width: 20, height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white,
                        ))
                    : Text(_picked == null
                        ? 'Pick a class to continue'
                        : 'Continue as Class $_picked student'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ClassCard extends StatelessWidget {
  const _ClassCard({
    required this.grade,
    required this.selected,
    required this.onTap,
  });
  final int grade;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: selected
          ? LabSparkTokens.teal600.withValues(alpha: 0.10)
          : scheme.surface,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: () {
          HapticFeedback.selectionClick();
          onTap();
        },
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: selected ? LabSparkTokens.teal600 : scheme.outlineVariant,
              width: selected ? 2 : 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 52, height: 52,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: selected
                      ? LabSparkTokens.teal600
                      : scheme.surfaceContainerHigh,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Text(
                  '$grade',
                  style: TextStyle(
                    color: selected ? Colors.white : scheme.onSurface,
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Class $grade',
                        style: const TextStyle(
                          fontSize: 15.5,
                          fontWeight: FontWeight.w800,
                        )),
                    const SizedBox(height: 3),
                    Text(_bookFor(grade),
                        style: TextStyle(
                          fontSize: 12.5,
                          color: scheme.onSurfaceVariant,
                          fontWeight: FontWeight.w600,
                        )),
                  ],
                ),
              ),
              Icon(
                selected
                    ? Icons.check_circle_rounded
                    : Icons.radio_button_unchecked,
                color: selected
                    ? LabSparkTokens.teal600
                    : scheme.onSurfaceVariant,
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _bookFor(int grade) {
    switch (grade) {
      case 6:
        return 'NCERT Curiosity · 10 labs';
      case 7:
        return 'NCERT Science · 6 labs';
      case 8:
        return 'NCERT Science · 8 labs';
      case 9:
        return 'NCERT Science · 8 labs';
      case 10:
        return 'NCERT Science · 8 labs';
      default:
        return 'NCERT Science';
    }
  }
}

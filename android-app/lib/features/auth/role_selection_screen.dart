import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_repository.dart';
import '../../core/theme/app_tokens.dart';

class RoleSelectionScreen extends ConsumerStatefulWidget {
  const RoleSelectionScreen({super.key});

  @override
  ConsumerState<RoleSelectionScreen> createState() =>
      _RoleSelectionScreenState();
}

class _RoleSelectionScreenState extends ConsumerState<RoleSelectionScreen> {
  String? _selected;
  bool _busy = false;

  static const _roles = <_RoleOption>[
    _RoleOption(
      id: 'student',
      icon: Icons.school_rounded,
      title: 'I am a Student',
      body: 'Run virtual experiments, earn XP, and compile your practical file.',
      accent: LabSparkTokens.teal600,
    ),
    _RoleOption(
      id: 'teacher',
      icon: Icons.badge_rounded,
      title: 'I am a Teacher',
      body: 'Create a class, assign labs, and review student submissions.',
      accent: LabSparkTokens.indigo600,
    ),
    _RoleOption(
      id: 'parent',
      icon: Icons.family_restroom_rounded,
      title: 'I am a Parent',
      body: 'Track your child\'s progress and completed labs at a glance.',
      accent: LabSparkTokens.amber500,
    ),
  ];

  Future<void> _confirm() async {
    if (_selected == null) return;
    setState(() => _busy = true);
    try {
      await ref.read(authRepositoryProvider).setRole(_selected!);
      if (!mounted) return;
      // Students need to pick a class next; teachers/parents skip that.
      context.go(_selected == 'student' ? '/class' : '/home');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Who are you?',
                  style:
                      text.headlineLarge?.copyWith(fontSize: 30, height: 1.1)),
              const SizedBox(height: 8),
              Text(
                'We\'ll tailor LabSpark to what you need.',
                style: text.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 32),
              ..._roles.map((r) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _RoleCard(
                      option: r,
                      selected: _selected == r.id,
                      onTap: () => setState(() => _selected = r.id),
                    ),
                  )),
              const Spacer(),
              FilledButton(
                onPressed: _selected == null || _busy ? null : _confirm,
                child: _busy
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2.5, color: Colors.white),
                      )
                    : const Text('Continue'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoleOption {
  const _RoleOption({
    required this.id,
    required this.icon,
    required this.title,
    required this.body,
    required this.accent,
  });
  final String id;
  final IconData icon;
  final String title;
  final String body;
  final Color accent;
}

class _RoleCard extends StatelessWidget {
  const _RoleCard({
    required this.option,
    required this.selected,
    required this.onTap,
  });
  final _RoleOption option;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: selected
          ? option.accent.withValues(alpha: 0.08)
          : scheme.surface,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: selected ? option.accent : scheme.outlineVariant,
              width: selected ? 2 : 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: option.accent.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(option.icon, color: option.accent, size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(option.title,
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                )),
                    const SizedBox(height: 2),
                    Text(option.body,
                        style: Theme.of(context)
                            .textTheme
                            .bodySmall
                            ?.copyWith(color: scheme.onSurfaceVariant)),
                  ],
                ),
              ),
              AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: selected ? option.accent : Colors.transparent,
                  border: Border.all(
                    color: selected ? option.accent : scheme.outline,
                    width: 2,
                  ),
                ),
                child: selected
                    ? const Icon(Icons.check, color: Colors.white, size: 14)
                    : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

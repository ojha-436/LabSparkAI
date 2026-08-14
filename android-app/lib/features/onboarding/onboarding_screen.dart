import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/theme/app_tokens.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _controller = PageController();
  int _index = 0;

  static const _pages = <_OnboardingPage>[
    _OnboardingPage(
      icon: Icons.science_rounded,
      title: 'Real experiments,\ninside your phone',
      body:
          '42 NCERT-aligned labs across Physics & Chemistry for Class 6 to 10. '
          'Mix, dip, measure — safe, unlimited, and always ready.',
      accent: LabSparkTokens.teal600,
    ),
    _OnboardingPage(
      icon: Icons.auto_awesome_rounded,
      title: 'Meet Spark,\nyour AI lab partner',
      body:
          'A live voice tutor that reacts to what you do, asks Socratic '
          'questions, and grades your practical instantly.',
      accent: LabSparkTokens.indigo600,
    ),
    _OnboardingPage(
      icon: Icons.picture_as_pdf_rounded,
      title: 'CBSE practical file,\nauto-generated',
      body:
          'Every completed lab compiles into a CBSE-format practical file '
          'you can share with your teacher in one tap.',
      accent: LabSparkTokens.amber500,
    ),
  ];

  Future<void> _finish() async {
    await ref.read(onboardingSeenProvider.notifier).markSeen();
    if (mounted) context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: _finish,
                child: const Text('Skip'),
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _controller,
                itemCount: _pages.length,
                onPageChanged: (i) => setState(() => _index = i),
                itemBuilder: (_, i) => _pages[i].build(context),
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(_pages.length, (i) {
                final active = i == _index;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: active ? 22 : 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: active ? scheme.primary : scheme.outline,
                    borderRadius: BorderRadius.circular(4),
                  ),
                );
              }),
            ),
            const SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () {
                    if (_index < _pages.length - 1) {
                      _controller.nextPage(
                        duration: const Duration(milliseconds: 260),
                        curve: Curves.easeOutCubic,
                      );
                    } else {
                      _finish();
                    }
                  },
                  child: Text(
                    _index < _pages.length - 1 ? 'Next' : 'Get started',
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _OnboardingPage {
  const _OnboardingPage({
    required this.icon,
    required this.title,
    required this.body,
    required this.accent,
  });

  final IconData icon;
  final String title;
  final String body;
  final Color accent;

  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Spacer(),
          Container(
            width: 96,
            height: 96,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(24),
            ),
            child: Icon(icon, size: 48, color: accent),
          ),
          const SizedBox(height: 32),
          Text(title,
              style: text.headlineLarge?.copyWith(height: 1.1, fontSize: 32)),
          const SizedBox(height: 16),
          Text(
            body,
            style: text.bodyLarge
                ?.copyWith(color: LabSparkTokens.slate600, height: 1.5),
          ),
          const Spacer(flex: 2),
        ],
      ),
    );
  }
}

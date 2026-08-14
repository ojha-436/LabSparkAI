import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/user_profile.dart';
import '../../core/theme/app_tokens.dart';
import '../../data/labs_repository.dart';

class AchievementsScreen extends ConsumerWidget {
  const AchievementsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(userProfileProvider).value;
    final completions = ref.watch(completionsProvider).valueOrNull ?? const <String>{};
    final xp = profile?.xp ?? 0;
    final total = ref.watch(labsRepositoryProvider).allLabs().length;
    final labs = ref.watch(labsRepositoryProvider).allLabs();

    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Achievements')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
        children: [
          // Hero stats
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [LabSparkTokens.teal600, LabSparkTokens.indigo600],
              ),
              borderRadius: BorderRadius.circular(22),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('LEVEL', style: TextStyle(
                        color: Colors.white70, letterSpacing: 1.4,
                        fontWeight: FontWeight.w700, fontSize: 10,
                      )),
                      const SizedBox(height: 4),
                      Text('${(xp ~/ 200) + 1}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                            fontSize: 42,
                          )),
                      Text('$xp XP',
                          style: const TextStyle(
                            color: Colors.white70,
                            fontWeight: FontWeight.w600,
                          )),
                    ],
                  ),
                ),
                Container(
                  width: 92, height: 92,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.18),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('${completions.length}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 28,
                              fontWeight: FontWeight.w800,
                            )),
                        Text('of $total labs',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 9,
                              fontWeight: FontWeight.w600,
                            )),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Text('COMPLETED LABS',
              style: TextStyle(
                color: scheme.onSurfaceVariant,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.4,
                fontSize: 11,
              )),
          const SizedBox(height: 8),
          if (completions.isEmpty)
            Container(
              padding: const EdgeInsets.all(20),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: scheme.surfaceContainerHigh,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                children: [
                  Icon(Icons.emoji_events_outlined,
                      size: 40, color: scheme.onSurfaceVariant),
                  const SizedBox(height: 8),
                  const Text('No labs completed yet.',
                      style: TextStyle(fontWeight: FontWeight.w700)),
                  Text('Finish your first experiment to earn XP!',
                      style: TextStyle(color: scheme.onSurfaceVariant)),
                ],
              ),
            )
          else
            for (final lab in labs.where((l) => completions.contains(l.id)))
              Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: scheme.surface,
                  border: Border.all(color: scheme.outlineVariant),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 44, height: 44,
                      decoration: BoxDecoration(
                        color: lab.accent.withValues(alpha: 0.14),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(lab.icon, color: lab.accent),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(lab.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 14,
                              )),
                          Text('Class ${lab.grade} · ${lab.subject.label}',
                              style: TextStyle(
                                color: scheme.onSurfaceVariant,
                                fontSize: 12,
                              )),
                        ],
                      ),
                    ),
                    const Icon(Icons.check_circle_rounded,
                        color: LabSparkTokens.teal600, size: 22),
                  ],
                ),
              ),
        ],
      ),
    );
  }
}

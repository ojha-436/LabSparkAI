import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/user_profile.dart';
import '../../core/theme/app_tokens.dart';
import '../../data/labs_repository.dart';
import '../../data/models/lab.dart';
import '../labs/lab_detail_sheet.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(userProfileProvider).value;
    final displayName =
        (profile?.displayName.isNotEmpty ?? false) ? profile!.displayName : 'Scientist';
    final firstName = displayName.split(' ').first;
    final xp = profile?.xp ?? 0;
    final streak = profile?.streak ?? 0;
    final level = (xp ~/ 200) + 1;
    final progress = (xp % 200) / 200;

    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 20,
        // Cap text scaling in the AppBar so a Class-6 student with
        // system font size at 130% doesn't overflow the greeting row.
        title: MediaQuery.withClampedTextScaling(
          maxScaleFactor: 1.2,
          child: Row(
            children: [
              _AvatarChip(name: firstName, photoURL: profile?.photoURL),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Hi, $firstName 👋',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: text.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                        )),
                    Text('Ready for today\'s experiment?',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: text.bodySmall
                            ?.copyWith(color: scheme.onSurfaceVariant)),
                  ],
                ),
              ),
            ],
          ),
        ),
        actions: [
          IconButton(
            onPressed: () {},
            tooltip: 'Notifications',
            icon: const Icon(Icons.notifications_none_rounded),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {},
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          children: [
            _LevelCard(
              level: level,
              xp: xp,
              progress: progress,
              streak: streak,
            ),
            const SizedBox(height: 20),
            Text('Continue where you left off',
                style: text.titleMedium?.copyWith(fontSize: 15)),
            const SizedBox(height: 12),
            Builder(builder: (ctx) {
              final continueLab = ref.watch(continueLabProvider);
              return _ContinueLabCard(
                lab: continueLab,
                onTap: () => showLabDetailSheet(ctx, continueLab),
              );
            }),
            const SizedBox(height: 24),
            Text('Quick actions', style: text.titleMedium?.copyWith(fontSize: 15)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _QuickAction(
                    icon: Icons.science_rounded,
                    label: 'Browse labs',
                    color: LabSparkTokens.teal600,
                    onTap: () => context.go('/labs'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _QuickAction(
                    icon: Icons.auto_awesome_rounded,
                    label: 'Ask Spark',
                    color: LabSparkTokens.indigo600,
                    onTap: () => context.go('/spark'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _QuickAction(
                    icon: Icons.menu_book_rounded,
                    label: 'Practical file',
                    color: LabSparkTokens.amber500,
                    onTap: () => context.go('/practical'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _QuickAction(
                    icon: Icons.groups_rounded,
                    label: 'Join a class',
                    color: LabSparkTokens.rose600,
                    onTap: () {},
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _AvatarChip extends StatelessWidget {
  const _AvatarChip({required this.name, this.photoURL});
  final String name;
  final String? photoURL;
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return CircleAvatar(
      radius: 20,
      backgroundColor: scheme.primary.withValues(alpha: 0.15),
      foregroundImage: photoURL != null ? NetworkImage(photoURL!) : null,
      child: Text(
        name.isNotEmpty ? name[0].toUpperCase() : '?',
        style: TextStyle(
          fontWeight: FontWeight.w800,
          color: scheme.primary,
        ),
      ),
    );
  }
}

class _LevelCard extends StatelessWidget {
  const _LevelCard({
    required this.level,
    required this.xp,
    required this.progress,
    required this.streak,
  });
  final int level;
  final int xp;
  final double progress;
  final int streak;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [LabSparkTokens.teal600, Color(0xFF06B6D4)],
        ),
        boxShadow: [
          BoxShadow(
            color: LabSparkTokens.teal600.withValues(alpha: 0.24),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.workspace_premium_rounded,
                  color: Colors.white, size: 18),
              const SizedBox(width: 8),
              Text('Level $level',
                  style: text.titleSmall?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  )),
              const Spacer(),
              _StreakPill(days: streak),
            ],
          ),
          const SizedBox(height: 16),
          Text('$xp XP',
              style: text.headlineMedium?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w800,
                fontSize: 32,
              )),
          Text('${200 - xp % 200} XP to next level',
              style: text.bodySmall?.copyWith(color: Colors.white70)),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: progress,
              backgroundColor: Colors.white.withValues(alpha: 0.24),
              valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
              minHeight: 8,
            ),
          ),
        ],
      ),
    );
  }
}

class _StreakPill extends StatelessWidget {
  const _StreakPill({required this.days});
  final int days;
  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '$days day streak',
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.18),
          borderRadius: BorderRadius.circular(100),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.local_fire_department_rounded,
              size: 14,
              color: Colors.white,
            ),
            const SizedBox(width: 4),
            Text('$days day${days == 1 ? '' : 's'}',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                )),
          ],
        ),
      ),
    );
  }
}

class _ContinueLabCard extends StatelessWidget {
  const _ContinueLabCard({required this.lab, required this.onTap});
  final Lab lab;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: scheme.surface,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: scheme.outlineVariant),
          ),
          child: Row(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      lab.accent.withValues(alpha: 0.20),
                      lab.accent.withValues(alpha: 0.08),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(lab.icon, color: lab.accent, size: 28),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(lab.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: text.titleMedium?.copyWith(fontSize: 15)),
                    const SizedBox(height: 2),
                    Text(
                      'Class ${lab.grade} · ${lab.subject.label} · ${lab.estimatedMinutes} min',
                      style: text.bodySmall
                          ?.copyWith(color: scheme.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: scheme.surface,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: scheme.outlineVariant),
          ),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(label,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 13.5,
                    )),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

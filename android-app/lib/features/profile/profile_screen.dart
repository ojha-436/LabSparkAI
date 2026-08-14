import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_repository.dart';
import '../../core/auth/user_profile.dart';
import 'invite_parent_sheet.dart';
import 'join_class_sheet.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(userProfileProvider).value;
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('You')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: scheme.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: scheme.outlineVariant),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 32,
                  backgroundColor: scheme.primary.withValues(alpha: 0.15),
                  foregroundImage: profile?.photoURL != null
                      ? NetworkImage(profile!.photoURL!)
                      : null,
                  child: Text(
                    (profile?.displayName.isNotEmpty ?? false)
                        ? profile!.displayName[0].toUpperCase()
                        : '?',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 22,
                      color: scheme.primary,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        profile?.displayName.isNotEmpty == true
                            ? profile!.displayName
                            : 'Anonymous scientist',
                        style: text.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 2),
                      if (profile?.email != null)
                        Text(profile!.email!,
                            style: text.bodySmall
                                ?.copyWith(color: scheme.onSurfaceVariant)),
                      if (profile?.role != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: scheme.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(100),
                            ),
                            child: Text(
                              profile!.role!.toUpperCase(),
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w800,
                                color: scheme.primary,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          _MenuTile(
            icon: Icons.groups_rounded,
            label: 'Join a class',
            onTap: () => showJoinClassSheet(context),
          ),
          _MenuTile(
            icon: Icons.family_restroom_rounded,
            label: 'Invite a parent',
            onTap: () => showInviteParentSheet(context),
          ),
          _MenuTile(
            icon: Icons.emoji_events_rounded,
            label: 'Achievements',
            onTap: () => context.push('/profile/achievements'),
          ),
          _MenuTile(
            icon: Icons.settings_rounded,
            label: 'Settings',
            onTap: () => context.push('/profile/settings'),
          ),
          _MenuTile(
            icon: Icons.privacy_tip_outlined,
            label: 'Privacy policy',
            onTap: () => context.push('/profile/privacy'),
          ),
          _MenuTile(
            icon: Icons.info_outline_rounded,
            label: 'About LabSpark AI',
            onTap: () => _showAbout(context),
          ),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: () async {
              await ref.read(authRepositoryProvider).signOut();
              if (context.mounted) context.go('/login');
            },
            icon: const Icon(Icons.logout_rounded),
            label: const Text('Sign out'),
            style: OutlinedButton.styleFrom(
              foregroundColor: scheme.error,
              side: BorderSide(color: scheme.error.withValues(alpha: 0.3)),
            ),
          ),
        ],
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({
    required this.icon,
    required this.label,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 14),
          child: Row(
            children: [
              Icon(icon, size: 22, color: scheme.onSurfaceVariant),
              const SizedBox(width: 14),
              Expanded(
                child: Text(label,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14.5,
                    )),
              ),
              Icon(Icons.chevron_right_rounded,
                  color: scheme.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }
}

void _showAbout(BuildContext context) {
  showAboutDialog(
    context: context,
    applicationName: 'LabSpark AI',
    applicationVersion: '0.1.0',
    applicationLegalese: '© 2026 LabSpark AI',
    children: const [
      SizedBox(height: 12),
      Text(
        'An AI-first virtual science laboratory for CBSE / NCERT Class 6–10.\n'
        'Powered by Gemini for the Spark tutor and grader.',
      ),
    ],
  );
}

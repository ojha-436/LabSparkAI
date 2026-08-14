import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/user_profile.dart';
import '../../core/theme/app_tokens.dart';
import '../../data/labs_repository.dart';
import '../../data/models/lab.dart';
import 'lab_detail_sheet.dart';

class LabsScreen extends ConsumerStatefulWidget {
  const LabsScreen({super.key});

  @override
  ConsumerState<LabsScreen> createState() => _LabsScreenState();
}

class _LabsScreenState extends ConsumerState<LabsScreen> {
  bool _searchOpen = false;
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final labs = ref.watch(filteredLabsProvider);
    final completions = ref.watch(completionsProvider).valueOrNull ?? const <String>{};
    final filter = ref.watch(labFilterProvider);
    final profile = ref.watch(userProfileProvider).valueOrNull;
    final locked =
        profile?.role == 'student' && profile?.grade != null;
    final lockedGrade = profile?.grade;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 20,
        title: _searchOpen
            ? _SearchField(
                controller: _searchCtrl,
                onChanged: (v) => ref.read(labFilterProvider.notifier).setQuery(v),
                onClose: () {
                  _searchCtrl.clear();
                  ref.read(labFilterProvider.notifier).setQuery('');
                  setState(() => _searchOpen = false);
                },
              )
            : Row(
                children: [
                  Text('${labs.length} labs',
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 20,
                      )),
                  const SizedBox(width: 8),
                  Text(
                    locked ? 'Class $lockedGrade' : '/ 40 total',
                    style: TextStyle(
                      color: locked
                          ? LabSparkTokens.teal600
                          : scheme.onSurfaceVariant,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
        actions: _searchOpen
            ? null
            : [
                IconButton(
                  onPressed: () => setState(() => _searchOpen = true),
                  icon: const Icon(Icons.search_rounded),
                ),
                const SizedBox(width: 4),
              ],
      ),
      body: Column(
        children: [
          _FilterRow(filter: filter, showClassChips: !locked),
          const Divider(height: 1),
          Expanded(
            child: labs.isEmpty
                ? const _EmptyState()
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                    itemCount: labs.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, i) => _LabCard(
                      lab: labs[i],
                      completed: completions.contains(labs[i].id),
                      onOpen: () {
                        HapticFeedback.selectionClick();
                        _openLab(context, labs[i]);
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  void _openLab(BuildContext context, Lab lab) {
    showLabDetailSheet(context, lab);
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField({
    required this.controller,
    required this.onChanged,
    required this.onClose,
  });
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: controller,
            autofocus: true,
            onChanged: onChanged,
            decoration: const InputDecoration(
              hintText: 'Search labs…',
              border: InputBorder.none,
            ),
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
        ),
        IconButton(onPressed: onClose, icon: const Icon(Icons.close_rounded)),
      ],
    );
  }
}

class _FilterRow extends ConsumerWidget {
  const _FilterRow({required this.filter, required this.showClassChips});
  final LabFilter filter;
  final bool showClassChips;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          if (showClassChips) ...[
            _Chip(
              label: 'All classes',
              selected: filter.grade == null,
              onTap: () => ref.read(labFilterProvider.notifier).setGrade(null),
            ),
            for (final g in const [6, 7, 8, 9, 10])
              _Chip(
                label: 'Class $g',
                selected: filter.grade == g,
                onTap: () => ref
                    .read(labFilterProvider.notifier)
                    .setGrade(filter.grade == g ? null : g),
              ),
            Container(
              width: 1,
              height: 24,
              margin: const EdgeInsets.symmetric(horizontal: 8),
              color: Theme.of(context).colorScheme.outlineVariant,
            ),
          ],
          _Chip(
            label: 'Physics',
            leading: Icons.calculate_rounded,
            selected: filter.subject == LabSubject.physics,
            onTap: () => ref
                .read(labFilterProvider.notifier)
                .setSubject(filter.subject == LabSubject.physics
                    ? null
                    : LabSubject.physics),
          ),
          _Chip(
            label: 'Chemistry',
            leading: Icons.biotech_rounded,
            selected: filter.subject == LabSubject.chemistry,
            onTap: () => ref
                .read(labFilterProvider.notifier)
                .setSubject(filter.subject == LabSubject.chemistry
                    ? null
                    : LabSubject.chemistry),
          ),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({
    required this.label,
    required this.selected,
    required this.onTap,
    this.leading,
  });
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final IconData? leading;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Material(
        color: selected ? scheme.primary : scheme.surface,
        borderRadius: BorderRadius.circular(100),
        child: InkWell(
          onTap: () {
            HapticFeedback.selectionClick();
            onTap();
          },
          borderRadius: BorderRadius.circular(100),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(100),
              border: Border.all(
                color: selected ? scheme.primary : scheme.outlineVariant,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (leading != null) ...[
                  Icon(leading,
                      size: 14,
                      color: selected ? Colors.white : scheme.onSurfaceVariant),
                  const SizedBox(width: 6),
                ],
                Text(label,
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 12.5,
                      color: selected ? Colors.white : scheme.onSurface,
                    )),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _LabCard extends StatelessWidget {
  const _LabCard({
    required this.lab,
    required this.completed,
    required this.onOpen,
  });
  final Lab lab;
  final bool completed;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return Material(
      color: scheme.surface,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onOpen,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
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
                      lab.accent.withValues(alpha: 0.18),
                      lab.accent.withValues(alpha: 0.08),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(lab.icon, color: lab.accent, size: 28),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        _Tag(label: 'Class ${lab.grade}', color: lab.accent),
                        const SizedBox(width: 6),
                        _Tag(
                          label: lab.subject.label,
                          color: scheme.onSurfaceVariant,
                          outlined: true,
                        ),
                        if (completed) ...[
                          const SizedBox(width: 6),
                          const Icon(Icons.check_circle_rounded,
                              size: 15, color: LabSparkTokens.teal600),
                        ],
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      lab.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: text.titleMedium
                          ?.copyWith(fontSize: 15, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${lab.chapter}  ·  ${lab.estimatedMinutes} min',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: text.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: scheme.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag({
    required this.label,
    required this.color,
    this.outlined = false,
  });
  final String label;
  final Color color;
  final bool outlined;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: outlined ? Colors.transparent : color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(100),
        border:
            outlined ? Border.all(color: color.withValues(alpha: 0.28)) : null,
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 10.5,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.4,
        ),
      ),
    );
  }
}

class _EmptyState extends ConsumerWidget {
  const _EmptyState();
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.search_off_rounded,
              size: 56, color: scheme.onSurfaceVariant),
          const SizedBox(height: 12),
          const Text('No labs match those filters',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text('Try clearing the class or subject filter.',
              style: TextStyle(color: scheme.onSurfaceVariant)),
          const SizedBox(height: 16),
          FilledButton.tonalIcon(
            onPressed: () => ref.read(labFilterProvider.notifier).clear(),
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Clear filters'),
          ),
        ],
      ),
    );
  }
}

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_tokens.dart';

/// Streams the signed-in student's completions in reverse chronological
/// order. Each entry is a Firestore map with { id, title, grade, score,
/// completedAt }.
final _completionsStreamProvider =
    StreamProvider<List<Map<String, dynamic>>>((ref) {
  final uid = FirebaseAuth.instance.currentUser?.uid;
  if (uid == null) return Stream.value(const []);
  return FirebaseFirestore.instance
      .collection('users')
      .doc(uid)
      .snapshots()
      .map((doc) {
    final raw = doc.data()?['completions'] as List<dynamic>? ?? const [];
    final list = raw.whereType<Map<String, dynamic>>().toList()
      ..sort((a, b) {
        final aTs = a['completedAt'];
        final bTs = b['completedAt'];
        final aMs =
            aTs is Timestamp ? aTs.millisecondsSinceEpoch : 0;
        final bMs =
            bTs is Timestamp ? bTs.millisecondsSinceEpoch : 0;
        return bMs.compareTo(aMs);
      });
    return list;
  });
});

class PracticalScreen extends ConsumerWidget {
  const PracticalScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final completions = ref.watch(_completionsStreamProvider);
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Practical file'),
        centerTitle: false,
        actions: [
          IconButton(
            tooltip: 'How to share',
            icon: const Icon(Icons.info_outline_rounded),
            onPressed: () => _showShareInfo(context),
          ),
        ],
      ),
      body: completions.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => Center(
          child: Text('Couldn\'t load your practical file.',
              style: TextStyle(color: scheme.onSurfaceVariant)),
        ),
        data: (list) {
          if (list.isEmpty) return const _EmptyState();
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            children: [
              _HeaderSummary(count: list.length),
              const SizedBox(height: 8),
              for (final entry in list)
                _ReportCard(
                  entry: entry,
                  onOpen: () => _openReport(context, ref, entry),
                ),
            ],
          );
        },
      ),
    );
  }

  void _openReport(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> entry,
  ) {
    // Pushed as a shell sub-route (`/practical/report`) so the bottom
    // navigation bar stays visible while viewing a report.
    context.push('/practical/report', extra: entry);
  }

  void _showShareInfo(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        ),
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Sharing with your teacher',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            const Text(
              'Every lab you finish is added here as a CBSE-style report. '
              'Tap any card to view the full report, then use the copy button '
              'to paste it into WhatsApp / email.',
              style: TextStyle(height: 1.5, fontSize: 14),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(),
              style: FilledButton.styleFrom(
                minimumSize: const Size(double.infinity, 44),
              ),
              child: const Text('Got it'),
            ),
          ],
        ),
      ),
    );
  }
}

class _HeaderSummary extends StatelessWidget {
  const _HeaderSummary({required this.count});
  final int count;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [LabSparkTokens.teal500, LabSparkTokens.teal600],
        ),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          Container(
            width: 52, height: 52,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Icons.menu_book_rounded,
                color: Colors.white, size: 28),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('$count lab report${count == 1 ? '' : 's'}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                    )),
                Text('Auto-compiled in CBSE format',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.8),
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                    )),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ReportCard extends StatelessWidget {
  const _ReportCard({required this.entry, required this.onOpen});
  final Map<String, dynamic> entry;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final title = entry['title'] as String? ?? 'Lab';
    final grade =
        (entry['grade'] as num?)?.toInt() ?? 0;
    final score = entry['score'];
    final ts = entry['completedAt'];
    final date = ts is Timestamp
        ? DateFormat('d MMM y').format(ts.toDate())
        : '—';
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: onOpen,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: scheme.outlineVariant),
            ),
            child: Row(
              children: [
                Container(
                  width: 44, height: 44,
                  decoration: BoxDecoration(
                    color: LabSparkTokens.teal600.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.description_rounded,
                      color: LabSparkTokens.teal600, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 14.5,
                            fontWeight: FontWeight.w700,
                          )),
                      const SizedBox(height: 2),
                      Text(
                        [
                          if (grade > 0) 'Class $grade',
                          date,
                          if (score != null) 'Score: $score',
                        ].join(' · '),
                        style: TextStyle(
                          color: scheme.onSurfaceVariant,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
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
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 88, height: 88,
              decoration: BoxDecoration(
                color: LabSparkTokens.teal600.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(22),
              ),
              child: const Icon(Icons.menu_book_rounded,
                  color: LabSparkTokens.teal600, size: 42),
            ),
            const SizedBox(height: 20),
            const Text('Your practical file is empty',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            Text(
              'Finish a lab and the CBSE-format report gets saved here.',
              textAlign: TextAlign.center,
              style: TextStyle(color: scheme.onSurfaceVariant, height: 1.5),
            ),
          ],
        ),
      ),
    );
  }
}


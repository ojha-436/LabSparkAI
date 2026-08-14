import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import '../../core/auth/user_profile.dart';
import '../../core/theme/app_tokens.dart';
import '../../data/labs_repository.dart';
import '../../data/models/lab.dart';

/// CBSE-format lab report for a single completed lab.
///
/// Data comes from the Firestore completion entry (see
/// LabRunnerScreen._saveCompletion). Anything not stored on the entry is
/// derived from the static [Lab] catalog (aim, chapter, etc).
class LabReportScreen extends ConsumerWidget {
  const LabReportScreen({super.key, required this.entry});
  final Map<String, dynamic> entry;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    final labId = entry['id'] as String? ?? '';
    final lab = ref.read(labsRepositoryProvider).findById(labId);
    final profile = ref.watch(userProfileProvider).valueOrNull;

    final title = entry['title'] as String? ?? lab?.title ?? 'Lab';
    final grade = (entry['grade'] as num?)?.toInt() ?? lab?.grade ?? 0;
    final subject = entry['subject'] as String? ?? lab?.subject.label ?? '';
    final chapter = entry['chapter'] as String? ?? lab?.chapter ?? '';
    final score = (entry['score'] as num?)?.toInt() ?? 0;
    final total = (entry['total'] as num?)?.toInt() ?? 0;
    final feedback = entry['feedback'] as String? ?? '';
    final badge = entry['badge'] as String?;
    final observations = entry['observations'] is Map
        ? Map<String, dynamic>.from(entry['observations'] as Map)
        : const <String, dynamic>{};
    final ts = entry['completedAt'];
    final date = ts is Timestamp
        ? DateFormat('d MMMM y, h:mm a').format(ts.toDate())
        : '—';
    final percent = total > 0 ? score / total : 0.0;
    final studentName = profile?.displayName ?? 'Student';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Lab report'),
        actions: [
          IconButton(
            tooltip: 'Copy as text',
            icon: const Icon(Icons.copy_rounded),
            onPressed: () {
              Clipboard.setData(ClipboardData(
                text: _reportAsText(
                  studentName: studentName,
                  title: title,
                  grade: grade,
                  subject: subject,
                  chapter: chapter,
                  date: date,
                  score: score,
                  total: total,
                  feedback: feedback,
                  observations: observations,
                  lab: lab,
                ),
              ));
              HapticFeedback.selectionClick();
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                content: Text('Report copied — paste into WhatsApp / email.'),
                behavior: SnackBarBehavior.floating,
              ));
            },
          ),
          IconButton(
            tooltip: 'Export as PDF',
            icon: const Icon(Icons.picture_as_pdf_rounded),
            onPressed: () => _exportPdf(
              context,
              studentName: studentName,
              title: title,
              grade: grade,
              subject: subject,
              chapter: chapter,
              date: date,
              score: score,
              total: total,
              feedback: feedback,
              badge: badge,
              observations: observations,
              lab: lab,
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // ── HERO score card ──
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: percent >= 0.7
                    ? const [LabSparkTokens.teal500, LabSparkTokens.teal600]
                    : percent >= 0.4
                        ? const [LabSparkTokens.amber500, LabSparkTokens.amber600]
                        : const [LabSparkTokens.rose600, LabSparkTokens.rose600],
              ),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('SCORE',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.6,
                          )),
                      const SizedBox(height: 4),
                      Text(
                        total > 0 ? '$score / $total' : '—',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 36,
                          fontWeight: FontWeight.w800,
                          height: 1,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        total > 0
                            ? '${(percent * 100).round()}% correct'
                            : 'Marks unavailable',
                        style: const TextStyle(
                          color: Colors.white70,
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
                if (badge != null && badge.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(100),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.emoji_events_rounded,
                            color: Colors.white, size: 16),
                        const SizedBox(width: 6),
                        Text(badge,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                            )),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // ── CBSE metadata card ──
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: scheme.surface,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: scheme.outlineVariant),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Text('CBSE PRACTICAL FILE',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.6,
                          color: LabSparkTokens.teal600,
                        )),
                    const Spacer(),
                    Text(date,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: scheme.onSurfaceVariant,
                        )),
                  ],
                ),
                const SizedBox(height: 8),
                Text(title,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      height: 1.2,
                    )),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: [
                    _MetaChip(label: studentName),
                    if (grade > 0) _MetaChip(label: 'Class $grade'),
                    if (subject.isNotEmpty) _MetaChip(label: subject),
                  ],
                ),
                if (chapter.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  _label('CHAPTER'),
                  const SizedBox(height: 4),
                  Text(chapter,
                      style: const TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w600,
                      )),
                ],
                if (lab != null) ...[
                  const SizedBox(height: 16),
                  _label('AIM'),
                  const SizedBox(height: 4),
                  Text(_aimFor(lab),
                      style: const TextStyle(fontSize: 14, height: 1.5)),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),

          // ── Observations table ──
          if (observations.isNotEmpty)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: scheme.surface,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: scheme.outlineVariant),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _label('OBSERVATIONS'),
                  const SizedBox(height: 10),
                  for (final e in observations.entries)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            margin: const EdgeInsets.only(top: 7, right: 10),
                            width: 6, height: 6,
                            decoration: const BoxDecoration(
                              color: LabSparkTokens.teal600,
                              shape: BoxShape.circle,
                            ),
                          ),
                          Expanded(
                            child: RichText(
                              text: TextSpan(
                                style: TextStyle(
                                  fontSize: 13.5,
                                  height: 1.5,
                                  color: scheme.onSurface,
                                ),
                                children: [
                                  TextSpan(
                                    text: '${_prettify(e.key)}: ',
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w800),
                                  ),
                                  TextSpan(text: _prettifyValue(e.value)),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          if (observations.isNotEmpty) const SizedBox(height: 16),

          // ── Feedback card ──
          if (feedback.isNotEmpty)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: LabSparkTokens.indigo600.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: LabSparkTokens.indigo600.withValues(alpha: 0.28),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.auto_awesome_rounded,
                          size: 18, color: LabSparkTokens.indigo600),
                      const SizedBox(width: 8),
                      _label('SPARK\'S FEEDBACK',
                          color: LabSparkTokens.indigo600),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(feedback,
                      style: const TextStyle(fontSize: 14, height: 1.55)),
                ],
              ),
            ),
          if (feedback.isNotEmpty) const SizedBox(height: 16),

          // ── Conclusion ──
          if (lab != null)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: scheme.surface,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: scheme.outlineVariant),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _label('CONCLUSION'),
                  const SizedBox(height: 6),
                  Text(
                    _conclusion(lab, score, total),
                    style: const TextStyle(fontSize: 14, height: 1.5),
                  ),
                  const SizedBox(height: 14),
                  Divider(color: scheme.outlineVariant),
                  const SizedBox(height: 10),
                  Text(
                    'Verified by LabSpark AI · Graded by Gemini 2.5',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 11,
                      color: scheme.onSurfaceVariant,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
      bottomNavigationBar: null,
    );
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  Widget _label(String text, {Color? color}) {
    return Text(text,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w800,
          letterSpacing: 1.4,
          color: color ?? Colors.grey.shade600,
        ));
  }

  String _prettify(String key) => key
      .replaceAll('_', ' ')
      .replaceAll('-', ' ')
      .split(' ')
      .map((w) => w.isEmpty ? w : w[0].toUpperCase() + w.substring(1))
      .join(' ');

  String _prettifyValue(dynamic v) {
    if (v == null) return '—';
    if (v is bool) return v ? 'Yes' : 'No';
    if (v is Map) {
      return v.entries.map((e) => '${_prettify(e.key.toString())}: ${e.value}').join(', ');
    }
    if (v is List) return v.join(', ');
    return v.toString();
  }

  String _aimFor(Lab lab) {
    switch (lab.id) {
      case 'acids-bases':
        return 'To test whether everyday substances are acids, bases, or neutral by observing the colour change on blue and red litmus paper.';
      case 'solubility':
        return 'To test whether different everyday substances are soluble or insoluble in water.';
      case 'magnetism':
        return 'To find which materials are attracted by a magnet (magnetic) and which are not (non-magnetic).';
      case 'circuits':
        return 'To identify which everyday materials conduct electricity when placed in a simple electric circuit with a battery and bulb.';
      case 'friction':
        return 'To observe how friction differs between rough and smooth surfaces and compare the sliding distance of a block.';
      default:
        return 'A guided CBSE practical for the "${lab.chapter}" chapter.';
    }
  }

  String _conclusion(Lab lab, int score, int total) {
    if (total > 0) {
      return 'The student completed the "${lab.title}" experiment and '
          'correctly classified $score of $total samples in line with the '
          'NCERT syllabus. The observations were consistent with the '
          'expected outcomes discussed in the chapter.';
    }
    return 'The student completed the "${lab.title}" experiment as part of '
        'the ${lab.chapter} chapter of NCERT Class ${lab.grade} ${lab.subject.label}.';
  }

  String _reportAsText({
    required String studentName,
    required String title,
    required int grade,
    required String subject,
    required String chapter,
    required String date,
    required int score,
    required int total,
    required String feedback,
    required Map<String, dynamic> observations,
    Lab? lab,
  }) {
    final b = StringBuffer()
      ..writeln('LABSPARK AI · CBSE PRACTICAL FILE')
      ..writeln('=' * 40)
      ..writeln('Student  : $studentName')
      ..writeln('Title    : $title')
      ..writeln('Class    : $grade')
      ..writeln('Subject  : $subject')
      ..writeln('Chapter  : $chapter')
      ..writeln('Date     : $date')
      ..writeln('Score    : $score / $total')
      ..writeln();
    if (lab != null) {
      b
        ..writeln('AIM')
        ..writeln(_aimFor(lab))
        ..writeln();
    }
    if (observations.isNotEmpty) {
      b.writeln('OBSERVATIONS');
      for (final e in observations.entries) {
        b.writeln('  • ${_prettify(e.key)}: ${_prettifyValue(e.value)}');
      }
      b.writeln();
    }
    if (feedback.isNotEmpty) {
      b
        ..writeln('SPARK\'S FEEDBACK')
        ..writeln(feedback)
        ..writeln();
    }
    if (lab != null) {
      b
        ..writeln('CONCLUSION')
        ..writeln(_conclusion(lab, score, total))
        ..writeln();
    }
    b.writeln('Verified by LabSpark AI · Graded by Gemini 2.5');
    return b.toString();
  }

  Future<void> _exportPdf(
    BuildContext context, {
    required String studentName,
    required String title,
    required int grade,
    required String subject,
    required String chapter,
    required String date,
    required int score,
    required int total,
    required String feedback,
    String? badge,
    required Map<String, dynamic> observations,
    Lab? lab,
  }) async {
    final doc = pw.Document(
      title: 'LabSpark AI — $title',
      author: 'LabSpark AI',
    );
    final teal = PdfColor.fromInt(0xFF0D9488);
    final ink = PdfColor.fromInt(0xFF0F172A);
    final subtle = PdfColor.fromInt(0xFF64748B);

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(36),
        build: (ctx) => [
          // Header
          pw.Row(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Expanded(
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text('LABSPARK AI',
                        style: pw.TextStyle(
                          color: teal, fontSize: 10,
                          fontWeight: pw.FontWeight.bold,
                          letterSpacing: 2,
                        )),
                    pw.SizedBox(height: 2),
                    pw.Text('CBSE Practical File',
                        style: pw.TextStyle(
                          color: subtle, fontSize: 10,
                          fontWeight: pw.FontWeight.normal,
                        )),
                  ],
                ),
              ),
              pw.Text(date,
                  style: pw.TextStyle(color: subtle, fontSize: 10)),
            ],
          ),
          pw.SizedBox(height: 6),
          pw.Divider(color: PdfColor.fromInt(0xFFE2E8F0)),
          pw.SizedBox(height: 12),

          // Title + student
          pw.Text(title,
              style: pw.TextStyle(
                color: ink, fontSize: 22, fontWeight: pw.FontWeight.bold,
              )),
          pw.SizedBox(height: 6),
          pw.Text(
            '$studentName  ·  Class $grade  ·  $subject',
            style: pw.TextStyle(color: subtle, fontSize: 11),
          ),
          if (chapter.isNotEmpty) ...[
            pw.SizedBox(height: 4),
            pw.Text(chapter,
                style: pw.TextStyle(color: subtle, fontSize: 11)),
          ],
          pw.SizedBox(height: 18),

          // Score box
          pw.Container(
            padding: const pw.EdgeInsets.all(14),
            decoration: pw.BoxDecoration(
              color: teal,
              borderRadius: pw.BorderRadius.circular(12),
            ),
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text('SCORE',
                        style: pw.TextStyle(
                          color: PdfColor.fromInt(0xFFB2F5EA),
                          fontSize: 8,
                          letterSpacing: 1.8,
                          fontWeight: pw.FontWeight.bold,
                        )),
                    pw.SizedBox(height: 4),
                    pw.Text('$score / $total',
                        style: pw.TextStyle(
                          color: PdfColors.white,
                          fontSize: 28,
                          fontWeight: pw.FontWeight.bold,
                        )),
                  ],
                ),
                if (badge != null && badge.isNotEmpty)
                  pw.Container(
                    padding: const pw.EdgeInsets.symmetric(
                        horizontal: 10, vertical: 5),
                    decoration: pw.BoxDecoration(
                      color: PdfColor.fromInt(0x33FFFFFF),
                      borderRadius: pw.BorderRadius.circular(50),
                    ),
                    child: pw.Text(badge,
                        style: pw.TextStyle(
                          color: PdfColors.white,
                          fontSize: 10,
                          fontWeight: pw.FontWeight.bold,
                        )),
                  ),
              ],
            ),
          ),

          if (lab != null) ...[
            pw.SizedBox(height: 20),
            _pdfSection('AIM', _aimFor(lab), teal, ink),
          ],

          if (observations.isNotEmpty) ...[
            pw.SizedBox(height: 16),
            _pdfHeading('OBSERVATIONS', teal),
            pw.SizedBox(height: 6),
            pw.Table(
              border: pw.TableBorder.all(
                color: PdfColor.fromInt(0xFFE2E8F0),
                width: 0.5,
              ),
              columnWidths: const {
                0: pw.FlexColumnWidth(1),
                1: pw.FlexColumnWidth(1.8),
              },
              children: [
                pw.TableRow(
                  decoration: pw.BoxDecoration(
                    color: PdfColor.fromInt(0xFFF1F5F9),
                  ),
                  children: [
                    _pdfCell('Sample', bold: true, subtle: subtle),
                    _pdfCell('Result', bold: true, subtle: subtle),
                  ],
                ),
                for (final e in observations.entries)
                  pw.TableRow(children: [
                    _pdfCell(_prettify(e.key), ink: ink),
                    _pdfCell(_prettifyValue(e.value), ink: ink),
                  ]),
              ],
            ),
          ],

          if (feedback.isNotEmpty) ...[
            pw.SizedBox(height: 16),
            _pdfSection('SPARK\'S FEEDBACK', feedback, teal, ink),
          ],

          if (lab != null) ...[
            pw.SizedBox(height: 16),
            _pdfSection('CONCLUSION', _conclusion(lab, score, total), teal, ink),
          ],

          pw.SizedBox(height: 24),
          pw.Divider(color: PdfColor.fromInt(0xFFE2E8F0)),
          pw.SizedBox(height: 6),
          pw.Center(
            child: pw.Text(
              'Verified by LabSpark AI · Graded by Gemini 2.5',
              style: pw.TextStyle(color: subtle, fontSize: 9),
            ),
          ),
        ],
      ),
    );

    await Printing.layoutPdf(
      onLayout: (fmt) async => doc.save(),
      name: 'LabSpark_${title.replaceAll(' ', '_')}.pdf',
    );
  }

  pw.Widget _pdfSection(
      String heading, String body, PdfColor teal, PdfColor ink) {
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        _pdfHeading(heading, teal),
        pw.SizedBox(height: 4),
        pw.Text(body,
            style: pw.TextStyle(color: ink, fontSize: 11, lineSpacing: 3)),
      ],
    );
  }

  pw.Widget _pdfHeading(String text, PdfColor teal) {
    return pw.Text(text,
        style: pw.TextStyle(
          color: teal, fontSize: 9,
          letterSpacing: 1.4, fontWeight: pw.FontWeight.bold,
        ));
  }

  pw.Widget _pdfCell(String text,
      {bool bold = false, PdfColor? ink, PdfColor? subtle}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      child: pw.Text(text,
          style: pw.TextStyle(
            color: bold ? subtle : (ink ?? PdfColors.black),
            fontSize: 10,
            fontWeight: bold ? pw.FontWeight.bold : pw.FontWeight.normal,
            letterSpacing: bold ? 1.2 : 0,
          )),
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.label});
  final String label;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: LabSparkTokens.teal600.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(100),
        border: Border.all(
          color: LabSparkTokens.teal600.withValues(alpha: 0.28),
        ),
      ),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          color: LabSparkTokens.teal600,
          letterSpacing: 0.4,
        ),
      ),
    );
  }
}

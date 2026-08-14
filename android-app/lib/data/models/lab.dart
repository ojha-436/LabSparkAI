import 'package:flutter/material.dart';

/// A CBSE Physics / Chemistry lab in the LabSpark catalog.
///
/// Kept small on purpose — the full lab payload (materials, Socratic Q&A,
/// 3D scene id, grading rubric) lives on Firestore and in the R3F WebView
/// bundle, keyed by [id]. This model is what the catalog and dashboard need.
class Lab {
  const Lab({
    required this.id,
    required this.title,
    required this.chapter,
    required this.grade,
    required this.subject,
    required this.accentHex,
    required this.icon,
    required this.estimatedMinutes,
  });

  /// URL-safe id matching the R3F route (`/lab/:id?embed=1`).
  final String id;
  final String title;
  final String chapter;

  /// 6..10 for CBSE Classes 6–10.
  final int grade;
  final LabSubject subject;

  /// Accent hex string (`#0D9488`). Used to tint the lab card.
  final String accentHex;

  /// Material icon codepoint used in the card.
  final IconData icon;

  /// Best-guess average completion time.
  final int estimatedMinutes;

  Color get accent {
    final v = accentHex.replaceFirst('#', '');
    return Color(int.parse('FF$v', radix: 16));
  }
}

enum LabSubject {
  physics('Physics'),
  chemistry('Chemistry');

  const LabSubject(this.label);
  final String label;
}

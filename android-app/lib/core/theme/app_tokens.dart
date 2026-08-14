// LabSpark AI — design tokens ported from `src/tokens.js` + `src/index.css`.
//
// Colors are the same brand palette used on web (teal-600 for CTAs,
// indigo-600 for AI accents, amber-500 for reactions/warnings). Typography
// keeps Plus Jakarta Sans (display) + Inter (body) so the mobile app reads
// as the same product.
import 'package:flutter/material.dart';

class LabSparkTokens {
  // Grayscale
  static const slate50 = Color(0xFFF8FAFC);
  static const slate100 = Color(0xFFF1F5F9);
  static const slate200 = Color(0xFFE2E8F0);
  static const slate300 = Color(0xFFCBD5E1);
  static const slate400 = Color(0xFF94A3B8);
  static const slate500 = Color(0xFF64748B);
  static const slate600 = Color(0xFF475569);
  static const slate700 = Color(0xFF334155);
  static const slate800 = Color(0xFF1E293B);
  static const slate900 = Color(0xFF0F172A);
  static const slate950 = Color(0xFF020617);

  // Scientific authority teal (brand primary)
  static const teal500 = Color(0xFF14B8A6);
  static const teal600 = Color(0xFF0D9488);
  static const teal700 = Color(0xFF0F766E);
  static const tealPale = Color(0xFFF0FDFA);

  // AI accent indigo
  static const indigo600 = Color(0xFF4F46E5);
  static const indigo700 = Color(0xFF4338CA);
  static const indigoPale = Color(0xFFE0E7FF);

  // State alerts
  static const rose600 = Color(0xFFE11D48);
  static const orange500 = Color(0xFFF97316);
  static const amber500 = Color(0xFFF59E0B);
  static const amber600 = Color(0xFFD97706);
  static const green600 = Color(0xFF16A34A);

  // Semantic tokens
  static const paper = slate50;
  static const paperWarm = Color(0xFFFDFAF5);
  static const line = slate200;
}

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_tokens.dart';

class AppTheme {
  const AppTheme._();

  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(
      seedColor: LabSparkTokens.teal600,
      brightness: Brightness.light,
    ).copyWith(
      primary: LabSparkTokens.teal600,
      onPrimary: Colors.white,
      secondary: LabSparkTokens.indigo600,
      onSecondary: Colors.white,
      tertiary: LabSparkTokens.amber500,
      surface: Colors.white,
      surfaceContainer: LabSparkTokens.slate50,
      surfaceContainerHigh: LabSparkTokens.slate100,
      outline: LabSparkTokens.slate200,
      outlineVariant: LabSparkTokens.slate100,
      error: LabSparkTokens.rose600,
    );

    return _buildTheme(scheme, Brightness.light);
  }

  static ThemeData dark() {
    final scheme = ColorScheme.fromSeed(
      seedColor: LabSparkTokens.teal600,
      brightness: Brightness.dark,
    ).copyWith(
      primary: LabSparkTokens.teal500,
      secondary: LabSparkTokens.indigo600,
      tertiary: LabSparkTokens.amber500,
      surface: LabSparkTokens.slate900,
      surfaceContainer: LabSparkTokens.slate800,
      surfaceContainerHigh: LabSparkTokens.slate700,
      outline: LabSparkTokens.slate700,
      outlineVariant: LabSparkTokens.slate800,
    );
    return _buildTheme(scheme, Brightness.dark);
  }

  static ThemeData _buildTheme(ColorScheme scheme, Brightness brightness) {
    final base =
        brightness == Brightness.light ? ThemeData.light() : ThemeData.dark();

    // Plus Jakarta Sans for display, Inter for body — matches the web build.
    final displayFamily = GoogleFonts.plusJakartaSans().fontFamily;
    final bodyText = GoogleFonts.interTextTheme(base.textTheme);

    return base.copyWith(
      colorScheme: scheme,
      scaffoldBackgroundColor: scheme.surfaceContainer,
      useMaterial3: true,
      splashFactory: InkSparkle.splashFactory,
      textTheme: bodyText.copyWith(
        displayLarge: bodyText.displayLarge?.copyWith(
          fontFamily: displayFamily,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.6,
        ),
        headlineLarge: bodyText.headlineLarge?.copyWith(
          fontFamily: displayFamily,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.4,
        ),
        headlineMedium: bodyText.headlineMedium?.copyWith(
          fontFamily: displayFamily,
          fontWeight: FontWeight.w700,
        ),
        titleLarge: bodyText.titleLarge?.copyWith(
          fontFamily: displayFamily,
          fontWeight: FontWeight.w700,
        ),
        titleMedium: bodyText.titleMedium?.copyWith(
          fontFamily: displayFamily,
          fontWeight: FontWeight.w600,
        ),
        labelLarge: bodyText.labelLarge?.copyWith(fontWeight: FontWeight.w600),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: scheme.surface,
        surfaceTintColor: Colors.transparent,
        centerTitle: false,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        systemOverlayStyle: brightness == Brightness.light
            ? SystemUiOverlayStyle.dark
            : SystemUiOverlayStyle.light,
        titleTextStyle: TextStyle(
          fontFamily: displayFamily,
          fontWeight: FontWeight.w700,
          fontSize: 18,
          color: scheme.onSurface,
          letterSpacing: -0.2,
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: scheme.surface,
        elevation: 0,
        height: 68,
        indicatorColor: scheme.primary.withValues(alpha: 0.12),
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => TextStyle(
            fontSize: 11.5,
            fontWeight: states.contains(WidgetState.selected)
                ? FontWeight.w700
                : FontWeight.w500,
            color: states.contains(WidgetState.selected)
                ? scheme.primary
                : scheme.onSurfaceVariant,
          ),
        ),
        iconTheme: WidgetStateProperty.resolveWith(
          (states) => IconThemeData(
            size: 24,
            color: states.contains(WidgetState.selected)
                ? scheme.primary
                : scheme.onSurfaceVariant,
          ),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(0, 48),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontSize: 14.5,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(0, 48),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          side: BorderSide(color: scheme.outline),
          textStyle: const TextStyle(
            fontSize: 14.5,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          minimumSize: const Size(0, 44),
          textStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        margin: EdgeInsets.zero,
        color: scheme.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: scheme.outlineVariant),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: scheme.surfaceContainer,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: scheme.outline),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: scheme.outline),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: scheme.primary, width: 1.5),
        ),
        labelStyle: TextStyle(color: scheme.onSurfaceVariant),
      ),
      chipTheme: ChipThemeData(
        side: BorderSide(color: scheme.outline),
        backgroundColor: scheme.surface,
        selectedColor: scheme.primary.withValues(alpha: 0.12),
        labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(100),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: scheme.inverseSurface,
        contentTextStyle: TextStyle(color: scheme.onInverseSurface),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }
}

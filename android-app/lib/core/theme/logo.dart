import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'app_tokens.dart';

/// The LabSpark AI brand tile — white flask + amber spark on a teal
/// gradient rounded square. Matches the Play Store adaptive icon 1:1.
///
/// Use for auth screens, splash, empty-state hero surfaces, avatar fallback.
class LabSparkLogoTile extends StatelessWidget {
  const LabSparkLogoTile({
    super.key,
    this.size = 64,
    this.borderRadiusRatio = 0.28,
  });

  final double size;

  /// Corner radius as a fraction of [size]. 0.28 matches Android adaptive icon.
  final double borderRadiusRatio;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [LabSparkTokens.teal500, LabSparkTokens.teal600],
        ),
        borderRadius: BorderRadius.circular(size * borderRadiusRatio),
        boxShadow: [
          BoxShadow(
            color: LabSparkTokens.teal600.withValues(alpha: 0.28),
            blurRadius: size * 0.24,
            offset: Offset(0, size * 0.08),
          ),
        ],
      ),
      alignment: Alignment.center,
      child: Padding(
        padding: EdgeInsets.all(size * 0.18),
        child: SvgPicture.asset(
          'assets/images/logo_mark_white.svg',
          width: size * 0.64,
          height: size * 0.64,
        ),
      ),
    );
  }
}

/// The mark on its own — no tile, no gradient. Use inside cards or on
/// existing surfaces where the tile would be too heavy.
class LabSparkMark extends StatelessWidget {
  const LabSparkMark({super.key, this.size = 32});
  final double size;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      'assets/images/logo_mark.svg',
      width: size,
      height: size,
    );
  }
}

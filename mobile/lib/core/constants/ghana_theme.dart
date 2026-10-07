import 'package:flutter/material.dart';

class GhanaColors {
  static const Color red = Color(0xFFCE1126);
  static const Color gold = Color(0xFFFCD116);
  static const Color green = Color(0xFF006B3F);
  static const Color blackStar = Color(0xFF111111);
  
  static const Color backgroundDark = Color(0xFF070B13);
  static const Color surfaceDark = Color(0xFF0F172A);
  static const Color cardDark = Color(0xFF1E293B);
  static const Color borderDark = Color(0xFF334155);

  static const Color amberAlert = Color(0xFFF59E0B);
  static const Color redAlert = Color(0xFFDC2626);
  static const Color policeBlue = Color(0xFF1E40AF);
}

class AppTextStyles {
  static const TextStyle header = TextStyle(
    fontSize: 22,
    fontWeight: FontWeight.w800,
    color: Colors.white,
    letterSpacing: -0.5,
  );

  static const TextStyle subheader = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    color: Color(0xFF94A3B8),
  );

  static const TextStyle watermark = TextStyle(
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    shadows: [
      Shadow(blurRadius: 4.0, color: Colors.black, offset: Offset(1, 1)),
    ],
  );
}

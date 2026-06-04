export const COLORS = {
  // Cosmic Dark Backgrounds
  bgPrimary:    '#050811',   // Deep space black-blue
  bgCard:       '#101524',   // Translucent deep blue card
  bgSurface:    '#1A2035',   // Highlighted surfaces

  // High-Tech Brand Accent Glows
  accent:       '#00E5FF',   // Neon Cyber Cyan
  accentGlow:   'rgba(0, 229, 255, 0.15)', // Neon glow
  accentSecondary: '#8A2BE2', // Electric Violet
  accentSecondaryGlow: 'rgba(138, 43, 226, 0.2)', // Violet glow
  
  // States
  success:      '#10B981',   // Emerald Green
  danger:       '#F43F5E',   // Rose Red
  warning:      '#FBBF24',   // Bright Amber

  // Text
  textPrimary:  '#FFFFFF',
  textSecondary:'#94A3B8',
  textMuted:    '#64748B',

  // Biometric Oval Ring Glows
  ovalBorder:   '#00E5FF',
  ovalSuccess:  '#10B981',
  ovalFail:     '#F43F5E',
};

export const FONTS = {
  heading:  { fontSize: 24, fontWeight: '700' as const, color: COLORS.textPrimary, letterSpacing: 0.5 },
  subhead:  { fontSize: 16, fontWeight: '600' as const, color: COLORS.textSecondary },
  body:     { fontSize: 14, fontWeight: '400' as const, color: COLORS.textSecondary, lineHeight: 20 },
  label:    { fontSize: 11, fontWeight: '700' as const, color: COLORS.textMuted, letterSpacing: 1 },
  button:   { fontSize: 16, fontWeight: '700' as const, color: '#050811' }, // Dark text on light accent
};

export const SPACING = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
};

export const RADIUS = {
  sm: 6, md: 12, lg: 20, xl: 28, full: 9999,
};

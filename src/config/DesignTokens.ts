export const COLORS = {
  // Backgrounds
  bgPrimary:    '#0A0E1A',   // Deep navy — main background
  bgCard:       '#141929',   // Slightly lighter card background
  bgSurface:    '#1C2236',   // Surface elements

  // Brand
  accent:       '#4C8EF7',   // Primary blue — buttons, highlights
  accentGlow:   '#4C8EF725', // Opacity accent — glow effects
  success:      '#22C55E',   // Green — authentication passed
  danger:       '#EF4444',   // Red — authentication failed
  warning:      '#F59E0B',   // Amber — processing / waiting

  // Text
  textPrimary:  '#FFFFFF',
  textSecondary:'#94A3B8',
  textMuted:    '#475569',

  // Oval/Frame
  ovalBorder:   '#4C8EF7',
  ovalSuccess:  '#22C55E',
  ovalFail:     '#EF4444',
};

export const FONTS = {
  heading:  { fontSize: 24, fontWeight: '700' as const, color: COLORS.textPrimary },
  subhead:  { fontSize: 16, fontWeight: '500' as const, color: COLORS.textSecondary },
  body:     { fontSize: 14, fontWeight: '400' as const, color: COLORS.textSecondary },
  label:    { fontSize: 12, fontWeight: '600' as const, color: COLORS.textMuted },
  button:   { fontSize: 16, fontWeight: '600' as const, color: COLORS.textPrimary },
};

export const SPACING = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
};

export const RADIUS = {
  sm: 8, md: 12, lg: 16, xl: 24, full: 9999,
};

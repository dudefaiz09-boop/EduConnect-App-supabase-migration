export const colors = {
  // Brand colors
  primary: '#4f46e5',
  primarySoft: '#1e1b4b',
  primaryHover: '#4338ca',

  // Interface colors
  background: '#0f172a',
  backgroundMuted: '#111827',
  card: '#1e293b',
  cardMuted: '#263449',
  cardSoft: '#334155',
  border: '#475569',
  line: '#334155',
  text: '#f8fafc',
  muted: '#94a3b8',
  whiteSoft: '#e2e8f0',

  // Status colors
  success: '#34d399',
  successStrong: '#10b981',
  successSoft: '#123b33',
  danger: '#f87171',
  dangerSoft: '#3f1d24',
  dangerHover: '#ef4444',
  warning: '#fbbf24',
  warningSoft: '#3a2f16',
  info: '#60a5fa',
  infoSoft: '#1e3a5f',

  // Feature/AI color
  ai: '#93c5fd',
  aiSoft: '#1e3a5f',

  // Link / action colors
  link: '#bfdbfe',
  linkHover: '#93c5fd',

  // White with alpha
  whiteA08: 'rgba(255,255,255,0.08)',
  whiteA14: 'rgba(255,255,255,0.14)',
  whiteA16: 'rgba(255,255,255,0.16)',

  // Unique UI surface colors
  featuredBg: '#1e293b',
  featuredBorder: '#475569',
  heroBg: '#1e293b',
  heroBorder: '#475569',
  profileCardBg: '#1e293b',
  profileCardBorder: '#475569',
  progressFill: '#4f46e5',

  // Role Specific Brand Colors
  roles: {
    admin: '#f43f5e', // Rose
    principal: '#a855f7', // Purple
    teacher: '#3b82f6', // Blue
    student: '#10b981', // Emerald
    parent: '#eab308', // Yellow
    librarian: '#14b8a6', // Teal
    accountant: '#f97316', // Orange
    staff: '#64748b', // Slate
  },
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 48,
  giant: 64,
};

export const radii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  full: 9999,
};

export const typography = {
  fontSizes: {
    xs: 12,
    sm: 13,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
    display: 28,
    giant: 36,
  },
  fontWeights: {
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    black: '900' as const,
  },
  lineHeights: {
    none: 1,
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
};

export const elevation = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  low: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  high: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const glowShadows = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  stat: {
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  floating: {
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  hero: {
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
};

export const gradients = {
  hero: ['#0f172a', '#1e293b', '#334155'],
  primary: ['#3730a3', '#4f46e5', '#2563eb'],
  ai: ['#1e3a5f', '#2563eb', '#93c5fd'],
  stat: ['#1e293b', '#334155'],
};

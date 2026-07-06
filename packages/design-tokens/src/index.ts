export const colors = {
  // Brand colors
  primary: '#2563eb',
  primarySoft: '#172554',
  primaryHover: '#1d4ed8',

  // Interface colors
  background: '#020617',
  backgroundMuted: '#090e1f',
  card: '#0f172a',
  cardMuted: '#111c33',
  cardSoft: '#15213a',
  border: '#24324a',
  line: '#1e293b',
  text: '#f8fafc',
  muted: '#94a3b8',
  whiteSoft: '#e2e8f0',

  // Status colors
  success: '#86efac',
  successStrong: '#10b981',
  successSoft: '#064e3b',
  danger: '#f87171',
  dangerSoft: '#2a1218',
  dangerHover: '#ef4444',
  warning: '#fbbf24',
  warningSoft: '#2a210f',
  info: '#3b82f6',
  infoSoft: '#1e3a8a',

  // Feature/AI color
  ai: '#67e8f9',
  aiSoft: '#083344',

  // Link / action colors
  link: '#8bb7ff',
  linkHover: '#5ea0ff',

  // White with alpha
  whiteA08: 'rgba(255,255,255,0.08)',
  whiteA14: 'rgba(255,255,255,0.14)',
  whiteA16: 'rgba(255,255,255,0.16)',

  // Unique UI surface colors
  featuredBg: '#132142',
  featuredBorder: '#2950b8',
  heroBg: '#081225',
  heroBorder: '#2a3650',
  profileCardBg: '#312e81',
  profileCardBorder: '#4f46e5',
  progressFill: '#4f8cff',

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
    shadowColor: '#7ea2ff',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  stat: {
    shadowColor: '#4f8cff',
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  floating: {
    shadowColor: '#0ea5ff',
    shadowOpacity: 0.28,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  hero: {
    shadowColor: '#2563eb',
    shadowOpacity: 0.35,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 16 },
    elevation: 14,
  },
};

export const gradients = {
  hero: ['#081225', '#0d1f4f', '#07163f'],
  primary: ['#1a3a8f', '#2563eb', '#3b82f6'],
  ai: ['#083344', '#0ea5e9', '#67e8f9'],
  stat: ['#0f172a', '#1e293b'],
};

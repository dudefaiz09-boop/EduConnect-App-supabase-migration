export const colors = {
  ai: '#67e8f9',
  aiSoft: '#083344',
  background: '#020617',
  border: '#24324a',
  card: '#0f172a',
  cardMuted: '#111c33',
  cardSoft: '#15213a',
  danger: '#f87171',
  dangerHover: '#ef4444',
  dangerSoft: '#2a1218',
  featuredBg: '#132142',
  featuredBorder: '#2950b8',
  heroBg: '#081225',
  heroBorder: '#2a3650',
  info: '#3b82f6',
  infoSoft: '#1e3a8a',
  line: '#1e293b',
  link: '#8bb7ff',
  linkHover: '#5ea0ff',
  muted: '#94a3b8',
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  primarySoft: '#172554',
  profileCardBg: '#312e81',
  profileCardBorder: '#4f46e5',
  progressFill: '#4f8cff',
  success: '#86efac',
  successStrong: '#10b981',
  successSoft: '#064e3b',
  text: '#f8fafc',
  warning: '#fbbf24',
  warningSoft: '#2a210f',
  whiteA08: 'rgba(255,255,255,0.08)',
  whiteA14: 'rgba(255,255,255,0.14)',
  whiteA16: 'rgba(255,255,255,0.16)',
  whiteSoft: '#e2e8f0',
};

export function formatDate(value?: string | number | Date | null) {
  if (!value) return 'Not synced yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not synced yet';
  return date.toLocaleString([], {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });
}

export function formatCurrency(amount: number) {
  return `INR ${Math.round(amount || 0).toLocaleString()}`;
}

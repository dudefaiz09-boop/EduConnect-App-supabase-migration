export { colors } from '@educonnect/design-tokens';

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

// Allows screens to import spacing/radii/typography/glows from a single local path.
export {
  spacing,
  radii,
  typography,
  elevation,
  glowShadows,
  gradients,
} from '@educonnect/design-tokens';

// Provides a single import point for role display names on mobile.
export { ROLE_LABELS } from '@educonnect/shared';

export function getAuthErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Please confirm your email address before signing in.';
  }

  if (normalized.includes('already registered') || normalized.includes('already exists')) {
    return 'An account with this email already exists. Try signing in or resetting your password.';
  }

  if (normalized.includes('failed to fetch') || normalized.includes('network')) {
    return 'Unable to reach the authentication server. Check your connection and try again.';
  }

  if (normalized.includes('password')) {
    return message;
  }

  return message || 'Authentication failed. Please try again.';
}

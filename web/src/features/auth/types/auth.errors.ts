// ── Auth-specific Error Codes ───────────────────────────────

/**
 * Granular error codes for authentication failures.
 * Used by the server to communicate specific failure reasons.
 */
export const AUTH_ERROR_CODES = {
  // Credential errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  EMAIL_NOT_FOUND: 'EMAIL_NOT_FOUND',

  // Token errors
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  REFRESH_TOKEN_EXPIRED: 'REFRESH_TOKEN_EXPIRED',
  REFRESH_TOKEN_INVALID: 'REFRESH_TOKEN_INVALID',

  // Verification errors
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  VERIFICATION_TOKEN_EXPIRED: 'VERIFICATION_TOKEN_EXPIRED',
  VERIFICATION_TOKEN_INVALID: 'VERIFICATION_TOKEN_INVALID',

  // Password reset errors
  RESET_TOKEN_EXPIRED: 'RESET_TOKEN_EXPIRED',
  RESET_TOKEN_INVALID: 'RESET_TOKEN_INVALID',

  // OAuth errors
  OAUTH_FAILED: 'OAUTH_FAILED',
  OAUTH_EMAIL_CONFLICT: 'OAUTH_EMAIL_CONFLICT',

  // Rate limiting
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',

  // Session errors
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_INVALID: 'SESSION_INVALID',

  // MFA (future)
  MFA_REQUIRED: 'MFA_REQUIRED',
  MFA_INVALID: 'MFA_INVALID',
} as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

/**
 * User-friendly messages for each error code.
 */
export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  [AUTH_ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid email or password.',
  [AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS]: 'An account with this email already exists.',
  [AUTH_ERROR_CODES.EMAIL_NOT_FOUND]: 'No account found with this email.',
  [AUTH_ERROR_CODES.TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
  [AUTH_ERROR_CODES.TOKEN_INVALID]: 'Invalid session. Please log in again.',
  [AUTH_ERROR_CODES.REFRESH_TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
  [AUTH_ERROR_CODES.REFRESH_TOKEN_INVALID]: 'Invalid session. Please log in again.',
  [AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED]: 'Please verify your email before continuing.',
  [AUTH_ERROR_CODES.VERIFICATION_TOKEN_EXPIRED]: 'Verification link has expired. Please request a new one.',
  [AUTH_ERROR_CODES.VERIFICATION_TOKEN_INVALID]: 'Invalid verification link.',
  [AUTH_ERROR_CODES.RESET_TOKEN_EXPIRED]: 'Password reset link has expired. Please request a new one.',
  [AUTH_ERROR_CODES.RESET_TOKEN_INVALID]: 'Invalid password reset link.',
  [AUTH_ERROR_CODES.OAUTH_FAILED]: 'OAuth authentication failed. Please try again.',
  [AUTH_ERROR_CODES.OAUTH_EMAIL_CONFLICT]: 'An account with this email already exists. Please log in with your password first.',
  [AUTH_ERROR_CODES.TOO_MANY_ATTEMPTS]: 'Too many attempts. Please try again later.',
  [AUTH_ERROR_CODES.SESSION_EXPIRED]: 'Your session has expired. Please log in again.',
  [AUTH_ERROR_CODES.SESSION_INVALID]: 'Invalid session. Please log in again.',
  [AUTH_ERROR_CODES.MFA_REQUIRED]: 'Multi-factor authentication is required.',
  [AUTH_ERROR_CODES.MFA_INVALID]: 'Invalid verification code.',
};

import crypto from 'crypto';

/**
 * Generates a secure, cryptographically random token string.
 * Used for CSRF tokens, email verification, and password reset tokens.
 * @param bytes Number of random bytes to generate (default 32 = 64 hex chars)
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

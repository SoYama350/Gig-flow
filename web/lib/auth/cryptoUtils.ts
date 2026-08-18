import crypto from "node:crypto";

/**
 * Generates a secure, cryptographically random token string.
 * Used for CSRF tokens, email verification, and password reset tokens.
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hashes a plain-text password using bcrypt.
 * Cost factor is 12 to balance security and performance.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compares a plain-text password against a hashed password.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

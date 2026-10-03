import { EMAIL_RULES, PASSWORD_RULES, NAME_RULES } from './validationRules';

// ── Result Type ─────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ── Individual Validators ───────────────────────────────────

/**
 * Validates an email address.
 * Pure function — no side effects.
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  if (!email || email.trim().length === 0) {
    return { valid: false, errors: [EMAIL_RULES.MESSAGES.REQUIRED] };
  }

  const trimmed = email.trim();

  if (trimmed.length > EMAIL_RULES.MAX_LENGTH) {
    errors.push(EMAIL_RULES.MESSAGES.TOO_LONG);
  }

  if (!EMAIL_RULES.PATTERN.test(trimmed)) {
    errors.push(EMAIL_RULES.MESSAGES.INVALID);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates a password against all strength requirements.
 * Returns all failing requirements (not just the first).
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if (!password) {
    return { valid: false, errors: [PASSWORD_RULES.MESSAGES.REQUIRED] };
  }

  if (password.length < PASSWORD_RULES.MIN_LENGTH) {
    errors.push(PASSWORD_RULES.MESSAGES.TOO_SHORT);
  }

  if (password.length > PASSWORD_RULES.MAX_LENGTH) {
    errors.push(PASSWORD_RULES.MESSAGES.TOO_LONG);
  }

  if (!PASSWORD_RULES.UPPERCASE_PATTERN.test(password)) {
    errors.push(PASSWORD_RULES.MESSAGES.NEEDS_UPPERCASE);
  }

  if (!PASSWORD_RULES.LOWERCASE_PATTERN.test(password)) {
    errors.push(PASSWORD_RULES.MESSAGES.NEEDS_LOWERCASE);
  }

  if (!PASSWORD_RULES.DIGIT_PATTERN.test(password)) {
    errors.push(PASSWORD_RULES.MESSAGES.NEEDS_DIGIT);
  }

  if (!PASSWORD_RULES.SPECIAL_PATTERN.test(password)) {
    errors.push(PASSWORD_RULES.MESSAGES.NEEDS_SPECIAL);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates a display name.
 */
export function validateName(name: string): ValidationResult {
  const errors: string[] = [];

  if (!name || name.trim().length === 0) {
    return { valid: false, errors: [NAME_RULES.MESSAGES.REQUIRED] };
  }

  const trimmed = name.trim();

  if (trimmed.length < NAME_RULES.MIN_LENGTH) {
    errors.push(NAME_RULES.MESSAGES.TOO_SHORT);
  }

  if (trimmed.length > NAME_RULES.MAX_LENGTH) {
    errors.push(NAME_RULES.MESSAGES.TOO_LONG);
  }

  if (!NAME_RULES.PATTERN.test(trimmed)) {
    errors.push(NAME_RULES.MESSAGES.INVALID);
  }

  return { valid: errors.length === 0, errors };
}

// ── Password Strength Scoring ───────────────────────────────

export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

/**
 * Scores a password for the strength meter UI.
 * Returns a 0–4 score and a human-readable label.
 */
export function scorePassword(password: string): {
  score: number;
  label: PasswordStrength;
} {
  if (!password) return { score: 0, label: 'weak' };

  let score = 0;

  if (password.length >= PASSWORD_RULES.MIN_LENGTH) score++;
  if (password.length >= 12) score++;
  if (PASSWORD_RULES.UPPERCASE_PATTERN.test(password) && PASSWORD_RULES.LOWERCASE_PATTERN.test(password)) score++;
  if (PASSWORD_RULES.DIGIT_PATTERN.test(password)) score++;
  if (PASSWORD_RULES.SPECIAL_PATTERN.test(password)) score++;

  // Normalize to 0–4 scale
  const normalizedScore = Math.min(4, score);

  const labels: PasswordStrength[] = ['weak', 'weak', 'fair', 'good', 'strong'];
  return { score: normalizedScore, label: labels[normalizedScore] };
}

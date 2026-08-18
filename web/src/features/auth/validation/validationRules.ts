// ── Validation Rules ────────────────────────────────────────
// Single source of truth — validators.ts references these.
// Never duplicate these patterns elsewhere.

export const EMAIL_RULES = {
  /**
   * RFC 5322 simplified email regex.
   * Covers 99.9% of real-world email addresses.
   */
  PATTERN: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  MAX_LENGTH: 254,
  MESSAGES: {
    REQUIRED: 'Email is required.',
    INVALID: 'Please enter a valid email address.',
    TOO_LONG: 'Email must be 254 characters or fewer.',
  },
} as const;

export const PASSWORD_RULES = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  UPPERCASE_PATTERN: /[A-Z]/,
  LOWERCASE_PATTERN: /[a-z]/,
  DIGIT_PATTERN: /[0-9]/,
  SPECIAL_PATTERN: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/,
  MESSAGES: {
    REQUIRED: 'Password is required.',
    TOO_SHORT: 'Password must be at least 8 characters.',
    TOO_LONG: 'Password must be 128 characters or fewer.',
    NEEDS_UPPERCASE: 'Password must contain at least one uppercase letter.',
    NEEDS_LOWERCASE: 'Password must contain at least one lowercase letter.',
    NEEDS_DIGIT: 'Password must contain at least one number.',
    NEEDS_SPECIAL: 'Password must contain at least one special character.',
  },
} as const;

export const NAME_RULES = {
  MIN_LENGTH: 1,
  MAX_LENGTH: 100,
  /**
   * Allows letters (Unicode), spaces, hyphens, and apostrophes.
   */
  PATTERN: /^[\p{L}\s'-]+$/u,
  MESSAGES: {
    REQUIRED: 'Name is required.',
    TOO_SHORT: 'Name must be at least 1 character.',
    TOO_LONG: 'Name must be 100 characters or fewer.',
    INVALID: 'Name can only contain letters, spaces, hyphens, and apostrophes.',
  },
} as const;

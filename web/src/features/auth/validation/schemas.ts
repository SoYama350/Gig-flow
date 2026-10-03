import { validateEmail, validatePassword, validateName, type ValidationResult } from './validators';

// ── Schema Types ────────────────────────────────────────────

export interface FormValidationResult {
  valid: boolean;
  fieldErrors: Record<string, string[]>;
}

// ── Composed Schemas ────────────────────────────────────────

/**
 * Validates the login form.
 */
export function validateLoginForm(data: {
  email: string;
  password: string;
}): FormValidationResult {
  const fieldErrors: Record<string, string[]> = {};

  const emailResult = validateEmail(data.email);
  if (!emailResult.valid) fieldErrors.email = emailResult.errors;

  // For login, we only check that password is not empty (not full strength validation)
  if (!data.password) {
    fieldErrors.password = ['Password is required.'];
  }

  return { valid: Object.keys(fieldErrors).length === 0, fieldErrors };
}

/**
 * Validates the registration form.
 */
export function validateRegisterForm(data: {
  email: string;
  password: string;
  name: string;
}): FormValidationResult {
  const fieldErrors: Record<string, string[]> = {};

  const emailResult = validateEmail(data.email);
  if (!emailResult.valid) fieldErrors.email = emailResult.errors;

  const passwordResult = validatePassword(data.password);
  if (!passwordResult.valid) fieldErrors.password = passwordResult.errors;

  const nameResult = validateName(data.name);
  if (!nameResult.valid) fieldErrors.name = nameResult.errors;

  return { valid: Object.keys(fieldErrors).length === 0, fieldErrors };
}

/**
 * Validates the forgot-password form.
 */
export function validateForgotPasswordForm(data: {
  email: string;
}): FormValidationResult {
  const fieldErrors: Record<string, string[]> = {};

  const emailResult = validateEmail(data.email);
  if (!emailResult.valid) fieldErrors.email = emailResult.errors;

  return { valid: Object.keys(fieldErrors).length === 0, fieldErrors };
}

/**
 * Validates the reset-password form.
 */
export function validateResetPasswordForm(data: {
  password: string;
  confirmPassword: string;
}): FormValidationResult {
  const fieldErrors: Record<string, string[]> = {};

  const passwordResult = validatePassword(data.password);
  if (!passwordResult.valid) fieldErrors.password = passwordResult.errors;

  if (data.password !== data.confirmPassword) {
    fieldErrors.confirmPassword = ['Passwords do not match.'];
  }

  return { valid: Object.keys(fieldErrors).length === 0, fieldErrors };
}

/**
 * Validates the update-password form.
 */
export function validateUpdatePasswordForm(data: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): FormValidationResult {
  const fieldErrors: Record<string, string[]> = {};

  if (!data.currentPassword) {
    fieldErrors.currentPassword = ['Current password is required.'];
  }

  const passwordResult = validatePassword(data.newPassword);
  if (!passwordResult.valid) fieldErrors.newPassword = passwordResult.errors;

  if (data.newPassword !== data.confirmPassword) {
    fieldErrors.confirmPassword = ['Passwords do not match.'];
  }

  if (data.currentPassword && data.currentPassword === data.newPassword) {
    fieldErrors.newPassword = ['New password must be different from current password.'];
  }

  return { valid: Object.keys(fieldErrors).length === 0, fieldErrors };
}

/**
 * Validates the update-email form.
 */
export function validateUpdateEmailForm(data: {
  currentPassword: string;
  newEmail: string;
}): FormValidationResult {
  const fieldErrors: Record<string, string[]> = {};

  if (!data.currentPassword) {
    fieldErrors.currentPassword = ['Current password is required.'];
  }

  const emailResult = validateEmail(data.newEmail);
  if (!emailResult.valid) fieldErrors.newEmail = emailResult.errors;

  return { valid: Object.keys(fieldErrors).length === 0, fieldErrors };
}

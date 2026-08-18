import { AppError } from './AppError';

/**
 * Thrown when input validation fails.
 * Carries per-field error messages for form display.
 */
export class ValidationError extends AppError {
  public readonly fieldErrors: Record<string, string[]>;

  constructor(
    message: string = 'Validation failed',
    fieldErrors: Record<string, string[]> = {}
  ) {
    super(message, 'VALIDATION_ERROR', 400, { fieldErrors });
    this.fieldErrors = fieldErrors;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      fieldErrors: this.fieldErrors,
    };
  }
}

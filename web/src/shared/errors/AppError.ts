/**
 * Base application error class.
 * All domain-specific errors extend this.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly metadata?: Record<string, unknown>;

  constructor(
    message: string,
    code: string = 'APP_ERROR',
    statusCode?: number,
    metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.metadata = metadata;

    // Maintains proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Serializes the error into a plain object for API responses.
   */
  toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      ...(this.metadata ? { metadata: this.metadata } : {}),
    };
  }
}

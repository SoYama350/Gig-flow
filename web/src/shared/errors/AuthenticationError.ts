import { AppError } from './AppError';

/**
 * Thrown when authentication fails (invalid credentials, expired token).
 * Maps to HTTP 401.
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

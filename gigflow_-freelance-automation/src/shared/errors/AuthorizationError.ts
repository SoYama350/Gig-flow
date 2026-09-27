import { AppError } from './AppError';

/**
 * Thrown when an authenticated user lacks permission for a resource.
 * Maps to HTTP 403.
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

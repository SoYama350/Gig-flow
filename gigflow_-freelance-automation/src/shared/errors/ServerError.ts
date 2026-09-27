import { AppError } from './AppError';

/**
 * Thrown when the server returns a 5xx error.
 */
export class ServerError extends AppError {
  constructor(message: string = 'An unexpected server error occurred') {
    super(message, 'SERVER_ERROR', 500);
  }
}

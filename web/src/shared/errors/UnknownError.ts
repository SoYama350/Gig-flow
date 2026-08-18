import { AppError } from './AppError';

/**
 * Fallback error for unexpected/unclassifiable failures.
 */
export class UnknownError extends AppError {
  constructor(message: string = 'An unknown error occurred') {
    super(message, 'UNKNOWN_ERROR');
  }
}

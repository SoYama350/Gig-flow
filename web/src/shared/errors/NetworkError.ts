import { AppError } from './AppError';

/**
 * Thrown when a network request fails (offline, DNS, timeout).
 * No HTTP status code — the request never reached the server.
 */
export class NetworkError extends AppError {
  constructor(message: string = 'Network error. Please check your connection.') {
    super(message, 'NETWORK_ERROR');
  }
}

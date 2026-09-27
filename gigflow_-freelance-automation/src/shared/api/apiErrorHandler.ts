import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  ServerError,
  NetworkError,
  UnknownError,
} from '../errors';

/**
 * Maps an API error response to a typed AppError subclass.
 * Used by httpClient to convert raw HTTP responses into domain errors.
 */
export async function mapApiError(response: Response): Promise<AppError> {
  try {
    const body = await response.json();
    const message = body?.message || response.statusText || 'Request failed';

    switch (response.status) {
      case 400:
        if (body?.fieldErrors) {
          return new ValidationError(message, body.fieldErrors);
        }
        return new ValidationError(message);

      case 401:
        return new AuthenticationError(message);

      case 403:
        return new AuthorizationError(message);

      case 404:
        return new AppError(message, 'NOT_FOUND', 404);

      case 429:
        return new AppError(
          body?.message || 'Too many requests. Please try again later.',
          'RATE_LIMITED',
          429
        );

      default:
        if (response.status >= 500) {
          return new ServerError(message);
        }
        return new UnknownError(message);
    }
  } catch {
    // Response body wasn't JSON — fall back to status text
    if (response.status === 401) return new AuthenticationError();
    if (response.status === 403) return new AuthorizationError();
    if (response.status >= 500) return new ServerError();
    return new UnknownError(`HTTP ${response.status}: ${response.statusText}`);
  }
}

/**
 * Wraps a raw error (from fetch rejection) into a NetworkError.
 */
export function mapNetworkError(error: unknown): NetworkError {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new NetworkError('Unable to connect to the server. Please check your connection.');
  }
  return new NetworkError(
    error instanceof Error ? error.message : 'Network error'
  );
}

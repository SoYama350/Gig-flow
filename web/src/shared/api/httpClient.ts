import { mapApiError, mapNetworkError } from './apiErrorHandler';
import type { AppError } from '../errors';

/**
 * Request configuration extending standard RequestInit.
 */
interface HttpRequestConfig extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /**
   * If true, skips the Authorization header injection.
   * Useful for public endpoints (login, register).
   */
  skipAuth?: boolean;
}

/**
 * Function signature for the token accessor.
 * Injected by the auth feature so httpClient doesn't depend on auth internals.
 */
type TokenAccessor = () => string | null;

// ── Module-level state ──────────────────────────────────────

let _getAccessToken: TokenAccessor = () => null;
let _onUnauthorized: (() => void) | null = null;

/**
 * Registers the token accessor function.
 * Called once by AuthProvider during initialization.
 */
export function setTokenAccessor(accessor: TokenAccessor): void {
  _getAccessToken = accessor;
}

/**
 * Registers a callback invoked when a 401 is received.
 * Typically triggers silent refresh or logout.
 */
export function setOnUnauthorized(handler: () => void): void {
  _onUnauthorized = handler;
}

// ── HTTP Client ─────────────────────────────────────────────

const BASE_URL = '';  // Same origin — Vite proxies to Express in dev

/**
 * Generic HTTP client that wraps fetch with:
 * - Automatic JSON serialization
 * - Authorization header injection (via DI)
 * - Centralized error mapping
 * - 401 interception for session refresh
 */
async function request<T = unknown>(
  url: string,
  config: HttpRequestConfig = {}
): Promise<T> {
  const { body, skipAuth = false, headers: extraHeaders, ...restConfig } = config;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string>),
  };

  // Inject auth token if available and not skipped
  if (!skipAuth) {
    const token = _getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(`${BASE_URL}${url}`, {
      ...restConfig,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include', // Always send cookies (refresh token)
    });

    if (!response.ok) {
      // Intercept 401 for session refresh
      if (response.status === 401 && !skipAuth && _onUnauthorized) {
        _onUnauthorized();
      }

      const error: AppError = await mapApiError(response);
      throw error;
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    // If it's already an AppError, rethrow
    if (error && typeof error === 'object' && 'code' in error) {
      throw error;
    }
    // Otherwise it's a network/fetch error
    throw mapNetworkError(error);
  }
}

/**
 * HTTP client with typed method helpers.
 */
export const httpClient = {
  get: <T = unknown>(url: string, config?: HttpRequestConfig) =>
    request<T>(url, { ...config, method: 'GET' }),

  post: <T = unknown>(url: string, body?: unknown, config?: HttpRequestConfig) =>
    request<T>(url, { ...config, method: 'POST', body }),

  patch: <T = unknown>(url: string, body?: unknown, config?: HttpRequestConfig) =>
    request<T>(url, { ...config, method: 'PATCH', body }),

  put: <T = unknown>(url: string, body?: unknown, config?: HttpRequestConfig) =>
    request<T>(url, { ...config, method: 'PUT', body }),

  delete: <T = unknown>(url: string, config?: HttpRequestConfig) =>
    request<T>(url, { ...config, method: 'DELETE' }),
};

// ── Domain Types ────────────────────────────────────────────

/**
 * Core user entity returned from the API.
 */
export interface User {
  id: string;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  bio: string | null;
  isEmailVerified: boolean;
  termsAccepted: boolean;
  marketingEmails: boolean;
  createdAt: string;
  oauthProviders: string[];
}

/**
 * Credentials for email+password login.
 */
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

/**
 * Data required for registration.
 */
export interface RegisterData {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
  termsAccepted: boolean;
  marketingEmails: boolean;
}

/**
 * Response from login/register endpoints.
 */
export interface AuthResponse {
  user: User;
  accessToken: string;
  message?: string;
}

/**
 * Response from token refresh.
 */
export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}

/**
 * The global authentication state managed by AuthProvider.
 */
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isEmailVerified: boolean;
  sessionExpiresAt: number | null;
  error: string | null;
}

/**
 * Mutation state shape used by individual auth hooks.
 */
export interface MutationState<T = unknown> {
  data: T | null;
  isLoading: boolean;
  isSuccess: boolean;
  error: string | null;
}

/**
 * Supported OAuth providers.
 * Extensible — add new entries without modifying consuming code.
 */
export type OAuthProvider = 'google' | 'github' | 'microsoft' | 'apple';

/**
 * Configuration for an OAuth provider button.
 */
export interface OAuthProviderConfig {
  id: OAuthProvider;
  label: string;
  color: string;
  enabled: boolean;
}

import type { OAuthProviderConfig } from './auth.types';

// ── Route Paths ─────────────────────────────────────────────

export const AUTH_ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  OAUTH_CALLBACK: '/oauth/callback',
} as const;

export const APP_ROUTES = {
  DASHBOARD: '/dashboard',
  GIGS: '/gigs',
  ANALYTICS: '/analytics',
  PROFILE: '/profile',
  SETTINGS: '/settings',
} as const;

// ── API Endpoints ───────────────────────────────────────────

export const AUTH_API = {
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  CHECK_USERNAME: '/api/auth/check-username',
  LOGOUT: '/api/auth/logout',
  REFRESH: '/api/auth/refresh',
  FORGOT_PASSWORD: '/api/auth/forgot-password',
  RESET_PASSWORD: '/api/auth/reset-password',
  FORGOT_USERNAME: '/api/auth/forgot-username',
  VERIFY_EMAIL: '/api/auth/verify-email',
  RESEND_VERIFICATION: '/api/auth/resend-verification',
  UPDATE_EMAIL: '/api/auth/update-email',
  UPDATE_PASSWORD: '/api/auth/update-password',
  ME: '/api/auth/me',
  OAUTH_GOOGLE: '/api/auth/oauth/google',
  OAUTH_GOOGLE_CALLBACK: '/api/auth/oauth/google/callback',
} as const;

// ── Storage Keys ────────────────────────────────────────────

export const STORAGE_KEYS = {
  REMEMBER_ME: 'gigflow_remember_me',
  // Access token is stored in-memory only — never in storage
} as const;

// ── Token Configuration ─────────────────────────────────────

export const TOKEN_CONFIG = {
  ACCESS_TOKEN_TTL_SECONDS: 900,           // 15 minutes
  REFRESH_BEFORE_EXPIRY_SECONDS: 60,       // Refresh 60s before expiry
  REMEMBER_ME_REFRESH_TTL_DAYS: 30,
  DEFAULT_REFRESH_TTL_DAYS: 7,
} as const;

// ── OAuth Provider Configurations ───────────────────────────

export const OAUTH_PROVIDERS: OAuthProviderConfig[] = [
  {
    id: 'google',
    label: 'Continue with Google',
    color: '#4285F4',
    enabled: true,
  },
  // Future providers — add here without touching any components:
  // { id: 'github', label: 'Continue with GitHub', color: '#333333', enabled: false },
  // { id: 'microsoft', label: 'Continue with Microsoft', color: '#00A4EF', enabled: false },
  // { id: 'apple', label: 'Continue with Apple', color: '#000000', enabled: false },
];

// ── Password Requirements ───────────────────────────────────

export const PASSWORD_CONFIG = {
  MIN_LENGTH: 12,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_DIGIT: true,
  REQUIRE_SPECIAL: true,
} as const;

// ── Rate Limiting (client-side display constants) ───────────

export const RATE_LIMIT = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,
} as const;

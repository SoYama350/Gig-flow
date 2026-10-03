import type { AuthState, User } from '../types/auth.types';

export type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; expiresIn?: number } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'RESTORE_SESSION'; payload: { user: User; expiresIn?: number } }
  | { type: 'SESSION_REFRESHED'; payload: { expiresIn: number } }
  | { type: 'USER_UPDATED'; payload: Partial<User> }
  | { type: 'EMAIL_VERIFIED' };

export const initialAuthState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // true by default because we attempt to restore session on mount
  isEmailVerified: false,
  sessionExpiresAt: null,
  error: null,
};

function calculateExpiry(expiresInSeconds?: number): number | null {
  if (!expiresInSeconds) return null;
  return Date.now() + expiresInSeconds * 1000;
}

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case 'LOGIN_SUCCESS':
    case 'RESTORE_SESSION':
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        isEmailVerified: action.payload.user.isEmailVerified,
        sessionExpiresAt: calculateExpiry(action.payload.expiresIn),
        error: null,
      };

    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isEmailVerified: false,
        sessionExpiresAt: null,
        error: action.payload,
      };

    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isEmailVerified: false,
        sessionExpiresAt: null,
        error: null,
      };

    case 'SESSION_REFRESHED':
      return {
        ...state,
        sessionExpiresAt: calculateExpiry(action.payload.expiresIn),
      };

    case 'USER_UPDATED':
      if (!state.user) return state;
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };

    case 'EMAIL_VERIFIED':
      if (!state.user) return state;
      return {
        ...state,
        user: { ...state.user, isEmailVerified: true },
        isEmailVerified: true,
      };

    default:
      return state;
  }
}

import { useAuthState, useAuthDispatch } from '../context/AuthProvider';
import { useLogout } from './useLogout';

/**
 * Primary hook for consuming auth state.
 * Only returns the data needed for rendering, plus the logout action.
 */
export function useAuth() {
  const state = useAuthState();
  const { logout } = useLogout();

  return {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    isEmailVerified: state.isEmailVerified,
    logout,
  };
}

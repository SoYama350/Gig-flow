import { useState } from 'react';
import { authService } from '../api/authService';
import { useAuthDispatch } from '../context/AuthProvider';
import type { LoginCredentials, MutationState } from '../types/auth.types';
import type { AppError } from '../../../shared/errors/AppError';

export function useLogin() {
  const dispatch = useAuthDispatch();
  const [state, setState] = useState<MutationState<void>>({
    data: null,
    isLoading: false,
    isSuccess: false,
    error: null,
  });

  const login = async (credentials: LoginCredentials) => {
    setState({ data: null, isLoading: true, isSuccess: false, error: null });
    dispatch({ type: 'LOGIN_START' });

    try {
      const user = await authService.login(credentials);
      
      // We don't have the exact accessToken TTL here unless the service returns it.
      // But AuthProvider will attempt a silent refresh soon if needed.
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user } });
      
      setState({ data: null, isLoading: false, isSuccess: true, error: null });
      return true;
    } catch (err) {
      const error = err as AppError;
      dispatch({ type: 'LOGIN_FAILURE', payload: error.message });
      setState({ data: null, isLoading: false, isSuccess: false, error: error.message });
      return false;
    }
  };

  return { ...state, login };
}

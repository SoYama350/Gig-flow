"use client";

import { useState } from 'react';
import { authService } from '../api/authService';
import { useAuthDispatch } from '../context/AuthProvider';
import type { RegisterData, MutationState } from '../types/auth.types';
import type { AppError } from '../../../shared/errors/AppError';

export function useRegister() {
  const dispatch = useAuthDispatch();
  const [state, setState] = useState<MutationState<void>>({
    data: null,
    isLoading: false,
    isSuccess: false,
    error: null,
  });

  const register = async (data: RegisterData) => {
    setState({ data: null, isLoading: true, isSuccess: false, error: null });
    dispatch({ type: 'LOGIN_START' });

    try {
      const user = await authService.register(data);
      
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

  return { ...state, register };
}

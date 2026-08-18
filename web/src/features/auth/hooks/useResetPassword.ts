"use client";

import { useState } from 'react';
import { authRepository } from '../api/authRepository';
import type { MutationState } from '../types/auth.types';
import type { AppError } from '../../../shared/errors/AppError';

export function useResetPassword() {
  const [state, setState] = useState<MutationState<void>>({
    data: null,
    isLoading: false,
    isSuccess: false,
    error: null,
  });

  const submit = async (token: string, newPassword: string) => {
    setState({ data: null, isLoading: true, isSuccess: false, error: null });

    try {
      await authRepository.resetPassword(token, newPassword);
      setState({ data: null, isLoading: false, isSuccess: true, error: null });
      return true;
    } catch (err) {
      const error = err as AppError;
      setState({ data: null, isLoading: false, isSuccess: false, error: error.message });
      return false;
    }
  };

  return { ...state, submit };
}

"use client";

import { useState } from 'react';
import { authRepository } from '../api/authRepository';
import { useAuthDispatch } from '../context/AuthProvider';
import type { MutationState } from '../types/auth.types';
import type { AppError } from '../../../shared/errors/AppError';

export function useEmailVerification() {
  const dispatch = useAuthDispatch();
  const [verifyState, setVerifyState] = useState<MutationState<void>>({
    data: null,
    isLoading: false,
    isSuccess: false,
    error: null,
  });
  
  const [resendState, setResendState] = useState<MutationState<void>>({
    data: null,
    isLoading: false,
    isSuccess: false,
    error: null,
  });

  const verify = async (token: string) => {
    setVerifyState({ data: null, isLoading: true, isSuccess: false, error: null });

    try {
      await authRepository.verifyEmail(token);
      dispatch({ type: 'EMAIL_VERIFIED' });
      setVerifyState({ data: null, isLoading: false, isSuccess: true, error: null });
      return true;
    } catch (err) {
      const error = err as AppError;
      setVerifyState({ data: null, isLoading: false, isSuccess: false, error: error.message });
      return false;
    }
  };

  const resend = async () => {
    setResendState({ data: null, isLoading: true, isSuccess: false, error: null });

    try {
      await authRepository.resendVerification();
      setResendState({ data: null, isLoading: false, isSuccess: true, error: null });
      return true;
    } catch (err) {
      const error = err as AppError;
      setResendState({ data: null, isLoading: false, isSuccess: false, error: error.message });
      return false;
    }
  };

  return { verify, verifyState, resend, resendState };
}

"use client";

import { httpClient } from '../../../shared/api/httpClient';
import { AUTH_API } from '../types/auth.constants';
import type { LoginCredentials, RegisterData, AuthResponse, RefreshResponse, User } from '../types/auth.types';

/**
 * Raw HTTP client for auth endpoints.
 * Knows URLs and request shapes, but doesn't handle business logic or state.
 */
export const authApiClient = {
  login(credentials: LoginCredentials): Promise<AuthResponse> {
    return httpClient.post<AuthResponse>(AUTH_API.LOGIN, credentials, { skipAuth: true });
  },

  register(data: RegisterData): Promise<AuthResponse> {
    return httpClient.post<AuthResponse>(AUTH_API.REGISTER, data, { skipAuth: true });
  },

  logout(): Promise<void> {
    return httpClient.post<void>(AUTH_API.LOGOUT);
  },

  refreshSession(): Promise<RefreshResponse> {
    return httpClient.post<RefreshResponse>(AUTH_API.REFRESH, undefined, { skipAuth: true });
  },

  forgotPassword(email: string): Promise<void> {
    return httpClient.post<void>(AUTH_API.FORGOT_PASSWORD, { email }, { skipAuth: true });
  },

  resetPassword(token: string, newPassword: string): Promise<void> {
    return httpClient.post<void>(AUTH_API.RESET_PASSWORD, { token, newPassword }, { skipAuth: true });
  },

  forgotUsername(email: string): Promise<void> {
    return httpClient.post<void>(AUTH_API.FORGOT_USERNAME, { email }, { skipAuth: true });
  },

  verifyEmail(token: string): Promise<void> {
    return httpClient.get<void>(`${AUTH_API.VERIFY_EMAIL}?token=${token}`, { skipAuth: true });
  },

  resendVerification(): Promise<void> {
    return httpClient.post<void>(AUTH_API.RESEND_VERIFICATION);
  },

  getMe(): Promise<{ user: User }> {
    return httpClient.get<{ user: User }>(AUTH_API.ME);
  },
};

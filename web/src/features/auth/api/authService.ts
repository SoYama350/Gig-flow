"use client";

import { authRepository } from './authRepository';
import { tokenManager } from '../utils/tokenManager';
import { STORAGE_KEYS } from '../types/auth.constants';
import type { LoginCredentials, RegisterData, User } from '../types/auth.types';

/**
 * High-level business logic for authentication.
 * Orchestrates token storage, storage flags (remember me), and API calls.
 * Independent of React hooks/components.
 */
export const authService = {
  async login(credentials: LoginCredentials): Promise<User> {
    const response = await authRepository.login(credentials);
    
    tokenManager.setToken(response.accessToken);
    
    if (credentials.rememberMe) {
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
    }
    
    return response.user;
  },

  async register(data: RegisterData): Promise<User> {
    const response = await authRepository.register(data);
    
    tokenManager.setToken(response.accessToken);
    
    return response.user;
  },

  async logout(): Promise<void> {
    try {
      await authRepository.logout();
    } finally {
      // Always clear local state even if the server request fails
      tokenManager.clearToken();
      localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
    }
  },

  async refreshSession(): Promise<{ accessToken: string; expiresIn: number }> {
    const response = await authRepository.refreshSession();
    tokenManager.setToken(response.accessToken);
    return response;
  },

  async restoreSession(): Promise<User | null> {
    // Attempt a silent refresh to get an access token
    try {
      await this.refreshSession();
      // If refresh succeeded, we now have an access token in memory.
      // Fetch the user profile.
      return await authRepository.getMe();
    } catch {
      // No valid session
      return null;
    }
  },

  async verifyEmail(token: string): Promise<void> {
    return authRepository.verifyEmail(token);
  },
};

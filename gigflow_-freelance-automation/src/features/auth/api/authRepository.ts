import { authApiClient } from './authApiClient';
import type { LoginCredentials, RegisterData, AuthResponse, RefreshResponse, User } from '../types/auth.types';

/**
 * Repository layer. Maps raw HTTP responses to domain models if needed.
 * Currently passes data through directly, but isolates the application
 * from changes to the backend API structure.
 */
export const authRepository = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return authApiClient.login(credentials);
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    return authApiClient.register(data);
  },

  async logout(): Promise<void> {
    return authApiClient.logout();
  },

  async refreshSession(): Promise<RefreshResponse> {
    return authApiClient.refreshSession();
  },

  async forgotPassword(email: string): Promise<void> {
    return authApiClient.forgotPassword(email);
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    return authApiClient.resetPassword(token, newPassword);
  },

  async forgotUsername(email: string): Promise<void> {
    return authApiClient.forgotUsername(email);
  },

  async verifyEmail(token: string): Promise<void> {
    return authApiClient.verifyEmail(token);
  },

  async resendVerification(): Promise<void> {
    return authApiClient.resendVerification();
  },

  async getMe(): Promise<User> {
    const { user } = await authApiClient.getMe();
    return user;
  },
};

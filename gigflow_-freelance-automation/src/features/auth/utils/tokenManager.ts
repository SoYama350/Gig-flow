/**
 * Manages the client-side lifecycle of the access token.
 * Tokens are stored purely in memory for maximum XSS protection.
 */

let _accessToken: string | null = null;

export const tokenManager = {
  /**
   * Returns the current access token, or null if unauthenticated.
   */
  getToken(): string | null {
    return _accessToken;
  },

  /**
   * Sets the new access token.
   */
  setToken(token: string): void {
    _accessToken = token;
  },

  /**
   * Clears the access token from memory.
   */
  clearToken(): void {
    _accessToken = null;
  },
};

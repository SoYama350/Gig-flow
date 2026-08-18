"use client";

import { TOKEN_CONFIG } from '../types/auth.constants';

type RefreshCallback = () => void;

let refreshTimeoutId: ReturnType<typeof setTimeout> | null = null;

/**
 * Schedules a callback to fire before the token expires.
 * 
 * @param expiresInSeconds The total TTL of the token in seconds
 * @param onRefresh The callback to execute (usually the silent refresh API call)
 */
export function scheduleSessionRefresh(expiresInSeconds: number, onRefresh: RefreshCallback): void {
  clearSessionTimer();

  // Calculate when to refresh (e.g., 60 seconds before expiry)
  const refreshInSeconds = Math.max(0, expiresInSeconds - TOKEN_CONFIG.REFRESH_BEFORE_EXPIRY_SECONDS);
  const refreshInMs = refreshInSeconds * 1000;

  refreshTimeoutId = setTimeout(() => {
    onRefresh();
  }, refreshInMs);
}

/**
 * Clears any pending session refresh timers.
 */
export function clearSessionTimer(): void {
  if (refreshTimeoutId) {
    clearTimeout(refreshTimeoutId);
    refreshTimeoutId = null;
  }
}

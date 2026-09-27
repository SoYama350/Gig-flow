import { useCallback } from 'react';
import { AUTH_API, OAUTH_PROVIDERS } from '../types/auth.constants';
import type { OAuthProvider } from '../types/auth.types';

export function useOAuth() {
  const initiateOAuth = useCallback((providerId: OAuthProvider) => {
    const provider = OAUTH_PROVIDERS.find((p) => p.id === providerId);
    if (!provider || !provider.enabled) {
      console.error(`OAuth provider ${providerId} is not enabled or not found.`);
      return;
    }

    // In a real app, generate a secure random state string and store it in sessionStorage/cookie
    // to verify against CSRF attacks in the callback.
    const state = 'random_state_string'; 
    
    // Redirect browser to the backend endpoint which will then redirect to the provider
    const url = AUTH_API.OAUTH_GOOGLE.replace('google', providerId);
    window.location.href = `${url}?state=${state}`;
  }, []);

  return { initiateOAuth };
}

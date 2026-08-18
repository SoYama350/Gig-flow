"use client";

import React, { createContext, useReducer, useEffect, useContext, useCallback, useMemo } from 'react';
import { authReducer, initialAuthState, type AuthAction } from './authReducer';
import { authService } from '../api/authService';
import { tokenManager } from '../utils/tokenManager';
import { authEventBus } from '../utils/authEventBus';
import { scheduleSessionRefresh, clearSessionTimer } from '../utils/sessionTimer';
import { setTokenAccessor, setOnUnauthorized } from '../../../shared/api/httpClient';
import type { AuthState } from '../types/auth.types';

// Split contexts to prevent unnecessary re-renders
const AuthStateContext = createContext<AuthState | undefined>(undefined);
const AuthDispatchContext = createContext<React.Dispatch<AuthAction> | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  // Provide token to HTTP client without circular dependencies
  useEffect(() => {
    setTokenAccessor(() => tokenManager.getToken());
  }, []);

  // Handle cross-tab logout and unauthorized 401s
  const handleSessionEnded = useCallback(() => {
    authService.logout().catch(() => {});
    clearSessionTimer();
    dispatch({ type: 'LOGOUT' });
  }, []);

  useEffect(() => {
    authEventBus.init(handleSessionEnded, () => {
      // Optional: Handle another tab logging in
      // We could trigger a restoreSession() here to sync the new user state
      authService.restoreSession().then(user => {
        if (user) dispatch({ type: 'RESTORE_SESSION', payload: { user } });
      });
    });
    
    setOnUnauthorized(handleSessionEnded);

    return () => authEventBus.cleanup();
  }, [handleSessionEnded]);

  // Attempt to restore session on mount
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const response = await authService.refreshSession();
        const user = await authService.restoreSession(); // we already refreshed, this just fetches me
        
        if (isMounted && user) {
          dispatch({ 
            type: 'RESTORE_SESSION', 
            payload: { user, expiresIn: response.expiresIn } 
          });
          
          // Schedule the next refresh
          scheduleSessionRefresh(response.expiresIn, handleSilentRefresh);
        } else if (isMounted) {
          dispatch({ type: 'LOGIN_FAILURE', payload: 'Session expired' });
        }
      } catch {
        if (isMounted) {
          dispatch({ type: 'LOGIN_FAILURE', payload: 'No active session' });
        }
      }
    }

    initSession();

    return () => { isMounted = false; };
  }, []);

  // The function that runs when the token is about to expire
  const handleSilentRefresh = useCallback(async () => {
    try {
      const response = await authService.refreshSession();
      dispatch({ type: 'SESSION_REFRESHED', payload: { expiresIn: response.expiresIn } });
      scheduleSessionRefresh(response.expiresIn, handleSilentRefresh);
    } catch (e) {
      handleSessionEnded();
    }
  }, [handleSessionEnded]);

  // If sessionExpiresAt changes from another source (e.g. login), schedule a refresh
  useEffect(() => {
    if (state.isAuthenticated && state.sessionExpiresAt) {
      const expiresInSeconds = Math.floor((state.sessionExpiresAt - Date.now()) / 1000);
      if (expiresInSeconds > 0) {
        scheduleSessionRefresh(expiresInSeconds, handleSilentRefresh);
      }
    } else {
      clearSessionTimer();
    }
  }, [state.isAuthenticated, state.sessionExpiresAt, handleSilentRefresh]);

  return (
    <AuthStateContext.Provider value={state}>
      <AuthDispatchContext.Provider value={dispatch}>
        {children}
      </AuthDispatchContext.Provider>
    </AuthStateContext.Provider>
  );
}

// Custom hooks to consume contexts
export function useAuthState() {
  const context = useContext(AuthStateContext);
  if (context === undefined) {
    throw new Error('useAuthState must be used within an AuthProvider');
  }
  return context;
}

export function useAuthDispatch() {
  const context = useContext(AuthDispatchContext);
  if (context === undefined) {
    throw new Error('useAuthDispatch must be used within an AuthProvider');
  }
  return context;
}

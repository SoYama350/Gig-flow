"use client";

import { useCallback } from 'react';
import { authService } from '../api/authService';
import { useAuthDispatch } from '../context/AuthProvider';
import { authEventBus } from '../utils/authEventBus';

export function useLogout() {
  const dispatch = useAuthDispatch();

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      // Regardless of server success, clear local state immediately
      dispatch({ type: 'LOGOUT' });
      authEventBus.broadcast('SESSION_ENDED');
    }
  }, [dispatch]);

  return { logout };
}

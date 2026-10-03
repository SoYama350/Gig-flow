"use client";

import React, { useEffect, useState } from 'react';
import { useAuth, useEmailVerification } from '../hooks';
import { AuthFormWrapper } from './AuthFormWrapper';

export function EmailVerificationNotice() {
  const { user, isEmailVerified } = useAuth();
  const { resend, resendState } = useEmailVerification();
  const [cooldown, setCooldown] = useState(0);

  // If there's no user, or they are already verified, don't show the banner
  if (!user || isEmailVerified) {
    return null;
  }

  // Timer for cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0) return;
    
    const success = await resend();
    if (success) {
      setCooldown(60); // 60s cooldown
    }
  };

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/30 border-b border-yellow-200 dark:border-yellow-800 p-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center">
          <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Please verify your email address ({user.email}) to unlock all features.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {resendState.isSuccess && (
            <span className="text-sm text-green-600 dark:text-green-400">Sent!</span>
          )}
          {resendState.error && (
            <span className="text-sm text-red-600 dark:text-red-400">Failed to send</span>
          )}
          
          <button
            onClick={handleResend}
            disabled={resendState.isLoading || cooldown > 0}
            className="text-sm font-medium text-yellow-800 dark:text-yellow-200 hover:text-yellow-900 dark:hover:text-white underline disabled:opacity-50 disabled:no-underline transition-colors"
          >
            {resendState.isLoading
              ? 'Sending...'
              : cooldown > 0
              ? `Resend in ${cooldown}s`
              : 'Resend email'}
          </button>
        </div>
      </div>
    </div>
  );
}

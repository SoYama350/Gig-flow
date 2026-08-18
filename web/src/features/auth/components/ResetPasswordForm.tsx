"use client";

import React, { useState } from 'react';
import { useResetPassword } from '../hooks';
import { validateResetPasswordForm } from '../validation/schemas';
import { AuthFormWrapper } from './AuthFormWrapper';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  
  const { submit, isLoading, isSuccess, error } = useResetPassword();

  if (!token) {
    return (
      <AuthFormWrapper title="Invalid Reset Link">
        <div className="text-center space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            This password reset link is invalid or has expired.
          </p>
          <div className="pt-4">
            <Link href="/forgot-password" className="text-blue-600 hover:text-blue-500 font-medium">
              Request a new link
            </Link>
          </div>
        </div>
      </AuthFormWrapper>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateResetPasswordForm({ password, confirmPassword });
    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors);
      return;
    }
    setFieldErrors({});

    await submit(token, password);
  };

  if (isSuccess) {
    return (
      <AuthFormWrapper title="Password Reset Complete">
        <div className="text-center space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Your password has been successfully reset. You can now log in with your new password.
          </p>
          <div className="pt-4">
            <Link href="/login" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
              Go to login
            </Link>
          </div>
        </div>
      </AuthFormWrapper>
    );
  }

  return (
    <AuthFormWrapper
      title="Create new password"
      subtitle="Your new password must be different from previous used passwords."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm dark:bg-red-900/50 dark:text-red-200">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            New Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              fieldErrors.password
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
            }`}
          />
          <PasswordStrengthMeter password={password} />
          {fieldErrors.password && (
            <div className="mt-1 space-y-1">
              {fieldErrors.password.map((err, i) => (
                <p key={i} className="text-sm text-red-600 dark:text-red-400">{err}</p>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              fieldErrors.confirmPassword
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
            }`}
          />
          {fieldErrors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.confirmPassword[0]}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? 'Resetting...' : 'Reset password'}
        </button>
      </form>
    </AuthFormWrapper>
  );
}

"use client";

import React, { useState } from 'react';
import { useForgotPassword } from '../hooks';
import { validateForgotPasswordForm } from '../validation/schemas';
import { AuthFormWrapper } from './AuthFormWrapper';
import Link from 'next/link';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  
  const { submit, isLoading, isSuccess, error } = useForgotPassword();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateForgotPasswordForm({ email });
    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors);
      return;
    }
    setFieldErrors({});

    await submit(email);
  };

  if (isSuccess) {
    return (
      <AuthFormWrapper title="Check your email">
        <div className="text-center space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            If an account exists for <span className="font-medium text-gray-900 dark:text-white">{email}</span>, 
            we have sent a password reset link.
          </p>
          <div className="pt-4">
            <Link href="/login" className="text-blue-600 hover:text-blue-500 font-medium">
              Return to login
            </Link>
          </div>
        </div>
      </AuthFormWrapper>
    );
  }

  return (
    <AuthFormWrapper
      title="Reset your password"
      subtitle="Enter your email address and we'll send you a link to reset your password."
      footer={
        <Link href="/login" className="font-medium text-gray-600 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300">
          Back to login
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm dark:bg-red-900/50 dark:text-red-200">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              fieldErrors.email
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
            }`}
          />
          {fieldErrors.email && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.email[0]}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? 'Sending link...' : 'Send reset link'}
        </button>
      </form>
    </AuthFormWrapper>
  );
}

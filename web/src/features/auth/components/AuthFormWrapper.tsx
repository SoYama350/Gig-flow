import React from 'react';

interface AuthFormWrapperProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthFormWrapper({ title, subtitle, children, footer }: AuthFormWrapperProps) {
  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl dark:bg-gray-800">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {subtitle}
          </p>
        )}
      </div>

      <div className="mt-8 space-y-6">
        {children}
      </div>

      {footer && (
        <div className="mt-6 text-center text-sm">
          {footer}
        </div>
      )}
    </div>
  );
}

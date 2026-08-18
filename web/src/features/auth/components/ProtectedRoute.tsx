"use client";

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../hooks';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVerification?: boolean;
}

export function ProtectedRoute({ children, requireVerification = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, isEmailVerified } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace(`/login?from=${encodeURIComponent(pathname || '/')}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requireVerification && !isEmailVerified) {
    // Verification gate handled by EmailVerificationNotice banner.
  }

  return <>{children}</>;
}

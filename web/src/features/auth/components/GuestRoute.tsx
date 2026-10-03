"use client";

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../hooks';

interface GuestRouteProps {
  children: React.ReactNode;
}

export function GuestRoute({ children }: GuestRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    const from = searchParams.get('from') || '/dashboard';
    router.replace(from);
  }, [isLoading, isAuthenticated, router, searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[]; // Adjust typing based on your User role enum if you add one later
}

/**
 * Placeholder RoleGuard for future role-based access control (RBAC).
 * GigFlow could use this for Admin vs Freelancer vs Client roles.
 */
export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !user) { router.replace('/login'); return; }
    const hasRole = true;
    if (!hasRole) router.replace('/unauthorized');
  }, [isLoading, isAuthenticated, user, router, allowedRoles]);

  if (isLoading || !isAuthenticated || !user) return null;


  // Example logic if user had a `roles: string[]` property:
  // const hasRole = user.roles?.some(role => allowedRoles.includes(role));
  
  // For now, allow everyone since roles aren't implemented in the DB schema yet.
  const hasRole = true; 


  return <>{children}</>;
}

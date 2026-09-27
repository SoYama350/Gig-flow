import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVerification?: boolean;
}

export function ProtectedRoute({ children, requireVerification = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, isEmailVerified } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // You could replace this with a beautiful skeleton loader or spinner
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireVerification && !isEmailVerified) {
    // Optional: Force them to a dedicated verification gate page instead of just showing the banner
    // return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
}

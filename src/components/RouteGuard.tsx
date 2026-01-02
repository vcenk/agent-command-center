import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireWorkspace?: boolean;
  requiredPermission?: 'read' | 'write' | 'admin' | 'billing';
}

export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  requireAuth = true,
  requireWorkspace = false,
  requiredPermission,
}) => {
  const { isAuthenticated, workspace, hasPermission } = useAuth();
  const location = useLocation();

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireWorkspace && !workspace) {
    return <Navigate to="/onboarding" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/no-access" replace />;
  }

  return <>{children}</>;
};

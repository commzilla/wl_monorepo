import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface PermissionGateProps {
  children: ReactNode;
  /** Single permission codename */
  permission?: string;
  /** Multiple permission codenames */
  permissions?: string[];
  /** 'all' = require all permissions, 'any' = require at least one */
  mode?: 'all' | 'any';
  /** Fallback UI when permission check fails */
  fallback?: ReactNode;
}

const PermissionGate = ({
  children,
  permission,
  permissions,
  mode = 'all',
  fallback = null,
}: PermissionGateProps) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions && permissions.length > 0) {
    hasAccess = mode === 'any'
      ? hasAnyPermission(permissions)
      : hasAllPermissions(permissions);
  } else {
    // No permission requirement — allow access
    hasAccess = true;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

export default PermissionGate;

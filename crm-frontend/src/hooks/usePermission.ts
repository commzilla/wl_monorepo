import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function usePermission(codename: string): boolean {
  const { hasPermission } = useAuth();
  return useMemo(() => hasPermission(codename), [hasPermission, codename]);
}

export function useAnyPermission(codenames: string[]): boolean {
  const { hasAnyPermission } = useAuth();
  return useMemo(() => hasAnyPermission(codenames), [hasAnyPermission, codenames]);
}

export function useAllPermissions(codenames: string[]): boolean {
  const { hasAllPermissions } = useAuth();
  return useMemo(() => hasAllPermissions(codenames), [hasAllPermissions, codenames]);
}

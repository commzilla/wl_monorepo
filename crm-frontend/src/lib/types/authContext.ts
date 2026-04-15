
import { ReactNode } from 'react';
import { AuthState, ProfileData } from '@/lib/types/auth';

export interface AuthContextType extends AuthState {
  profile: ProfileData | null;
  signUp: (email: string, password: string, metadata?: { first_name?: string; last_name?: string }) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<ProfileData>) => Promise<void>;
  // Legacy role booleans (backward compat)
  isAdmin: boolean;
  isSupport: boolean;
  isRisk: boolean;
  isContentCreator: boolean;
  isDiscordManager: boolean;
  rolesLoading: boolean;
  // RBAC permissions
  permissions: string[];
  roleName: string | null;
  roleSlug: string | null;
  hasPermission: (codename: string) => boolean;
  hasAnyPermission: (codenames: string[]) => boolean;
  hasAllPermissions: (codenames: string[]) => boolean;
}

export interface AuthProviderProps {
  children: ReactNode;
}


import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthState, ProfileData } from '@/lib/types/auth';
import { AuthProviderProps } from '@/lib/types/authContext';
import { useToast } from '@/hooks/use-toast';
import { realAuthService } from '@/services/realAuthService';
import AuthContext from '@/contexts/AuthContext';

interface PermissionsResponse {
  role_id: string | null;
  role_name: string | null;
  role_slug: string | null;
  permissions: string[];
  is_superuser: boolean;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Use React Query for profile fetching with caching
  const { data: profile = null, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile', authState.user?.id],
    queryFn: () => realAuthService.fetchProfile(),
    enabled: !!authState.user?.id && !authState.isLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Use React Query for user roles with caching (legacy)
  const { data: userRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['user-roles', authState.user?.id],
    queryFn: () => realAuthService.fetchUserRoles(authState.user?.id || ''),
    enabled: !!authState.user?.id && !authState.isLoading,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Fetch RBAC permissions from /auth/permissions/me/
  const { data: permissionsData } = useQuery<PermissionsResponse>({
    queryKey: ['user-permissions', authState.user?.id],
    queryFn: async () => {
      const { apiService } = await import('@/services/apiService');
      const response = await apiService.get<PermissionsResponse>('/auth/permissions/me/');
      return response.data;
    },
    enabled: !!authState.user?.id && !authState.isLoading,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Set up auth state listener
  useEffect(() => {
    const subscription = realAuthService.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);

        setAuthState({
          user: session?.user || null,
          session: session,
          isLoading: false,
        });

        // Invalidate queries on auth state change
        if (session?.user) {
          queryClient.invalidateQueries({ queryKey: ['user-profile'] });
          queryClient.invalidateQueries({ queryKey: ['user-roles'] });
          queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
        } else {
          queryClient.clear(); // Clear all queries on sign out
        }

        // Handle specific auth events
        if (event === 'SIGNED_IN' && !isInitialLoad) {
          toast({
            title: "Signed in successfully",
            description: "Welcome back!",
          });
          navigate('/');
        } else if (event === 'SIGNED_OUT') {
          toast({
            title: "Signed out",
            description: "You have been signed out.",
          });
          navigate('/auth');
        }

        // Mark that initial load is complete
        if (isInitialLoad) {
          setIsInitialLoad(false);
        }
      }
    );

    // Check for existing session
    const session = realAuthService.getSession();
    console.log('Initial session check:', session?.user?.id);

    setAuthState({
      user: session?.user || null,
      session: session,
      isLoading: false,
    });

    // Mark initial load as complete after checking session
    setIsInitialLoad(false);

    return () => subscription.unsubscribe();
  }, [toast, navigate, isInitialLoad, queryClient]);

  // Auth action handlers with error handling
  const signUp = async (
    email: string,
    password: string,
    metadata?: { first_name?: string; last_name?: string }
  ) => {
    try {
      const data = await realAuthService.signUp(email, password, metadata);

      if (data.user) {
        toast({
          title: "Account created",
          description: "Your account has been created successfully.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await realAuthService.triggerSignIn(email, password);
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const signInWithGoogle = async () => {
    try {
      // This will throw an error for now since Google OAuth isn't implemented
      await realAuthService.triggerSignIn('admin@wefund.com', 'password');
      toast({
        title: "Google sign in successful",
        description: "Signed in with demo admin account.",
      });
    } catch (error: any) {
      toast({
        title: "Google sign in failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const signOut = async () => {
    try {
      await realAuthService.triggerSignOut();
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateProfile = async (data: Partial<ProfileData>) => {
    if (!authState.user) return;

    try {
      await realAuthService.updateProfile(data);

      // Invalidate profile query to refetch
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // RBAC permissions
  const permissions = useMemo(() => permissionsData?.permissions ?? [], [permissionsData]);
  const roleName = permissionsData?.role_name ?? null;
  const roleSlug = permissionsData?.role_slug ?? null;

  // Memoized permission check callbacks
  const hasPermission = useCallback(
    (codename: string) => permissions.includes(codename),
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (codenames: string[]) => codenames.some(c => permissions.includes(c)),
    [permissions]
  );

  const hasAllPermissions = useCallback(
    (codenames: string[]) => codenames.every(c => permissions.includes(c)),
    [permissions]
  );

  // Legacy role checks — derived from roleSlug for backward compat
  const isAdmin = useMemo(() => roleSlug === 'admin' || userRoles.includes('admin'), [roleSlug, userRoles]);
  const isSupport = useMemo(() => roleSlug === 'support' || userRoles.includes('support'), [roleSlug, userRoles]);
  const isRisk = useMemo(() => roleSlug === 'risk' || userRoles.includes('risk'), [roleSlug, userRoles]);
  const isContentCreator = useMemo(() => roleSlug === 'content_creator' || userRoles.includes('content_creator'), [roleSlug, userRoles]);
  const isDiscordManager = useMemo(() => roleSlug === 'discord_manager' || userRoles.includes('discord_manager'), [roleSlug, userRoles]);

  console.log('Current auth state:', {
    userId: authState.user?.id,
    email: authState.user?.email,
    userRoles,
    roleSlug,
    permissionCount: permissions.length,
    isAdmin,
    rolesLoading: rolesLoading || profileLoading
  });

  return (
    <AuthContext.Provider value={{
      ...authState,
      profile,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      updateProfile,
      isAdmin,
      isSupport,
      isRisk,
      isContentCreator,
      isDiscordManager,
      rolesLoading: rolesLoading || profileLoading,
      permissions,
      roleName,
      roleSlug,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

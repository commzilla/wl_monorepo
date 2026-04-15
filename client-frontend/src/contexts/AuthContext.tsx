
import React, { createContext, useContext, useState, useEffect } from 'react';
import { LoginRequest, LoginResponse, loginClient, refreshToken } from '@/utils/api';
import { enhancedStorage } from '@/utils/storage';

interface AuthContextType {
  user: LoginResponse | null;
  login: (credentials: LoginRequest) => Promise<void>;
  loginWithTokens: (data: { access_token: string; refresh_token: string; user: any; isImpersonating?: boolean }) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
  isImpersonating: boolean;
  impersonatedUserEmail: string | null;
  stopImpersonating: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('🔧 AuthProvider: Component mounting');
  const [user, setUser] = useState<LoginResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedUserEmail, setImpersonatedUserEmail] = useState<string | null>(null);
  
  console.log('🔧 AuthProvider: State initialized', { user: !!user, isLoading, error });

  // Check for stored tokens on mount and set up refresh timer + cross-tab sync
  useEffect(() => {
    const storedUser = enhancedStorage.getItem('user');
    const accessToken = enhancedStorage.getItem('access_token');
    const refreshTokenValue = enhancedStorage.getItem('refresh_token');
    const storedImpersonating = enhancedStorage.getItem('is_impersonating');
    const storedImpersonatedEmail = enhancedStorage.getItem('impersonated_user_email');
    
    if (storedUser && accessToken && refreshTokenValue) {
      try {
        setUser(JSON.parse(storedUser));
        setIsImpersonating(storedImpersonating === 'true');
        setImpersonatedUserEmail(storedImpersonatedEmail);
        console.log('Restored user session from storage', { 
          username: JSON.parse(storedUser).username,
          hasTokens: true,
          isImpersonating: storedImpersonating === 'true'
        });
        
        // Set up automatic token refresh
        setupTokenRefresh();
      } catch (e) {
        console.error('Failed to parse stored user data:', e);
        enhancedStorage.removeItem('user');
        enhancedStorage.removeItem('access_token');
        enhancedStorage.removeItem('refresh_token');
      }
    } else {
      console.log('No valid session found in storage', {
        hasUser: !!storedUser,
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshTokenValue
      });
    }

    // Set up cross-tab synchronization
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'tokens_updated' && e.newValue) {
        try {
          const { access, refresh } = JSON.parse(e.newValue);
          console.log('Tokens updated from another tab');
          
          // Check if user data was also updated (from new client refresh endpoint)
          const updatedUser = enhancedStorage.getItem('user');
          if (updatedUser) {
            try {
              const parsedUser = JSON.parse(updatedUser);
              setUser(parsedUser);
              console.log('User data synced from storage update', { username: parsedUser.username });
            } catch (error) {
              console.error('Failed to parse updated user data:', error);
            }
          }
          
          // Don't restart the refresh timer - it's already running and should continue
          console.log('Token sync completed without restarting refresh timer');
        } catch (error) {
          console.error('Failed to sync tokens from storage event:', error);
        }
      }
      
      // Handle logout from other tab
      if (e.key === 'access_token' && e.newValue === null) {
        console.log('Logout detected from another tab');
        setUser(null);
        setError(null);
        if ((window as any).tokenRefreshInterval) {
          clearInterval((window as any).tokenRefreshInterval);
          (window as any).tokenRefreshInterval = null;
        }
      }
    };

    window.addEventListener('storage', handleStorageEvent);
    
    return () => {
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  // Set up automatic token refresh every 4 minutes (refresh before tokens expire)
  const setupTokenRefresh = () => {
    // Clear any existing interval first
    if ((window as any).tokenRefreshInterval) {
      console.log('Clearing existing refresh interval');
      clearInterval((window as any).tokenRefreshInterval);
      (window as any).tokenRefreshInterval = null;
    }

    const refreshInterval = setInterval(async () => {
      const refreshTokenValue = enhancedStorage.getItem('refresh_token');
      const accessToken = enhancedStorage.getItem('access_token');
      
      console.log('🔄 Refresh interval triggered', { 
        cycle: Date.now(),
        hasRefreshToken: !!refreshTokenValue, 
        hasAccessToken: !!accessToken,
        refreshTokenLength: refreshTokenValue?.length,
        accessTokenLength: accessToken?.length
      });
      
      if (refreshTokenValue && accessToken) {
        // Prevent multiple simultaneous refreshes
        if (isRefreshing) {
          console.log('🚫 Refresh already in progress, skipping this cycle');
          return;
        }

        try {
          setIsRefreshing(true);
          console.log('🚀 Starting proactive token refresh...');
          const refreshResponse = await refreshToken();
          console.log('✅ Token refresh completed successfully', {
            hasNewTokens: !!(refreshResponse.access && refreshResponse.refresh),
            newAccessToken: refreshResponse.access?.substring(0, 20) + '...',
            newRefreshToken: refreshResponse.refresh?.substring(0, 20) + '...'
          });
          
          // CRITICAL: Immediately update user state with the exact tokens from refresh response
          // This prevents the race condition where old tokens are used before storage is updated
          if (refreshResponse.access && refreshResponse.refresh) {
            const updatedUser = {
              access: refreshResponse.access,  // Use fresh token immediately
              refresh: refreshResponse.refresh, // Use fresh refresh token immediately
              user_id: user?.user_id || '',
              username: user?.username || '',
              role: user?.role || '',
              full_name: user?.full_name || '',
              profile_picture: user?.profile_picture || '',
              created_at: user?.created_at || ''
            };
            
            setUser(updatedUser);
            console.log('👤 User state updated immediately with fresh tokens', { 
              username: updatedUser.username,
              tokenRotationComplete: true,
              newTokensInState: true
            });
            
            // Verify tokens were stored in enhanced storage
            const storedAccess = enhancedStorage.getItem('access_token');
            const storedRefresh = enhancedStorage.getItem('refresh_token');
            console.log('📦 Post-refresh storage verification', {
              accessStored: !!storedAccess,
              refreshStored: !!storedRefresh,
              tokensMatch: storedAccess === refreshResponse.access && storedRefresh === refreshResponse.refresh,
              storageSync: storedAccess === refreshResponse.access && storedRefresh === refreshResponse.refresh ? '✅' : '❌'
            });
          }
        } catch (error) {
          console.error('❌ Proactive token refresh failed:', error);
          console.log('🔍 Error details:', {
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            currentRefreshToken: enhancedStorage.getItem('refresh_token')?.substring(0, 20) + '...',
            timestamp: new Date().toISOString()
          });
          // If refresh fails, logout user
          logout();
        } finally {
          setIsRefreshing(false);
        }
      } else {
        console.log('⚠️ No tokens available, clearing refresh interval');
        clearInterval(refreshInterval);
      }
    }, 4 * 60 * 1000); // 4 minutes - refresh before tokens expire

    // Store interval ID for cleanup
    (window as any).tokenRefreshInterval = refreshInterval;
    console.log('Token refresh interval set up successfully');
  };

  const login = async (credentials: LoginRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Starting login process...');
      const response = await loginClient(credentials);
      
      setUser(response);
      enhancedStorage.setItem('user', JSON.stringify(response), true);
      enhancedStorage.setItem('access_token', response.access, true);
      enhancedStorage.setItem('refresh_token', response.refresh, true);
      
      // Store additional profile info if available
      if (response.full_name) enhancedStorage.setItem('full_name', response.full_name, true);
      if (response.profile_picture) enhancedStorage.setItem('profile_picture', response.profile_picture, true);
      
      // Set up automatic token refresh after successful login
      setupTokenRefresh();
      
      console.log('Login process completed successfully');
    } catch (err) {
      console.error('Login process failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithTokens = async (data: { access_token: string; refresh_token: string; user: any; isImpersonating?: boolean }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Starting token-based login process...', { isImpersonating: data.isImpersonating });
      const user = {
        ...data.user,
        access: data.access_token,
        refresh: data.refresh_token,
      };
      
      setUser(user);
      enhancedStorage.setItem('user', JSON.stringify(user), true);
      enhancedStorage.setItem('access_token', data.access_token, true);
      enhancedStorage.setItem('refresh_token', data.refresh_token, true);
      
      // Handle impersonation state
      if (data.isImpersonating) {
        setIsImpersonating(true);
        setImpersonatedUserEmail(data.user.username || data.user.email);
        enhancedStorage.setItem('is_impersonating', 'true', true);
        enhancedStorage.setItem('impersonated_user_email', data.user.username || data.user.email, true);
      }
      
      // Store additional profile info if available
      if (data.user.full_name) enhancedStorage.setItem('full_name', data.user.full_name, true);
      if (data.user.profile_picture) enhancedStorage.setItem('profile_picture', data.user.profile_picture, true);
      
      // Set up automatic token refresh after successful login
      setupTokenRefresh();
      
      console.log('Token-based login process completed successfully');
    } catch (err) {
      console.error('Token-based login process failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    console.log('Logging out user');
    setUser(null);
    setError(null);
    setIsImpersonating(false);
    setImpersonatedUserEmail(null);
    enhancedStorage.removeItem('user');
    enhancedStorage.removeItem('access_token');
    enhancedStorage.removeItem('refresh_token');
    enhancedStorage.removeItem('full_name');
    enhancedStorage.removeItem('profile_picture');
    enhancedStorage.removeItem('is_impersonating');
    enhancedStorage.removeItem('impersonated_user_email');
    
    // Clear token refresh interval
    if ((window as any).tokenRefreshInterval) {
      clearInterval((window as any).tokenRefreshInterval);
      (window as any).tokenRefreshInterval = null;
    }
  };

  const stopImpersonating = () => {
    console.log('Stopping impersonation');
    logout();
    window.close();
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if ((window as any).tokenRefreshInterval) {
        clearInterval((window as any).tokenRefreshInterval);
      }
    };
  }, []);

  console.log('🔧 AuthProvider: About to return provider with context value');
  return (
    <AuthContext.Provider value={{ user, login, loginWithTokens, logout, isLoading, error, isImpersonating, impersonatedUserEmail, stopImpersonating }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  console.log('🔧 useAuth: Hook called, checking context');
  const context = useContext(AuthContext);
  console.log('🔧 useAuth: Context value', context);
  if (context === undefined) {
    console.error('🔧 useAuth: Context is undefined - AuthProvider not found!');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

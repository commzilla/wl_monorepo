
import { ProfileData } from '@/lib/types/auth';
import { authService } from '@/services/authService';

interface RealUser {
  id: string;
  email: string;
  username: string;
  is_superuser: boolean;
  created_at: string;
}

interface RealSession {
  user: RealUser;
  access_token: string;
  expires_at: number;
}

class RealAuthService {
  private listeners: Array<(event: string, session: RealSession | null) => void> = [];

  async signUp(email: string, password: string, metadata?: { first_name?: string; last_name?: string }) {
    const data = await authService.signUp(email, password, metadata);
    return data;
  }

  async signIn(email: string, password: string) {
    const data = await authService.signIn(email, password);
    return data;
  }

  async signOut() {
    await authService.signOut();
  }

  getSession(): RealSession | null {
    return authService.getSession();
  }

  getUser(): RealUser | null {
    const session = this.getSession();
    return session?.user || null;
  }

  async fetchProfile(): Promise<ProfileData> {
    return await authService.fetchProfile();
  }

  async updateProfile(data: Partial<ProfileData>): Promise<void> {
    await authService.updateProfile(data);
  }

  async fetchUserRoles(userId: string): Promise<string[]> {
    try {
      // Try to fetch roles from the backend API
      const { apiService } = await import('@/services/apiService');
      const response = await apiService.get<{ roles: string[] } | string[]>('/auth/roles/me/');
      
      if (response.data) {
        // Handle both array response and object with roles field
        const roles = Array.isArray(response.data) ? response.data : response.data.roles;
        console.log('Fetched user roles from API:', roles);
        return roles || [];
      }
    } catch (error) {
      console.warn('Failed to fetch roles from API, falling back to profile:', error);
    }

    // Fallback: Try to get role from profile
    try {
      const profile = await this.fetchProfile();
      if (profile?.role) {
        console.log('Got role from profile:', profile.role);
        return [profile.role];
      }
    } catch (error) {
      console.warn('Failed to get role from profile:', error);
    }

    // Final fallback: check is_superuser
    const user = this.getUser();
    if (user?.is_superuser) {
      console.log('User is superuser, granting admin role');
      return ['admin'];
    }
    
    console.log('No roles found for user');
    return [];
  }

  // Auth state change simulation
  onAuthStateChange(callback: (event: string, session: RealSession | null) => void) {
    this.listeners.push(callback);
    
    return {
      unsubscribe: () => {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
          this.listeners.splice(index, 1);
        }
      }
    };
  }

  private notifyListeners(event: string, session: RealSession | null) {
    this.listeners.forEach(callback => callback(event, session));
  }

  // Trigger auth state changes
  async triggerSignIn(email: string, password: string) {
    await this.signIn(email, password);
    const session = this.getSession();
    this.notifyListeners('SIGNED_IN', session);
    return session;
  }

  async triggerSignOut() {
    await this.signOut();
    this.notifyListeners('SIGNED_OUT', null);
  }
}

export const realAuthService = new RealAuthService();


import { ProfileData } from '@/lib/types/auth';
import { sendWelcomeEmail } from '@/services/emailService';
import { apiService } from '@/services/apiService';

interface AuthResponse {
  access: string;
  refresh: string;
  username: string;
  email: string;
  is_superuser: boolean;
}

interface User {
  id: string;
  email: string;
  username: string;
  is_superuser: boolean;
  created_at: string;
}

export const authService = {
  async signUp(
    email: string, 
    password: string, 
    metadata?: { first_name?: string; last_name?: string }
  ) {
    console.log('Starting sign up process for:', email);
    
    const response = await apiService.post<AuthResponse>('/auth/register/', {
      email,
      password,
      username: email, // Use email as username
      first_name: metadata?.first_name,
      last_name: metadata?.last_name,
    });

    if (response.error) {
      console.error('Sign up error:', response.error);
      throw new Error(response.error);
    }

    console.log('Sign up successful for:', email);

    // Send welcome email if successful
    if (metadata?.first_name && response.data) {
      try {
        await sendWelcomeEmail(email, metadata.first_name, response.data.username);
        console.log('Welcome email sent successfully');
      } catch (emailError) {
        console.warn('Failed to send welcome email:', emailError);
        // Don't throw here, sign up was successful
      }
    }

    return { user: response.data };
  },

  async signIn(email: string, password: string) {
    console.log('Starting sign in process for:', email);
    console.log('Making request to:', '/auth/admin/login/');
    
    const requestBody = {
      username: email, // Django expects username field (can be email or username)
      password,
    };
    
    console.log('Request body:', { username: email, password: '[REDACTED]' });
    
    const response = await apiService.post<AuthResponse>('/auth/admin/login/', requestBody);

    console.log('Sign in response status:', response.status);
    console.log('Sign in response error:', response.error);
    console.log('Sign in response data:', response.data ? 'Data received' : 'No data');

    if (response.error) {
      console.error('Sign in error:', response.error);
      throw new Error(response.error);
    }

    if (response.data) {
      console.log('Storing authentication data...');
      
      // Store tokens in localStorage with new key names
      localStorage.setItem('access', response.data.access);
      localStorage.setItem('refresh', response.data.refresh);
      
      // Store user info
      const userInfo = {
        id: response.data.username,
        email: response.data.email,
        username: response.data.username,
        is_superuser: response.data.is_superuser,
        created_at: new Date().toISOString(),
      };
      
      localStorage.setItem('user_info', JSON.stringify(userInfo));
      console.log('User info stored:', userInfo);
    }

    return response.data;
  },

  async signInWithGoogle() {
    console.log('Google sign-in requested');
    // For Google sign-in, you might need to implement OAuth flow
    // For now, we'll throw an error as this needs backend OAuth setup
    throw new Error('Google sign-in not implemented yet. Please use email/password.');
  },

  async signOut() {
    console.log('Starting sign out process');
    
    // Clear all stored data
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user_info');
    localStorage.removeItem('user_profile');
    
    console.log('Auth data cleared from localStorage');
  },

  async updateProfile(data: Partial<ProfileData>) {
    console.log('Updating profile');
    
    const response = await apiService.put(`/auth/profile/me/`, data);
    
    if (response.error) {
      console.error('Profile update error:', response.error);
      throw new Error(response.error);
    }

    // Update local profile cache
    const currentProfile = localStorage.getItem('user_profile');
    if (currentProfile) {
      const profile = JSON.parse(currentProfile);
      const updatedProfile = { ...profile, ...data, updated_at: new Date().toISOString() };
      localStorage.setItem('user_profile', JSON.stringify(updatedProfile));
      console.log('Profile updated locally');
    }

    return response.data;
  },

  async fetchProfile() {
    console.log('Fetching profile');
    
    const response = await apiService.get<ProfileData>(`/auth/profile/me/`);
    
    if (response.error) {
      console.error('Profile fetch error:', response.error);
      throw new Error(response.error);
    }

    // Cache profile locally
    if (response.data) {
      localStorage.setItem('user_profile', JSON.stringify(response.data));
      console.log('Profile cached locally');
    }

    return response.data;
  },

  // Get current session from localStorage
  getSession() {
    const accessToken = localStorage.getItem('access');
    const userInfo = localStorage.getItem('user_info');
    
    if (!accessToken || !userInfo) {
      console.log('No session found in localStorage');
      return null;
    }

    try {
      const user = JSON.parse(userInfo);
      const session = {
        user,
        access_token: accessToken,
        expires_at: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      };
      console.log('Session retrieved from localStorage:', { userId: user.id, email: user.email });
      return session;
    } catch (error) {
      console.error('Error parsing user info from localStorage:', error);
      return null;
    }
  },

  // Refresh token using Django admin endpoint
  async refreshToken() {
    console.log('Attempting to refresh token using Django admin endpoint');
    
    const refreshToken = localStorage.getItem('refresh');
    
    if (!refreshToken) {
      console.error('No refresh token available');
      throw new Error('No refresh token available');
    }

    const response = await apiService.post<{ access: string; refresh: string }>('/auth/admin/refresh/', {
      refresh: refreshToken,
    });

    if (response.error) {
      console.error('Token refresh failed:', response.error);
      // If refresh fails, clear all tokens
      this.signOut();
      throw new Error('Session expired. Please log in again.');
    }

    if (response.data && response.data.access) {
      // Update both tokens (refresh token rotates)
      localStorage.setItem('access', response.data.access);
      localStorage.setItem('refresh', response.data.refresh);
      console.log('Tokens refreshed successfully');
      return response.data;
    } else {
      throw new Error('Invalid refresh response format');
    }
  },
};

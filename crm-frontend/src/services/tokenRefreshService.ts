
import { apiService } from '@/services/apiService';

class TokenRefreshService {
  private isRefreshing = false;
  private failedQueue: Array<{ resolve: Function; reject: Function }> = [];

  private processQueue(error: any = null, token: string | null = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
    
    this.failedQueue = [];
  }

  async refreshTokenIfNeeded(): Promise<string | null> {
    const accessToken = localStorage.getItem('access');
    const refreshToken = localStorage.getItem('refresh');
    
    if (!accessToken || !refreshToken) {
      return null;
    }

    if (this.isRefreshing) {
      // If already refreshing, queue this request
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      console.log('Attempting to refresh token using Django admin endpoint...');
      
      const response = await apiService.post<{ access: string; refresh: string }>('/auth/admin/refresh/', {
        refresh: refreshToken,
      });

      if (response.error) {
        console.error('Token refresh failed:', response.error);
        throw new Error(response.error);
      }

      if (response.data && response.data.access) {
        const newAccessToken = response.data.access;
        const newRefreshToken = response.data.refresh;
        
        // Update both stored tokens (refresh token rotates)
        localStorage.setItem('access', newAccessToken);
        localStorage.setItem('refresh', newRefreshToken);
        
        console.log('Tokens refreshed successfully');
        this.processQueue(null, newAccessToken);
        return newAccessToken;
      } else {
        throw new Error('Invalid refresh response format');
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      this.processQueue(error, null);
      
      // Clear tokens if refresh fails
      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
      localStorage.removeItem('user_info');
      
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }
}

export const tokenRefreshService = new TokenRefreshService();

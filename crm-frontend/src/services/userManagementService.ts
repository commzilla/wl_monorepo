import { AdminUser, CreateAdminUserRequest, UpdateAdminUserRequest } from '@/lib/types/userManagement';

const API_BASE_URL = 'https://api.we-fund.com/admin/user-management';

class UserManagementService {
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('access');
    if (!token) {
      throw new Error('No access token available');
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  private makeRequest = async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Extract error message from various API response formats
      let errorMessage = `HTTP error! status: ${response.status}`;
      if (errorData.detail) {
        errorMessage = errorData.detail;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      } else if (typeof errorData === 'object' && Object.keys(errorData).length > 0) {
        // Handle field-specific errors like { "email": ["This field is required."] }
        const fieldErrors = Object.entries(errorData)
          .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
          .join('; ');
        if (fieldErrors) errorMessage = fieldErrors;
      }
      throw new Error(errorMessage);
    }

    // Check if response has content before parsing JSON
    const contentLength = response.headers.get('content-length');
    const contentType = response.headers.get('content-type');
    
    // If no content or content-length is 0, return void for DELETE operations
    if (response.status === 204 || contentLength === '0' || 
        (options.method === 'DELETE' && (!contentType || !contentType.includes('application/json')))) {
      return undefined as T;
    }

    // Only parse JSON if we have content
    const text = await response.text();
    if (!text) {
      return undefined as T;
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      // If parsing fails but request was successful, return undefined for DELETE
      if (options.method === 'DELETE') {
        return undefined as T;
      }
      throw error;
    }
  }

  getUsers = async (): Promise<AdminUser[]> => {
    return this.makeRequest<AdminUser[]>('/');
  }

  getUser = async (id: string): Promise<AdminUser> => {
    return this.makeRequest<AdminUser>(`/${id}/`);
  }

  createUser = async (data: CreateAdminUserRequest): Promise<AdminUser> => {
    return this.makeRequest<AdminUser>('/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateUser = async (id: string, data: UpdateAdminUserRequest): Promise<AdminUser> => {
    return this.makeRequest<AdminUser>(`/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteUser = async (id: string): Promise<void> => {
    await this.makeRequest<void>(`/${id}/`, {
      method: 'DELETE',
    });
  }
}

export const userManagementService = new UserManagementService();
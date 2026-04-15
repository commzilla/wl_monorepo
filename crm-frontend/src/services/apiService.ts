import { tokenRefreshService } from '@/services/tokenRefreshService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
  `https://${window.location.hostname.replace(/^crm\./, 'api.')}`;
const USE_PROXY = false;

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

class ApiService {
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('access');
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    // Read raw text first so we can handle non-JSON responses gracefully
    const rawText = await response.text();
    console.log('Raw response text:', rawText);

    let data: any = null;
    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
      }
    }
    
    if (!response.ok) {
      // Build error message including details if available
      let parsedMessage = data?.error || data?.detail || data?.message || '';
      if (data?.details && parsedMessage) {
        parsedMessage = `${parsedMessage}: ${data.details}`;
      } else if (data?.details) {
        parsedMessage = data.details;
      }
      
      const textSnippet = parsedMessage || (rawText ? rawText.slice(0, 200) : '');
      const errorMessage = textSnippet
        ? `HTTP ${response.status}: ${textSnippet}`
        : `HTTP ${response.status}: ${response.statusText}`;

      console.error('API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        data
      });
      
      return {
        error: errorMessage,
        status: response.status,
      };
    }

    return {
      data,
      status: response.status,
    };
  }

  private async makeProxyRequest<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<ApiResponse<T>> {
    // Proxy functionality not available
    return {
      error: 'Proxy functionality not available',
      status: 500,
    };
  }

  private async makeRequest<T>(
    url: string, 
    options: RequestInit, 
    retryCount = 0
  ): Promise<ApiResponse<T>> {
    // If using proxy, extract endpoint and use proxy function
    if (USE_PROXY) {
      const endpoint = url.replace(API_BASE_URL, '');
      const method = options.method || 'GET';
      let body = undefined;
      
      if (options.body && typeof options.body === 'string') {
        try {
          body = JSON.parse(options.body);
        } catch (e) {
          body = options.body;
        }
      }
      
      return this.makeProxyRequest<T>(method, endpoint, body);
    }

    // Original direct API call logic
    try {
      const response = await fetch(url, options);
      
      // If we get a 401 and haven't retried yet, try to refresh the token
      if (response.status === 401 && retryCount === 0) {
        console.log('Token expired, attempting refresh...');
        try {
          await tokenRefreshService.refreshTokenIfNeeded();
          // Update only the Authorization header, preserving Content-Type for FormData
          const newToken = localStorage.getItem('access');
          const existingHeaders = options.headers as Record<string, string> || {};
          const newOptions = {
            ...options,
            headers: {
              ...existingHeaders,
              ...(newToken && { 'Authorization': `Bearer ${newToken}` }),
            },
          };
          return this.makeRequest<T>(url, newOptions, 1);
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          // If refresh fails, redirect to auth
          window.location.href = '/auth';
          return {
            error: 'Session expired. Please log in again.',
            status: 401,
          };
        }
      }

      return this.handleResponse<T>(response);
    } catch (error) {
      console.error('Network error details:', error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const corsError = 'Unable to connect to the API server. This could be due to CORS policy, network connectivity, or the server being unavailable. Check browser console for CORS errors.';
        return {
          error: corsError,
          status: 0,
        };
      }
      
      return {
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 0,
      };
    }
  }

  async post<T>(endpoint: string, body: any = {}): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`Making POST request to: ${url}`);
    console.log('Request body:', body);
    
    const options: RequestInit = {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body),
      mode: 'cors',
      credentials: 'omit',
    };
    
    return this.makeRequest<T>(url, options);
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`Making GET request to: ${url}`);
    
    const options: RequestInit = {
      method: 'GET',
      headers: this.getAuthHeaders(),
      mode: 'cors',
      credentials: 'omit',
    };
    
    return this.makeRequest<T>(url, options);
  }

  async put<T>(endpoint: string, body: any = {}): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`Making PUT request to: ${url}`);
    
    const options: RequestInit = {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body),
      mode: 'cors',
      credentials: 'omit',
    };
    
    return this.makeRequest<T>(url, options);
  }

  async patch<T>(endpoint: string, body: any = {}): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`Making PATCH request to: ${url}`);
    
    const options: RequestInit = {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body),
      mode: 'cors',
      credentials: 'omit',
    };
    
    return this.makeRequest<T>(url, options);
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`Making DELETE request to: ${url}`);
    
    const options: RequestInit = {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      mode: 'cors',
      credentials: 'omit',
    };
    
    return this.makeRequest<T>(url, options);
  }

  async getBlob(endpoint: string): Promise<ApiResponse<Blob>> {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`Making GET blob request to: ${url}`);
    
    const token = localStorage.getItem('access');
    const headers: Record<string, string> = {
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        mode: 'cors',
        credentials: 'omit',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorData.error || errorMessage;
        } catch {
          if (errorText) errorMessage = errorText.slice(0, 200);
        }
        return { error: errorMessage, status: response.status };
      }
      
      const blob = await response.blob();
      return { data: blob, status: response.status };
    } catch (error) {
      return {
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 0,
      };
    }
  }

  async uploadFile<T>(endpoint: string, formData: FormData, method: 'POST' | 'PATCH' = 'POST'): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`Making ${method} file upload request to: ${url}`);
    
    const token = localStorage.getItem('access');
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
    
    const options: RequestInit = {
      method,
      headers,
      body: formData,
      mode: 'cors',
      credentials: 'omit',
    };
    
    return this.makeRequest<T>(url, options);
  }
}

export const apiService = new ApiService();
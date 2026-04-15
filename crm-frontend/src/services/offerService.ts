
import { apiService, ApiResponse } from '@/services/apiService';
import { Offer, CreateOfferRequest, UpdateOfferRequest } from '@/lib/types/offer';

class OfferService {
  async getOffers(): Promise<ApiResponse<Offer[]>> {
    return apiService.get<Offer[]>('/offers/');
  }

  async getOffer(id: number): Promise<ApiResponse<Offer>> {
    return apiService.get<Offer>(`/offers/${id}/`);
  }

  async createOffer(data: CreateOfferRequest): Promise<ApiResponse<Offer>> {
    // Always use FormData for Django backend with MultiPartParser
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('start_date', data.start_date);
    formData.append('end_date', data.end_date);
    formData.append('is_active', data.is_active.toString());
    
    // Use feature_image_file for uploading (matches updated API)
    if (data.feature_image && data.feature_image instanceof File) {
      formData.append('feature_image_file', data.feature_image);
    }
    
    if (data.coupons && data.coupons.length > 0) {
      formData.append('coupons', JSON.stringify(data.coupons));
    }

    return this.postFormData('/offers/', formData);
  }

  async updateOffer(id: number, data: UpdateOfferRequest): Promise<ApiResponse<Offer>> {
    // Always use FormData for Django backend with MultiPartParser
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('start_date', data.start_date);
    formData.append('end_date', data.end_date);
    formData.append('is_active', data.is_active.toString());
    
    // Use feature_image_file for uploading (matches updated API)
    if (data.feature_image instanceof File) {
      formData.append('feature_image_file', data.feature_image);
    }
    
    if (data.coupons && data.coupons.length > 0) {
      formData.append('coupons', JSON.stringify(data.coupons));
    }

    return this.putFormData(`/offers/${id}/`, formData);
  }

  async deleteOffer(id: number): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`/offers/${id}/`);
  }

  private async postFormData(endpoint: string, formData: FormData): Promise<ApiResponse<Offer>> {
    const url = `https://api.we-fund.com${endpoint}`;
    console.log(`Making POST request with FormData to: ${url}`);
    
    // Log FormData contents for debugging
    console.log('FormData contents:');
    for (const [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }
    
    const token = localStorage.getItem('access');
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Don't set Content-Type for FormData - let browser set it with boundary

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        mode: 'cors',
        credentials: 'omit',
      });

      const data = await response.json();
      console.log('Response data:', data);
      
      if (!response.ok) {
        return {
          error: data?.error || data?.detail || `HTTP ${response.status}`,
          status: response.status,
        };
      }

      return {
        data,
        status: response.status,
      };
    } catch (error) {
      return {
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 0,
      };
    }
  }

  private async putFormData(endpoint: string, formData: FormData): Promise<ApiResponse<Offer>> {
    const url = `https://api.we-fund.com${endpoint}`;
    console.log(`Making PUT request with FormData to: ${url}`);
    
    const token = localStorage.getItem('access');
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: formData,
        mode: 'cors',
        credentials: 'omit',
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          error: data?.error || data?.detail || `HTTP ${response.status}`,
          status: response.status,
        };
      }

      return {
        data,
        status: response.status,
      };
    } catch (error) {
      return {
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 0,
      };
    }
  }
}

export const offerService = new OfferService();

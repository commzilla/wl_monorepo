import { apiService } from './apiService';

export interface ClientKYC {
  id: string;
  client_name: string;
  client_email: string;
  operator_name: string | null;
  status: string;
  rise_invite_sent: boolean;
  rise_invite_accepted: boolean;
  rise_invite_id: string | null;
  operator: string | null;
  created_at: string;
  updated_at: string;
  session_id: string | null;
  session_link: string | null;
  client: string;
  initiate_date: string;
  note: string | null;
  operator_remark: string | null;
  rise_api_response: any | null;
  rise_webhook_response: any | null;
}

export interface KycListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ClientKYC[];
}

export const kycService = {
  async getKycVerifications(params?: {
    search?: string;
    status?: string;
    page?: number;
  }): Promise<KycListResponse> {
    console.log('Fetching KYC verifications with params:', params);
    
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status && params.status !== 'all') queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    
    const endpoint = `/admin/kyc-management/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await apiService.get<any>(endpoint);
    
    if (response.error) {
      console.error('Failed to fetch KYC verifications:', response.error);
      throw new Error(response.error);
    }
    
    const data = response.data;
    // Normalize response: backend may return a simple array or a paginated object
    if (Array.isArray(data)) {
      return {
        count: data.length,
        next: null,
        previous: null,
        results: data as ClientKYC[],
      };
    }
    
    if (data && Array.isArray((data as any).results)) {
      return data as KycListResponse;
    }

    console.warn('Unexpected KYC response shape, normalizing to empty list:', data);
    return {
      count: data?.count ?? 0,
      next: data?.next ?? null,
      previous: data?.previous ?? null,
      results: (data?.results as ClientKYC[]) ?? [],
    };
  },

  async updateKycStatus(kycId: number | string, status: string, notes?: string, client?: string): Promise<ClientKYC> {
    console.log('Updating KYC status:', { kycId, status, notes, client });
    
    const response = await apiService.put<ClientKYC>(`/admin/kyc-management/${kycId}/`, {
      status,
      note: notes,
      client
    });
    
    if (response.error) {
      console.error('Failed to update KYC status:', response.error);
      throw new Error(response.error);
    }
    
    return response.data!;
  }
};
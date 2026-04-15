
import { apiService } from '@/services/apiService';

export interface ApiTrader {
  id: string; // Now always available from user.id
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  kyc_status: 'approved' | 'rejected' | 'pending' | 'not_submitted';
  has_live_account: boolean;
  full_address?: string; // For list view
  address_info?: any; // For detail view (JSON object)
  referred_by?: string;
  challenges?: any[]; // Full challenge objects instead of count
  active_accounts?: number; // Count of active accounts
}

export interface CreateTraderRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  country?: string;
}

export interface UpdateTraderRequest {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  kyc_status?: 'approved' | 'rejected' | 'pending' | 'not_submitted';
  has_live_account?: boolean;
  address_info?: string;
  referred_by?: string;
}

export interface TraderListParams {
  page?: number;
  page_size?: number;
  search?: string;
  kyc_status?: string;
  ordering?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}


export interface TraderFullProfile {
  profile_info: {
    user: any;
    client_profile: any;
  };
  orders_info: any[];
  challenge_info: any[];
  trades_info: any[];
  payout_info: {
    methods: any[];
    payouts: any[];
    config: any;
  };
  risk_info: any[];
  certificate_info: any[];
  // Pre-grouped by challenge (new API fields)
  risk_by_challenge?: Array<{
    challenge_name: string;
    account_size: number;
    mt5_account_id: string;
    breaches: any[];
  }>;
  certificates_by_challenge?: Array<{
    challenge_name: string;
    account_size: number;
    mt5_account_id: string;
    certificates: any[];
  }>;
  notifications: any[];
  affiliate_info: {
    profile: any;
    wallet: any;
    payouts: any[];
    transactions: any[];
  } | null;
}

class TraderService {
  // Get all traders with pagination
  async getTraders(params?: TraderListParams) {
    console.log('Fetching traders from API with params:', params);
    
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.kyc_status && params.kyc_status !== 'all') queryParams.append('kyc_status', params.kyc_status);
    if (params?.ordering) queryParams.append('ordering', params.ordering);
    
    const url = `/admin/traders/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await apiService.get<PaginatedResponse<ApiTrader>>(url);
    
    if (response.error) {
      console.error('Error fetching traders:', response.error);
      throw new Error(response.error);
    }

    console.log('Raw API response:', response.data);
    return response.data;
  }

  // Get trader by ID
  async getTrader(id: string) {
    console.log(`Fetching trader ${id} from API...`);
    const response = await apiService.get<ApiTrader>(`/admin/traders/${id}/`);
    
    if (response.error) {
      console.error('Error fetching trader:', response.error);
      throw new Error(response.error);
    }

    return response.data;
  }

  // Create new trader
  async createTrader(traderData: CreateTraderRequest) {
    console.log('Creating trader:', traderData);
    const response = await apiService.post<{ message: string; id: string }>('/add-trader/', traderData);
    
    if (response.error) {
      console.error('Error creating trader:', response.error);
      throw new Error(response.error);
    }

    return response.data;
  }

  // Update trader
  async updateTrader(id: string, traderData: Partial<UpdateTraderRequest>) {
    console.log(`Updating trader ${id}:`, traderData);
    const response = await apiService.put<ApiTrader>(`/admin/traders/${id}/`, traderData);
    
    if (response.error) {
      console.error('Error updating trader:', response.error);
      throw new Error(response.error);
    }

    return response.data;
  }

  // Partial update trader
  async patchTrader(id: string, traderData: Partial<UpdateTraderRequest>) {
    console.log(`Patching trader ${id}:`, traderData);
    const response = await apiService.put<ApiTrader>(`/admin/traders/${id}/`, traderData);
    
    if (response.error) {
      console.error('Error patching trader:', response.error);
      throw new Error(response.error);
    }

    return response.data;
  }

  // Delete trader
  async deleteTrader(id: string) {
    console.log(`Deleting trader ${id}`);
    
    if (!id || id === 'undefined') {
      throw new Error('Cannot delete trader: Invalid trader ID');
    }
    
    const response = await apiService.delete(`/admin/traders/${id}/`);
    
    if (response.error) {
      console.error('Error deleting trader:', response.error);
      throw new Error(response.error);
    }

    return true;
  }

  // Get trader full profile
  async getTraderFullProfile(traderId: string) {
    console.log(`Fetching full profile for trader ${traderId} from API...`);
    const response = await apiService.get<TraderFullProfile>(`/admin/traders/${traderId}/full-profile/`);
    
    if (response.error) {
      console.error('Error fetching trader full profile:', response.error);
      throw new Error(response.error);
    }

    return response.data;
    return response.data;
  }

  // Reset trader password
  async resetTraderPassword(email: string) {
    console.log(`Resetting password for trader: ${email}`);
    const response = await apiService.post<{ message: string }>('/admin/reset-trader-password/', { email });
    
    if (response.error) {
      console.error('Error resetting trader password:', response.error);
      throw new Error(response.error);
    }

    return response.data;
  }

  // Impersonate trader
  async impersonateTrader(userId: string) {
    console.log(`Impersonating trader: ${userId}`);
    const response = await apiService.post<{ ticket: string }>('/admin/impersonate/', { user_id: userId });
    
    if (response.error) {
      console.error('Error impersonating trader:', response.error);
      throw new Error(response.error);
    }

    return response.data;
  }
}

export const traderService = new TraderService();

import { apiService } from './apiService';

export interface AffiliateDashboardData {
  summary: {
    total_affiliates: number;
    total_commission: number;
    total_payout_requests: number;
    total_payouts: number;
  };
  top_affiliates: Array<{
    id: string;
    username: string;
    email: string;
    total_commission: number;
  }>;
  recent_referrals: Array<{
    id: string;
    affiliate_username: string;
    referred_username: string;
    challenge_name: string;
    commission_amount: number;
    date_referred: string;
  }>;
  affiliate_clicks: Array<{
    affiliate_id: string;
    affiliate_username: string;
    total_clicks: number;
  }>;
  affiliates: Array<{
    id: string;
    username: string;
    email: string;
    status: string;
    created_at: string;
    profile_picture?: string;
    phone?: string;
  }>;
}

export interface AffiliateReferral {
  id: string;
  affiliate_id: string;
  affiliate_username: string;
  affiliate_email: string;
  referred_user_id: string;
  referred_username: string;
  referred_email: string;
  challenge_name: string;
  commission_amount: number;
  commission_status: 'pending' | 'approved' | 'rejected';
  date_referred: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface AffiliateReferralResponse {
  summary: {
    total_referrals: number;
    total_commission: number;
    by_status: Array<{
      commission_status: string;
      count: number;
      total: number;
    }>;
  };
  results: {
    count: number;
    next: string | null;
    previous: string | null;
    results: AffiliateReferral[];
  };
}

export interface AffiliatePayout {
  id: string;
  affiliate: string;
  amount: number | string;
  status: string;
  requested_at: string;
  processed_at?: string;
  transaction_id?: string;
  is_manual: boolean;
  notes?: string;
}

export interface AffiliatePayoutResponse {
  summary: {
    total_payouts: number;
    approved_paid: number;
    pending_payouts: number;
    by_status: Array<{
      status: string;
      count: number;
      total: number;
    }>;
  };
  results: {
    count: number;
    next: string | null;
    previous: string | null;
    results: AffiliatePayout[];
  };
}

export interface CreateAffiliatePayoutData {
  affiliate: string;
  amount: number;
  status: string;
  processed_at?: string;
  transaction_id?: string;
  is_manual: boolean;
  notes?: string;
}

export interface UpdateAffiliatePayoutData {
  affiliate?: string;
  amount?: number;
  status?: string;
  processed_at?: string;
  transaction_id?: string;
  is_manual?: boolean;
  notes?: string;
}

export interface AffiliateUsersResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: import('@/types/affiliate').AffiliateUser[];
}

export const affiliateService = {
  getDashboard: async (status?: string): Promise<AffiliateDashboardData> => {
    try {
      const response = await apiService.get<AffiliateDashboardData>('/admin/affiliate/dashboard/');
      if (response.error) {
        console.error('Dashboard API Error:', response.error);
        // Return default data structure on error
        return {
          summary: { total_affiliates: 0, total_commission: 0, total_payout_requests: 0, total_payouts: 0 },
          top_affiliates: [],
          recent_referrals: [],
          affiliate_clicks: [],
          affiliates: []
        };
      }
      return response.data || {
        summary: { total_affiliates: 0, total_commission: 0, total_payout_requests: 0, total_payouts: 0 },
        top_affiliates: [],
        recent_referrals: [],
        affiliate_clicks: [],
        affiliates: []
      };
    } catch (error) {
      console.error('Dashboard fetch failed:', error);
      return {
        summary: { total_affiliates: 0, total_commission: 0, total_payout_requests: 0, total_payouts: 0 },
        top_affiliates: [],
        recent_referrals: [],
        affiliate_clicks: [],
        affiliates: []
      };
    }
  },

  getReferrals: async (params?: { 
    commission_status?: string; 
    affiliate_user_id?: string;
    affiliate_user_email?: string;
    referred_username?: string;
    referred_from?: string;
    referred_to?: string;
    search?: string;
    ordering?: string;
    page?: number;
    page_size?: number;
  }): Promise<AffiliateReferralResponse> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.commission_status) queryParams.append('commission_status', params.commission_status);
      if (params?.affiliate_user_id) queryParams.append('affiliate_user_id', params.affiliate_user_id);
      if (params?.affiliate_user_email) queryParams.append('affiliate_user_email', params.affiliate_user_email);
      if (params?.referred_username) queryParams.append('referred_username', params.referred_username);
      if (params?.referred_from) queryParams.append('referred_from', params.referred_from);
      if (params?.referred_to) queryParams.append('referred_to', params.referred_to);
      if (params?.search) queryParams.append('search', params.search);
      if (params?.ordering) queryParams.append('ordering', params.ordering);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
      
      const endpoint = `/admin-affiliate-referrals/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiService.get<AffiliateReferralResponse>(endpoint);
      if (response.error) {
        console.error('Referrals API Error:', response.error);
        return {
          summary: { total_referrals: 0, total_commission: 0, by_status: [] },
          results: { count: 0, next: null, previous: null, results: [] }
        };
      }
      return response.data || {
        summary: { total_referrals: 0, total_commission: 0, by_status: [] },
        results: { count: 0, next: null, previous: null, results: [] }
      };
    } catch (error) {
      console.error('Referrals fetch failed:', error);
      return {
        summary: { total_referrals: 0, total_commission: 0, by_status: [] },
        results: { count: 0, next: null, previous: null, results: [] }
      };
    }
  },

  getReferral: async (id: string): Promise<AffiliateReferral | null> => {
    try {
      const response = await apiService.get<AffiliateReferral>(`/admin-affiliate-referrals/${id}/`);
      if (response.error) {
        console.error('Referral API Error:', response.error);
        return null;
      }
      return response.data || null;
    } catch (error) {
      console.error('Referral fetch failed:', error);
      return null;
    }
  },

  createReferral: async (data: Partial<AffiliateReferral>): Promise<AffiliateReferral | null> => {
    try {
      const response = await apiService.post<AffiliateReferral>('/admin-affiliate-referrals/', data);
      if (response.error) {
        console.error('Create Referral API Error:', response.error);
        return null;
      }
      return response.data || null;
    } catch (error) {
      console.error('Referral creation failed:', error);
      return null;
    }
  },

  updateReferral: async (id: string, data: Partial<AffiliateReferral>): Promise<AffiliateReferral | null> => {
    try {
      const response = await apiService.put<AffiliateReferral>(`/admin-affiliate-referrals/${id}/`, data);
      if (response.error) {
        console.error('Update Referral API Error:', response.error);
        return null;
      }
      return response.data || null;
    } catch (error) {
      console.error('Referral update failed:', error);
      return null;
    }
  },

  deleteReferral: async (id: string): Promise<boolean> => {
    try {
      const response = await apiService.delete(`/admin-affiliate-referrals/${id}/`);
      if (response.error) {
        console.error('Delete Referral API Error:', response.error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Referral deletion failed:', error);
      return false;
    }
  },

  getPayouts: async (params?: { 
    status?: string; 
    is_manual?: boolean;
    affiliate_user_id?: string;
    affiliate_user_email?: string;
    processed_from?: string;
    processed_to?: string;
    search?: string;
    ordering?: string;
    page?: number;
    page_size?: number;
  }): Promise<AffiliatePayoutResponse> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.is_manual !== undefined) queryParams.append('is_manual', params.is_manual.toString());
      if (params?.affiliate_user_id) queryParams.append('affiliate_user_id', params.affiliate_user_id);
      if (params?.affiliate_user_email) queryParams.append('affiliate_user_email', params.affiliate_user_email);
      if (params?.processed_from) queryParams.append('processed_from', params.processed_from);
      if (params?.processed_to) queryParams.append('processed_to', params.processed_to);
      if (params?.search) queryParams.append('search', params.search);
      if (params?.ordering) queryParams.append('ordering', params.ordering);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
      const endpoint = `/admin/affiliate/payouts/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiService.get<AffiliatePayoutResponse>(endpoint);
      if (response.error) {
        console.error('Payouts API Error:', response.error);
        return {
          summary: { total_payouts: 0, approved_paid: 0, pending_payouts: 0, by_status: [] },
          results: { count: 0, next: null, previous: null, results: [] }
        };
      }
      
      const data = response.data;
      
      // API now returns the expected structure directly
      return data || {
        summary: { total_payouts: 0, approved_paid: 0, pending_payouts: 0, by_status: [] },
        results: { count: 0, next: null, previous: null, results: [] }
      };
    } catch (error) {
      console.error('Payouts fetch failed:', error);
      return {
        summary: { total_payouts: 0, approved_paid: 0, pending_payouts: 0, by_status: [] },
        results: { count: 0, next: null, previous: null, results: [] }
      };
    }
  },

  getPayout: async (id: string): Promise<AffiliatePayout | null> => {
    try {
      const response = await apiService.get<AffiliatePayout>(`/admin/affiliate/payouts/${id}/`);
      if (response.error) {
        console.error('Payout API Error:', response.error);
        return null;
      }
      return response.data || null;
    } catch (error) {
      console.error('Payout fetch failed:', error);
      return null;
    }
  },

  createPayout: async (data: CreateAffiliatePayoutData): Promise<AffiliatePayout | null> => {
    try {
      const response = await apiService.post<AffiliatePayout>('/admin/affiliate/payouts/', data);
      if (response.error) {
        console.error('Create Payout API Error:', response.error);
        return null;
      }
      return response.data || null;
    } catch (error) {
      console.error('Payout creation failed:', error);
      return null;
    }
  },

  updatePayout: async (id: string, data: UpdateAffiliatePayoutData): Promise<AffiliatePayout | null> => {
    try {
      const response = await apiService.put<AffiliatePayout>(`/admin/affiliate/payouts/${id}/`, data);
      if (response.error) {
        console.error('Update Payout API Error:', response.error);
        return null;
      }
      return response.data || null;
    } catch (error) {
      console.error('Payout update failed:', error);
      return null;
    }
  },

  deletePayout: async (id: string): Promise<boolean> => {
    try {
      const response = await apiService.delete(`/admin/affiliate/payouts/${id}/`);
      if (response.error) {
        console.error('Delete Payout API Error:', response.error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Payout deletion failed:', error);
      return false;
    }
  },

  // Affiliate Tier methods
  getAffiliateTiers: async (): Promise<import('@/types/affiliate').AffiliateCommissionTier[]> => {
    try {
      const response = await apiService.get('/admin/affiliate-tiers/');
      if (response.error) {
        console.error('Get Affiliate Tiers API Error:', response.error);
        return [];
      }
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Affiliate tiers fetch failed:', error);
      return [];
    }
  },

  getAffiliateTier: async (id: string): Promise<import('@/types/affiliate').AffiliateCommissionTier | null> => {
    try {
      const response = await apiService.get(`/admin/affiliate-tiers/${id}/`);
      if (response.error) {
        console.error('Get Affiliate Tier API Error:', response.error);
        return null;
      }
      return (response.data as import('@/types/affiliate').AffiliateCommissionTier) || null;
    } catch (error) {
      console.error('Affiliate tier fetch failed:', error);
      return null;
    }
  },

  createAffiliateTier: async (data: import('@/types/affiliate').CreateAffiliateCommissionTierData): Promise<import('@/types/affiliate').AffiliateCommissionTier | null> => {
    try {
      const response = await apiService.post('/admin/affiliate-tiers/', data);
      if (response.error) {
        console.error('Create Affiliate Tier API Error:', response.error);
        throw new Error(response.error);
      }
      return (response.data as import('@/types/affiliate').AffiliateCommissionTier) || null;
    } catch (error) {
      console.error('Affiliate tier creation failed:', error);
      throw error;
    }
  },

  updateAffiliateTier: async (id: string, data: import('@/types/affiliate').UpdateAffiliateCommissionTierData): Promise<import('@/types/affiliate').AffiliateCommissionTier | null> => {
    try {
      const response = await apiService.put(`/admin/affiliate-tiers/${id}/`, data);
      if (response.error) {
        console.error('Update Affiliate Tier API Error:', response.error);
        throw new Error(response.error);
      }
      return (response.data as import('@/types/affiliate').AffiliateCommissionTier) || null;
    } catch (error) {
      console.error('Affiliate tier update failed:', error);
      throw error;
    }
  },

  deleteAffiliateTier: async (id: string): Promise<void> => {
    try {
      const response = await apiService.delete(`/admin/affiliate-tiers/${id}/`);
      if (response.error) {
        console.error('Delete Affiliate Tier API Error:', response.error);
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Affiliate tier deletion failed:', error);
      throw error;
    }
  },

  // Affiliate Users CRUD
  getAffiliateUsers: async (params?: any): Promise<AffiliateUsersResponse> => {
    try {
      const qp = new URLSearchParams();
      Object.entries(params || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          qp.append(key, String(value));
        }
      });
      const url = qp.toString() ? `/admin/affiliates/?${qp.toString()}` : '/admin/affiliates/';
      const response = await apiService.get<import('@/types/affiliate').AffiliateUser[]>(url);
      if (response.error) {
        console.error('Get Affiliate Users API Error:', response.error);
        return { results: [], count: 0, next: null, previous: null };
      }
      
      // API returns simple array, convert to paginated format
      const users = response.data || [];
      return {
        results: users,
        count: users.length,
        next: null,
        previous: null
      };
    } catch (error) {
      console.error('Affiliate users fetch failed:', error);
      return { results: [], count: 0, next: null, previous: null };
    }
  },

  getAffiliateUser: async (id: string): Promise<import('@/types/affiliate').AffiliateUser | null> => {
    try {
      const response = await apiService.get(`/admin/affiliates/${id}/`);
      if (response.error) {
        console.error('Get Affiliate User API Error:', response.error);
        return null;
      }
      return (response.data as import('@/types/affiliate').AffiliateUser) || null;
    } catch (error) {
      console.error('Affiliate user fetch failed:', error);
      return null;
    }
  },

  createAffiliateUser: async (data: import('@/types/affiliate').CreateAffiliateUserData): Promise<import('@/types/affiliate').AffiliateUser | null> => {
    try {
      const response = await apiService.post('/admin/affiliates/', data);
      if (response.error) {
        console.error('Create Affiliate User API Error:', response.error);
        throw new Error(response.error);
      }
      return (response.data as import('@/types/affiliate').AffiliateUser) || null;
    } catch (error) {
      console.error('Affiliate user creation failed:', error);
      throw error;
    }
  },

  updateAffiliateUser: async (id: string, data: import('@/types/affiliate').UpdateAffiliateUserData): Promise<import('@/types/affiliate').AffiliateUser | null> => {
    try {
      const response = await apiService.put(`/admin/affiliates/${id}/`, data);
      if (response.error) {
        console.error('Update Affiliate User API Error:', response.error);
        throw new Error(response.error);
      }
      return (response.data as import('@/types/affiliate').AffiliateUser) || null;
    } catch (error) {
      console.error('Affiliate user update failed:', error);
      throw error;
    }
  },

  deleteAffiliateUser: async (id: string): Promise<void> => {
    try {
      const response = await apiService.delete(`/admin/affiliates/${id}/`);
      if (response.error) {
        console.error('Delete Affiliate User API Error:', response.error);
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Affiliate user deletion failed:', error);
      throw error;
    }
  },

  makeAffiliate: async (data: {
    user_id: string;
    approve_now?: boolean;
    custom_commission?: {
      is_active?: boolean;
      commission_rate?: string;
      fixed_amount_per_referral?: string;
      notes?: string;
    };
  }): Promise<any> => {
    try {
      const response = await apiService.post('/admin/affiliate-management/make-affiliate/', data);
      if (response.error) {
        console.error('Make Affiliate API Error:', response.error);
        throw new Error(response.error);
      }
      return response.data;
    } catch (error) {
      console.error('Make affiliate failed:', error);
      throw error;
    }
  },

  impersonateAffiliateUser: async (userId: string): Promise<{ ticket: string }> => {
    try {
      const response = await apiService.post<{ ticket: string }>('/admin/impersonate/', { user_id: userId });
      if (response.error) {
        console.error('Impersonate Affiliate User API Error:', response.error);
        throw new Error(response.error);
      }
      return response.data;
    } catch (error) {
      console.error('Affiliate user impersonation failed:', error);
      throw error;
    }
  },

  assignReferralCode: async (data: {
    user_id: string;
    referral_code: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: {
      user_id: string;
      username: string;
      email: string;
      referral_code: string;
      approved: boolean;
    };
  }> => {
    try {
      const response = await apiService.post('/admin/affiliate/assign-referral-code/', data);
      if (response.error) {
        console.error('Assign Referral Code API Error:', response.error);
        throw new Error(response.error);
      }
      return response.data as {
        success: boolean;
        message: string;
        data: {
          user_id: string;
          username: string;
          email: string;
          referral_code: string;
          approved: boolean;
        };
      };
    } catch (error) {
      console.error('Assign referral code failed:', error);
      throw error;
    }
  },

  assignTier: async (userId: string, tierId: string | null): Promise<any> => {
    try {
      const response = await apiService.post('/api/admin/affiliate/tier/assign/', {
        user_id: userId,
        tier_id: tierId,
      });
      return response.data;
    } catch (error) {
      console.error('Assign tier failed:', error);
      throw error;
    }
  },

  async getTopAffiliates(params?: any): Promise<import('@/types/affiliate').TopAffiliatesResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, String(value));
          }
        });
      }

      const queryString = queryParams.toString();
      const endpoint = `/admin/affiliate/top/${queryString ? `?${queryString}` : ''}`;

      const response = await apiService.get<import('@/types/affiliate').TopAffiliatesResponse>(endpoint);

      return response.data as import('@/types/affiliate').TopAffiliatesResponse || {
        count: 0,
        next: null,
        previous: null,
        results: []
      };
    } catch (error) {
      console.error('Error fetching top affiliates:', error);
      return {
        count: 0,
        next: null,
        previous: null,
        results: []
      };
    }
  },

  approveAffiliate: async (userId: string): Promise<{ detail: string }> => {
    try {
      const response = await apiService.post(`/admin/affiliates/${userId}/approve/`);
      return response.data as { detail: string };
    } catch (error) {
      console.error('Approve affiliate failed:', error);
      throw error;
    }
  },

  disapproveAffiliate: async (userId: string): Promise<{ detail: string }> => {
    try {
      const response = await apiService.post(`/admin/affiliates/${userId}/disapprove/`);
      return response.data as { detail: string };
    } catch (error) {
      console.error('Disapprove affiliate failed:', error);
      throw error;
    }
  },

  resetAffiliatePassword: async (data: { user_id?: string; email?: string }): Promise<{ message: string }> => {
    try {
      const response = await apiService.post('/admin/reset-affiliate-password/', data);
      return response.data as { message: string };
    } catch (error) {
      console.error('Reset affiliate password failed:', error);
      throw error;
    }
  },

  convertToClient: async (data: { user_id?: string; email?: string }): Promise<{
    success: boolean;
    user: {
      id: string;
      email: string;
      username: string;
      role: string;
      status: string;
    };
    client_profile: {
      id: number | null;
      created: boolean;
    };
    role_changed: boolean;
  }> => {
    try {
      const response = await apiService.post('/admin/affiliate/convert-to-client/', data);
      return response.data as any;
    } catch (error) {
      console.error('Convert to client failed:', error);
      throw error;
    }
  },
};
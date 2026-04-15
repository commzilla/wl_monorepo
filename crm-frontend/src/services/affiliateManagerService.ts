import { apiService } from './apiService';

export interface AffiliateOverview {
  user: {
    id: string;
    name: string;
    email: string;
    status: string;
    phone: string;
    created_at: string;
  };
  profile: {
    id: number;
    user_email: string;
    user_name: string;
    referral_code: string;
    approved: boolean;
    website_url: string;
    promotion_strategy: string;
    referral_count: number;
    current_tier_name: string;
    effective_rate: string;
    effective_fixed_amount: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  wallet: {
    id: number;
    affiliate_email: string;
    balance: string;
    total_earned: string;
    last_updated: string;
  } | null;
  custom_commission: {
    id: number;
    affiliate_email: string;
    is_active: boolean;
    commission_rate: string | null;
    fixed_amount_per_referral: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  stats: {
    total_referrals: number;
    approved_referrals: number;
    total_payouts: number;
    total_earned: string;
  };
}

export interface AffiliateWalletDetail {
  wallet: {
    id: number;
    affiliate_email: string;
    balance: string;
    total_earned: string;
    last_updated: string;
  };
  recent_transactions: Array<{
    id: number;
    transaction_type: string;
    transaction_type_display: string;
    amount: string;
    status: string;
    status_display: string;
    note: string;
    created_at: string;
  }>;
}

export const affiliateManagerService = {
  getOverview: async (userId: string): Promise<AffiliateOverview> => {
    const response = await apiService.get(`/admin/affiliate-manager/${userId}/overview/`);
    return response.data as AffiliateOverview;
  },

  getReferrals: async (userId: string): Promise<any[]> => {
    const response = await apiService.get(`/admin/affiliate-manager/${userId}/referrals/`);
    return response.data as any[];
  },

  getPayouts: async (userId: string): Promise<any[]> => {
    const response = await apiService.get(`/admin/affiliate-manager/${userId}/payouts/`);
    return response.data as any[];
  },

  getWallet: async (userId: string): Promise<AffiliateWalletDetail> => {
    const response = await apiService.get(`/admin/affiliate-manager/${userId}/wallet/`);
    return response.data as AffiliateWalletDetail;
  },

  adjustWallet: async (userId: string, amount: number, note: string): Promise<{ detail: string; new_balance: string }> => {
    const response = await apiService.post(`/admin/affiliate-manager/${userId}/adjust_wallet/`, {
      amount,
      note,
    });
    return response.data as { detail: string; new_balance: string };
  },

  setCustomCommission: async (
    userId: string,
    data: {
      is_active: boolean;
      commission_rate?: string;
      fixed_amount_per_referral?: string;
      notes?: string;
    }
  ): Promise<any> => {
    const response = await apiService.post(`/admin/affiliate-manager/${userId}/set_custom_commission/`, data);
    return response.data;
  },

  disableCustomCommission: async (userId: string): Promise<{ detail: string }> => {
    const response = await apiService.delete(`/admin/affiliate-manager/${userId}/disable_custom_commission/`);
    return response.data as { detail: string };
  },
};

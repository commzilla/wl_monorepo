import { apiService } from './apiService';
import type { PayoutPolicy, PayoutSplitTier, CreatePayoutPolicyData, CreatePayoutSplitTierData } from '@/lib/types/payoutPolicy';

export class PayoutPolicyService {
  // Payout Policies
  async getPayoutPolicies(): Promise<PayoutPolicy[]> {
    const response = await apiService.get<PayoutPolicy[]>('/admin/payout-policies/');
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data || [];
  }

  async createPayoutPolicy(data: CreatePayoutPolicyData): Promise<PayoutPolicy> {
    const response = await apiService.post<PayoutPolicy>('/admin/payout-policies/', data);
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data;
  }

  async updatePayoutPolicy(id: string, data: CreatePayoutPolicyData): Promise<PayoutPolicy> {
    const response = await apiService.put<PayoutPolicy>(`/admin/payout-policies/${id}/`, data);
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data;
  }

  async deletePayoutPolicy(id: string): Promise<void> {
    const response = await apiService.delete(`/admin/payout-policies/${id}/`);
    if (response.error) {
      throw new Error(response.error);
    }
  }

  // Payout Split Tiers
  async getPayoutSplitTiers(): Promise<PayoutSplitTier[]> {
    const response = await apiService.get<PayoutSplitTier[]>('/admin/payout-split-tiers/');
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data || [];
  }

  async createPayoutSplitTier(data: CreatePayoutSplitTierData): Promise<PayoutSplitTier> {
    const response = await apiService.post<PayoutSplitTier>('/admin/payout-split-tiers/', data);
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data;
  }

  async updatePayoutSplitTier(id: string, data: CreatePayoutSplitTierData): Promise<PayoutSplitTier> {
    const response = await apiService.put<PayoutSplitTier>(`/admin/payout-split-tiers/${id}/`, data);
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data;
  }

  async deletePayoutSplitTier(id: string): Promise<void> {
    const response = await apiService.delete(`/admin/payout-split-tiers/${id}/`);
    if (response.error) {
      throw new Error(response.error);
    }
  }
}

export const payoutPolicyService = new PayoutPolicyService();
import { apiService } from './apiService';
import type { WeCoinWallet, AdjustBalanceData } from '@/lib/types/weCoinWallet';

const BASE_URL = '/admin/reward/wallets';

export const weCoinWalletService = {
  getAll: async (params?: {
    search?: string;
    ordering?: string;
  }): Promise<WeCoinWallet[]> => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.ordering) queryParams.append('ordering', params.ordering);
    
    const url = queryParams.toString() ? `${BASE_URL}?${queryParams}` : BASE_URL;
    const response = await apiService.get<WeCoinWallet[]>(url);
    return response.data || [];
  },

  getById: async (id: number): Promise<WeCoinWallet> => {
    const response = await apiService.get<WeCoinWallet>(`${BASE_URL}/${id}`);
    if (!response.data) {
      throw new Error('Wallet not found');
    }
    return response.data;
  },

  adjustBalance: async (id: number, data: AdjustBalanceData): Promise<{ detail: string; new_balance: number }> => {
    const response = await apiService.post<{ detail: string; new_balance: number }>(
      `${BASE_URL}/${id}/adjust_balance/`,
      data
    );
    if (!response.data) {
      throw new Error('Failed to adjust balance');
    }
    return response.data;
  },
};

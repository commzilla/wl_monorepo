import { apiService } from './apiService';
import type { 
  RedeemItemSummary, 
  RedemptionListItem, 
  RedemptionActionData, 
  RedemptionActionResponse 
} from '@/lib/types/redemption';

export const redemptionService = {
  getDashboard: async () => {
    return apiService.get<RedeemItemSummary[]>('/admin/reward/redeem-dashboard/');
  },

  getItemRedemptions: async (itemId: string, status?: string) => {
    const queryParams = new URLSearchParams();
    if (status) queryParams.append('status', status);
    
    const endpoint = `/admin/reward/redeem-dashboard/${itemId}/redemptions/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.get<RedemptionListItem[]>(endpoint);
  },

  performAction: async (redemptionId: string, data: RedemptionActionData) => {
    return apiService.post<RedemptionActionResponse>(
      `/admin/reward/redemption-actions/${redemptionId}/action/`,
      data
    );
  },
};

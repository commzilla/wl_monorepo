import { apiService } from '@/services/apiService';
import { WeCoinsOverviewResponse } from '@/lib/types/weCoinsOverview';

export const profileManagerWeCoinsService = {
  async getUserOverview(userId: string, limit = 200): Promise<WeCoinsOverviewResponse> {
    const primaryEndpoint = `/admin/users/wecoins/${userId}/?limit=${limit}`;
    const fallbackEndpoint = `/admin/users/${userId}/wecoins/?limit=${limit}`;

    const primaryResponse = await apiService.get<WeCoinsOverviewResponse>(primaryEndpoint);
    if (!primaryResponse.error && primaryResponse.data) {
      return primaryResponse.data;
    }

    const fallbackResponse = await apiService.get<WeCoinsOverviewResponse>(fallbackEndpoint);
    if (fallbackResponse.error || !fallbackResponse.data) {
      throw new Error(fallbackResponse.error || primaryResponse.error || 'Failed to fetch WeCoins overview');
    }

    return fallbackResponse.data;
  },
};

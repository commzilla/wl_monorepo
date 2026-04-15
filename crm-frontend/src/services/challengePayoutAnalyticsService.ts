import { apiService } from './apiService';
import { ChallengePayoutAnalytics } from '@/lib/types/challengePayoutAnalytics';

class ChallengePayoutAnalyticsService {
  async getChallengeWisePayouts(): Promise<ChallengePayoutAnalytics[]> {
    console.log('Fetching challenge-wise payout analytics...');
    
    const response = await apiService.get<ChallengePayoutAnalytics[]>('/admin/analytics/challenge-wise-payouts/');
    
    if (response.error) {
      console.error('Error fetching challenge-wise payout analytics:', response.error);
      throw new Error(response.error);
    }

    console.log('Challenge-wise payout analytics received:', response.data);
    return response.data;
  }
}

export const challengePayoutAnalyticsService = new ChallengePayoutAnalyticsService();

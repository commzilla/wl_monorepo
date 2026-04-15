import { apiService } from './apiService';
import { AccountSizePayoutAnalytics } from '@/lib/types/accountSizePayoutAnalytics';

class AccountSizePayoutAnalyticsService {
  async getAccountSizeWisePayouts(): Promise<AccountSizePayoutAnalytics[]> {
    console.log('Fetching account size-wise payout analytics...');
    
    const response = await apiService.get<AccountSizePayoutAnalytics[]>('/admin/analytics/account-size-wise-payouts/');
    
    if (response.error) {
      console.error('Error fetching account size-wise payout analytics:', response.error);
      throw new Error(response.error);
    }

    console.log('Account size-wise payout analytics received:', response.data);
    return response.data;
  }
}

export const accountSizePayoutAnalyticsService = new AccountSizePayoutAnalyticsService();

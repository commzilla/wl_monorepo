import { apiService } from './apiService';
import { ConsistencyCheckResponse } from '@/lib/types/consistencyCheck';

export const consistencyCheckService = {
  async getConsistencyReport(payoutId: string, refresh: boolean = false): Promise<ConsistencyCheckResponse> {
    const url = `/admin/payout-report/run-consistency/${payoutId}/${refresh ? '?refresh=true' : ''}`;
    
    const response = await apiService.post<ConsistencyCheckResponse>(url);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    if (!response.data) {
      throw new Error('No data returned from consistency check');
    }
    
    return response.data;
  },
};

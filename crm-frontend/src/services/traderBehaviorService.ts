import { apiService } from './apiService';
import { TraderBehaviorResponse, TraderBehaviorFilters } from '@/lib/types/traderBehavior';

export const traderBehaviorService = {
  getTraderBehaviorAnalytics: async (filters?: TraderBehaviorFilters): Promise<TraderBehaviorResponse> => {
    const params = new URLSearchParams();
    
    if (filters?.program) params.append('program', filters.program);
    if (filters?.country) params.append('country', filters.country);
    if (filters?.account_size) params.append('account_size', filters.account_size);
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    if (filters?.trade_from) params.append('trade_from', filters.trade_from);
    if (filters?.trade_to) params.append('trade_to', filters.trade_to);
    
    const queryString = params.toString();
    const endpoint = queryString 
      ? `/admin/analytics/trader-behavior/?${queryString}`
      : '/admin/analytics/trader-behavior/';
    
    const response = await apiService.get<TraderBehaviorResponse>(endpoint);
    return response.data!;
  },
};

import { apiService } from './apiService';
import { StopLossHistoryResponse, StopLossHistoryFilters } from '@/lib/types/stopLossHistory';

const BASE_URL = '/admin/stoploss-history';

class StopLossHistoryService {
  async getStopLossHistory(filters?: StopLossHistoryFilters, page: number = 1): Promise<StopLossHistoryResponse> {
    const params = new URLSearchParams();
    
    if (page > 1) {
      params.append('page', page.toString());
    }
    
    if (filters) {
      if (filters.position_id) params.append('position_id', filters.position_id);
      if (filters.login) params.append('login', filters.login);
      if (filters.symbol) params.append('symbol', filters.symbol);
      if (filters.side) params.append('side', filters.side);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      if (filters.search) params.append('search', filters.search);
    }
    
    const queryString = params.toString();
    const endpoint = queryString ? `${BASE_URL}/?${queryString}` : `${BASE_URL}/`;
    
    const response = await apiService.get<StopLossHistoryResponse>(endpoint);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data!;
  }
}

export const stopLossHistoryService = new StopLossHistoryService();

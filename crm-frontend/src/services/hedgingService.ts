import { apiService } from './apiService';
import type { 
  HedgingDetectRequest, 
  HedgingDetectResponse, 
  HedgingFindSimilarRequest, 
  HedgingFindSimilarResponse 
} from '@/lib/types/hedging';

export const hedgingService = {
  async detectHedging(request: HedgingDetectRequest): Promise<HedgingDetectResponse> {
    const response = await apiService.post<HedgingDetectResponse>('/admin/risk/hedging/detect/', request);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data!;
  },

  async findSimilarHedging(request: HedgingFindSimilarRequest): Promise<HedgingFindSimilarResponse> {
    const response = await apiService.post<HedgingFindSimilarResponse>('/admin/risk/hedging/find-similar/', request);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data!;
  },
};

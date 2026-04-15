 import { apiService } from './apiService';
import type { CopyTradingDetectRequest, CopyTradingDetectResponse, FindSimilarRequest, FindSimilarResponse } from '@/lib/types/copyTrading';
 
 export const copyTradingService = {
   async detectCopyTrading(request: CopyTradingDetectRequest): Promise<CopyTradingDetectResponse> {
     const response = await apiService.post<CopyTradingDetectResponse>('/admin/risk/copy-trading/detect/', request);
     
     if (response.error) {
       throw new Error(response.error);
     }
     
     return response.data!;
   },

  async findSimilarAccounts(request: FindSimilarRequest): Promise<FindSimilarResponse> {
    const response = await apiService.post<FindSimilarResponse>('/admin/risk/copy-trading/find-similar/', request);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data!;
  },
 };
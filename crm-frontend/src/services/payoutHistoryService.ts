import { apiService } from './apiService';
import { PayoutHistoryResponse } from '@/lib/types/payoutHistory';

export interface CreateManualPayoutRequest {
  amount: number;
  profit: number;
  profit_share: number;
  method: 'paypal' | 'bank' | 'crypto' | 'rise';
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled';
  admin_note?: string;
  method_details?: Record<string, any>;
}

export interface CreateManualPayoutResponse {
  message: string;
  payout_id: string;
  enrollment_id: string;
  amount: string;
  profit: string;
  profit_share: string;
  status: string;
}

export class PayoutHistoryService {
  async getPayoutHistory(enrollmentId: string): Promise<PayoutHistoryResponse> {
    const response = await apiService.get<PayoutHistoryResponse>(
      `/admin/enrollments/payout-history/${enrollmentId}/`
    );
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  }

  async createManualPayout(enrollmentId: string, data: CreateManualPayoutRequest): Promise<CreateManualPayoutResponse> {
    const response = await apiService.post<CreateManualPayoutResponse>(
      `/admin/enrollments/manual-payout/${enrollmentId}/`,
      data
    );
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  }
}

export const payoutHistoryService = new PayoutHistoryService();
import { apiService } from './apiService';

export interface PayoutActionData {
  status: 'approved' | 'rejected';
  admin_note?: string;
  rejection_reason?: string;
  is_custom_amount?: boolean;
  exclude_amount?: number;
  exclude_reason?: string;
}

export interface PayoutActionResponse {
  detail: string;
}

export interface ExtendReviewData {
  extension_business_days?: number;
}

export interface ExtendReviewResponse {
  id: string;
  status: string;
  extended_review_until: string;
  extended_review_days: number;
}

export class PayoutService {
  async updatePayoutAction(payoutId: string, data: PayoutActionData): Promise<PayoutActionResponse> {
    const response = await apiService.put<PayoutActionResponse>(`/admin/trader-payouts/action/${payoutId}/`, data);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  }

  async extendReview(payoutId: string, data: ExtendReviewData): Promise<ExtendReviewResponse> {
    const response = await apiService.post<ExtendReviewResponse>(`/admin/payouts/${payoutId}/extend-review/`, data);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  }
}

export const payoutService = new PayoutService();
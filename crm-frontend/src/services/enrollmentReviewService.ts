import { apiService } from './apiService';
import { EnrollmentReviewResponse, OpenTradesResponse, CloseTradesResponse, FundsRequest, FundsResponse, BlockAccountRequest, BlockAccountResponse, BrokerDetailsResponse, MT5AccountDetailsResponse, SnapshotsResponse } from '@/lib/types/enrollmentReview';
import { EnrollmentEventsResponse } from '@/lib/types/enrollmentEvents';
import { EnrollmentEventLog } from '@/lib/types/eventLog';

export interface AccountMetrics {
  initial_balance: number;
  live_balance: number;
  live_equity: number;
  profit_loss: number;
  daily_starting_balance: number;
  daily_drawdown: {
    amount: number | null;
    percentage: number | null;
  };
  profit_target: {
    amount: number | null;
    percentage: number | null;
  };
  global_drawdown: {
    amount: number | null;
    percentage: number | null;
  };
}

export interface AccountMetricsResponse {
  success: boolean;
  enrollment_id: string;
  metrics: AccountMetrics;
}

export interface TransitionLog {
  id: number;
  from_status: string;
  to_status: string;
  reason: string;
  meta: any;
  created_at: string;
}

class EnrollmentReviewService {
  async getEnrollmentReview(enrollmentId: string): Promise<EnrollmentReviewResponse> {
    const response = await apiService.get<EnrollmentReviewResponse>(`/admin/enrollments/review/${enrollmentId}/`);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  }

  async getOpenTrades(enrollmentId: string): Promise<OpenTradesResponse> {
    const response = await apiService.get<OpenTradesResponse>(`/admin/enrollments/open-trades/${enrollmentId}/`);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  }

  async closeAllTrades(enrollmentId: string): Promise<CloseTradesResponse> {
    const response = await apiService.post<CloseTradesResponse>(`/admin/enrollments/close-trades/${enrollmentId}/`, {});
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  }

  async manageFunds(enrollmentId: string, request: FundsRequest): Promise<FundsResponse> {
    const response = await apiService.post<FundsResponse>(`/admin/enrollments/funds/${enrollmentId}/`, request);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  }

  async blockAccount(enrollmentId: string, request: BlockAccountRequest): Promise<BlockAccountResponse> {
    const response = await apiService.post<BlockAccountResponse>(`/admin/enrollments/block/${enrollmentId}/`, request);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  }

  async getBrokerDetails(enrollmentId: string): Promise<BrokerDetailsResponse> {
    const response = await apiService.get<BrokerDetailsResponse>(`/admin/enrollments/accounts/${enrollmentId}/`);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  }

  async getEnrollmentEvents(enrollmentId: string): Promise<EnrollmentEventsResponse> {
    const response = await apiService.get<EnrollmentEventsResponse>(`/admin/enrollments/events/${enrollmentId}/`);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  }

  async getTransitionLogs(enrollmentId: string): Promise<TransitionLog[]> {
    console.log(`Fetching transition logs for enrollment: ${enrollmentId}`);
    
    const response = await apiService.get<TransitionLog[]>(`/admin/enrollments/logs/${enrollmentId}/`);
    
    if (response.error) {
      console.error('Error fetching transition logs:', response.error);
      throw new Error(response.error);
    }
    
    return response.data || [];
  }

  async getAccountDetails(enrollmentId: string): Promise<MT5AccountDetailsResponse> {
    const response = await apiService.get<MT5AccountDetailsResponse>(`/admin/enrollments/account/details/${enrollmentId}/`);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  }

  async getSnapshots(enrollmentId: string): Promise<SnapshotsResponse> {
    const response = await apiService.get<SnapshotsResponse>(`/admin/enrollments/snapshots/${enrollmentId}/`);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  }

  async getAccountMetrics(enrollmentId: string): Promise<AccountMetricsResponse> {
    const response = await apiService.get<AccountMetricsResponse>(`/admin/enrollments/metrics/${enrollmentId}/`);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  }

  async getBreachHistory(enrollmentId: string): Promise<any> {
    const response = await apiService.get<any>(
      `/admin/enrollments/breach-history/${enrollmentId}/`
    );
    return response.data;
  }

  async getMT5Trades(mt5AccountId: string, method: 'equity' | 'mt5-api' = 'equity'): Promise<any[]> {
    const endpoint = method === 'mt5-api' 
      ? `/admin/mt5-trades/mt5-api/?mt5_id=${mt5AccountId}`
      : `/admin/mt5-trades/?mt5_id=${mt5AccountId}`;
    const response = await apiService.get<any[]>(endpoint);
    return response.data;
  }

  async getEnrollmentEventLogs(enrollmentId: string): Promise<EnrollmentEventLog[]> {
    const response = await apiService.get<EnrollmentEventLog[]>(`/admin/enrollments/event-logs/${enrollmentId}/`);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  }

  async manualUpgrade(enrollmentId: string, request: { new_status: string; reason?: string }): Promise<{ message: string; from_status: string; to_status: string; phase_type: string; mt5_created: boolean; mt5_account_id: string | null }> {
    const response = await apiService.post<{ message: string; from_status: string; to_status: string; phase_type: string; mt5_created: boolean; mt5_account_id: string | null }>(`/admin/enrollments/manual-upgrade/${enrollmentId}/`, request);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  }
}

export const enrollmentReviewService = new EnrollmentReviewService();
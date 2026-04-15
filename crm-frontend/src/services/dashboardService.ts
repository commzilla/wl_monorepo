import { apiService } from './apiService';
import { PayoutAnalyticsData, PayoutDateFilterParams } from '@/lib/types/payoutAnalytics';
import { OrderAnalyticsData } from '@/lib/types/orderAnalytics';
import { TradeAnalyticsData } from '@/lib/types/tradeAnalytics';

export interface DashboardOverview {
  // New metrics
  total_users: number;
  total_challenges: number;
  phase_1: number;
  phase_2: number;
  live_accounts: number;
  total_payouts: {
    count: number;
    amount: number;
    status_wise: {
      [key: string]: number;
    };
  };
  number_of_payouts: number;
  average_payout: number;
  
  // Existing metrics
  active_traders: number;
  active_challenges: number;
  completed_challenges: number;
  total_balance: number;
  pending_payouts: number;
  pending_kyc: number;
}

export interface RecentChallenge {
  trader_name: string;
  challenge_name: string;
  phase_status: string;
  start_date: string;
  days_left: number | null;
}

export interface RecentPayout {
  trader_name: string;
  amount: number;
  status: string;
  time_ago: string;
}

export interface RecentKyc {
  trader_name: string;
  status: string;
  time_ago: string;
}

export interface DashboardData {
  overview: DashboardOverview;
  recent_challenges: RecentChallenge[];
  recent_payouts: RecentPayout[];
  recent_kyc: RecentKyc[];
}

class DashboardService {
  async getDashboardData(): Promise<DashboardData> {
    console.log('Fetching dashboard data from API...');
    
    const response = await apiService.get<DashboardData>('/admin/dashboard/');
    
    if (response.error) {
      console.error('Error fetching dashboard data:', response.error);
      throw new Error(response.error);
    }

    console.log('Dashboard data received:', response.data);
    return response.data;
  }

  async getPayoutAnalytics(filters?: PayoutDateFilterParams): Promise<PayoutAnalyticsData> {
    console.log('Fetching payout analytics from API...');

    const params = new URLSearchParams();
    if (filters?.quick && filters.quick !== 'all') {
      params.append('quick', filters.quick);
    }
    if (filters?.date_from) {
      params.append('date_from', filters.date_from);
    }
    if (filters?.date_to) {
      params.append('date_to', filters.date_to);
    }

    const queryString = params.toString();
    const url = `/admin/analytics/payouts/${queryString ? `?${queryString}` : ''}`;

    const response = await apiService.get<PayoutAnalyticsData>(url);

    if (response.error) {
      console.error('Error fetching payout analytics:', response.error);
      throw new Error(response.error);
    }

    console.log('Payout analytics received:', response.data);
    return response.data;
  }

  async getOrderAnalytics(): Promise<OrderAnalyticsData> {
    console.log('Fetching order analytics from API...');
    
    const response = await apiService.get<OrderAnalyticsData>('/admin/analytics/orders/');
    
    if (response.error) {
      console.error('Error fetching order analytics:', response.error);
      throw new Error(response.error);
    }

    console.log('Order analytics received:', response.data);
    return response.data;
  }

  async getTradeAnalytics(): Promise<TradeAnalyticsData> {
    console.log('Fetching trade analytics from API...');
    
    const response = await apiService.get<TradeAnalyticsData>('/admin/analytics/trades/');
    
    if (response.error) {
      console.error('Error fetching trade analytics:', response.error);
      throw new Error(response.error);
    }

    console.log('Trade analytics received:', response.data);
    return response.data;
  }
}

export const dashboardService = new DashboardService();
import { apiService } from './apiService';

export interface TopEarningTrader {
  user_id: string;
  name: string;
  email: string;
  total_revenue: number;
  total_payouts: number;
  total_affiliate_commission: number;
  net_profit: number;
  profit_margin: number;
  active_accounts: number;
  funded_accounts: number;
  total_accounts: number;
  breached_accounts: number;
}

export interface TopEarningTradersSummary {
  total_traders: number;
  total_revenue_sum: number;
  total_payouts_sum: number;
  total_affiliate_commission_sum: number;
  total_net_profit_sum: number;
  avg_revenue_per_trader: number;
  avg_net_profit_per_trader: number;
}

export interface TopEarningTradersResponse {
  summary: TopEarningTradersSummary;
  count: number;
  traders: TopEarningTrader[];
}

export interface TopEarningTradersFilters {
  from_date?: string;
  to_date?: string;
  min_revenue?: number;
  has_payouts?: boolean;
}

export interface TraderBreakdown {
  client: {
    id: string;
    name: string;
    email: string;
    kyc_status: string | null;
  };
  summary: {
    total_revenue: number;
    total_payouts: number;
    total_affiliate_commission: number;
    net_profit: number;
    profit_margin: number;
    active_accounts: number;
    funded_accounts: number;
    breached_accounts: number;
    total_accounts: number;
  };
  orders: Array<{
    id: string;
    product_name: string;
    order_total_usd: number;
    date_created: string;
    status: string;
    challenge_account_size: number | null;
    challenge_broker_type: string | null;
    mt5_account_id: string | null;
  }>;
  payouts: Array<{
    id: string;
    status: string;
    amount: number;
    released_fund: number;
    profit: number;
    profit_share: number;
    net_profit: number;
    requested_at: string;
    paid_at: string | null;
    method: string;
  }>;
  affiliate_commissions: Array<{
    id: string;
    commission_amount: number;
    commission_status: string;
    challenge_name: string;
    created_at: string;
  }>;
  enrollments: Array<{
    id: string;
    challenge_name: string | null;
    status: string;
    account_size: number;
    currency: string;
    broker_type: string;
    mt5_account_id: string | null;
    is_active: boolean;
    start_date: string | null;
    completed_date: string | null;
    live_start_date: string | null;
    created_at: string;
    updated_at: string;
  }>;
}

export const topEarningTradersService = {
  async getTopEarningTraders(filters?: TopEarningTradersFilters): Promise<TopEarningTradersResponse> {
    const params = new URLSearchParams();
    
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    if (filters?.min_revenue) params.append('min_revenue', filters.min_revenue.toString());
    if (filters?.has_payouts !== undefined) params.append('has_payouts', filters.has_payouts.toString());

    const queryString = params.toString();
    const endpoint = `/admin/risk/top-earning-traders/${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiService.get<TopEarningTradersResponse>(endpoint);
    return response.data!;
  },

  async getTraderBreakdown(userId: string): Promise<TraderBreakdown> {
    const response = await apiService.get<TraderBreakdown>(`/admin/risk/traders/breakdown/${userId}/`);
    return response.data!;
  },
};

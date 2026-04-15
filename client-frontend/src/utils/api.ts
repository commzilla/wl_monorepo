import { enhancedStorage } from './storage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user_id: string;
  username: string; // This is the email field
  role: string;
  full_name: string;
  profile_picture?: string;
  created_at: string;
}

export interface RefreshTokenResponse {
  access: string;
  refresh: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetResponse {
  message: string;
}

export interface PasswordResetConfirmRequest {
  uid: string;
  token: string;
  new_password: string;
}

export interface PasswordResetConfirmResponse {
  message: string;
}

export interface PasswordChangeRequest {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

export interface PasswordChangeResponse {
  message: string;
}

// Dashboard API Types
export interface DashboardAchievements {
  total_payout: number;
  highest_payout: number;
  best_trade: number;
  longest_funded_days: number;
}

export interface ChallengeCredentials {
  login: string;
  password: string;
  server: string;
}

export interface CurrentPhase {
  name: string;
  profit_target: number;
  max_daily_loss: number;
  max_loss: number;
  trading_period: string;
  min_trading_days: string;
}

export interface ChallengeStep {
  name: string;
}

export interface ChallengeMetrics {
  profit_target: {
    percentage: number;
    maximum: number;
    left: number;
  };
  max_daily_loss: {
    used_percentage: number;
    percentage: number;
    maximum: number;
    left: number;
    time_left_today: string | null;
  };
  max_permitted_loss: {
    used_percentage: number;
    percentage: number;
    maximum: number;
    left: number;
  };
  trading_days: {
    required: string;
    completed: number;
  };
}

export interface ActiveChallenge {
  name: string;
  step_type: string;
  status: string;
  total_phases: number;
  steps: ChallengeStep[];
  current_phase: CurrentPhase;
  account_id: string;
  platform: string;
  start_date: string;
  credentials: ChallengeCredentials;
  metrics: ChallengeMetrics;
  currency?: string;
}

export interface ActiveChallenges {
  count: number;
  list: ActiveChallenge[];
}

export interface TopTrader {
  trader: string;
  profile_picture: string;
  starting_balance: number;
  total_paid: number;
  equity_growth: number;
  place: number;
}

export interface DashboardData {
  achievements: DashboardAchievements;
  active_challenges: ActiveChallenges;
  top_traders: TopTrader[];
}

// My Stats API Types
export interface DailyPL {
  date: string;
  profit: number;
  trades: number;
  lots: number;
}

export interface TradeHistory {
  order: number;
  open_time: string;
  open_price: number;
  close_time: string;
  close_price: number;
  side: string;
  symbol: string;
  volume: number;
  profit: number;
}

export interface MyStatsData {
  selected_enrollment: {
    enrollment_id: string;
    account_id: string;
    challenge_name: string;
    account_size: number;
    currency?: string;
  } | null;
  available_enrollments: {
    enrollment_id: string;
    account_id: string;
    challenge_name: string;
    account_size: number;
    currency?: string;
  }[];
  net_pnl: number;
  win_rate: number;
  avg_rr: number;
  profit_factor: number;
  total_winners: number;
  best_win: number;
  avg_win: number;
  max_win_streak: number;
  total_losers: number;
  worst_loss: number;
  avg_loss: number;
  max_loss_streak: number;
  pnl_daily: DailyPL[];
  best_day: {
    date: string | null;
    profit: number;
  };
  worst_day: {
    date: string | null;
    profit: number;
  };
  trade_history: TradeHistory[];
}

export interface MyStatsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: MyStatsData;
}

// Daily Summary API Types
export interface DailySummaryDay {
  date: string;
  profit: number;
}

export interface MonthlyDailySummaryResponse {
  account_id: number;
  year: number;
  month: number;
  days: DailySummaryDay[];
}

export interface DailyPnlPoint {
  time: string;
  pnl: number;
}

export interface DailyPnlDetailResponse {
  account_id: number;
  date: string;
  profit: number;
  trade_count: number;
  lots: number;
  pnl_chart: DailyPnlPoint[];
}

// EA Approval API Types
export interface ChallengeEnrollment {
  id: string;
  challenge_name: string;
  account_size: string;
  currency: string;
  status: string;
  start_date: string;
  completed_date: string | null;
  live_start_date: string | null;
  is_active: boolean;
  broker_type: string;
  mt5_account_id: string;
  mt5_password: string;
  mt5_investor_password: string;
  created_at: string;
  updated_at: string;
}

export interface EAApprovalRequest {
  id: string;
  client: string;
  enrollment: string;
  mq5_file_url: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// Trading Results API Types
export interface TradingResultTrade {
  ticket: number;
  time: number;
  type: number;
  volume: number;
  symbol: string;
  price: number;
  sl: number;
  tp: number;
  time_msc: number;
  profit: number;
  swap: number;
  commission: number;
  comment: string;
}

export interface TradingResultAccount {
  account_id: number;
  challenge_name: string;
  account_size: number;
  start_date: string;
  end_date: string;
  total_profit: number;
  trade_count: number;
  average_trade_size: number;
  win_ratio: number;
  trades: TradingResultTrade[];
}

export interface TradingResultsResponse {
  results: TradingResultAccount[];
}

// New Trading Results API types based on Django backend
export interface TradingResultData {
  date: string;
  balance: number;
}

export interface TradingResultResponse {
  account_id: number;
  start_date: string;
  end_date: string;
  starting_balance: number;
  equity_today: number;
  // Profit target
  profit_target_line: number;
  // Daily Loss Limit (dynamic, based on current equity)
  max_daily_loss_pct: number; // kept for backward compatibility
  daily_loss_limit_pct: number;
  daily_loss_limit_amount: number;
  daily_loss_floor: number;
  // Max Trailing Drawdown (dynamic, based on current equity)
  max_trailing_drawdown_pct: number;
  max_trailing_drawdown_amount: number;
  max_trailing_drawdown_floor: number;
  data: TradingResultData[];
}

// Grid Challenge Enrollment API Types
export interface GridChallengeEnrollment {
  id: string;
  enrollment_id: string;
  challenge_type: string; // e.g., "100K – 2 Step Phase 1"
  account_number: string; // e.g., "#105502"
  account_size: string;
  balance: string; // e.g., "$50,000.00"
  end_date: string;
  status_label: string; // e.g., "In Progress", "Passed", "Failed", "Payment Required"
  status: string; // raw status: "phase_1_in_progress", "awaiting_payment", etc.
  payment_type: string; // "standard" or "pay_after_pass"
  progress: number; // percentage as number (0-100)
  currency?: string;
  pap_checkout_url: string | null;
  credentials: {
    broker: string;
    server: string;
    login: string;
    password: string;
    investor_password: string;
  };
  metrics: {
    trading_period: string;
    min_trading_days: string;
    max_daily_loss: string;
    max_loss: string;
    profit_target: string;
  };
}

export type GridChallengeResponse = GridChallengeEnrollment[];

// Global refresh promise to ensure only one refresh happens at a time
let currentRefreshPromise: Promise<RefreshTokenResponse> | null = null;

// Token refresh function with rotation support
export const refreshToken = async (): Promise<RefreshTokenResponse> => {
  // If there's already a refresh in progress, return that promise
  if (currentRefreshPromise) {
    return currentRefreshPromise;
  }

  const refreshTokenValue = enhancedStorage.getItem('refresh_token');
  
  if (!refreshTokenValue) {
    throw new Error('No refresh token available');
  }

  console.log('Attempting to refresh token...', { 
    refreshTokenLength: refreshTokenValue.length,
    timestamp: new Date().toISOString()
  });
  
  currentRefreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/client/refresh/`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          refresh: refreshTokenValue
        }),
      });

      console.log('Refresh response status:', response.status, {
        timestamp: new Date().toISOString(),
        ok: response.ok
      });

      if (!response.ok) {
        // Handle blacklisted/invalid refresh token
        if (response.status === 401) {
          console.error('Refresh token is invalid or blacklisted');
          throw new Error('REFRESH_TOKEN_INVALID');
        }
        
        const errorData = await response.json().catch(() => ({}));
        console.error('Token refresh failed:', errorData);
        throw new Error(errorData.detail || `Token refresh failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('Token refresh successful', {
        timestamp: new Date().toISOString(),
        hasNewAccess: !!data.access,
        hasNewRefresh: !!data.refresh,
        newAccessLength: data.access?.length,
        newRefreshLength: data.refresh?.length
      });
      
      // Update both access and refresh tokens (token rotation)
      enhancedStorage.setItem('access_token', data.access, true);
      enhancedStorage.setItem('refresh_token', data.refresh, true);
      
      console.log('Tokens stored successfully, dispatching storage event');
      
      // Dispatch storage event for cross-tab synchronization
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'tokens_updated',
        newValue: JSON.stringify({ access: data.access, refresh: data.refresh, timestamp: Date.now() }),
        url: window.location.href
      }));
      
      return data;
      
      // Dispatch storage event for cross-tab synchronization
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'tokens_updated',
        newValue: JSON.stringify({ access: data.access, refresh: data.refresh, timestamp: Date.now() }),
        url: window.location.href
      }));
      
      return data;
    } finally {
      currentRefreshPromise = null;
    }
  })();

  return currentRefreshPromise;
};

// Enhanced fetch wrapper with automatic token refresh
export const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = enhancedStorage.getItem('access_token');
  
  if (!token) {
    throw new Error('No access token available');
  }

  // Check if body is FormData - if so, don't set Content-Type (browser will set it with boundary)
  const isFormData = options.body instanceof FormData;

  // Add authorization header
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    ...(options.headers as Record<string, string> || {}),
  };

  // Only add Content-Type for non-FormData requests
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // If token expired, try to refresh and retry the request
    if (response.status === 401) {
      console.log('Access token expired, attempting refresh...');
      
      try {
        await refreshToken();
        
        // Retry the original request with new token
        const newToken = enhancedStorage.getItem('access_token');
        const retryHeaders: Record<string, string> = {
          ...headers,
          'Authorization': `Bearer ${newToken}`,
        };
        
        const retryResponse = await fetch(url, {
          ...options,
          headers: retryHeaders,
        });
        
        return retryResponse;
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        
        // If refresh token is invalid/blacklisted, force re-login
        if (refreshError instanceof Error && refreshError.message === 'REFRESH_TOKEN_INVALID') {
          console.log('Refresh token invalid, forcing re-login');
          enhancedStorage.removeItem('user');
          enhancedStorage.removeItem('access_token');
          enhancedStorage.removeItem('refresh_token');
          window.location.href = '/login';
          throw new Error('Session expired. Please login again.');
        }
        
        throw refreshError;
      }
    }

    return response;
  } catch (error) {
    console.error('Authenticated fetch error:', error);
    throw error;
  }
};

export const loginClient = async (credentials: LoginRequest): Promise<LoginResponse> => {
  console.log('Attempting login with credentials:', { username: credentials.username });
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/client/login/`, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Login failed with error:', errorData);
      
      // Show generic error message for login failures
      throw new Error('Invalid username/email or password');
    }

    const data = await response.json();
    console.log('Login successful:', { user_id: data.user_id, username: data.username, role: data.role });
    return data;
  } catch (error) {
    console.error('Network error during login:', error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Please check your internet connection or try again later.');
    }
    
    throw error;
  }
};

// Dashboard API function
export const fetchDashboardData = async (): Promise<DashboardData> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/client/dashboard/`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard data: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
};

export interface AddressInfo {
  first_name?: string;
  last_name?: string;
  company?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  postcode?: string;
  state?: string;
  country?: string;
  email?: string;
  phone?: string;
}

export interface NotificationSettings {
  system_new_challenge: boolean;
  system_announcements: boolean;
  system_risk_alerts: boolean;
  system_community: boolean;
  system_platform: boolean;
  email_new_challenge: boolean;
  email_announcements: boolean;
  email_risk_alerts: boolean;
  email_community: boolean;
  email_platform: boolean;
}

export interface ClientProfile {
  address_info: AddressInfo;
}

export interface ClientPaymentMethod {
  id: string;
  payment_type: 'rise' | 'crypto';
  rise_email?: string;
  crypto_type?: 'usdt_trc20' | 'usdt_erc20' | 'btc' | 'eth' | 'other';
  crypto_wallet_address?: string;
  is_default: boolean;
  label?: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfileSettings {
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: string;
  profile_picture?: string;
  two_factor_enabled: boolean;
  two_factor_method?: 'email' | 'sms' | 'phone_call' | 'auth_app';
  client_profile: ClientProfile;
  notification_settings: NotificationSettings;
  payment_methods: ClientPaymentMethod[];
}

// First Login API Types
export interface ClientInitData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_first_login: boolean;
}

export interface NameUpdateRequest {
  first_name: string;
  last_name: string;
}

// First Login API functions
export const fetchClientInit = async (): Promise<ClientInitData> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/client/dashboard/init/`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch client init data: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching client init data:', error);
    throw error;
  }
};

export const updateClientName = async (data: NameUpdateRequest): Promise<void> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/client/dashboard/init/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to update client name: ${response.status}`);
    }
  } catch (error) {
    console.error('Error updating client name:', error);
    throw error;
  }
};

export const updateUserProfileSettings = async (data: Partial<UserProfileSettings>, profilePictureFile?: File): Promise<UserProfileSettings> => {
  try {
    const token = enhancedStorage.getItem('access_token');
    
    if (!token) {
      throw new Error('No access token available');
    }

    if (profilePictureFile) {
      // When uploading a file, use FormData and let the browser handle everything
      const formData = new FormData();
      formData.append('profile_picture_file', profilePictureFile);
      
      // Only append basic string fields (email is read-only, set at account creation)
      if (data.username) formData.append('username', data.username);
      if (data.first_name) formData.append('first_name', data.first_name);
      if (data.last_name) formData.append('last_name', data.last_name);
      if (data.phone) formData.append('phone', data.phone);
      if (data.date_of_birth) formData.append('date_of_birth', data.date_of_birth);

      const response = await fetch(`${API_BASE_URL}/client/settings/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type - let browser set it with boundary
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to update profile settings: ${response.status}`);
      }

      return await response.json();
    } else {
      // When not uploading a file, use authenticatedFetch with JSON
      const response = await authenticatedFetch(`${API_BASE_URL}/client/settings/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to update profile settings: ${response.status}`);
      }

      return await response.json();
    }
  } catch (error) {
    console.error('Error updating profile settings:', error);
    throw error;
  }
};

export const fetchUserProfileSettings = async (): Promise<UserProfileSettings> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/client/settings/`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch profile settings: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching profile settings:', error);
    throw error;
  }
};

export interface Coupon {
  id: number;
  code: string;
  discount_percent: number;
  usage_limit_per_user: number;
  is_bogo?: boolean;
}

export interface Offer {
  id: number;
  title: string;
  description: string;
  feature_image: string;
  start_date: string;
  end_date: string;
  coupons: Coupon[];
}

export interface OffersResponse {
  active_offers: Offer[];
  past_offers: Offer[];
}

export const fetchActiveOffers = async (): Promise<OffersResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/client/offers/`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch offers: ${response.status}`);
    }

    const data = await response.json();
    return {
      active_offers: data.active_offers || [],
      past_offers: data.past_offers || []
    };
  } catch (error) {
    console.error('Error fetching offers:', error);
    throw error;
  }
};

export interface LeaderboardEntry {
  place: number;
  username: string;
  profile_picture: string | null;
  equity: number;
  profit: number;
  growth_percentage: number;
  won_trade_percent: number;
}

export interface LeaderboardResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: LeaderboardEntry[];
}

export const fetchLeaderboard = async (page: number = 1, pageSize: number = 10): Promise<LeaderboardResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/client/leaderboard/?page=${page}&page_size=${pageSize}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch leaderboard: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    throw error;
  }
};

// My Stats API function
export const fetchMyStats = async (page: number = 1, pageSize: number = 25, enrollmentId?: string): Promise<MyStatsResponse> => {
  try {
    let url = `${API_BASE_URL}/client/mystats/?page=${page}&page_size=${pageSize}`;
    if (enrollmentId) {
      url += `&enrollment_id=${enrollmentId}`;
    }
    const response = await authenticatedFetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch my stats: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching my stats:', error);
    throw error;
  }
};

// Daily Summary API functions
export const fetchMonthlyDailySummary = async (accountId: number, month: string): Promise<MonthlyDailySummaryResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/client/daily-summary/${accountId}/?month=${month}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch monthly daily summary: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching monthly daily summary:', error);
    throw error;
  }
};

export const fetchDailyPnlDetail = async (accountId: number, date: string): Promise<DailyPnlDetailResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/client/daily-summary/${accountId}/${date}/`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch daily PnL detail: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching daily PnL detail:', error);
    throw error;
  }
};

// Trading Results API function - Updated to support date filtering
export const fetchTradingResults = async (accountId: string, startDate?: Date | null, endDate?: Date | null): Promise<TradingResultResponse> => {
  try {
    let url = `${API_BASE_URL}/client/trading-results/?account_id=${accountId}`;
    
    // Add date range parameters if provided
    if (startDate) {
      const startDateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      url += `&start_date=${startDateStr}`;
    }
    
    if (endDate) {
      const endDateStr = endDate.toISOString().split('T')[0]; // YYYY-MM-DD format  
      url += `&end_date=${endDateStr}`;
    }
    
    console.log('🌐 API Call: fetchTradingResults', { accountId, startDate, endDate, url });

    const response = await authenticatedFetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch trading results: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ API Response: fetchTradingResults', data);
    return data;
  } catch (error) {
    console.error('❌ Error fetching trading results:', error);
    throw error;
  }
};

// Keep the old function for backward compatibility (if needed elsewhere)
export const fetchTradingResultsLegacy = async (startDate?: string, endDate?: string): Promise<TradingResultsResponse> => {
  try {
    let url = `${API_BASE_URL}/client/trading-results/`;
    const params = new URLSearchParams();
    
    if (startDate) {
      params.append('start_date', startDate);
    }
    if (endDate) {
      params.append('end_date', endDate);
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await authenticatedFetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch trading results: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching trading results:', error);
    throw error;
  }
};

export interface Certificate {
  id: string;
  certificate_type: 'phase_pass' | 'payout';
  title: string;
  image_url?: string;
  pdf_url?: string;
  issued_date: string;
  expiry_date?: string;
  metadata: Record<string, any>;
}

export interface CertificateResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Certificate[];
}

export const fetchCertificates = async (page: number = 1, pageSize: number = 12): Promise<CertificateResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/certificates/?page=${page}&page_size=${pageSize}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch certificates: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching certificates:', error);
    throw error;
  }
};

export interface WithdrawalAccount {
  enrollment_id: string;
  account_id: string;
  current_balance: number;
  profit: number;
  profit_share_percent: number;
  trader_share: number;
  next_withdrawal_date: string;
  payment_cycle: string;
  first_payout_delay_days: number;
  subsequent_cycle_days: number;
  min_net_amount: number;
  status: 'eligible' | 'not_eligible';
  message: string;
  currency?: string;
}

export interface WithdrawalSummary {
  current_balance: number;
  withdrawal_profit: number;
  profit_share_percent: number;
  trader_share: number;
  next_withdrawal_date: string;
}

export interface TraderPayoutHistory {
  id: string;
  profit: number;
  profit_share: number;
  net_profit: number;
  amount: number;
  method: 'paypal' | 'bank' | 'crypto' | 'rise';
  method_details: any;
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled' | 'extended_review';
  requested_at: string;
  currency?: string;
  reviewed_at: string | null;
  paid_at: string | null;
  mt5_account_id: string | number | null;
  exclude_amount: number | null;
  exclude_reason: string | null;
  extended_review_until: string | null;
  client_status_label: string;
  extended_review_details?: {
    extended_review_days: number;
    extended_review_until: string;
    note: string;
  } | null;
  rejection_details?: {
    rejection_reason: string;
    admin_note: string;
    reviewed_at: string | null;
  } | null;
  exclude_details?: {
    exclude_amount: number;
    exclude_reason: string;
    is_custom_amount: boolean;
  } | null;
}

export interface RewardTask {
  id: string;
  title: string;
  description: string;
  instructions: string;
  url: string;
  reward_amount: string;
  status: 'active' | 'inactive' | 'expired';
  created_at: string;
  updated_at: string;
  submission_status: 'pending' | 'approved' | 'rejected' | 'declined' | null;
  can_submit: boolean;
  requires_url_submission: boolean;
  example_image?: string;
  feature_image?: string;
  is_expired?: boolean;
  label?: string;
  starts_at?: string | null;
  expires_at?: string | null;
}

export interface RewardSubmission {
  id: string;
  user_name: string;
  task_title: string;
  notes: string | null;
  proof_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_comment: string | null;
  reward_amount: string;
  created_at: string;
}

export interface RewardSubmissionRequest {
  task: string;
  notes?: string;
  proof_url?: string;
  proof_file?: File;
}

export interface RewardSubmissionResponse {
  id: string;
  task: string;
  notes: string;
  proof_url: string;
  status: 'pending' | 'approved' | 'declined';
  created_at: string;
}

export interface RedeemItem {
  id: string;
  title: string;
  description: string;
  category: string;
  required_wecoins: string;
  stock_quantity: number | null;
  image_url: string;
  is_expired?: boolean;
  is_available?: boolean;
  can_redeem?: boolean;
  label?: string;
}

export interface Redemption {
  id: string;
  item: string;
  item_title: string;
  item_category: string;
  item_required_wecoins: string;
  item_image: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_comment: string;
  delivery_data: any;
  created_at: string;
  reviewed_at: string | null;
}

export interface WeCoinTransaction {
  id: string;
  type: 'earn' | 'spend';
  amount: string;
  description: string;
  created_at: string;
}

export interface WeCoinWallet {
  id: string;
  balance: string;
  transactions: WeCoinTransaction[];
}

export interface WithdrawalResponse {
  accounts: WithdrawalAccount[];
}

// Eligible accounts interfaces
export interface EligibleAccount {
  enrollment_id: string;
  account_id: string;
  account_size: number;
  balance: number;
  profit: number;
  profit_share: number;
  net_profit: number;
  management_share: number;
  currency: string;
  is_eligible: boolean;
  errors: string[];
  next_eligible_date: string;
  exchange_rate_to_usd?: number;
  profit_usd?: number;
  net_profit_usd?: number;
}

export interface PayoutRequestData {
  enrollment_id: string;
  payment_method_id: string;
}

export interface ClientPayoutResponse {
  detail: string;
  payout_id: number;
  amount: string;
  profit: string;
}

export const fetchEligibleAccounts = async (): Promise<EligibleAccount[]> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/client/payout/eligible-accounts/`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch eligible accounts: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching eligible accounts:', error);
    throw error;
  }
};

export const fetchPaymentMethods = async (): Promise<ClientPaymentMethod[]> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/client/payment-methods/`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch payment methods: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    throw error;
  }
};

export const requestPayout = async (data: PayoutRequestData): Promise<ClientPayoutResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/client/payout/request/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to request payout: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error requesting payout:', error);
    throw error;
  }
};

export const fetchWithdrawalData = async (page: number = 1, pageSize: number = 25): Promise<WithdrawalResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/client/withdrawal/?page=${page}&page_size=${pageSize}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch withdrawal data: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching withdrawal data:', error);
    throw error;
  }
};

export const fetchPayoutHistoryByAccount = async (
  mt5AccountId: string,
  page: number = 1,
  pageSize: number = 25
): Promise<{
  count: number;
  next: string | null;
  previous: string | null;
  results: TraderPayoutHistory[];
}> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/client/payout-history/${mt5AccountId}/?page=${page}&page_size=${pageSize}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch payout history: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching payout history:', error);
    throw error;
  }
};

// Notification API Types
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'kyc' | 'challenge' | 'payout' | 'system' | 'update';
  is_read: boolean;
  created_at: string;
  read_at: string | null;
  action_url: string | null;
  image_url: string | null;
}

// The API returns a direct array, not a paginated response
export const fetchNotifications = async (page: number = 1, pageSize: number = 20): Promise<{ results: Notification[], count: number }> => {
  try {
    console.log('Fetching notifications from API...');
    const response = await authenticatedFetch(`${API_BASE_URL}/client/notifications/?page=${page}&page_size=${pageSize}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch notifications: ${response.status}`);
    }

    const data = await response.json();
    console.log('Notifications API response:', data);
    
    // Handle both array response and paginated response
    if (Array.isArray(data)) {
      return {
        results: data,
        count: data.length
      };
    } else if (data.results && Array.isArray(data.results)) {
      return data;
    } else {
      return {
        results: [],
        count: 0
      };
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    console.log('Marking notification as read:', notificationId);
    const response = await authenticatedFetch(`${API_BASE_URL}/client/notifications/mark-read/${notificationId}/`, {
      method: 'PATCH',
    });

    if (!response.ok) {
      throw new Error(`Failed to mark notification as read: ${response.status}`);
    }
    console.log('Successfully marked notification as read');
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
  try {
    console.log('Deleting notification:', notificationId);
    const response = await authenticatedFetch(`${API_BASE_URL}/client/notifications/${notificationId}/delete/`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete notification: ${response.status}`);
    }
    console.log('Successfully deleted notification');
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

// Affiliate API Types
export interface AffiliatePayout {
  id: string;
  amount: number;
  status: string;
  requested_at: string;
  processed_at: string | null;
}

export interface AffiliateProfile {
  referral_code: string;
  website_url?: string;
  promotion_strategy: string;
  approved: boolean;
  total_referrals: number;
  active_referrals: number;
  total_earnings: number;
  conversion_rate: number;
  approved_earnings: number;
  pending_earnings: number;
  processing_earnings: number;
  rejected_earnings: number;
  wallet_balance: number;
  wallet_total_earned: number;
  recent_payouts: AffiliatePayout[];
}

export interface AffiliateReferral {
  id: string;
  referred_user_email: string;
  date_referred: string;
  challenge_name: string;
  commission_amount: number;
  commission_status: 'pending' | 'approved' | 'processing' | 'rejected';
  note: string;
}

export interface AffiliateReferralResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AffiliateReferral[];
}

export interface CreateAffiliateProfileRequest {
  website_url?: string;
  promotion_strategy: string;
}

export interface PayoutRequest {
  amount: number;
  payment_method_id: string;
  notes?: string;
}

export interface PayoutResponse {
  detail: string;
  payout_id: string;
  amount: number;
  status: string;
}

// Affiliate API functions
export const fetchAffiliateProfile = async (): Promise<AffiliateProfile> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/affiliate/profile/`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch affiliate profile: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching affiliate profile:', error);
    throw error;
  }
};

export const createAffiliateProfile = async (data: CreateAffiliateProfileRequest): Promise<AffiliateProfile> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/affiliate/profile/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to create affiliate profile: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating affiliate profile:', error);
    throw error;
  }
};

export const fetchAffiliateReferrals = async (
  page: number = 1, 
  pageSize: number = 25, 
  filters?: {
    commission_status?: string;
    search?: string;
    start_date?: string;
    end_date?: string;
    ordering?: string;
  }
): Promise<AffiliateReferral[]> => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });

    if (filters?.commission_status) {
      params.append('commission_status', filters.commission_status);
    }
    if (filters?.search) {
      params.append('search', filters.search);
    }
    if (filters?.start_date) {
      params.append('start_date', filters.start_date);
    }
    if (filters?.end_date) {
      params.append('end_date', filters.end_date);
    }
    if (filters?.ordering) {
      params.append('ordering', filters.ordering);
    }

    const response = await authenticatedFetch(`${API_BASE_URL}/affiliate/referrals/?${params.toString()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch affiliate referrals: ${response.status}`);
    }

    const data = await response.json();
    
    // Handle both array response and paginated response
    if (Array.isArray(data)) {
      return data;
    } else if (data.results && Array.isArray(data.results)) {
      return data.results;
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error fetching affiliate referrals:', error);
    throw error;
  }
};



// Request affiliate payout
export const requestAffiliatePayout = async (payoutData: PayoutRequest): Promise<PayoutResponse> => {
  try {
    console.log('Requesting affiliate payout:', payoutData);
    
    const response = await authenticatedFetch(`${API_BASE_URL}/affiliate/payout-request/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payoutData),
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.non_field_errors) {
          errorMessage = Array.isArray(errorData.non_field_errors) 
            ? errorData.non_field_errors.join(', ')
            : errorData.non_field_errors;
        } else if (typeof errorData === 'object' && errorData !== null) {
          // Handle field-specific errors
          const fieldErrors = Object.entries(errorData)
            .map(([field, errors]) => {
              const errorList = Array.isArray(errors) ? errors : [errors];
              return `${field}: ${errorList.join(', ')}`;
            })
            .join('; ');
          if (fieldErrors) {
            errorMessage = fieldErrors;
          }
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('Payout request successful:', data);
    return data;
  } catch (error) {
    console.error('Error requesting payout:', error);
    throw error;
  }
};

// Affiliate Wallet Transaction types
export interface AffiliateWalletTransaction {
  id: string;
  transaction_type: 'commission' | 'payout' | 'bonus' | 'refund';
  transaction_type_display: string;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected';
  status_display: string;
  amount: number;
  note: string;
  created_at: string;
}

export interface WalletTransactionFilters {
  transaction_type?: string;
  status?: string;
  created_at__gte?: string;
  created_at__lte?: string;
}

export interface WalletTransactionsResponse {
  results: AffiliateWalletTransaction[];
  count: number;
  next: string | null;
  previous: string | null;
}

export interface OpenTrade {
  order: number;
  open_time: number;
  open_price: number;
  current_price: number;
  cmd: number;
  symbol: string;
  volume: number;
  profit: number;
}

export interface OpenTradesResponse {
  results: OpenTrade[];
  count: number;
  next: string | null;
  previous: string | null;
}

// Fetch open trades from MT5
export const fetchOpenTrades = async (
  accountId?: string,
  page: number = 1,
  pageSize: number = 10,
  symbol?: string,
  minProfit?: number,
  maxProfit?: number,
  sortBy?: 'profit' | 'volume' | 'open_price',
  sortOrder?: 'asc' | 'desc'
): Promise<OpenTradesResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });

  if (accountId) params.append('account_id', accountId);
  if (symbol) params.append('symbol', symbol);
  if (minProfit !== undefined) params.append('min_profit', minProfit.toString());
  if (maxProfit !== undefined) params.append('max_profit', maxProfit.toString());
  if (sortBy) params.append('sort_by', sortBy);
  if (sortOrder) params.append('sort_order', sortOrder);

  const response = await authenticatedFetch(`${API_BASE_URL}/client/mt5/open-trades/?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch open trades: ${response.statusText}`);
  }
  return response.json();
};

// Fetch affiliate wallet transactions
export const fetchAffiliateWalletTransactions = async (
  page: number = 1,
  pageSize: number = 25,
  filters: WalletTransactionFilters = {}
): Promise<WalletTransactionsResponse> => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });

    // Add filters to params
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.append(key, value);
      }
    });

    console.log('Fetching wallet transactions with params:', params.toString());
    console.log('Full API URL:', `${API_BASE_URL}/affiliate/wallet/transactions/?${params.toString()}`);
    
    const response = await authenticatedFetch(`${API_BASE_URL}/affiliate/wallet/transactions/?${params.toString()}`, {
      method: 'GET',
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Raw wallet transactions response:', data);
    console.log('Response type:', typeof data);
    console.log('Is array?', Array.isArray(data));
    console.log('Has results property?', 'results' in data);
    
    const result = {
      results: data.results || data, // Handle both paginated and non-paginated responses
      count: data.count || data.length || 0,
      next: data.next || null,
      previous: data.previous || null,
    };
    
    console.log('Final processed result:', result);
    return result;
  } catch (error) {
    console.error('Error fetching wallet transactions:', error);
    throw error;
  }
};

// EA Approval API Functions
export const fetchActiveChallenges = async (): Promise<ChallengeEnrollment[]> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/client/challenges/active/`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch active challenges: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching active challenges:', error);
    throw error;
  }
};

export const submitEAApproval = async (enrollmentId: string, mq5File: File): Promise<EAApprovalRequest> => {
  try {
    const formData = new FormData();
    formData.append('enrollment_id', enrollmentId);
    formData.append('mq5_file', mq5File);

    const token = enhancedStorage.getItem('access_token');
    
    if (!token) {
      throw new Error('No access token available');
    }

    const response = await fetch(`${API_BASE_URL}/client/ea-request/upload/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    // Handle token refresh if needed
    if (response.status === 401) {
      await refreshToken();
      const newToken = enhancedStorage.getItem('access_token');
      
      const retryResponse = await fetch(`${API_BASE_URL}/client/ea-request/upload/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${newToken}`,
        },
        body: formData,
      });
      
      if (!retryResponse.ok) {
        const errorData = await retryResponse.json();
        throw new Error(errorData.error || `EA submission failed with status ${retryResponse.status}`);
      }
      
      return await retryResponse.json();
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `EA submission failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error submitting EA approval:', error);
    throw error;
  }
};

// Grid Challenge API function
export const fetchGridChallenges = async (): Promise<GridChallengeResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/client/challenges/`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch grid challenges: ${response.status}`);
    }

    const data = await response.json();
    console.log('Grid Challenges API Response:', data);
    
    // Log each challenge's credentials and metrics
    if (Array.isArray(data)) {
      data.forEach((challenge, index) => {
        console.log(`Challenge ${index} - Full Data:`, challenge);
        console.log(`Challenge ${index} - Credentials:`, challenge.credentials);
        console.log(`Challenge ${index} - Metrics:`, challenge.metrics);
      });
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching grid challenges:', error);
    throw error;
  }
};

// Password Reset API functions
console.log('Loading password reset functions...'); // Debug log

export const requestPasswordReset = async (data: PasswordResetRequest): Promise<PasswordResetResponse> => {
  console.log('requestPasswordReset called with:', data); // Debug log
  try {
    const response = await fetch(`${API_BASE_URL}/auth/client/password-reset/request/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.email?.[0] || 'Failed to request password reset');
    }

    return await response.json();
  } catch (error) {
    console.error('Error requesting password reset:', error);
    throw error;
  }
};

export const confirmPasswordReset = async (data: PasswordResetConfirmRequest): Promise<PasswordResetConfirmResponse> => {
  console.log('confirmPasswordReset called with:', data); // Debug log
  try {
    const response = await fetch(`${API_BASE_URL}/auth/client/password-reset/confirm/`, {
      method: 'POST',      
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.new_password?.[0] || errorData.non_field_errors?.[0] || 'Failed to reset password');
    }

    return await response.json();
  } catch (error) {
    console.error('Error confirming password reset:', error);
    throw error;
  }
};

export const changePassword = async (data: PasswordChangeRequest): Promise<PasswordChangeResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/client/change-password/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || errorData.new_password?.[0] || errorData.non_field_errors?.[0] || 'Failed to change password');
    }

    return await response.json();
  } catch (error) {
    console.error('Error changing password:', error);
    throw error;
  }
};

/**
 * Fetch all active reward tasks for the authenticated client
 */
export const fetchRewardTasks = async (): Promise<RewardTask[]> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/client/wecoins/tasks/`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch reward tasks');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching reward tasks:', error);
    throw error;
  }
};

/**
 * Submit a reward task with optional proof file
 */
export const submitRewardTask = async (data: RewardSubmissionRequest): Promise<RewardSubmissionResponse> => {
  try {
    const formData = new FormData();
    formData.append('task', data.task);
    
    if (data.notes) {
      formData.append('notes', data.notes);
    }
    
    if (data.proof_url) {
      formData.append('proof_url', data.proof_url);
    }
    
    if (data.proof_file) {
      formData.append('proof_file', data.proof_file);
    }

    const response = await authenticatedFetch(`${API_BASE_URL}/client/wecoins/tasks/submit/`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || errorData.message || 'Failed to submit task');
    }

    return await response.json();
  } catch (error) {
    console.error('Error submitting reward task:', error);
    throw error;
  }
};

/**
 * Fetch all reward submissions for the current user
 */
export const fetchRewardSubmissions = async (): Promise<RewardSubmission[]> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/client/wecoins/submissions/`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch reward submissions: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching reward submissions:', error);
    throw error;
  }
};

/**
 * Fetch all available redeem items from WeCoins store
 */
export const fetchRedeemItems = async (): Promise<RedeemItem[]> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/client/wecoins/redeem-items/`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch redeem items: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching redeem items:', error);
    throw error;
  }
};

/**
 * Redeem an item with WeCoins
 */
export const redeemItem = async (itemId: string): Promise<Redemption> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/client/wecoins/redeem-items/redeem/`, {
      method: 'POST',
      body: JSON.stringify({ item: itemId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || error.non_field_errors?.[0] || 'Failed to redeem item');
    }

    return await response.json();
  } catch (error) {
    console.error('Error redeeming item:', error);
    throw error;
  }
};

/**
 * Fetch redemption history for the authenticated client
 */
export const fetchRedemptionHistory = async (): Promise<Redemption[]> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/client/wecoins/redeem-items/history/`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch redemption history: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching redemption history:', error);
    throw error;
  }
};

/**
 * Fetch WeCoin wallet with balance and transaction history
 */
export const fetchWeCoinWallet = async (): Promise<WeCoinWallet> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/client/wecoins/wallet/`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch WeCoin wallet: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching WeCoin wallet:', error);
    throw error;
  }
};

// Economic Calendar API Types
export interface EconomicCalendarEvent {
  id: string;
  event_name: string;
  currency: string;
  impact: string;
  event_datetime: string;
  event_datetime_gmt2: string;
  time_window_minutes: number;
  affected_symbols: string[];
  actual_value: string | null;
  forecast_value: string | null;
  previous_value: string | null;
  source: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const fetchHighImpactEvents = async (): Promise<EconomicCalendarEvent[]> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/admin/economic-calendar/high_impact/`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch high impact events: ${response.status}`);
    }

    const data = await response.json();

    // Handle response formats: { upcoming: [...], ... }, array, or paginated
    if (Array.isArray(data)) {
      return data;
    } else if (data && typeof data === 'object') {
      // Flatten all arrays from keyed groups (e.g. { upcoming: [...], past: [...] })
      const allEvents: EconomicCalendarEvent[] = [];
      for (const key of Object.keys(data)) {
        if (Array.isArray(data[key])) {
          allEvents.push(...data[key]);
        }
      }
      return allEvents;
    }
    return [];
  } catch (error) {
    console.error('Error fetching high impact events:', error);
    throw error;
  }
};

// Competition API Types
export interface Competition {
  id: string;
  banner: string | null;
  organizer_logo: string | null;
  organizer_name: string | null;
  title: string;
  prize_pool_text: string;
  short_description: string;
  entry_type: string;
  start_at: string;
  end_at: string;
  status: 'ongoing' | 'upcoming' | 'ended';
  participants: number;
  cta: 'JOIN' | 'VIEW' | 'ENDED';
  is_joined: boolean;
}

export interface CompetitionTopTrader {
  rank: number;
  name: string;
  growth_percent: number;
}

export interface CompetitionPrize {
  rank_from: number;
  rank_to: number;
  description: string;
}

export interface CompetitionDetail {
  id: string;
  title: string;
  banner: string | null;
  organizer_logo: string | null;
  short_description: string;
  full_description: string | null;
  prize_pool_text: string;
  rules_markdown: string | null;
  entry_type: string;
  start_at: string;
  end_at: string;
  status: 'ongoing' | 'upcoming' | 'ended';
  organizer_name: string | null;
  participants: number;
  is_joined: boolean;
  mt5_login: string | null;
  mt5_password: string | null;
  mt5_investor_password: string | null;
  mt5_server: string | null;
  top_three: CompetitionTopTrader[];
  top_prizes?: CompetitionPrize[];
}

export interface JoinCompetitionResponse {
  detail: string;
  competition_mt5_login: string | null;
  challenge_enrollment_id: string | null;
  challenge_mt5_account: string | null;
}

// Fetch competitions list
export const fetchCompetitions = async (tab: string): Promise<Competition[]> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/client/competitions/?tab=${tab}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch competitions: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching competitions:', error);
    throw error;
  }
};

// Fetch competition detail
export const fetchCompetitionDetail = async (competitionId: string): Promise<CompetitionDetail> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/client/competitions/${competitionId}/`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch competition detail: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching competition detail:', error);
    throw error;
  }
};

// Competition Leaderboard Types
export interface CompetitionLeaderboardRow {
  rank: number;
  name: string;
  total_trades: number;
  growth_percent: number;
}

export interface CompetitionLeaderboardResponse {
  competition_id: string;
  competition_title: string;
  total_participants: number;
  my_rank: number | null;
  rows: CompetitionLeaderboardRow[];
  count: number;
  next: string | null;
  previous: string | null;
}

// Fetch competition leaderboard
export const fetchCompetitionLeaderboard = async (
  competitionId: string, 
  search?: string, 
  page: number = 1
): Promise<CompetitionLeaderboardResponse> => {
  try {
    let url = `${API_BASE_URL}/client/competitions/leaderboard/table/${competitionId}/?page=${page}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    
    const response = await authenticatedFetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch competition leaderboard: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      ...data.results,
      count: data.count,
      next: data.next,
      previous: data.previous,
    };
  } catch (error) {
    console.error('Error fetching competition leaderboard:', error);
    throw error;
  }
};

// Join competition
export const joinCompetition = async (competitionId: string): Promise<JoinCompetitionResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/client/competitions/join/${competitionId}/`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to join competition: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error joining competition:', error);
    throw error;
  }
};


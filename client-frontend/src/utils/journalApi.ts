import { authenticatedFetch } from './api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ─── Types ─────────────────────────────────────────────────────────

export interface Enrollment {
  enrollment_id: string;
  account_id: string;
  challenge_name: string;
  account_size: number;
  currency: string;
}

export interface TradeTag {
  id: string;
  category: string;
  category_name: string;
  category_type: string;
  name: string;
  color: string;
  usage_count: number;
  created_at: string;
}

export interface TagCategory {
  id: string;
  name: string;
  category_type: string;
  color: string;
  icon: string;
  is_system: boolean;
}

export interface TradeListItem {
  order: number;
  symbol: string;
  cmd: number;
  volume: number;
  open_time: string;
  close_time: string;
  open_price: string;
  close_price: string;
  profit: string;
  sl: string;
  tp: string;
  has_journal: boolean;
  journal_id: string | null;
  rating: number | null;
  tags: { id: string; name: string; color: string }[];
  emotional_state: string;
}

export interface JournalEntry {
  id: string;
  trade: number;
  enrollment: string;
  trade_order: number;
  trade_symbol: string;
  trade_cmd: number;
  trade_volume: number;
  trade_open_time: string;
  trade_close_time: string;
  trade_open_price: string;
  trade_close_price: string;
  trade_profit: string;
  trade_sl: string;
  trade_tp: string;
  notes: string;
  setup_description: string;
  tags: TradeTag[];
  rating: number | null;
  planned_entry: string | null;
  planned_sl: string | null;
  planned_tp: string | null;
  followed_plan: boolean | null;
  emotional_state: string;
  screenshot_entry: string;
  screenshot_exit: string;
  created_at: string;
  updated_at: string;
  has_journal?: boolean;
}

export interface TradingSession {
  id: string;
  enrollment: string;
  date: string;
  pre_session_notes: string;
  post_session_notes: string;
  key_lessons: string;
  energy_level: number | null;
  discipline_score: number | null;
  emotional_state_start: string;
  emotional_state_end: string;
  market_conditions: string;
  followed_rules: boolean | null;
  rule_violations: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarDay {
  date: string;
  pnl: number;
  trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  has_session: boolean;
  energy_level: number | null;
  discipline_score: number | null;
  market_conditions: string;
  breaches: number;
}

export interface EquityCurvePoint {
  date: string;
  balance: number;
  equity: number;
  drawdown_pct: number;
  pnl: number;
}

export interface SymbolPerformance {
  symbol: string;
  pnl: number;
  trades: number;
  wins: number;
  win_rate: number;
  avg_profit: number;
  volume: number;
}

export interface TimeHeatmapCell {
  hour: number;
  weekday: number;
  pnl: number;
  trades: number;
  win_rate: number;
}

export interface ComplianceRule {
  name: string;
  limit?: number;
  target?: number;
  current: number;
  used_pct?: number;
  progress_pct?: number;
  status: string;
}

export interface MonteCarloResult {
  simulations: number;
  trade_count: number;
  starting_balance: number;
  profit_target: number;
  percentile_curves: Record<string, number[]>;
  probability_target: number;
  risk_of_ruin: number;
  median_final: number;
  p5_final: number;
  p95_final: number;
  avg_max_drawdown: number;
  median_max_drawdown: number;
}

export interface DashboardData {
  net_pnl: number;
  win_rate: number;
  profit_factor: number;
  expectancy: number;
  sharpe_ratio: number;
  avg_rr: number;
  total_trades: number;
  trades_journaled: number;
  daily_loss_used_pct: number;
  total_loss_used_pct: number;
  profit_target_progress_pct: number;
  journal_streak: number;
  win_streak: number;
  loss_streak: number;
  calendar_data: { date: string; pnl: number; trades: number }[];
  recent_trades: TradeListItem[];
  top_tags: { id: string; name: string; color: string; count: number; pnl: number }[];
  equity_curve: EquityCurvePoint[];
  quick_insight: { summary: string; strength: string; improvement: string; actionable_tip: string; risk_alert: string } | null;
  available_enrollments: Enrollment[];
  selected_enrollment: Enrollment;
}

export interface AIInsight {
  summary: string;
  strength: string;
  improvement: string;
  actionable_tip: string;
  risk_alert: string;
}

export interface AIChatResponse {
  answer: string;
  cached: boolean;
  remaining_queries: number;
}

export interface StreakData {
  type: string;
  count: number;
  pnl: number;
  start: string;
  end?: string;
}

export interface MentorAccess {
  id: string;
  mentor_email: string;
  mentor_name: string;
  status: 'pending' | 'active' | 'revoked';
  permissions: ('view_trades' | 'view_journal' | 'view_analytics' | 'add_comments')[];
  granted_at: string;
  expires_at: string | null;
}

export interface ReplayTrade {
  order: number;
  symbol: string;
  cmd: number;
  volume: number;
  open_time: string;
  close_time: string;
  open_price: string;
  close_price: string;
  profit: string;
  sl: string;
  tp: string;
  cumulative_pnl: number;
  has_journal: boolean;
  rating: number | null;
  tags: { id: string; name: string; color: string }[];
  notes: string;
}

// ─── API Functions ─────────────────────────────────────────────────

export const fetchJournalDashboard = async (enrollmentId?: string): Promise<DashboardData> => {
  const params = enrollmentId ? `?enrollment_id=${enrollmentId}` : '';
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/dashboard/${params}`);
  if (!response.ok) throw new Error(`Failed to fetch journal dashboard: ${response.status}`);
  return response.json();
};

export const fetchJournalTrades = async (
  enrollmentId?: string,
  filters?: Record<string, string>,
  page = 1,
  pageSize = 50
): Promise<{ count: number; results: TradeListItem[] }> => {
  const params = new URLSearchParams();
  if (enrollmentId) params.set('enrollment_id', enrollmentId);
  params.set('page', String(page));
  params.set('page_size', String(pageSize));
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
  }
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/entries/?${params}`);
  if (!response.ok) throw new Error(`Failed to fetch trades: ${response.status}`);
  return response.json();
};

export const fetchJournalEntry = async (order: number, enrollmentId?: string): Promise<JournalEntry> => {
  const params = enrollmentId ? `?enrollment_id=${enrollmentId}` : '';
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/entries/${order}/${params}`);
  if (!response.ok) throw new Error(`Failed to fetch entry: ${response.status}`);
  return response.json();
};

export const saveJournalEntry = async (order: number, data: Partial<JournalEntry>, enrollmentId?: string): Promise<JournalEntry> => {
  const params = enrollmentId ? `?enrollment_id=${enrollmentId}` : '';
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/entries/${order}/${params}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Failed to save entry: ${response.status}`);
  return response.json();
};

export const createJournalEntry = async (data: { trade_order: number } & Partial<JournalEntry>, enrollmentId?: string): Promise<JournalEntry> => {
  const params = enrollmentId ? `?enrollment_id=${enrollmentId}` : '';
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/entries/${params}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Failed to create entry: ${response.status}`);
  return response.json();
};

export const bulkUpdateEntries = async (data: {
  trade_orders: number[];
  tag_ids?: string[];
  rating?: number;
  emotional_state?: string;
}, enrollmentId?: string) => {
  const params = enrollmentId ? `?enrollment_id=${enrollmentId}` : '';
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/entries/bulk/${params}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Failed to bulk update: ${response.status}`);
  return response.json();
};

export const uploadScreenshot = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/screenshots/upload/`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
  return response.json();
};

// Tags
export const fetchTagCategories = async (): Promise<TagCategory[]> => {
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/tag-categories/`);
  if (!response.ok) throw new Error(`Failed to fetch categories: ${response.status}`);
  return response.json();
};

export const fetchTags = async (): Promise<TradeTag[]> => {
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/tags/`);
  if (!response.ok) throw new Error(`Failed to fetch tags: ${response.status}`);
  return response.json();
};

export const createTag = async (data: { category: string; name: string; color: string }): Promise<TradeTag> => {
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/tags/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Failed to create tag: ${response.status}`);
  return response.json();
};

export const deleteTag = async (id: string) => {
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/tags/${id}/`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error(`Failed to delete tag: ${response.status}`);
};

// Sessions
export const fetchSessions = async (enrollmentId?: string): Promise<{ results: TradingSession[] }> => {
  const params = enrollmentId ? `?enrollment_id=${enrollmentId}` : '';
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/sessions/${params}`);
  if (!response.ok) throw new Error(`Failed to fetch sessions: ${response.status}`);
  return response.json();
};

export const fetchSession = async (date: string, enrollmentId?: string): Promise<TradingSession> => {
  const params = enrollmentId ? `?enrollment_id=${enrollmentId}` : '';
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/sessions/${date}/${params}`);
  if (!response.ok) throw new Error(`Failed to fetch session: ${response.status}`);
  return response.json();
};

export const saveSession = async (date: string, data: Partial<TradingSession>, enrollmentId?: string): Promise<TradingSession> => {
  const params = enrollmentId ? `?enrollment_id=${enrollmentId}` : '';
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/sessions/${date}/${params}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Failed to save session: ${response.status}`);
  return response.json();
};

// Analytics
export const fetchCalendar = async (month: string, enrollmentId?: string): Promise<{ month: string; data: CalendarDay[] }> => {
  const params = new URLSearchParams();
  params.set('month', month);
  if (enrollmentId) params.set('enrollment_id', enrollmentId);
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/analytics/calendar/?${params}`);
  if (!response.ok) throw new Error(`Failed to fetch calendar: ${response.status}`);
  return response.json();
};

export const fetchSymbolPerformance = async (enrollmentId?: string): Promise<SymbolPerformance[]> => {
  const params = enrollmentId ? `?enrollment_id=${enrollmentId}` : '';
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/analytics/symbols/${params}`);
  if (!response.ok) throw new Error(`Failed to fetch symbols: ${response.status}`);
  return response.json();
};

export const fetchTimePerformance = async (enrollmentId?: string): Promise<TimeHeatmapCell[]> => {
  const params = enrollmentId ? `?enrollment_id=${enrollmentId}` : '';
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/analytics/time/${params}`);
  if (!response.ok) throw new Error(`Failed to fetch time data: ${response.status}`);
  return response.json();
};

export const fetchTagPerformance = async (enrollmentId?: string) => {
  const params = enrollmentId ? `?enrollment_id=${enrollmentId}` : '';
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/analytics/tags/${params}`);
  if (!response.ok) throw new Error(`Failed to fetch tag performance: ${response.status}`);
  return response.json();
};

export const fetchEquityCurve = async (enrollmentId?: string, period = '30d'): Promise<EquityCurvePoint[]> => {
  const params = new URLSearchParams();
  if (enrollmentId) params.set('enrollment_id', enrollmentId);
  params.set('period', period);
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/analytics/equity-curve/?${params}`);
  if (!response.ok) throw new Error(`Failed to fetch equity curve: ${response.status}`);
  return response.json();
};

export const fetchCompliance = async (enrollmentId?: string) => {
  const params = enrollmentId ? `?enrollment_id=${enrollmentId}` : '';
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/analytics/compliance/${params}`);
  if (!response.ok) throw new Error(`Failed to fetch compliance: ${response.status}`);
  return response.json();
};

export const fetchDistribution = async (enrollmentId?: string) => {
  const params = enrollmentId ? `?enrollment_id=${enrollmentId}` : '';
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/analytics/distribution/${params}`);
  if (!response.ok) throw new Error(`Failed to fetch distribution: ${response.status}`);
  return response.json();
};

export const fetchHoldingTime = async (enrollmentId?: string) => {
  const params = enrollmentId ? `?enrollment_id=${enrollmentId}` : '';
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/analytics/holding-time/${params}`);
  if (!response.ok) throw new Error(`Failed to fetch holding time: ${response.status}`);
  return response.json();
};

export const fetchMonteCarlo = async (enrollmentId?: string): Promise<MonteCarloResult> => {
  const params = enrollmentId ? `?enrollment_id=${enrollmentId}` : '';
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/analytics/monte-carlo/${params}`);
  if (!response.ok) throw new Error(`Failed to fetch Monte Carlo: ${response.status}`);
  return response.json();
};

export const fetchStreaks = async (enrollmentId?: string) => {
  const params = enrollmentId ? `?enrollment_id=${enrollmentId}` : '';
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/analytics/streaks/${params}`);
  if (!response.ok) throw new Error(`Failed to fetch streaks: ${response.status}`);
  return response.json();
};

export const fetchMFEMAE = async (enrollmentId?: string) => {
  const params = enrollmentId ? `?enrollment_id=${enrollmentId}` : '';
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/analytics/mfe-mae/${params}`);
  if (!response.ok) throw new Error(`Failed to fetch MFE/MAE: ${response.status}`);
  return response.json();
};

// AI
export const fetchAIDailySummary = async (enrollmentId?: string, date?: string): Promise<AIInsight> => {
  const params = new URLSearchParams();
  if (enrollmentId) params.set('enrollment_id', enrollmentId);
  if (date) params.set('date', date);
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/ai/daily-summary/?${params}`);
  if (!response.ok) throw new Error(`Failed to fetch AI summary: ${response.status}`);
  return response.json();
};

export const sendAIChat = async (question: string, enrollmentId?: string): Promise<AIChatResponse> => {
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/ai/chat/`, {
    method: 'POST',
    body: JSON.stringify({ question, enrollment_id: enrollmentId }),
  });
  if (!response.ok) throw new Error(`AI chat failed: ${response.status}`);
  return response.json();
};

export const fetchAIReport = async (period: 'weekly' | 'monthly', enrollmentId?: string) => {
  const params = enrollmentId ? `?enrollment_id=${enrollmentId}` : '';
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/ai/report/${period}/${params}`);
  if (!response.ok) throw new Error(`Failed to fetch AI report: ${response.status}`);
  return response.json();
};

export const fetchAIPatterns = async (enrollmentId?: string) => {
  const params = enrollmentId ? `?enrollment_id=${enrollmentId}` : '';
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/ai/patterns/${params}`);
  if (!response.ok) throw new Error(`Failed to fetch patterns: ${response.status}`);
  return response.json();
};

export const sendAIWhatIf = async (question: string, enrollmentId?: string) => {
  const params = enrollmentId ? `?enrollment_id=${enrollmentId}` : '';
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/ai/what-if/${params}`, {
    method: 'POST',
    body: JSON.stringify({ question }),
  });
  if (!response.ok) throw new Error(`What-if failed: ${response.status}`);
  return response.json();
};

// Mentor Access
export const fetchMentorAccess = async (enrollmentId?: string): Promise<MentorAccess[]> => {
  const params = enrollmentId ? `?enrollment_id=${enrollmentId}` : '';
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/mentor-access/${params}`);
  if (!response.ok) throw new Error(`Failed to fetch mentor access: ${response.status}`);
  return response.json();
};

export const grantMentorAccess = async (data: {
  mentor_email: string;
  permissions: string[];
  enrollment_id?: string;
}): Promise<MentorAccess> => {
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/mentor-access/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Failed to grant access: ${response.status}`);
  return response.json();
};

export const revokeMentorAccess = async (id: string) => {
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/mentor-access/${id}/`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error(`Failed to revoke access: ${response.status}`);
};

// Share Links
export interface JournalShareLink {
  id: string;
  enrollment_id: string;
  account_id?: string;
  challenge_name?: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface PublicJournalData {
  trader_first_name: string;
  account_id: string;
  challenge_name: string;
  account_size: number;
  currency: string;
  net_pnl: number;
  win_rate: number;
  profit_factor: number;
  expectancy: number;
  sharpe_ratio: number;
  avg_rr: number;
  total_trades: number;
  win_count: number;
  loss_count: number;
  best_day_pnl: number;
  worst_day_pnl: number;
  avg_daily_pnl: number;
  trading_days: number;
  winning_days: number;
  losing_days: number;
  win_streak: number;
  loss_streak: number;
  avg_win: number;
  avg_loss: number;
  largest_win: number;
  largest_loss: number;
  calendar_data: { date: string; pnl: number; trades: number; wins: number }[];
  equity_curve: { date: string; balance: number; equity: number; drawdown: number }[];
  recent_trades: {
    order: number;
    symbol: string;
    cmd: number;
    volume: number;
    open_time: string;
    close_time: string;
    open_price: number;
    close_price: number;
    profit: number;
    sl: number;
    tp: number;
  }[];
  symbol_performance: {
    symbol: string;
    pnl: number;
    trades: number;
    wins: number;
    win_rate: number;
    avg_profit: number;
    volume: number;
  }[];
  time_heatmap: {
    hour: number;
    weekday: number;
    pnl: number;
    trades: number;
    win_rate: number;
  }[];
  distribution: {
    range_min: number;
    range_max: number;
    count: number;
  }[];
  holding_time: {
    label: string;
    trades: number;
    pnl: number;
    win_rate: number;
  }[];
}

export const createShareLink = async (enrollmentId: string): Promise<JournalShareLink> => {
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/share-link/`, {
    method: 'POST',
    body: JSON.stringify({ enrollment_id: enrollmentId }),
  });
  if (!response.ok) throw new Error(`Failed to create share link: ${response.status}`);
  return response.json();
};

export const fetchShareLinks = async (): Promise<JournalShareLink[]> => {
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/share-links/`);
  if (!response.ok) throw new Error(`Failed to fetch share links: ${response.status}`);
  return response.json();
};

export const deactivateShareLink = async (id: string): Promise<void> => {
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/share-link/${id}/`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error(`Failed to deactivate share link: ${response.status}`);
};

export const fetchPublicJournal = async (token: string): Promise<PublicJournalData> => {
  const response = await fetch(`${API_BASE_URL}/public/journal/${token}/`);
  if (!response.ok) throw new Error(`Failed to fetch public journal: ${response.status}`);
  return response.json();
};

// Certificate Verification
export interface CertificateVerificationData {
  valid: boolean;
  detail?: string;
  certificate?: {
    id: string;
    title: string;
    certificate_type: string;
    issued_date: string | null;
    image_url: string | null;
    pdf_url: string | null;
  };
  trader?: {
    display_name: string;
    initials: string;
  };
  payout?: {
    released_fund: number;
    net_profit: number;
    profit_share_percent: number;
    status: string;
    paid_at: string | null;
  };
  enrollment?: {
    account_size: number;
    currency: string;
    challenge_name: string | null;
    status: string;
  };
  trading_summary?: {
    total_trades: number;
    win_rate: number;
    profit_factor: number;
    net_pnl: number;
    avg_win: number;
    avg_loss: number;
    total_winners: number;
    total_losers: number;
  };
  daily_pnl?: { date: string; pnl: number }[];
  equity_curve?: { date: string; balance: number; equity: number }[];
}

export const fetchCertificateVerification = async (certificateId: string): Promise<CertificateVerificationData> => {
  const response = await fetch(`${API_BASE_URL}/public/certificate/verify/${certificateId}/`);
  if (!response.ok) {
    if (response.status === 404) return { valid: false, detail: "Certificate not found." };
    throw new Error(`Failed to fetch certificate verification: ${response.status}`);
  }
  return response.json();
};

// Trade Replay
export const fetchReplayTrades = async (
  enrollmentId?: string,
  date?: string,
): Promise<ReplayTrade[]> => {
  const params = new URLSearchParams();
  if (enrollmentId) params.set('enrollment_id', enrollmentId);
  if (date) params.set('date', date);
  const response = await authenticatedFetch(`${API_BASE_URL}/client/journal/replay/?${params}`);
  if (!response.ok) throw new Error(`Failed to fetch replay trades: ${response.status}`);
  return response.json();
};

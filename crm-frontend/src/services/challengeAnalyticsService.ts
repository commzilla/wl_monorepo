import { apiService } from './apiService';

export interface ChallengeStepStats {
  label: string;
  entered: number;
  passes: number;
  fails: number;
  in_progress: number;
  fail_rate: string;
  total: number;
}

export interface ChallengeAnalyticsData {
  total_challenges: number;
  phase1_count: number;
  phase2_count: number;
  live_traders: number;
  mt5_accounts_count: number;
  daily_dd_breached_pct: number;
  max_dd_breached_pct: number;
  blocked_accounts_pct: number;
  passed_phase1_count: number;
  passed_phase1_pct: number;
  passed_phase2_count: number;
  passed_phase2_pct: number;
  reached_live_count: number;
  reached_live_pct: number;
  total_users: number;
  avg_accounts_per_user: number;
  avg_pass_time: number | null;
  avg_breach_time: number | null;
  pending_payouts: number;
  one_step_stats: ChallengeStepStats[];
  two_step_stats: ChallengeStepStats[];
}

class ChallengeAnalyticsService {
  async getChallengeAnalytics(): Promise<ChallengeAnalyticsData> {
    console.log('Fetching challenge analytics data from API...');
    
    const response = await apiService.get<ChallengeAnalyticsData>('/admin/analytics/challenges/');
    
    if (response.error) {
      console.error('Error fetching challenge analytics data:', response.error);
      throw new Error(response.error);
    }

    console.log('Challenge analytics data received:', response.data);
    return response.data;
  }
}

export const challengeAnalyticsService = new ChallengeAnalyticsService();
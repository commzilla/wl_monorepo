import { apiService } from './apiService';

export interface LeaderboardEntry {
  rank: number;
  trader_name: string;
  trader_email: string;
  mt5_login: string;
  mt5_initial_balance: string | null;
  growth_percent: number;
  total_trades: number;
  equity: number;
  balance: number;
  captured_at: string;
}

export interface LiveLeaderboardEntry {
  rank: number;
  trader_name: string;
  trader_email: string;
  mt5_login: string;
  initial_balance: string;
  growth_percent: number;
  total_trades: number;
  equity: number;
  balance: number;
}

export interface LeaderboardResponse {
  competition: string;
  total_participants: number;
  total_pages: number;
  current_page: number;
  results: LeaderboardEntry[];
}

export interface LiveLeaderboardResponse {
  competition: string;
  mode: string;
  total_participants: number;
  total_pages: number;
  current_page: number;
  my_rank: number | null;
  results: LiveLeaderboardEntry[];
}

export type SortOption = 'rank' | 'growth' | 'trades' | 'equity' | 'balance';

class CompetitionLeaderboardService {
  async getLeaderboard(
    competitionId: string,
    page: number = 1,
    pageSize: number = 50,
    sort?: SortOption
  ): Promise<LeaderboardResponse> {
    let endpoint = `/admin/competitions/leaderboard/${competitionId}/?page=${page}&page_size=${pageSize}`;
    if (sort) {
      endpoint += `&sort=${sort}`;
    }
    const response = await apiService.get<LeaderboardResponse>(endpoint);
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data!;
  }

  async getLiveLeaderboard(
    competitionId: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<LiveLeaderboardResponse> {
    const endpoint = `/admin/competitions/leaderboard/live/${competitionId}/?page=${page}&page_size=${pageSize}`;
    const response = await apiService.get<LiveLeaderboardResponse>(endpoint);
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data!;
  }

  async exportLeaderboardCSV(competitionId: string): Promise<Blob> {
    const endpoint = `/admin/competitions/leaderboard/export-csv/${competitionId}/`;
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to export leaderboard');
    }
    
    return response.blob();
  }
}

export const competitionLeaderboardService = new CompetitionLeaderboardService();

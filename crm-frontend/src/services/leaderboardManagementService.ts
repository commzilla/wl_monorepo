import { apiService } from './apiService';

const BASE_URL = '/admin/leaderboard';

export interface LeaderboardTrader {
  user_id: string;
  email: string;
  full_name: string;
  leaderboard_display_name: string | null;
  hidden_from_leaderboard: boolean;
  has_live_account: boolean;
  profile_picture: string;
}

export interface LeaderboardStats {
  total: number;
  visible: number;
  hidden: number;
}

export interface LeaderboardListResponse {
  stats: LeaderboardStats;
  total_pages: number;
  current_page: number;
  total_results: number;
  results: LeaderboardTrader[];
}

export interface LeaderboardFilters {
  visibility?: 'all' | 'hidden' | 'visible';
  live_only?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface TraderUpdatePayload {
  hidden_from_leaderboard?: boolean;
  leaderboard_display_name?: string | null;
}

export const leaderboardManagementService = {
  getTraders: async (params?: LeaderboardFilters): Promise<LeaderboardListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.visibility && params.visibility !== 'all') queryParams.append('visibility', params.visibility);
    if (params?.live_only) queryParams.append('live_only', 'true');
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.page_size) queryParams.append('page_size', String(params.page_size));

    const url = queryParams.toString() ? `${BASE_URL}/?${queryParams}` : `${BASE_URL}/`;
    const response = await apiService.get<LeaderboardListResponse>(url);
    if (response.error) throw new Error(response.error);
    return response.data!;
  },

  updateTrader: async (userId: string, payload: TraderUpdatePayload) => {
    const response = await apiService.patch<{
      detail: string;
      user_id: string;
      hidden_from_leaderboard: boolean;
      leaderboard_display_name: string | null;
    }>(`${BASE_URL}/${userId}/`, payload);
    if (response.error) throw new Error(response.error);
    return response.data!;
  },
};

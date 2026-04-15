import { apiService } from './apiService';

export interface CompetitionPrize {
  id: string;
  rank_from: number;
  rank_to: number;
  description: string;
}

export type RuleType = 'mdl' | 'mtl' | 'mtd' | 'pr' | 'min_days' | 'max_lot' | 'consistency';
export type ValueType = 'percent' | 'amount' | 'count' | 'boolean';

export interface CompetitionRule {
  id: string;
  rule_type: RuleType;
  value: string | null;
  value_type: ValueType;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface ChallengeMini {
  id: string;
  name: string;
  step_type: string;
  is_active: boolean;
}

export const RULE_TYPE_LABELS: Record<RuleType, string> = {
  mdl: 'Max Daily Loss',
  mtl: 'Max Total Loss',
  mtd: 'Max Trades Per Day',
  pr: 'Profit Requirement',
  min_days: 'Minimum Trading Days',
  max_lot: 'Max Lot Size',
  consistency: 'Consistency Rule',
};

export const VALUE_TYPE_LABELS: Record<ValueType, string> = {
  percent: 'Percentage',
  amount: 'Fixed Amount',
  count: 'Count',
  boolean: 'Boolean',
};

export interface Competition {
  id: string;
  title: string;
  banner: string;
  short_description: string;
  full_description: string;
  organizer_name: string;
  organizer_logo: string | null;
  start_at: string;
  end_at: string;
  initial_balance: string;
  leverage: string;
  mt5_group: string;
  allowed_symbols: string[] | null;
  min_trades_to_qualify: number | null;
  scoring_metric: 'growth_percent';
  rules_markdown: string;
  use_global_rules: boolean;
  prize_pool_text: string;
  entry_type: 'free' | 'paid' | 'invite';
  entry_fee: string | null;
  max_participants: number | null;
  auto_create_mt5: boolean;
  enforce_single_entry: boolean;
  allow_test_users: boolean;
  status: 'draft' | 'upcoming' | 'ongoing' | 'ended';
  created_at: string;
  prizes: CompetitionPrize[];
  manual_rules: CompetitionRule[];
  challenge: string | null;
  challenge_detail: ChallengeMini | null;
  available_challenges: ChallengeMini[];
}

export interface CompetitionRuleCreateData {
  rule_type: RuleType;
  value?: number | null;
  value_type: ValueType;
  description?: string;
  is_active?: boolean;
}

export interface CompetitionCreateData {
  title: string;
  banner?: File;
  organizer_logo?: File;
  short_description: string;
  full_description: string;
  organizer_name: string;
  start_at: string;
  end_at: string;
  initial_balance: number;
  leverage: string;
  mt5_group: string;
  allowed_symbols?: string[];
  min_trades_to_qualify?: number;
  scoring_metric?: string;
  rules_markdown: string;
  use_global_rules?: boolean;
  prize_pool_text: string;
  entry_type: string;
  entry_fee?: number;
  max_participants?: number;
  auto_create_mt5?: boolean;
  enforce_single_entry?: boolean;
  allow_test_users?: boolean;
  prizes?: Omit<CompetitionPrize, 'id'>[];
  manual_rules?: CompetitionRuleCreateData[];
  challenge?: string | null;
}

class CompetitionService {
  private baseEndpoint = '/admin/competitions';

  async getCompetitions(): Promise<Competition[]> {
    const response = await apiService.get<Competition[]>(`${this.baseEndpoint}/`);
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data || [];
  }

  async getCompetition(id: string): Promise<Competition> {
    const response = await apiService.get<Competition>(`${this.baseEndpoint}/${id}/`);
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data!;
  }

  async getAvailableChallenges(): Promise<ChallengeMini[]> {
    // Fetch any competition to get the available_challenges list
    // Or use the manage endpoint if it returns challenges
    const response = await apiService.get<{ available_challenges?: ChallengeMini[] }>(`${this.baseEndpoint}/manage/`);
    if (response.error) {
      // Fallback: try to get from first competition
      const competitions = await this.getCompetitions();
      if (competitions.length > 0) {
        return competitions[0].available_challenges || [];
      }
      return [];
    }
    return response.data?.available_challenges || [];
  }

  async createCompetition(data: CompetitionCreateData): Promise<Competition> {
    // Use FormData for file upload
    const formData = new FormData();
    
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'banner' && value instanceof File) {
        formData.append('banner_file', value); // Backend expects 'banner_file'
      } else if (key === 'organizer_logo' && value instanceof File) {
        formData.append('organizer_logo_file', value); // Backend expects 'organizer_logo_file'
      } else if (key === 'prizes' && Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else if (key === 'allowed_symbols' && Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else if (key === 'manual_rules' && Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    const response = await apiService.uploadFile<Competition>(`${this.baseEndpoint}/`, formData, 'POST');
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data!;
  }

  async updateCompetition(id: string, data: Partial<CompetitionCreateData>): Promise<Competition> {
    const formData = new FormData();
    
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'banner' && value instanceof File) {
        formData.append('banner_file', value); // Backend expects 'banner_file'
      } else if (key === 'organizer_logo' && value instanceof File) {
        formData.append('organizer_logo_file', value); // Backend expects 'organizer_logo_file'
      } else if (key === 'prizes' && Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else if (key === 'allowed_symbols' && Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else if (key === 'manual_rules' && Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    const response = await apiService.uploadFile<Competition>(`${this.baseEndpoint}/${id}/`, formData, 'PATCH');
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data!;
  }

  async deleteCompetition(id: string): Promise<void> {
    const response = await apiService.delete(`${this.baseEndpoint}/${id}/`);
    if (response.error) {
      throw new Error(response.error);
    }
  }

  async publishCompetition(id: string): Promise<void> {
    const response = await apiService.post(`${this.baseEndpoint}/${id}/publish/`);
    if (response.error) {
      throw new Error(response.error);
    }
  }

  async forceStartCompetition(id: string): Promise<void> {
    const response = await apiService.post(`${this.baseEndpoint}/${id}/force_start/`);
    if (response.error) {
      throw new Error(response.error);
    }
  }

  async endCompetition(id: string): Promise<void> {
    const response = await apiService.post(`${this.baseEndpoint}/${id}/end_now/`);
    if (response.error) {
      throw new Error(response.error);
    }
  }
}

export const competitionService = new CompetitionService();

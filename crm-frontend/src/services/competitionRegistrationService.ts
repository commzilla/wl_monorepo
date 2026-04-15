import { apiService } from './apiService';
import { Competition } from './competitionService';

export interface CompetitionRegistration {
  id: string;
  trader_name: string;
  trader_email: string;
  mt5_login: string | null;
  mt5_initial_balance: string | null;
  mt5_current_balance: string | null;
  mt5_live_equity: string | null;
  status: string;
  joined_at: string;
}

export interface CompetitionRegistrationsResponse {
  competition: string;
  total_registrations: number;
  registrations: CompetitionRegistration[];
}

class CompetitionRegistrationService {
  async getCompetitions(status?: string): Promise<Competition[]> {
    const endpoint = status 
      ? `/admin/competitions/?status=${status}`
      : '/admin/competitions/';
    const response = await apiService.get<Competition[]>(endpoint);
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data || [];
  }

  async getRegistrations(competitionId: string): Promise<CompetitionRegistrationsResponse> {
    const response = await apiService.get<CompetitionRegistrationsResponse>(
      `/admin/competitions/registrations/${competitionId}/`
    );
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data!;
  }
}

export const competitionRegistrationService = new CompetitionRegistrationService();

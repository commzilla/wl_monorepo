import { apiService } from './apiService';

export interface ChallengePhaseGroupMapping {
  id: number;
  challenge_phase: number;
  challenge_phase_name: string;
  challenge_name: string;
  step_type: string;
  mt5_group: string;
  is_active: boolean;
}

export interface ChallengePhase {
  id: number;
  label: string;
}

export interface Mt5Group {
  group: string;
  description?: string;
}

export interface CgmCreateData {
  challenge_phase: number;
  mt5_group: string;
  is_active: boolean;
}

class CgmService {
  async getMappings(): Promise<ChallengePhaseGroupMapping[]> {
    const response = await apiService.get<ChallengePhaseGroupMapping[]>('/admin/challenge/group-mappings/');
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data || [];
  }

  async createMapping(data: CgmCreateData): Promise<ChallengePhaseGroupMapping> {
    const response = await apiService.post<ChallengePhaseGroupMapping>('/admin/challenge/group-mappings/', data);
    if (response.error) {
      // Handle validation errors from backend
      if (response.data && typeof response.data === 'object') {
        const validationErrors = Object.values(response.data).flat();
        throw new Error(validationErrors.join(', '));
      }
      throw new Error(response.error);
    }
    return response.data!;
  }

  async updateMapping(id: number, data: Partial<CgmCreateData>): Promise<ChallengePhaseGroupMapping> {
    const response = await apiService.put<ChallengePhaseGroupMapping>(`/admin/challenge/group-mappings/${id}/`, data);
    if (response.error) {
      // Handle validation errors from backend
      if (response.data && typeof response.data === 'object') {
        const validationErrors = Object.values(response.data).flat();
        throw new Error(validationErrors.join(', '));
      }
      throw new Error(response.error);
    }
    return response.data!;
  }

  async deleteMapping(id: number): Promise<void> {
    const response = await apiService.delete(`/admin/challenge/group-mappings/${id}/`);
    if (response.error) {
      throw new Error(response.error);
    }
  }

  async getAvailableGroups(): Promise<Mt5Group[]> {
    const response = await apiService.get<Mt5Group[]>('/admin/challenge/group-mappings/available_groups/');
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data || [];
  }

  async getChallengePhases(): Promise<ChallengePhase[]> {
    const response = await apiService.get<any[]>('/challenges/');
    if (response.error) {
      throw new Error(response.error);
    }
    
    // Extract phases from all challenges
    const phases: ChallengePhase[] = [];
    response.data?.forEach(challenge => {
      challenge.phases?.forEach((phase: any) => {
        phases.push({
          id: phase.id,
          label: `${challenge.name} - ${phase.phase_type_display}`
        });
      });
    });
    
    return phases;
  }
}

export const cgmService = new CgmService();
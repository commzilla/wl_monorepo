import { apiService } from './apiService';

export interface ChallengeProduct {
  id: number;
  name: string;
  challenge_type: 'one_step' | 'two_step';
  account_size: number;
  entry_fee: number;
  max_daily_loss: number;
  max_total_loss: number;
  profit_target_phase_1: number;
  profit_target_phase_2: number | null;
  rules: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export interface Client {
  id: number;
  user_id?: string; // UUID for API calls
  full_name: string;
  email: string;
}

export interface ChallengeDetailInfo {
  name: string;
  step_type: '1-step' | '2-step';
  is_active: boolean;
  phases: ChallengePhase[];
}

export interface ChallengeEnrollmentCreateData {
  client: string; // ClientProfile ID (UUID)
  challenge: number; // Challenge ID
  order?: string | null;
  account_size: number;
  currency: string;
  status: ChallengeEnrollment['status'];
  completed_date?: string | null;
  is_active: boolean;
  notes: string;
  broker_type: string;
  mt5_account_id?: string | null;
  mt5_password?: string | null;
  mt5_investor_password?: string | null;
}

export interface ChallengeEnrollmentUpdateData {
  client?: string; // Client ID (foreign key)
  challenge?: number; // Challenge ID (foreign key) 
  account_size?: number;
  currency?: string;
  status?: ChallengeEnrollment['status'];
  start_date?: string | null;
  completed_date?: string | null;
  live_start_date?: string | null;
  is_active?: boolean;
  notes?: string;
  broker_type?: string;
  mt5_account_id?: string | null;
  mt5_password?: string | null;
  mt5_investor_password?: string | null;
}

export interface LatestBreach {
  rule: string;
  reason: string;
  previous_state: any;
  breached_at: string;
}

export interface ChallengeEnrollment {
  id: string;
  client_id?: string; // Add client ID if available  
  client_name: string;
  client_email: string;
  challenge: ChallengeDetailInfo & { id?: number }; // Ensure challenge has ID
  order: {
    id: string;
  } | null;
  account_size: string;
  currency: string;
  current_balance?: string; // Current balance of the account
  status: 'active' | 'phase_1_in_progress' | 'phase_1_passed' | 'phase_2_in_progress' | 'phase_2_passed' | 'live_in_progress' | 'completed' | 'failed' | 'payout_limit_reached';
  start_date: string;
  completed_date: string | null;
  live_start_date: string | null;
  is_active: boolean;
  notes: string;
  broker_type: string;
  mt5_account_id: string | null;
  mt5_password: string | null;
  mt5_investor_password: string | null;
  created_at: string;
  updated_at: string;
  latest_breach?: LatestBreach | null;
}

export interface ChallengePhase {
  id: number;
  challenge: number;
  phase_type: 'phase-1' | 'phase-2' | 'live-trader';
  phase_type_display: string;
  trading_period: string;
  min_trading_days: string;
  max_daily_loss: string;
  max_loss: string;
  profit_target: string | null;
}

export interface Challenge {
  id: number;
  name: string;
  step_type: '1-step' | '2-step';
  step_type_display: string;
  is_active: boolean;
  phases: ChallengePhase[];
}

export interface ChallengeEnrollmentFilters {
  status?: string;
  challenge__id?: number;
  challenge__step_type?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface ChallengeOverview {
  total_challenges: number;
  active: number;
  live: number;
  failed: number;
}

export interface ChallengeEnrollmentResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    overview: ChallengeOverview;
    results: ChallengeEnrollment[];
  };
}

class ChallengeService {
  async getChallengeProducts(): Promise<ChallengeProduct[]> {
    console.log('Fetching challenge products from API...');
    
    const response = await apiService.get<ChallengeProduct[]>('/challenge-products/');
    
    if (response.error) {
      console.error('Error fetching challenge products:', response.error);
      throw new Error(response.error);
    }
    
    return response.data || [];
  }

  async createChallengeProduct(productData: Omit<ChallengeProduct, 'id' | 'created_at'>): Promise<ChallengeProduct> {
    console.log('Creating challenge product:', productData);
    
    const response = await apiService.post<ChallengeProduct>('/challenge-products/', productData);
    
    if (response.error) {
      console.error('Error creating challenge product:', response.error);
      throw new Error(response.error);
    }
    
    return response.data!;
  }

  async updateChallengeProduct(id: number, productData: Partial<ChallengeProduct>): Promise<ChallengeProduct> {
    console.log('Updating challenge product:', id, productData);
    
    const response = await apiService.put<ChallengeProduct>(`/challenge-products/${id}/`, productData);
    
    if (response.error) {
      console.error('Error updating challenge product:', response.error);
      throw new Error(response.error);
    }
    
    return response.data!;
  }

  async deleteChallengeProduct(id: number): Promise<void> {
    console.log('Deleting challenge product:', id);
    
    const response = await apiService.delete(`/challenge-products/${id}/`);
    
    if (response.error) {
      console.error('Error deleting challenge product:', response.error);
      throw new Error(response.error);
    }
  }

  // Challenge Configuration APIs
  async getChallenges(): Promise<Challenge[]> {
    console.log('Fetching challenges from API...');
    
    const response = await apiService.get<Challenge[]>('/challenges/');
    
    if (response.error) {
      console.error('Error fetching challenges:', response.error);
      throw new Error(response.error);
    }
    
    return response.data || [];
  }

  async createChallenge(challengeData: Omit<Challenge, 'id' | 'step_type_display' | 'phases'>): Promise<Challenge> {
    console.log('Creating challenge:', challengeData);
    
    const response = await apiService.post<Challenge>('/challenges/', challengeData);
    
    if (response.error) {
      console.error('Error creating challenge:', response.error);
      throw new Error(response.error);
    }
    
    return response.data!;
  }

  async updateChallenge(id: number, challengeData: Partial<Challenge>): Promise<Challenge> {
    console.log('Updating challenge:', id, challengeData);
    
    const response = await apiService.put<Challenge>(`/challenges/${id}/`, challengeData);
    
    if (response.error) {
      console.error('Error updating challenge:', response.error);
      throw new Error(response.error);
    }
    
    return response.data!;
  }

  async deleteChallenge(id: number): Promise<void> {
    console.log('Deleting challenge:', id);
    
    const response = await apiService.delete(`/challenges/${id}/`);
    
    if (response.error) {
      console.error('Error deleting challenge:', response.error);
      throw new Error(response.error);
    }
  }

  // Challenge Phase APIs
  async getChallengePhases(): Promise<ChallengePhase[]> {
    console.log('Fetching challenge phases from API...');
    
    const response = await apiService.get<ChallengePhase[]>('/challenge-phases/');
    
    if (response.error) {
      console.error('Error fetching challenge phases:', response.error);
      throw new Error(response.error);
    }
    
    return response.data || [];
  }

  async createChallengePhase(phaseData: Omit<ChallengePhase, 'id'>): Promise<ChallengePhase> {
    console.log('Creating challenge phase:', phaseData);
    
    const response = await apiService.post<ChallengePhase>('/challenge-phases/', phaseData);
    
    if (response.error) {
      console.error('Error creating challenge phase:', response.error);
      throw new Error(response.error);
    }
    
    return response.data!;
  }

  async updateChallengePhase(id: number, phaseData: Partial<ChallengePhase>): Promise<ChallengePhase> {
    console.log('Updating challenge phase:', id, phaseData);
    
    const response = await apiService.put<ChallengePhase>(`/challenge-phases/${id}/`, phaseData);
    
    if (response.error) {
      console.error('Error updating challenge phase:', response.error);
      throw new Error(response.error);
    }
    
    return response.data!;
  }

  async deleteChallengePhase(id: number): Promise<void> {
    console.log('Deleting challenge phase:', id);
    
    const response = await apiService.delete(`/challenge-phases/${id}/`);
    
    if (response.error) {
      console.error('Error deleting challenge phase:', response.error);
      throw new Error(response.error);
    }
  }

  async getChallengeEnrollments(filters?: ChallengeEnrollmentFilters): Promise<ChallengeEnrollmentResponse> {
    const queryParams = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/challenge-enrollments/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    console.log('Fetching challenge enrollments from:', endpoint);
    
    const response = await apiService.get<ChallengeEnrollmentResponse>(endpoint);
    
    if (response.error) {
      console.error('Error fetching challenge enrollments:', response.error);
      throw new Error(response.error);
    }
    
    // Ensure we have the expected structure
    const data = response.data;
    if (!data) {
      console.warn('No challenge enrollments data received');
      return {
        count: 0,
        next: null,
        previous: null,
        results: {
          overview: { total_challenges: 0, active: 0, live: 0, failed: 0 },
          results: []
        }
      };
    }
    
    return data;
  }

  // Get challenge enrollments for a specific trader
  async getChallengeEnrollmentsByEmail(email: string): Promise<ChallengeEnrollment[]> {
    console.log(`Fetching challenge enrollments for trader: ${email}`);
    
    const response = await apiService.get<ChallengeEnrollmentResponse>('/challenge-enrollments/');
    
    if (response.error) {
      console.error('Error fetching challenge enrollments:', response.error);
      throw new Error(response.error);
    }

    // Extract enrollments from nested results structure and filter by client email
    const allEnrollments = response.data?.results?.results || [];
    const enrollments = allEnrollments.filter(enrollment => 
      enrollment.client_email === email
    );
    
    console.log(`Found ${enrollments.length} challenge enrollments for ${email}`);
    return enrollments;
  }

  // CRUD operations for Challenge Enrollments
  async createChallengeEnrollment(enrollmentData: ChallengeEnrollmentCreateData): Promise<ChallengeEnrollment> {
    console.log('Creating challenge enrollment:', enrollmentData);
    
    const response = await apiService.post<ChallengeEnrollment>('/admin/challenge/enrollments/', enrollmentData);
    
    if (response.error) {
      console.error('Error creating challenge enrollment:', response.error);
      throw new Error(response.error);
    }
    
    return response.data!;
  }

  async updateChallengeEnrollment(id: string, enrollmentData: ChallengeEnrollmentUpdateData): Promise<ChallengeEnrollment> {
    console.log('Updating challenge enrollment with PATCH:', id, enrollmentData);
    
    // Use apiService instead of manual fetch to handle token refresh automatically
    const response = await apiService.patch<ChallengeEnrollment>(`/admin/challenge/enrollments/${id}/`, enrollmentData);
    
    if (response.error) {
      console.error('Error updating challenge enrollment:', response.error);
      throw new Error(response.error);
    }
    
    if (!response.data) {
      throw new Error('No data received from server');
    }
    
    return response.data;
  }

  async deleteChallengeEnrollment(id: string): Promise<void> {
    console.log('Deleting challenge enrollment:', id);
    
    const response = await apiService.delete(`/admin/challenge/enrollments/${id}/`);
    
    if (response.error) {
      console.error('Error deleting challenge enrollment:', response.error);
      throw new Error(response.error);
    }
  }

  async getClients(): Promise<Client[]> {
    console.log('Fetching clients dropdown from API...');
    
    const response = await apiService.get<Client[]>('/admin/clients-dropdown/');
    
    if (response.error) {
      console.error('Error fetching clients:', response.error);
      throw new Error(response.error);
    }
    
    return response.data || [];
  }
}

export const challengeService = new ChallengeService();

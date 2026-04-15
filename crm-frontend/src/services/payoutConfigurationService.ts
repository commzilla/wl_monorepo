import { apiService } from './apiService';
import { PayoutConfiguration, CreatePayoutConfigurationData, UpdatePayoutConfigurationData } from '@/lib/types/payoutConfiguration';

export class PayoutConfigurationService {
  private baseUrl = '/admin/enrollments/payout-config';

  async getPayoutConfiguration(enrollmentId: string): Promise<PayoutConfiguration> {
    const response = await apiService.get<PayoutConfiguration>(`${this.baseUrl}/${enrollmentId}/`);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  }

  async createPayoutConfiguration(enrollmentId: string, data: CreatePayoutConfigurationData): Promise<PayoutConfiguration> {
    const response = await apiService.post<PayoutConfiguration>(`${this.baseUrl}/${enrollmentId}/`, data);
    
    if (response.error || !response.data) {
      console.error('Create payout configuration failed:', response);
      throw new Error(response.error || 'Failed to create payout configuration - no data returned');
    }
    
    return response.data;
  }

  async updatePayoutConfiguration(enrollmentId: string, data: UpdatePayoutConfigurationData): Promise<PayoutConfiguration> {
    const response = await apiService.put<PayoutConfiguration>(`${this.baseUrl}/${enrollmentId}/`, data);
    
    if (response.error || !response.data) {
      console.error('Update payout configuration failed:', response);
      throw new Error(response.error || 'Failed to update payout configuration - no data returned');
    }
    
    return response.data;
  }
}

export const payoutConfigurationService = new PayoutConfigurationService();
import { apiService } from './apiService';
import { PayoutConfigImportResponse } from '@/lib/types/payoutConfigImport';

export class PayoutConfigImportService {
  private baseUrl = '/admin/enrollments/import-payout-configs';

  async importPayoutConfigs(file: File): Promise<PayoutConfigImportResponse> {
    const formData = new FormData();
    formData.append('file', file);

    // Custom fetch for file upload since apiService doesn't support FormData with custom headers
    const token = localStorage.getItem('access');
    const url = `https://api.we-fund.com${this.baseUrl}/`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
      mode: 'cors',
      credentials: 'omit',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data;
  }
}

export const payoutConfigImportService = new PayoutConfigImportService();
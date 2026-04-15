import { apiService } from './apiService';
import type { CertificateTemplate } from '@/types/certificate';

export const certificateService = {
  // Get all certificate templates
  async getTemplates(): Promise<CertificateTemplate[]> {
    const response = await apiService.get<CertificateTemplate[]>('/admin/certificate-templates/');
    return response.data;
  },

  // Get a single certificate template
  async getTemplate(id: number): Promise<CertificateTemplate> {
    const response = await apiService.get<CertificateTemplate>(`/admin/certificate-templates/${id}/`);
    return response.data;
  },

  // Create a new certificate template
  async createTemplate(template: Omit<CertificateTemplate, 'id' | 'available_images'>): Promise<CertificateTemplate> {
    const response = await apiService.post<CertificateTemplate>('/admin/certificate-templates/', template);
    return response.data;
  },

  // Update an existing certificate template
  async updateTemplate(id: number, template: Partial<Omit<CertificateTemplate, 'id' | 'available_images'>>): Promise<CertificateTemplate> {
    const response = await apiService.patch<CertificateTemplate>(`/admin/certificate-templates/${id}/`, template);
    return response.data;
  },

  // Delete a certificate template
  async deleteTemplate(id: number): Promise<void> {
    await apiService.delete(`/admin/certificate-templates/${id}/`);
  },

  // Lookup payouts by email
  async lookupPayouts(clientEmail: string): Promise<{
    client_email: string;
    payouts: Array<{
      payout_id: string;
      payout_value: number;
      payout_date: string;
      payout_status: string;
    }>;
  }> {
    const response = await apiService.post<{
      client_email: string;
      payouts: Array<{
        payout_id: string;
        payout_value: number;
        payout_date: string;
        payout_status: string;
      }>;
    }>('/admin/payouts/lookup/', { client_email: clientEmail });
    return response.data;
  },

  // Manually generate a challenge certificate
  async generateChallengeCertificate(data: {
    client_email: string;
    mt5_account_id?: string;
    template_key: string;
    title: string;
  }): Promise<any> {
    const response = await apiService.post('/admin/certificates/manual-generate/challenge/', data);
    return response.data;
  },

  // Manually generate a payout certificate
  async generatePayoutCertificate(data: {
    client_email: string;
    payout_id?: string;
    title: string;
    profit_share?: number;
  }): Promise<any> {
    const response = await apiService.post('/admin/certificates/manual-generate/payout/', data);
    return response.data;
  }
};
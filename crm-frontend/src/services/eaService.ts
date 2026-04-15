import { apiService } from './apiService';

export interface EARequest {
  id: string;
  client_name: string;
  client_email: string;
  enrollment_id: string;
  mq5_file_url: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string;
  created_at: string;
  updated_at: string;
}

export interface EAUpdateRequest {
  status: 'approved' | 'rejected';
  rejection_reason?: string;
}

class EAService {
  async getEARequests() {
    return apiService.get<EARequest[]>('/admin/ea-requests/');
  }

  async updateEARequest(id: string, data: EAUpdateRequest) {
    return apiService.put<EARequest>(`/admin/ea-requests/${id}/`, data);
  }

  async getFileContent(id: string) {
    return apiService.get<{ content: string }>(`/admin/ea-requests/${id}/file-content/`);
  }
}

export const eaService = new EAService();
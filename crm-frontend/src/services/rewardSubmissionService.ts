import { apiService } from './apiService';
import type { 
  RewardSubmission, 
  CreateRewardSubmissionData,
  ApproveSubmissionData,
  DeclineSubmissionData
} from '@/lib/types/rewardSubmission';

export const rewardSubmissionService = {
  getSubmissions: async (params?: { status?: string; task?: string; search?: string; ordering?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.task) queryParams.append('task', params.task);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.ordering) queryParams.append('ordering', params.ordering);
    
    const endpoint = `/admin/reward/submissions/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.get<RewardSubmission[]>(endpoint);
  },

  getSubmission: async (id: string) => {
    return apiService.get<RewardSubmission>(`/admin/reward/submissions/${id}/`);
  },

  createSubmission: async (data: CreateRewardSubmissionData) => {
    let response;
    if (data.proof_image_file) {
      const formData = new FormData();
      formData.append('task', data.task);
      if (data.notes) formData.append('notes', data.notes);
      if (data.proof_url) formData.append('proof_url', data.proof_url);
      formData.append('proof_image_file', data.proof_image_file);
      
      response = await apiService.uploadFile<RewardSubmission>('/admin/reward/submissions/', formData, 'POST');
    } else {
      response = await apiService.post<RewardSubmission>('/admin/reward/submissions/', data);
    }
    if (response.error) throw new Error(response.error);
    return response;
  },

  approveSubmission: async (id: string, data: ApproveSubmissionData) => {
    return apiService.post<{ detail: string }>(`/admin/reward/submissions/${id}/approve/`, data);
  },

  declineSubmission: async (id: string, data: DeclineSubmissionData) => {
    return apiService.post<{ detail: string }>(`/admin/reward/submissions/${id}/decline/`, data);
  },

  deleteSubmission: async (id: string) => {
    return apiService.delete(`/admin/reward/submissions/${id}/`);
  },
};

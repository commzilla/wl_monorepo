import { apiService } from './apiService';
import type { RewardTask, CreateRewardTaskData, UpdateRewardTaskData } from '@/lib/types/rewardTask';

export const rewardTaskService = {
  getTasks: async (params?: { status?: string; search?: string; ordering?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.ordering) queryParams.append('ordering', params.ordering);
    
    const endpoint = `/admin/reward/tasks/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await apiService.get<RewardTask[]>(endpoint);
    if (response.error) throw new Error(response.error);
    return response;
  },

  getTask: async (id: string) => {
    const response = await apiService.get<RewardTask>(`/admin/reward/tasks/${id}/`);
    if (response.error) throw new Error(response.error);
    return response;
  },

  createTask: async (data: CreateRewardTaskData) => {
    const hasFiles = data.feature_image_file || data.example_image_file;
    let response;
    if (hasFiles) {
      const formData = new FormData();
      formData.append('title', data.title);
      if (data.description) formData.append('description', data.description);
      if (data.instructions) formData.append('instructions', data.instructions);
      if (data.url) formData.append('url', data.url);
      if (data.requires_url_submission !== undefined) formData.append('requires_url_submission', String(data.requires_url_submission));
      formData.append('reward_amount', String(data.reward_amount));
      if (data.status) formData.append('status', data.status);
      if (data.starts_at) formData.append('starts_at', data.starts_at);
      if (data.expires_at) formData.append('expires_at', data.expires_at);
      if (data.expire_action) formData.append('expire_action', data.expire_action);
      if (data.feature_image_file) formData.append('feature_image_file', data.feature_image_file);
      if (data.example_image_file) formData.append('example_image_file', data.example_image_file);
      
      response = await apiService.uploadFile<RewardTask>('/admin/reward/tasks/', formData, 'POST');
    } else {
      response = await apiService.post<RewardTask>('/admin/reward/tasks/', data);
    }
    if (response.error) throw new Error(response.error);
    return response;
  },

  updateTask: async (id: string, data: UpdateRewardTaskData) => {
    const hasFiles = data.feature_image_file || data.remove_feature_image || data.example_image_file || data.remove_example_image;
    let response;
    if (hasFiles) {
      const formData = new FormData();
      if (data.title) formData.append('title', data.title);
      if (data.description) formData.append('description', data.description);
      if (data.instructions) formData.append('instructions', data.instructions);
      if (data.url) formData.append('url', data.url);
      if (data.requires_url_submission !== undefined) formData.append('requires_url_submission', String(data.requires_url_submission));
      if (data.reward_amount) formData.append('reward_amount', String(data.reward_amount));
      if (data.status) formData.append('status', data.status);
      if (data.starts_at !== undefined) formData.append('starts_at', data.starts_at || '');
      if (data.expires_at !== undefined) formData.append('expires_at', data.expires_at || '');
      if (data.expire_action) formData.append('expire_action', data.expire_action);
      if (data.remove_feature_image) formData.append('remove_feature_image', 'true');
      if (data.feature_image_file) formData.append('feature_image_file', data.feature_image_file);
      if (data.remove_example_image) formData.append('remove_example_image', 'true');
      if (data.example_image_file) formData.append('example_image_file', data.example_image_file);
      
      response = await apiService.uploadFile<RewardTask>(`/admin/reward/tasks/${id}/`, formData, 'PATCH');
    } else {
      response = await apiService.patch<RewardTask>(`/admin/reward/tasks/${id}/`, data);
    }
    if (response.error) throw new Error(response.error);
    return response;
  },

  deleteTask: async (id: string) => {
    const response = await apiService.delete(`/admin/reward/tasks/${id}/`);
    if (response.error) throw new Error(response.error);
    return response;
  },
};

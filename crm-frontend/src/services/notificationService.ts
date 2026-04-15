import { apiService } from './apiService';

export interface ScheduledNotification {
  id: string;
  user?: string | null;
  user_email?: string | null;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'kyc' | 'challenge' | 'payout' | 'system';
  action_url: string | null;
  image_url: string | null;
  expires_at: string | null;
  scheduled_for: string;
  status: 'pending' | 'paused' | 'sent' | 'cancelled';
  status_display?: string;
  celery_task_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduledNotificationPayload {
  title: string;
  message: string;
  type: string;
  action_url?: string | null;
  image_url?: string | null;
  expires_at?: string | null;
  scheduled_for: string;
  user_email?: string;
}

export const notificationService = {
  // Upload notification image to CDN
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiService.uploadFile<{ url: string }>('/admin/notifications/upload-image/', formData);
  },

  // List all scheduled notifications
  listScheduled: async () => {
    return apiService.get<ScheduledNotification[]>('/admin/scheduled-notifications/');
  },

  // Create a new scheduled notification
  createScheduled: async (data: ScheduledNotificationPayload) => {
    return apiService.post<ScheduledNotification>('/admin/scheduled-notifications/', data);
  },

  // Update a scheduled notification
  updateScheduled: async (id: string, data: ScheduledNotificationPayload) => {
    return apiService.put<ScheduledNotification>(`/admin/scheduled-notifications/${id}/`, data);
  },

  // Delete a scheduled notification
  deleteScheduled: async (id: string) => {
    return apiService.delete(`/admin/scheduled-notifications/${id}/`);
  },

  // Pause a pending notification
  pauseScheduled: async (id: string) => {
    return apiService.post(`/admin/scheduled-notifications/${id}/pause/`);
  },

  // Resume a paused notification
  resumeScheduled: async (id: string) => {
    return apiService.post(`/admin/scheduled-notifications/${id}/resume/`);
  },

  // Cancel a notification
  cancelScheduled: async (id: string) => {
    return apiService.post(`/admin/scheduled-notifications/${id}/cancel/`);
  },
};

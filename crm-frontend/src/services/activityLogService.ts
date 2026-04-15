import { apiService } from './apiService';

export interface ActivityLog {
  id: string;
  actor: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  } | null;
  actor_name: string;
  action_type: string;
  content_type: number;
  object_id: string;
  content_object_type: string;
  content_object_id: string;
  content_object_name: string;
  details: Record<string, any> | string;
  created_at: string;
  ip_address?: string;
  trader_name?: string;
  trader_email?: string;
}

export interface ActivityLogDetail extends ActivityLog {
  actor_email?: string;
  actor_role?: string;
  action_type_display?: string;
  content_object_details?: Record<string, any>;
  content_object?: any;
  changes?: Record<string, any>;
}

export interface ActivityLogFilters {
  date_from?: string;
  date_to?: string;
  action_type?: string;
  actor?: string;
  content_type?: string;
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
}

export interface ActivityLogResponse {
  results: ActivityLog[];
  pagination: {
    page: number;
    page_size: number;
    total_count: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
    next_page: number | null;
    previous_page: number | null;
  };
}

export const activityLogService = {
  async getActivityLogs(filters?: ActivityLogFilters): Promise<ActivityLogResponse> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.date_from) params.append('created_at_after', filters.date_from);
      if (filters.date_to) params.append('created_at_before', filters.date_to);
      if (filters.action_type) params.append('action_type', filters.action_type);
      if (filters.actor) params.append('actor', filters.actor);
      if (filters.content_type) params.append('content_type', filters.content_type);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.page_size) params.append('page_size', filters.page_size.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.ordering) params.append('ordering', filters.ordering);
    }

    const queryString = params.toString();
    const endpoint = `/admin/activity-logs/${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiService.get<ActivityLogResponse>(endpoint);
    return response.data!;
  },

  async getActivityLogDetail(id: string): Promise<ActivityLogDetail> {
    const response = await apiService.get<ActivityLogDetail>(`/admin/activity-logs/${id}/`);
    return response.data!;
  },
};

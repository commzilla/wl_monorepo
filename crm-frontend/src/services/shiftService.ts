import { apiService } from './apiService';

export interface ShiftSchedule {
  id?: string;
  agent: string;
  agent_name?: string;
  agent_email?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  timezone: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ShiftOverride {
  id?: string;
  agent: string;
  agent_name?: string;
  agent_email?: string;
  date: string;
  is_blocked: boolean;
  start_time?: string | null;
  end_time?: string | null;
  timezone: string;
  reason: string;
  created_at?: string;
  updated_at?: string;
}

export interface OnDutyResponse {
  has_schedules: boolean;
  agents: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  }[];
}

class ShiftService {
  // Schedules
  async getSchedules(agentId?: string): Promise<ShiftSchedule[]> {
    let url = '/admin/support/shifts/';
    if (agentId) url += `?agent=${agentId}`;
    const response = await apiService.get<ShiftSchedule[]>(url);
    if (response.error) throw new Error(response.error);
    return response.data!;
  }

  async createSchedule(data: Omit<ShiftSchedule, 'id' | 'agent_name' | 'agent_email' | 'created_at' | 'updated_at'>): Promise<ShiftSchedule> {
    const response = await apiService.post<ShiftSchedule>('/admin/support/shifts/', data);
    if (response.error) throw new Error(response.error);
    return response.data!;
  }

  async updateSchedule(id: string, data: Partial<ShiftSchedule>): Promise<ShiftSchedule> {
    const response = await apiService.patch<ShiftSchedule>(`/admin/support/shifts/${id}/`, data);
    if (response.error) throw new Error(response.error);
    return response.data!;
  }

  async deleteSchedule(id: string): Promise<void> {
    const response = await apiService.delete(`/admin/support/shifts/${id}/`);
    if (response.error) throw new Error(response.error);
  }

  // Overrides
  async getOverrides(agentId?: string): Promise<ShiftOverride[]> {
    let url = '/admin/support/shifts/overrides/';
    if (agentId) url += `?agent=${agentId}`;
    const response = await apiService.get<ShiftOverride[]>(url);
    if (response.error) throw new Error(response.error);
    return response.data!;
  }

  async createOverride(data: Omit<ShiftOverride, 'id' | 'agent_name' | 'agent_email' | 'created_at' | 'updated_at'>): Promise<ShiftOverride> {
    const response = await apiService.post<ShiftOverride>('/admin/support/shifts/overrides/', data);
    if (response.error) throw new Error(response.error);
    return response.data!;
  }

  async deleteOverride(id: string): Promise<void> {
    const response = await apiService.delete(`/admin/support/shifts/overrides/${id}/`);
    if (response.error) throw new Error(response.error);
  }

  // On-duty check
  async getOnDuty(): Promise<OnDutyResponse> {
    const response = await apiService.get<OnDutyResponse>('/admin/support/shifts/on-duty/');
    if (response.error) throw new Error(response.error);
    return response.data!;
  }
}

export const shiftService = new ShiftService();

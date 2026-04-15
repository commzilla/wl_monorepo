import { apiService } from './apiService';
import { PeriodicTask, EngineTaskToggleRequest, EngineTaskEditRequest, SupervisorStatus, SupervisorControlResponse } from '@/lib/types/engine';

class EngineService {
  private readonly baseUrl = '/engine';

  async getTasks(): Promise<PeriodicTask[]> {
    const response = await apiService.get<PeriodicTask[]>(`${this.baseUrl}/tasks/`);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data || [];
  }

  async toggleTask(taskId: number, action: "start" | "stop"): Promise<PeriodicTask> {
    const response = await apiService.post<PeriodicTask>(
      `${this.baseUrl}/tasks/${taskId}/toggle/`,
      { action }
    );
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data!;
  }

  async editTask(taskId: number, editData: EngineTaskEditRequest): Promise<PeriodicTask> {
    const response = await apiService.post<PeriodicTask>(
      `${this.baseUrl}/tasks/${taskId}/edit/`,
      editData
    );
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data!;
  }

  async getSupervisorStatus(): Promise<SupervisorStatus> {
    const response = await apiService.get<SupervisorStatus>(`${this.baseUrl}/supervisor/status/`);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data!;
  }

  async controlSupervisorProcess(processName: string, action: "start" | "stop" | "restart"): Promise<SupervisorControlResponse> {
    const response = await apiService.post<SupervisorControlResponse>(
      `${this.baseUrl}/supervisor/${processName}/${action}/`,
      {}
    );
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data!;
  }
}

export const engineService = new EngineService();
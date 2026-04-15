import { apiService } from './apiService';

export interface WebhookStatus {
  id: number;
  status: string;
}

export interface WebhookResponse {
  id: number;
  status: string;
}

export interface WebhookError {
  error: string;
}

class WebhookService {
  async getWebhookStatus(): Promise<WebhookStatus> {
    const response = await apiService.get<WebhookStatus>('/wc-webhook/status/');
    return response.data;
  }

  async enableWebhook(): Promise<WebhookResponse> {
    const response = await apiService.post<WebhookResponse>('/wc-webhook/enable/');
    return response.data;
  }

  async disableWebhook(): Promise<WebhookResponse> {
    const response = await apiService.post<WebhookResponse>('/wc-webhook/disable/');
    return response.data;
  }
}

export const webhookService = new WebhookService();
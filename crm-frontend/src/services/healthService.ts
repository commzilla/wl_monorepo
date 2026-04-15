const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.we-fund.com';

export interface HealthCheckDetail {
  status: 'ok' | 'warn' | 'critical';
  latency_ms?: number;
  free_pct?: number;
  workers?: number;
  tasks_run_recently?: number;
  last_run?: string | null;
  stale_seconds?: number;
  threshold_seconds?: number;
  reachable?: boolean;
  count?: number;
  detail?: string;
}

export interface HealthSummary {
  total: number;
  ok: number;
  warn: number;
  critical: number;
}

export interface SystemHealthResponse {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  checks: Record<string, HealthCheckDetail>;
  summary: HealthSummary;
}

class HealthService {
  async getSystemHealth(): Promise<SystemHealthResponse> {
    const url = `${API_BASE_URL}/api/health/`;
    const token = localStorage.getItem('access');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      mode: 'cors',
      credentials: 'omit',
    });

    // Parse JSON regardless of HTTP status (endpoint returns 503 on critical)
    const data = await response.json();
    return data as SystemHealthResponse;
  }
}

export const healthService = new HealthService();

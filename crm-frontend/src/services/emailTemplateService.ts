/**
 * Email Template & Log Service — Django API Client
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.we-fund.com';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EmailTemplate {
  id: number;
  template_path: string;
  name: string;
  subject: string;
  category: string;
  body_html: string;
  body_text: string;
  variables: string[];
  sample_context: Record<string, any>;
  description: string;
  is_active: boolean;
  last_modified_by: number | null;
  last_modified_by_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailLogEntry {
  id: number;
  user: number | null;
  user_email: string | null;
  category: string;
  subject: string;
  to_email: string;
  from_email: string;
  status: 'queued' | 'sent' | 'failed';
  error_message: string;
  body_html: string;
  body_text: string;
  sent_at: string | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface PreviewResponse {
  rendered_html: string;
  variables: string[];
  context_used: Record<string, any>;
}

// ─── Auth Helper ─────────────────────────────────────────────────────────────

function getAuthToken(): string | null {
  return localStorage.getItem('access') || localStorage.getItem('auth_token') || localStorage.getItem('token');
}

async function apiCall<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  data?: Record<string, any>,
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const config: RequestInit = { method, headers };
  if (data && method !== 'GET') config.body = JSON.stringify(data);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || error.error || 'Request failed');
  }

  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text);
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class EmailTemplateService {

  // Templates
  static async getTemplates(params?: {
    category?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<EmailTemplate>> {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'all') query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    query.set('page_size', String(params?.page_size || 50));
    return apiCall<PaginatedResponse<EmailTemplate>>(`/admin/email-templates/?${query}`);
  }

  static async getTemplate(id: number): Promise<EmailTemplate> {
    return apiCall<EmailTemplate>(`/admin/email-templates/${id}/`);
  }

  static async updateTemplate(id: number, data: Partial<EmailTemplate>): Promise<EmailTemplate> {
    return apiCall<EmailTemplate>(`/admin/email-templates/${id}/`, 'PATCH', data);
  }

  static async previewTemplate(id: number, context?: Record<string, any>): Promise<PreviewResponse> {
    return apiCall<PreviewResponse>(
      `/admin/email-templates/${id}/preview/`,
      'POST',
      context ? { context } : {},
    );
  }

  static async sendTestEmail(id: number, toEmail: string, context?: Record<string, any>): Promise<{ message: string }> {
    return apiCall<{ message: string }>(
      `/admin/email-templates/${id}/send-test/`,
      'POST',
      { to_email: toEmail, ...(context ? { context } : {}) },
    );
  }

  // Email Logs
  static async getEmailLogs(params?: {
    category?: string;
    status?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<EmailLogEntry>> {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'all') query.set('category', params.category);
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    query.set('page_size', String(params?.page_size || 25));
    return apiCall<PaginatedResponse<EmailLogEntry>>(`/admin/email-logs/?${query}`);
  }

  static async getEmailLog(id: number): Promise<EmailLogEntry> {
    return apiCall<EmailLogEntry>(`/admin/email-logs/${id}/`);
  }
}

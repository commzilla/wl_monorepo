import { apiService, ApiResponse } from '@/services/apiService';

export interface Release {
  id: string;
  title: string;
  description?: string;
  version: string;
  release_date: string;
  repos_affected: string[];
  is_major: boolean;
  created_by_name: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ReleaseListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Release[];
}

export interface CreateReleaseRequest {
  title: string;
  description: string;
  version?: string;
  release_date: string;
  repos_affected: string[];
  is_major: boolean;
}

export interface GitCommit {
  hash: string;
  short_hash: string;
  subject: string;
  date: string;
  author: string;
  repo: string;
}

export interface GitLogResponse {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  results: GitCommit[];
}

class ReleaseService {
  async getReleases(params?: { search?: string; ordering?: string; page?: number; page_size?: number }): Promise<ApiResponse<ReleaseListResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.ordering) searchParams.set('ordering', params.ordering);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    const qs = searchParams.toString();
    return apiService.get<ReleaseListResponse>(`/admin/releases/${qs ? `?${qs}` : ''}`);
  }

  async getRelease(id: string): Promise<ApiResponse<Release>> {
    return apiService.get<Release>(`/admin/releases/${id}/`);
  }

  async createRelease(data: CreateReleaseRequest): Promise<ApiResponse<Release>> {
    return apiService.post<Release>('/admin/releases/', data);
  }

  async updateRelease(id: string, data: Partial<CreateReleaseRequest>): Promise<ApiResponse<Release>> {
    return apiService.patch<Release>(`/admin/releases/${id}/`, data);
  }

  async deleteRelease(id: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`/admin/releases/${id}/`);
  }

  async getGitLog(params?: { repo?: string; page?: number; page_size?: number }): Promise<ApiResponse<GitLogResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.repo) searchParams.set('repo', params.repo);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    const qs = searchParams.toString();
    return apiService.get<GitLogResponse>(`/admin/git-log/${qs ? `?${qs}` : ''}`);
  }
}

export const releaseService = new ReleaseService();

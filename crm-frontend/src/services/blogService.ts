import { apiService } from '@/services/apiService';

// Types
export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  post_count: number;
  created_at: string;
  updated_at: string;
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string | null;
  category_name: string | null;
  tags: string[];
  tag_names: string[];
  featured_image: string;
  featured_image_alt: string;
  meta_title: string;
  meta_description: string;
  focus_keyword: string;
  canonical_url: string;
  author: string | null;
  author_email: string | null;
  author_display_name: string;
  status: 'draft' | 'published' | 'archived';
  published_at: string | null;
  reading_time_minutes: number;
  ai_generated: boolean;
  ai_metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface BlogPostsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: BlogPost[];
}

export interface BlogPostFilters {
  search?: string;
  status?: string;
  category?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface AIGenerateRequest {
  mode: 'generate_outline' | 'generate_article' | 'improve_seo';
  topic?: string;
  keywords?: string[];
  target_audience?: string;
  outline?: string;
  tone?: string;
  include_wefund_cta?: boolean;
  content?: string;
  focus_keyword?: string;
}

export const blogService = {
  // Posts
  async getPosts(filters: BlogPostFilters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.category) params.append('category', filters.category);
    if (filters.ordering) params.append('ordering', filters.ordering);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.page_size) params.append('page_size', filters.page_size.toString());
    const qs = params.toString();
    return apiService.get<BlogPostsResponse>(`/admin/blog/posts/${qs ? `?${qs}` : ''}`);
  },

  async getPost(id: string) {
    return apiService.get<BlogPost>(`/admin/blog/posts/${id}/`);
  },

  async createPost(data: Partial<BlogPost> & { tag_ids?: string[] }) {
    return apiService.post<BlogPost>('/admin/blog/posts/', data);
  },

  async updatePost(id: string, data: Partial<BlogPost> & { tag_ids?: string[] }) {
    return apiService.patch<BlogPost>(`/admin/blog/posts/${id}/`, data);
  },

  async deletePost(id: string) {
    return apiService.delete(`/admin/blog/posts/${id}/`);
  },

  async publishPost(id: string) {
    return apiService.post<BlogPost>(`/admin/blog/posts/${id}/publish/`, {});
  },

  async unpublishPost(id: string) {
    return apiService.post<BlogPost>(`/admin/blog/posts/${id}/unpublish/`, {});
  },

  // Categories
  async getCategories() {
    return apiService.get<BlogCategory[]>('/admin/blog/categories/');
  },

  async createCategory(data: Partial<BlogCategory>) {
    return apiService.post<BlogCategory>('/admin/blog/categories/', data);
  },

  async updateCategory(id: string, data: Partial<BlogCategory>) {
    return apiService.patch<BlogCategory>(`/admin/blog/categories/${id}/`, data);
  },

  async deleteCategory(id: string) {
    return apiService.delete(`/admin/blog/categories/${id}/`);
  },

  // Tags
  async getTags() {
    return apiService.get<BlogTag[]>('/admin/blog/tags/');
  },

  async createTag(data: Partial<BlogTag>) {
    return apiService.post<BlogTag>('/admin/blog/tags/', data);
  },

  async deleteTag(id: string) {
    return apiService.delete(`/admin/blog/tags/${id}/`);
  },

  // AI Generation
  async aiGenerate(data: AIGenerateRequest) {
    return apiService.post<any>('/admin/blog/ai-generate/', data);
  },

  // Image Upload
  async uploadImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return apiService.uploadFile<{ url: string }>('/admin/blog/upload-image/', formData);
  },
};

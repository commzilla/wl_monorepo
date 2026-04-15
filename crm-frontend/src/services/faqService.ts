/**
 * FAQ Service - Django API Integration
 * Replaces Supabase with Django REST API endpoints
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.we-fund.com';

function getAuthToken(): string | null {
  return localStorage.getItem('access') || localStorage.getItem('admin_token') || localStorage.getItem('access_token');
}

async function apiCall<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  data?: Record<string, any>
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (data && method !== 'GET') {
    config.body = JSON.stringify(data);
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.detail || 'Request failed');
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export interface FAQCollection {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  article_count?: number;
  articles?: FAQArticle[];
}

export interface FAQArticle {
  id: string;
  collection_id: string;
  collection?: string; // UUID for Django API
  title: string;
  content: string;
  search_keywords: string[];
  display_order: number;
  is_active: boolean;
  views_count: number;
  helpful_count: number;
  not_helpful_count: number;
  created_at: string;
  updated_at: string;
  faq_collections?: { title: string };
  collection_title?: string; // From Django serializer
  relevance_score?: number;
  helpfulness_ratio?: number;
}

export class FAQService {
  // ===================================================================
  // PUBLIC METHODS (for widget - uses POST endpoints)
  // ===================================================================

  static async listCollections(): Promise<FAQCollection[]> {
    return apiCall<FAQCollection[]>('/support/faq/list-collections/', 'POST');
  }

  static async getCollection(collectionId: string): Promise<FAQCollection> {
    return apiCall<FAQCollection>('/support/faq/get-collection/', 'POST', {
      collection_id: collectionId
    });
  }

  static async search(query: string): Promise<FAQArticle[]> {
    return apiCall<FAQArticle[]>('/support/faq/search/', 'POST', { query });
  }

  static async trackView(articleId: string): Promise<{ success: boolean }> {
    return apiCall<{ success: boolean }>('/support/faq/track-view/', 'POST', {
      article_id: articleId
    });
  }

  static async trackHelpful(articleId: string, helpful: boolean): Promise<{ success: boolean }> {
    return apiCall<{ success: boolean }>('/support/faq/track-helpful/', 'POST', {
      article_id: articleId,
      helpful
    });
  }

  // ===================================================================
  // ADMIN METHODS (for CRM - uses REST endpoints)
  // ===================================================================

  static async getAllCollections(): Promise<FAQCollection[]> {
    return apiCall<FAQCollection[]>('/admin/support/faq/collections/');
  }

  static async getCollectionWithArticles(collectionId: string): Promise<FAQCollection & { articles: FAQArticle[] }> {
    const collection = await apiCall<FAQCollection>(`/admin/support/faq/collections/${collectionId}/`);
    const articles = await this.getAllArticles(collectionId);
    return { ...collection, articles };
  }

  static async createCollection(data: Partial<FAQCollection>): Promise<FAQCollection> {
    return apiCall<FAQCollection>('/admin/support/faq/collections/', 'POST', data as Record<string, any>);
  }

  static async updateCollection(collectionId: string, data: Partial<FAQCollection>): Promise<FAQCollection> {
    return apiCall<FAQCollection>(`/admin/support/faq/collections/${collectionId}/`, 'PATCH', data as Record<string, any>);
  }

  static async deleteCollection(collectionId: string): Promise<void> {
    // Soft delete by setting is_active to false
    await apiCall<FAQCollection>(`/admin/support/faq/collections/${collectionId}/`, 'PATCH', {
      is_active: false
    });
  }

  static async getAllArticles(collectionId?: string): Promise<FAQArticle[]> {
    let endpoint = '/admin/support/faq/articles/';
    if (collectionId) {
      endpoint += `?collection=${collectionId}`;
    }
    const articles = await apiCall<FAQArticle[]>(endpoint);

    // Map collection to collection_id for frontend compatibility
    return articles.map(article => ({
      ...article,
      collection_id: article.collection || article.collection_id,
      faq_collections: article.collection_title ? { title: article.collection_title } : undefined,
    }));
  }

  static async createArticle(data: Partial<FAQArticle>): Promise<FAQArticle> {
    // Map collection_id to collection for Django API
    const payload = {
      ...data,
      collection: data.collection_id || data.collection,
    };
    delete (payload as any).collection_id;

    return apiCall<FAQArticle>('/admin/support/faq/articles/', 'POST', payload as Record<string, any>);
  }

  static async updateArticle(articleId: string, data: Partial<FAQArticle>): Promise<FAQArticle> {
    // Map collection_id to collection for Django API
    const payload = { ...data };
    if (payload.collection_id) {
      (payload as any).collection = payload.collection_id;
      delete (payload as any).collection_id;
    }

    return apiCall<FAQArticle>(`/admin/support/faq/articles/${articleId}/`, 'PATCH', payload as Record<string, any>);
  }

  static async deleteArticle(articleId: string): Promise<void> {
    // Soft delete by setting is_active to false
    await apiCall<FAQArticle>(`/admin/support/faq/articles/${articleId}/`, 'PATCH', {
      is_active: false
    });
  }

  static async reorderCollections(orderedIds: string[]): Promise<void> {
    // Update display_order for each collection
    const updates = orderedIds.map((id, index) =>
      this.updateCollection(id, { display_order: index })
    );
    await Promise.all(updates);
  }

  static async reorderArticles(collectionId: string, orderedIds: string[]): Promise<void> {
    // Update display_order for each article
    const updates = orderedIds.map((id, index) =>
      this.updateArticle(id, { display_order: index })
    );
    await Promise.all(updates);
  }

  static async importFAQ(data: {
    markdown: string;
    clear?: boolean;
  }): Promise<{
    success: boolean;
    collections_created: number;
    articles_created: number;
    total_collections: number;
    total_articles: number;
  }> {
    return apiCall('/admin/support/faq/import/', 'POST', data);
  }
}

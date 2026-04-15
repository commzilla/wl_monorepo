import { apiService } from './apiService';
import type { RedeemItem, CreateRedeemItemData, UpdateRedeemItemData } from '@/lib/types/redeemItem';

export const redeemItemService = {
  getItems: async (params?: { category?: string; is_active?: boolean; is_archived?: boolean; search?: string; ordering?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
    if (params?.is_archived !== undefined) queryParams.append('is_archived', params.is_archived.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.ordering) queryParams.append('ordering', params.ordering);
    
    const endpoint = `/admin/reward/redeem-items/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.get<RedeemItem[]>(endpoint);
  },

  getItem: async (id: string) => {
    return apiService.get<RedeemItem>(`/admin/reward/redeem-items/${id}/`);
  },

  createItem: async (data: CreateRedeemItemData) => {
    const formData = new FormData();
    formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    formData.append('category', data.category);
    formData.append('required_wecoins', data.required_wecoins.toString());
    if (data.stock_quantity !== undefined) formData.append('stock_quantity', data.stock_quantity.toString());
    if (data.max_per_user !== undefined) formData.append('max_per_user', data.max_per_user.toString());
    if (data.is_active !== undefined) formData.append('is_active', data.is_active.toString());
    if (data.coupon_code) formData.append('coupon_code', data.coupon_code);
    if (data.addon_code) formData.append('addon_code', data.addon_code);
    if (data.image_file) formData.append('image_file', data.image_file);
    if (data.starts_at) formData.append('starts_at', data.starts_at);
    if (data.starts_at === null) formData.append('starts_at', '');
    if (data.expires_at) formData.append('expires_at', data.expires_at);
    if (data.expires_at === null) formData.append('expires_at', '');
    if (data.expire_action) formData.append('expire_action', data.expire_action);
    if (data.is_archived !== undefined) formData.append('is_archived', data.is_archived.toString());

    return apiService.uploadFile<RedeemItem>('/admin/reward/redeem-items/', formData, 'POST');
  },

  updateItem: async (id: string, data: UpdateRedeemItemData) => {
    const formData = new FormData();
    if (data.title) formData.append('title', data.title);
    if (data.description !== undefined) formData.append('description', data.description);
    if (data.category) formData.append('category', data.category);
    if (data.required_wecoins !== undefined) formData.append('required_wecoins', data.required_wecoins.toString());
    if (data.stock_quantity !== undefined) formData.append('stock_quantity', data.stock_quantity.toString());
    if (data.max_per_user !== undefined) formData.append('max_per_user', data.max_per_user.toString());
    if (data.is_active !== undefined) formData.append('is_active', data.is_active.toString());
    if (data.coupon_code !== undefined) formData.append('coupon_code', data.coupon_code);
    if (data.addon_code !== undefined) formData.append('addon_code', data.addon_code);
    if (data.image_file) formData.append('image_file', data.image_file);
    if (data.remove_image) formData.append('remove_image', 'true');
    if (data.starts_at !== undefined) formData.append('starts_at', data.starts_at || '');
    if (data.expires_at !== undefined) formData.append('expires_at', data.expires_at || '');
    if (data.expire_action) formData.append('expire_action', data.expire_action);
    if (data.is_archived !== undefined) formData.append('is_archived', data.is_archived.toString());

    return apiService.uploadFile<RedeemItem>(`/admin/reward/redeem-items/${id}/`, formData, 'PATCH');
  },

  deleteItem: async (id: string) => {
    return apiService.delete(`/admin/reward/redeem-items/${id}/`);
  },
};

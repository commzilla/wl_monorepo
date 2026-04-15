import { apiService } from '@/services/apiService';

export interface DiscountCode {
  id: number;
  code: string;
  discount_type: 'percentage' | 'fixed' | 'buy_one_get_one';
  discount_value: string;
  max_uses: number | null;
  current_uses: number;
  usage_limit_per_user: number | null;
  min_order_amount: string;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  applicable_products: number[];
  bogo_challenge_types: string[];
  created_at: string;
  updated_at: string;
}

export const discountCodeService = {
  async getDiscountCodes() {
    const response = await apiService.get<DiscountCode[]>('/admin/discount-codes/');
    if (response.error) throw new Error(response.error);
    return response.data || [];
  },

  async getDiscountCode(id: number) {
    const response = await apiService.get<DiscountCode>(`/admin/discount-codes/${id}/`);
    if (response.error) throw new Error(response.error);
    return response.data!;
  },

  async createDiscountCode(data: Partial<DiscountCode>) {
    const response = await apiService.post<DiscountCode>('/admin/discount-codes/', data);
    if (response.error) throw new Error(response.error);
    return response.data!;
  },

  async updateDiscountCode(id: number, data: Partial<DiscountCode>) {
    const response = await apiService.patch<DiscountCode>(`/admin/discount-codes/${id}/`, data);
    if (response.error) throw new Error(response.error);
    return response.data!;
  },

  async deleteDiscountCode(id: number) {
    const response = await apiService.delete(`/admin/discount-codes/${id}/`);
    if (response.error) throw new Error(response.error);
  },

  async bulkImportCSV(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiService.uploadFile<{ created: number; updated: number; errors: string[]; total: number }>(
      '/admin/discount-codes/bulk-import/',
      formData,
    );
    if (response.error) throw new Error(response.error);
    return response.data!;
  },
};

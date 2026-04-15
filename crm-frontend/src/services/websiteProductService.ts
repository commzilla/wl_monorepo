import { apiService } from '@/services/apiService';

export interface WebsiteProductVariant {
  id: number;
  account_size: number;
  price: string;
  entry_fee: string | null;
  original_price: string | null;
  sku: string;
  broker_type: string;
  currency: string;
  is_active: boolean;
  sort_order: number;
}

export interface WebsiteProductAddon {
  id: number;
  name: string;
  description: string;
  price_type: string;
  price_value: string;
  is_active: boolean;
  sort_order: number;
  effect_type: string;
  effect_value: string;
  effect_from_payout: number | null;
}

export interface WebsiteProduct {
  id: number;
  name: string;
  slug: string;
  sku_prefix: string;
  description: string;
  challenge_type: string;
  challenge: number | null;
  is_active: boolean;
  is_pay_after_pass: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  variants: WebsiteProductVariant[];
  addons: WebsiteProductAddon[];
}

export const websiteProductService = {
  async getProducts() {
    const response = await apiService.get<WebsiteProduct[]>('/admin/website-products/');
    if (response.error) throw new Error(response.error);
    return response.data || [];
  },

  async getProduct(id: number) {
    const response = await apiService.get<WebsiteProduct>(`/admin/website-products/${id}/`);
    if (response.error) throw new Error(response.error);
    return response.data!;
  },

  async createProduct(data: Partial<WebsiteProduct>) {
    const response = await apiService.post<WebsiteProduct>('/admin/website-products/', data);
    if (response.error) throw new Error(response.error);
    return response.data!;
  },

  async updateProduct(id: number, data: Partial<WebsiteProduct>) {
    const response = await apiService.patch<WebsiteProduct>(`/admin/website-products/${id}/`, data);
    if (response.error) throw new Error(response.error);
    return response.data!;
  },

  async deleteProduct(id: number) {
    const response = await apiService.delete(`/admin/website-products/${id}/`);
    if (response.error) throw new Error(response.error);
  },

  async createVariant(data: Partial<WebsiteProductVariant> & { product: number }) {
    const response = await apiService.post<WebsiteProductVariant>('/admin/website-product-variants/', data);
    if (response.error) throw new Error(response.error);
    return response.data!;
  },

  async updateVariant(id: number, data: Partial<WebsiteProductVariant>) {
    const response = await apiService.patch<WebsiteProductVariant>(`/admin/website-product-variants/${id}/`, data);
    if (response.error) throw new Error(response.error);
    return response.data!;
  },

  async deleteVariant(id: number) {
    const response = await apiService.delete(`/admin/website-product-variants/${id}/`);
    if (response.error) throw new Error(response.error);
  },

  async createAddon(data: Partial<WebsiteProductAddon> & { products: number[] }) {
    const response = await apiService.post<WebsiteProductAddon>('/admin/website-product-addons/', data);
    if (response.error) throw new Error(response.error);
    return response.data!;
  },

  async updateAddon(id: number, data: Partial<WebsiteProductAddon> & { products?: number[] }) {
    const response = await apiService.patch<WebsiteProductAddon>(`/admin/website-product-addons/${id}/`, data);
    if (response.error) throw new Error(response.error);
    return response.data!;
  },

  async deleteAddon(id: number) {
    const response = await apiService.delete(`/admin/website-product-addons/${id}/`);
    if (response.error) throw new Error(response.error);
  },
};

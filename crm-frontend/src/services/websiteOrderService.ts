import { apiService } from '@/services/apiService';

export interface WebsiteOrder {
  id: string;
  order_number: number | null;
  customer_email: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_country: string;
  customer_phone: string;
  customer_address: Record<string, string>;
  customer_ip: string | null;
  status: string;
  payment_method: string;
  payment_id: string;
  payment_url: string;
  subtotal: string;
  addon_total: string;
  discount_amount: string;
  total: string;
  currency: string;
  product_name: string;
  account_size: number | null;
  discount_code_text: string;
  addons_list: { id: number; name: string; price: string }[];
  linked_order_id: number | null;
  challenge_type: string;
  broker_type: string;
  referral_code: string;
  webhook_payload: Record<string, any>;
  variant: number | null;
  order: number | null;
  discount_code: number | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
}

export interface WebsiteOrderOverview {
  total_orders: number;
  total_revenue: string | null;
  total_discounts: string | null;
  completed_orders: number;
  paid_orders: number;
}

export interface WebsiteOrdersResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    overview: WebsiteOrderOverview;
    orders: WebsiteOrder[];
  };
}

export interface WebsiteOrderFilters {
  search?: string;
  status?: string;
  payment_method?: string;
  customer_country?: string;
  ordering?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

export const websiteOrderService = {
  async getOrders(filters: WebsiteOrderFilters = {}) {
    const params = new URLSearchParams();

    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.payment_method) params.append('payment_method', filters.payment_method);
    if (filters.customer_country) params.append('customer_country', filters.customer_country);
    if (filters.ordering) params.append('ordering', filters.ordering);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.page_size) params.append('page_size', filters.page_size.toString());

    const queryString = params.toString();
    const endpoint = `/admin/website-orders/${queryString ? `?${queryString}` : ''}`;

    const response = await apiService.get<WebsiteOrdersResponse>(endpoint);
    if (response.error) throw new Error(response.error);

    return response.data || {
      count: 0,
      next: null,
      previous: null,
      results: {
        overview: {
          total_orders: 0,
          total_revenue: '0',
          total_discounts: '0',
          completed_orders: 0,
          paid_orders: 0,
        },
        orders: [],
      },
    };
  },

  async getOrder(id: string) {
    const response = await apiService.get<WebsiteOrder>(`/admin/website-orders/${id}/`);
    if (response.error) throw new Error(response.error);
    return response.data!;
  },

  async updateOrderStatus(id: string, newStatus: string) {
    const response = await apiService.patch<WebsiteOrder>(`/admin/website-orders/${id}/`, {
      status: newStatus,
    });
    if (response.error) throw new Error(response.error);
    return response.data!;
  },

  async reprocessOrder(id: string) {
    const response = await apiService.post<{ success: boolean; message: string; status: string; order_id: string | null }>(
      `/admin/website-orders/${id}/reprocess/`,
      {},
    );
    if (response.error) throw new Error(response.error);
    return response.data!;
  },
};

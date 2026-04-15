
import { apiService } from './apiService';

export interface Order {
  id: number;
  date_created: string;
  status: string;
  payment_status: string;
  customer_name: string;
  customer_email: string;
  customer_ip: string;
  billing_address: {
    first_name: string;
    last_name: string;
    company?: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state?: string;
    postcode?: string;
    country: string;
    phone?: string;
    email: string;
  };
  product_name: string;
  cost: string;
  quantity: number;
  total_usd: string;
  items_subtotal_usd: string;
  coupons_discount_usd: string;
  order_total_usd: string;
  paid_usd: string;
  coupon_codes: string[];
  payment_method: string;
  raw_data: any;
  user: string;
  mt5_payload_sent?: any;
  mt5_response?: any;
  mt5_account_id?: string;
  mt5_password?: string;
  mt5_investor_password?: string;

  // === 🆕 WooCommerce Identifiers ===
  woo_order_id?: number;
  woo_order_number: string;
  woo_order_key: string;
  woo_customer_id?: number;

  // === 🆕 Woo Metadata & Tracking ===
  tracking_metadata: Record<string, any>;
  currency: string;
  transaction_id: string;

  // === 🆕 Challenge/Account Metadata ===
  challenge_name: string;
  challenge_broker_type: string;
  challenge_account_size: string;

  // === 🆕 Affiliate Fields ===
  referral_code?: string;
  affiliate?: {
    user_id: number;
    username: string;
  };
}

export interface OrderAffiliateDetails {
  referral_code: string | null;
  affiliate_user_id: number | string | null;
  affiliate_username: string | null;
}

export interface AssignAffiliateData {
  affiliate_user_id: number | string;
}

export interface AssignAffiliateResponse {
  message: string;
  affiliate_user_id: number | string;
  commission_amount: string;
}

export interface OrderOverview {
  total_orders: number;
  total_revenue: string;
  total_discounts: string;
  completed_orders: number;
}

export interface OrdersResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    overview: OrderOverview;
    orders: Order[];
  };
}

export interface OrderFilters {
  search?: string;
  status?: string;
  payment_status?: string;
  payment_method?: string;
  ordering?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

export const orderService = {
  async getOrders(filters: OrderFilters = {}) {
    console.log('Fetching orders with filters:', filters);
    
    // Build query parameters
    const params = new URLSearchParams();
    
    if (filters.search) {
      params.append('search', filters.search);
    }
    
    if (filters.status) {
      params.append('status', filters.status);
    }
    
    if (filters.payment_status) {
      params.append('payment_status', filters.payment_status);
    }
    
    if (filters.payment_method) {
      params.append('payment_method', filters.payment_method);
    }
    
    if (filters.ordering) {
      params.append('ordering', filters.ordering);
    }
    
    if (filters.start_date) {
      params.append('start_date', filters.start_date);
    }
    
    if (filters.end_date) {
      params.append('end_date', filters.end_date);
    }
    
    if (filters.page) {
      params.append('page', filters.page.toString());
    }
    
    if (filters.page_size) {
      params.append('page_size', filters.page_size.toString());
    }
    
    const queryString = params.toString();
    const endpoint = `/admin/orders/${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiService.get<OrdersResponse>(endpoint);
    
    if (response.error) {
      console.error('Orders fetch error:', response.error);
      throw new Error(response.error);
    }
    
    return response.data || {
      count: 0,
      next: null,
      previous: null,
      results: {
        overview: {
          total_orders: 0,
          total_revenue: '0',
          total_discounts: '0',
          completed_orders: 0
        },
        orders: []
      }
    };
  },

  async deleteOrder(orderId: number) {
    console.log('Deleting order:', orderId);
    
    const response = await apiService.delete(`/orders/${orderId}/delete/`);
    
    if (response.error) {
      console.error('Order delete error:', response.error);
      throw new Error(response.error);
    }
    
    return response.data;
  },

  async getOrderAffiliate(orderId: number) {
    console.log('Fetching order affiliate details:', orderId);
    
    const response = await apiService.get<OrderAffiliateDetails>(`/admin/orders/${orderId}/affiliate/`);
    
    if (response.error) {
      console.error('Order affiliate fetch error:', response.error);
      throw new Error(response.error);
    }
    
    return response.data;
  },

  async assignOrderAffiliate(orderId: number, data: AssignAffiliateData) {
    console.log('Assigning affiliate to order:', orderId, data);
    
    const response = await apiService.post<AssignAffiliateResponse>(`/admin/orders/${orderId}/affiliate/assign/`, data);
    
    if (response.error) {
      console.error('Assign affiliate error:', response.error);
      throw new Error(response.error);
    }
    
    return response.data;
  },
};

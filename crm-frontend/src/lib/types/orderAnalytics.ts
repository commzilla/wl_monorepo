export interface PaymentStatusBreakdown {
  payment_status: string;
  count: number;
}

export interface StatusBreakdown {
  status: string;
  count: number;
}

export interface OrderByCountry {
  country: string;
  count: number;
  revenue: number;
}

export interface TopCustomer {
  customer_email: string;
  customer_name: string;
  order_count: number;
  total_spent: number;
  avg_spent: number;
}

export interface RepeatingCustomer {
  customer_email: string;
  customer_name: string;
  order_count: number;
  total_spent: number;
  avg_spent: number;
}

export interface OrderAnalyticsData {
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  refunded_amount: number;
  total_discounts: number;
  coupon_usage_count: number;
  payment_status_breakdown: PaymentStatusBreakdown[];
  status_breakdown: StatusBreakdown[];
  last_month_orders: number;
  last_month_revenue: number;
  current_month_orders: number;
  current_month_revenue: number;
  affiliate_orders: number;
  affiliate_revenue: number;
  orders_by_country: OrderByCountry[];
  top_customers: TopCustomer[];
  repeating_customers: RepeatingCustomer[];
}
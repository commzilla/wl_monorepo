
export interface Coupon {
  id?: number;
  code: string;
  discount_percent: number;
  usage_limit_per_user: number;
  is_bogo?: boolean;
}

export interface Offer {
  id?: number;
  title: string;
  description: string;
  feature_image?: string | File;
  start_date: string;
  end_date: string;
  is_active: boolean;
  coupons?: Coupon[];
  created_at?: string;
  updated_at?: string;
}

export interface OfferFormData {
  title: string;
  description: string;
  feature_image?: File;
  start_date: string;
  end_date: string;
  is_active: boolean;
  coupons: Coupon[];
}

export interface CreateOfferRequest {
  title: string;
  description: string;
  feature_image?: File;
  start_date: string;
  end_date: string;
  is_active: boolean;
  coupons?: Omit<Coupon, 'id'>[];
}

export interface UpdateOfferRequest extends CreateOfferRequest {
  id: number;
}

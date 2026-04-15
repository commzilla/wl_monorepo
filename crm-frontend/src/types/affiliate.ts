
export interface Affiliate {
  id: string;
  business_name: string;
  contact_name?: string;
  email: string;
  phone?: string;
  website?: string;
  website_url?: string;
  application_status: 'pending' | 'approved' | 'rejected';
  affiliate_code: string | null;
  commission_rate: number;
  admin_notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  expected_monthly_volume?: number;
  marketing_channels?: string[];
  social_media_handles?: Record<string, string>;
}

export interface AffiliateSale {
  id: string;
  affiliate_id: string;
  customer_email: string;
  order_reference: string;
  sale_amount: number;
  commission_amount: number;
  sale_date: string;
  payout_date: string | null;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  affiliates?: {
    business_name: string;
    affiliate_code: string;
  };
}

export interface DiscountCampaign {
  id: string;
  name: string;
  description?: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  valid_from: string;
  valid_to: string;
  is_active: boolean;
  usage_limit?: number;
  usage_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AffiliateCommissionTier {
  id: string;
  name: string;
  min_referrals: number;
  max_referrals?: number;
  commission_rate: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAffiliateCommissionTierData {
  name: string;
  min_referrals: number;
  max_referrals?: number;
  commission_rate: number;
}

export interface UpdateAffiliateCommissionTierData {
  name?: string;
  min_referrals?: number;
  max_referrals?: number;
  commission_rate?: number;
}

export interface CustomCommissionInfo {
  is_active: boolean;
  commission_rate: string | null;
  fixed_amount_per_referral: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AffiliateProfile {
  id?: string;
  referral_code: string;
  approved: boolean;
  website_url?: string;
  promotion_strategy?: string;
  referral_count?: number;
  manual_tier_override?: AffiliateCommissionTier | null;
  current_tier?: AffiliateCommissionTier | null;
  effective_commission_rate?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CurrentTierInfo {
  id: string;
  name: string;
  min_referrals: number;
  max_referrals?: number | null;
  commission_rate: string;
}

export interface ManualTierOverrideInfo {
  id: string;
  name: string;
  commission_rate: string;
}

export interface AutoTierInfo {
  id: string;
  name: string;
  min_referrals: number;
  max_referrals?: number | null;
  commission_rate: string;
}

export interface AffiliateUser {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  status: string;
  profile_picture?: string;
  date_of_birth?: string;
  role: string;
  created_at: string;
  updated_at: string;
  affiliate_profile: AffiliateProfile;
  custom_commission_info?: CustomCommissionInfo | null;
  effective_commission_rate?: string;
  current_tier_info?: CurrentTierInfo | null;
  manual_tier_override_info?: ManualTierOverrideInfo | null;
  auto_tier_info?: AutoTierInfo | null;
}

export interface CreateAffiliateUserData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  status?: string;
  profile_picture?: string;
  date_of_birth?: string;
  affiliate_profile?: {
    approved?: boolean;
    website_url?: string;
    promotion_strategy?: string;
  };
  custom_commission?: {
    is_active?: boolean;
    commission_rate?: string;
    fixed_amount_per_referral?: string;
    notes?: string;
  };
}

export interface UpdateAffiliateUserData {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  status?: string;
  profile_picture?: string;
  date_of_birth?: string;
  affiliate_profile?: {
    approved?: boolean;
    website_url?: string;
    promotion_strategy?: string;
  };
  custom_commission?: {
    is_active?: boolean;
    commission_rate?: string;
    fixed_amount_per_referral?: string;
    notes?: string;
  };
}

export interface TopAffiliate {
  id: string;
  username: string;
  email: string;
  referral_code: string;
  approved: boolean;
  referral_count: number;
  total_commission: string;
  total_paid: string;
  pending_payout: string;
  commission_rate: string;
  current_tier: string | null;
  created_at: string;
}

export interface TopAffiliatesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: TopAffiliate[];
}

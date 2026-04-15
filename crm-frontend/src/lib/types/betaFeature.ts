export type BetaFeatureStatus = 'draft' | 'active' | 'closed' | 'released';

export interface BetaFeature {
  id: string;
  code: string;
  name: string;
  description: string;
  status: BetaFeatureStatus;
  requires_kya: boolean;
  requires_kyc: boolean;
  created_at: string;
  updated_at: string;
}

export interface BetaFeatureFormData {
  code: string;
  name: string;
  description: string;
  status: BetaFeatureStatus;
  requires_kya: boolean;
  requires_kyc: boolean;
}

export interface ChangeStatusData {
  status: BetaFeatureStatus;
}

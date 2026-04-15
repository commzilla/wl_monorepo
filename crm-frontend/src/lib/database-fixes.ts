
// This file contains database schema fixes for missing tables and views

export interface EASubmission {
  id: string;
  trader_id: string;
  ea_name: string;
  description: string | null;
  hash: string;
  file_path: string | null;
  challenge_phase: '1-step' | '2-step' | 'live';
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  reviewed_by_first_name: string | null;
  reviewed_by_last_name: string | null;
}

export interface ApprovedEA {
  id: string;
  hash: string;
  ea_name: string;
  allowed_phases: string[];
  approved_by: string;
  created_at: string;
}

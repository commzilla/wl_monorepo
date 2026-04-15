export type CompetitionsBetaAccessStatus = 'pending' | 'requested' | 'approved' | 'declined';

export interface CompetitionsBetaAccess {
  id: string;
  user_id: string;
  user_email: string;
  user_full_name: string;
  status: CompetitionsBetaAccessStatus;
  admin_notes: string | null;
  requested_at: string;
  reviewed_at: string | null;
}

export interface CompetitionsBetaAccessFilters {
  status?: CompetitionsBetaAccessStatus;
}

export interface DeclineCompetitionsRequestData {
  admin_notes: string;
}

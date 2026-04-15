export interface EventLogUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
}

export interface EventLogChallenge {
  id: string;
  mt5_account_id: string;
}

export interface EventLog {
  id: string;
  timestamp: string;
  category: string | null;
  event_type: string;
  user: EventLogUser | null;
  engine: string | null; // "order", "challenge", "kyc", "risk", "payout"
  challenge: EventLogChallenge | null;
  ip_address: string | null;
  metadata: Record<string, any> | null;
  description: string;
}

export interface EventLogFilters {
  date_from?: string;
  date_to?: string;
  category?: string;
  event_type?: string;
  user?: string;
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
}

export interface EventLogResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: EventLog[];
}

export interface EnrollmentEventLog {
  id: string;
  timestamp: string;
  category: string | null;
  category_display: string | null;
  event_type: string;
  event_type_display: string | null;
  engine: string | null;
  engine_display: string | null;
  description: string;
  ip_address: string | null;
  metadata: Record<string, any> | null;
  user: string | null;
  username: string | null;
  user_email: string | null;
  challenge_enrollment: string;
}

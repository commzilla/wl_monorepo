export interface IPSummary {
  ip: string;
  accounts_count: number;
}

export interface AccountByIP {
  login: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  group: string;
  balance: number;
  city: string;
  country: string;
  created: string;
  enrollment_id: string | null;
}

export interface IPSummaryResponse {
  results: IPSummary[];
  count: number;
  next: string | null;
  previous: string | null;
}

export interface AccountsByIPResponse {
  results: AccountByIP[];
  count: number;
  next: string | null;
  previous: string | null;
}

export interface IPAnalyticsPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
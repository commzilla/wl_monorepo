export interface PayoutConfigImportLog {
  id: string;
  uploaded_by?: string;
  file_name?: string;
  total_rows: number;
  processed_rows: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
  created_at: string;
}

export interface PayoutConfigImportResponse {
  detail: string;
  log_id: string;
  errors: Array<{
    row: number;
    error: string;
  }>;
}
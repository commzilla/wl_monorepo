export interface EnrollmentEvent {
  id: string;
  event_type: "breach" | "phase_pass" | "status_changed";
  event_type_display: string;
  timestamp: string;
  balance?: number;
  equity?: number;
  notes?: string;
}

export type EnrollmentEventsResponse = EnrollmentEvent[];
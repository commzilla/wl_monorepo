export interface IntervalSchedule {
  id: number;
  every: number;
  period: string; // "seconds", "minutes", "hours", "days", "weeks"
}

export interface CrontabSchedule {
  id: number;
  minute: string;
  hour: string;
  day_of_week: string;
  day_of_month: string;
  month_of_year: string;
  timezone: string;
}

export interface PeriodicTask {
  id: number;
  name: string;
  task: string;
  enabled: boolean;
  schedule: string; // This comes from the backend's get_schedule method
}

export interface EngineTaskToggleRequest {
  action: "start" | "stop";
}

export interface EngineTaskEditRequest {
  type: "interval" | "crontab";
  // For interval schedules
  every?: number;
  period?: string;
  // For crontab schedules
  minute?: string;
  hour?: string;
  day_of_week?: string;
  day_of_month?: string;
  month_of_year?: string;
}

export interface SupervisorProcess {
  name: string;
  status: string;
  timestamp: string;
}

export interface SupervisorStatus {
  status: string; // Raw supervisor status string
}

export interface SupervisorControlResponse {
  process: string;
  action: string;
  output: string;
}
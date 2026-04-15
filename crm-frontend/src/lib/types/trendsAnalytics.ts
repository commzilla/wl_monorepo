export interface DailyTrend {
  date: string;
  revenue: string;
  payouts: string;
  profit: string;
  challenges_sold: number;
}

export interface WeeklyTrend {
  week: string;
  revenue: string;
  payouts: string;
  profit: string;
  challenges_sold: number;
}

export interface MonthlyTrend {
  month: string;
  revenue: string;
  payouts: string;
  profit: string;
  challenges_sold: number;
}

export interface TrendsAnalyticsResponse {
  daily: DailyTrend[];
  weekly: WeeklyTrend[];
  monthly: MonthlyTrend[];
}

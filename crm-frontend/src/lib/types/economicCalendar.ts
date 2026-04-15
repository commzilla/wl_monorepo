/**
 * Economic Calendar Types
 * Types for economic news events and sync scheduling
 */

export type ImpactLevel = 'low' | 'medium' | 'high';
export type EventSource = 'manual' | 'forex_factory';

export interface EconomicEvent {
  id: string;
  event_name: string;
  currency: string;
  impact: ImpactLevel;
  event_datetime: string;
  time_window_minutes: number;
  affected_symbols: string[];
  actual_value: string | null;
  forecast_value: string | null;
  previous_value: string | null;
  source: EventSource;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EconomicEventCreateData {
  event_name: string;
  currency: string;
  impact: ImpactLevel;
  event_datetime: string;
  time_window_minutes?: number;
  affected_symbols?: string[];
  forecast_value?: string;
  previous_value?: string;
  actual_value?: string;
}

export interface EconomicEventUpdateData {
  event_name?: string;
  currency?: string;
  impact?: ImpactLevel;
  event_datetime?: string;
  time_window_minutes?: number;
  affected_symbols?: string[];
  forecast_value?: string | null;
  previous_value?: string | null;
  actual_value?: string | null;
  is_active?: boolean;
}

export interface SyncSchedule {
  id: string;
  last_sync_at: string | null;
  next_sync_at: string | null;
  sync_interval_hours: number;
  is_enabled: boolean;
  schedule_hour: number;
  last_sync_result: SyncResult;
  created_at: string;
  updated_at: string;
}

export interface SyncResult {
  status: 'success' | 'error' | 'skipped';
  created?: number;
  updated?: number;
  skipped?: number;
  errors?: string[];
  reason?: string;
  error_message?: string;
}

export interface HighImpactEventsResponse {
  upcoming: EconomicEvent[];
  past: EconomicEvent[];
}

export interface EconomicEventFilters {
  currency?: string;
  impact?: ImpactLevel;
  source?: EventSource;
  is_active?: boolean;
  start_date?: string;
  end_date?: string;
  high_impact_only?: boolean;
}

// Available currencies for filtering
export const CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CHF',
  'AUD',
  'NZD',
  'CAD',
  'CNY',
  'XAU',  // Gold
  'OIL',  // Oil
] as const;

export type Currency = typeof CURRENCIES[number];

// Impact level styling/labels
export const IMPACT_LABELS: Record<ImpactLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const IMPACT_COLORS: Record<ImpactLevel, { bg: string; text: string }> = {
  low: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300' },
  medium: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-700 dark:text-yellow-300' },
  high: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-300' },
};

export const SOURCE_LABELS: Record<EventSource, string> = {
  manual: 'Manual',
  forex_factory: 'Forex Factory',
};

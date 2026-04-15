export type TradeSide = 'BUY' | 'SELL';

export interface StopLossChange {
  id: number;
  position_id: string | number;
  login: string | number;
  symbol: string;
  side: TradeSide;
  old_sl: number | string | null;
  new_sl: number | string | null;
  digits: number;
  price_open: number | string;
  price_current: number | string;
  tp: number | string | null;
  profit: number | string;
  storage: number | string;
  changed_at: string;
  created_at: string;
  dealer: string | number | null;
  expert_id: string | number | null;
  comment: string | null;
}

export interface StopLossHistoryFilters {
  position_id?: string;
  login?: string;
  symbol?: string;
  side?: TradeSide | '';
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface StopLossHistoryResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: StopLossChange[];
}

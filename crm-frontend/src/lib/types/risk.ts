
export type BreachSeverity = 'soft' | 'hard';
export type BreachCategory = 
  | 'daily_loss' 
  | 'total_loss' 
  | 'trading_hours' 
  | 'lot_size' 
  | 'frequency' 
  | 'strategy' 
  | 'risk_reward' 
  | 'manipulation';

export interface BreachDetection {
  id: string;
  traderId: string;
  tradeId?: string;
  category: BreachCategory;
  severity: BreachSeverity;
  title: string;
  description: string;
  detectedAt: Date;
  value?: number;
  threshold?: number;
  riskScore: number;
  status: 'active' | 'resolved' | 'investigating';
}

export interface RiskAnalysis {
  traderId: string;
  overallRiskScore: number;
  totalBreaches: number;
  softBreaches: number;
  hardBreaches: number;
  breaches: BreachDetection[];
  lastAnalyzed: Date;
  recommendations: string[];
}

export interface MLBreachEngine {
  analyzeTrader: (traderId: string) => RiskAnalysis;
  detectBreaches: (traderId: string, trades: any[]) => BreachDetection[];
}

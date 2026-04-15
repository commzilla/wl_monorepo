
import { BreachDetection, RiskAnalysis, BreachSeverity, BreachCategory } from '@/lib/types/risk';
import { TraderService } from '@/lib/models/trader';

export class MLBreachDetectionService {
  private static generateBreachId(): string {
    return `breach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static calculateRiskScore(breaches: BreachDetection[]): number {
    const softBreachWeight = 1;
    const hardBreachWeight = 3;
    
    const totalScore = breaches.reduce((score, breach) => {
      const weight = breach.severity === 'hard' ? hardBreachWeight : softBreachWeight;
      return score + (breach.riskScore * weight);
    }, 0);

    return Math.min(Math.round(totalScore), 100);
  }

  private static detectDailyLossBreaches(traderId: string, trades: any[]): BreachDetection[] {
    const breaches: BreachDetection[] = [];
    const dailyLossLimit = traderId === '1' ? 500 : traderId === '2' ? 2500 : 1250;
    
    // Group trades by day and calculate daily P&L
    const dailyPnL: { [key: string]: number } = {};
    trades.forEach(trade => {
      const day = trade.openTime.toDateString();
      dailyPnL[day] = (dailyPnL[day] || 0) + trade.profitLoss;
    });

    Object.entries(dailyPnL).forEach(([day, pnl]) => {
      const lossAmount = Math.abs(pnl < 0 ? pnl : 0);
      const lossPercentage = (lossAmount / dailyLossLimit) * 100;

      if (lossPercentage >= 80 && lossPercentage < 100) {
        breaches.push({
          id: this.generateBreachId(),
          traderId,
          category: 'daily_loss',
          severity: 'soft',
          title: 'Daily Loss Limit Warning',
          description: `Daily loss approaching limit: ${lossPercentage.toFixed(1)}% of maximum allowed`,
          detectedAt: new Date(day),
          value: lossAmount,
          threshold: dailyLossLimit,
          riskScore: Math.round(lossPercentage * 0.6),
          status: 'active'
        });
      } else if (lossPercentage >= 100) {
        breaches.push({
          id: this.generateBreachId(),
          traderId,
          category: 'daily_loss',
          severity: 'hard',
          title: 'Daily Loss Limit Exceeded',
          description: `Daily loss exceeded maximum limit by ${(lossPercentage - 100).toFixed(1)}%`,
          detectedAt: new Date(day),
          value: lossAmount,
          threshold: dailyLossLimit,
          riskScore: Math.min(100, Math.round(lossPercentage * 0.8)),
          status: 'active'
        });
      }
    });

    return breaches;
  }

  private static detectTradingHoursBreaches(traderId: string, trades: any[]): BreachDetection[] {
    const breaches: BreachDetection[] = [];
    
    trades.forEach(trade => {
      const hour = trade.openTime.getHours();
      // Assume prohibited hours are 22:00 - 06:00 UTC
      if (hour >= 22 || hour <= 6) {
        breaches.push({
          id: this.generateBreachId(),
          traderId,
          tradeId: trade.id,
          category: 'trading_hours',
          severity: 'hard',
          title: 'Trading During Prohibited Hours',
          description: `Trade opened at ${trade.openTime.toLocaleTimeString()} (prohibited time)`,
          detectedAt: trade.openTime,
          riskScore: 85,
          status: 'active'
        });
      }
    });

    return breaches;
  }

  private static detectLotSizeBreaches(traderId: string, trades: any[]): BreachDetection[] {
    const breaches: BreachDetection[] = [];
    const maxLotSize = traderId === '2' ? 2.5 : 1.5; // Aggressive trader gets higher limit
    
    trades.forEach(trade => {
      if (trade.lots > maxLotSize) {
        breaches.push({
          id: this.generateBreachId(),
          traderId,
          tradeId: trade.id,
          category: 'lot_size',
          severity: 'soft',
          title: 'Excessive Lot Size Detected',
          description: `Lot size ${trade.lots} exceeds recommended maximum of ${maxLotSize}`,
          detectedAt: trade.openTime,
          value: trade.lots,
          threshold: maxLotSize,
          riskScore: Math.min(60, Math.round((trade.lots / maxLotSize) * 40)),
          status: 'active'
        });
      }
    });

    return breaches;
  }

  private static detectFrequencyBreaches(traderId: string, trades: any[]): BreachDetection[] {
    const breaches: BreachDetection[] = [];
    
    // Group trades by day
    const tradesByDay: { [key: string]: any[] } = {};
    trades.forEach(trade => {
      const day = trade.openTime.toDateString();
      if (!tradesByDay[day]) tradesByDay[day] = [];
      tradesByDay[day].push(trade);
    });

    Object.entries(tradesByDay).forEach(([day, dayTrades]) => {
      if (dayTrades.length > 10) {
        breaches.push({
          id: this.generateBreachId(),
          traderId,
          category: 'frequency',
          severity: 'soft',
          title: 'High Frequency Trading Pattern',
          description: `${dayTrades.length} trades executed in a single day (potential overtrading)`,
          detectedAt: new Date(day),
          value: dayTrades.length,
          threshold: 10,
          riskScore: Math.min(70, dayTrades.length * 5),
          status: 'active'
        });
      }
    });

    return breaches;
  }

  private static detectRiskRewardBreaches(traderId: string, trades: any[]): BreachDetection[] {
    const breaches: BreachDetection[] = [];
    
    trades.forEach(trade => {
      const pips = Math.abs(trade.closePrice - trade.openPrice);
      const riskRewardRatio = trade.profitLoss > 0 ? 
        Math.abs(trade.profitLoss) / (pips * trade.lots * 10) : 0;
      
      if (riskRewardRatio < 0.5 && trade.profitLoss < 0) {
        breaches.push({
          id: this.generateBreachId(),
          traderId,
          tradeId: trade.id,
          category: 'risk_reward',
          severity: 'soft',
          title: 'Poor Risk-to-Reward Ratio',
          description: `Trade has unfavorable risk-reward ratio of 1:${riskRewardRatio.toFixed(2)}`,
          detectedAt: trade.openTime,
          value: riskRewardRatio,
          threshold: 1.0,
          riskScore: 45,
          status: 'active'
        });
      }
    });

    return breaches;
  }

  public static analyzeTrader(traderId: string): RiskAnalysis {
    console.log('MLBreachDetectionService: Analyzing trader:', traderId);
    
    const trader = TraderService.getTraderById(traderId);
    if (!trader) {
      console.error('MLBreachDetectionService: Trader not found:', traderId);
      throw new Error(`Trader ${traderId} not found`);
    }

    // Get trade data using the same logic as TradingActivity page
    const trades = this.getTradeData(traderId);
    console.log('MLBreachDetectionService: Got trades for trader', traderId, ':', trades.length);
    
    // Detect all types of breaches
    const allBreaches: BreachDetection[] = [
      ...this.detectDailyLossBreaches(traderId, trades),
      ...this.detectTradingHoursBreaches(traderId, trades),
      ...this.detectLotSizeBreaches(traderId, trades),
      ...this.detectFrequencyBreaches(traderId, trades),
      ...this.detectRiskRewardBreaches(traderId, trades)
    ];

    console.log('MLBreachDetectionService: Detected breaches for trader', traderId, ':', allBreaches.length);

    const softBreaches = allBreaches.filter(b => b.severity === 'soft');
    const hardBreaches = allBreaches.filter(b => b.severity === 'hard');
    const overallRiskScore = this.calculateRiskScore(allBreaches);

    // Generate recommendations based on detected breaches
    const recommendations = this.generateRecommendations(allBreaches);

    const analysis = {
      traderId,
      overallRiskScore,
      totalBreaches: allBreaches.length,
      softBreaches: softBreaches.length,
      hardBreaches: hardBreaches.length,
      breaches: allBreaches,
      lastAnalyzed: new Date(),
      recommendations
    };

    console.log('MLBreachDetectionService: Analysis complete for trader', traderId, ':', analysis);
    return analysis;
  }

  private static generateRecommendations(breaches: BreachDetection[]): string[] {
    const recommendations: string[] = [];
    const categories = [...new Set(breaches.map(b => b.category))];

    if (categories.includes('daily_loss')) {
      recommendations.push('Implement stricter position sizing to control daily losses');
    }
    if (categories.includes('trading_hours')) {
      recommendations.push('Ensure trading only occurs during permitted market hours');
    }
    if (categories.includes('lot_size')) {
      recommendations.push('Reduce lot sizes to manage risk exposure');
    }
    if (categories.includes('frequency')) {
      recommendations.push('Reduce trading frequency to avoid overtrading');
    }
    if (categories.includes('risk_reward')) {
      recommendations.push('Improve trade selection with better risk-reward ratios');
    }

    if (recommendations.length === 0) {
      recommendations.push('Trading patterns appear to be within acceptable parameters');
    }

    return recommendations;
  }

  private static getTradeData(traderId: string): any[] {
    const today = new Date('2025-05-21');

    if (traderId === '1') {
      return [
        {
          id: '1-t1',
          symbol: 'EURUSD',
          type: 'buy',
          openTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 9, 0),
          closeTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 10, 30),
          openPrice: 1.0720,
          closePrice: 1.0740,
          lots: 0.5,
          profitLoss: 100
        },
        {
          id: '1-t2',
          symbol: 'GBPUSD',
          type: 'sell',
          openTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2, 11, 0),
          closeTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2, 11, 45),
          openPrice: 1.2450,
          closePrice: 1.2430,
          lots: 0.3,
          profitLoss: 60
        },
        {
          id: '1-t3',
          symbol: 'USDJPY',
          type: 'buy',
          openTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3, 14, 0),
          closeTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3, 16, 0),
          openPrice: 137.50,
          closePrice: 137.65,
          lots: 0.2,
          profitLoss: 30
        },
        {
          id: '1-t4',
          symbol: 'EURUSD',
          type: 'sell',
          openTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 4, 9, 30),
          closeTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 4, 10, 15),
          openPrice: 1.0760,
          closePrice: 1.0770,
          lots: 0.4,
          profitLoss: -40
        },
        {
          id: '1-t5',
          symbol: 'AUDUSD',
          type: 'buy',
          openTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5, 13, 0),
          closeTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5, 14, 30),
          openPrice: 0.6620,
          closePrice: 0.6640,
          lots: 0.6,
          profitLoss: 120
        }
      ];
    } else if (traderId === '2') {
      return [
        {
          id: '2-t1',
          symbol: 'XAUUSD',
          type: 'buy',
          openTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 8, 0),
          closeTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 14, 0),
          openPrice: 1985.50,
          closePrice: 2010.75,
          lots: 1.0,
          profitLoss: 2525
        },
        {
          id: '2-t2',
          symbol: 'US30',
          type: 'sell',
          openTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3, 15, 30),
          closeTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3, 19, 45),
          openPrice: 34250,
          closePrice: 34050,
          lots: 0.5,
          profitLoss: 1000
        },
        {
          id: '2-t3',
          symbol: 'XAUUSD',
          type: 'sell',
          openTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 4, 23, 15), // Prohibited hour
          closeTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 4, 16, 30),
          openPrice: 2015.25,
          closePrice: 2030.50,
          lots: 0.8,
          profitLoss: -1220
        },
        {
          id: '2-t4',
          symbol: 'GBPJPY',
          type: 'buy',
          openTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5, 10, 0),
          closeTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5, 11, 0),
          openPrice: 171.50,
          closePrice: 170.80,
          lots: 1.5,
          profitLoss: -1050
        },
        {
          id: '2-t5',
          symbol: 'EURUSD',
          type: 'buy',
          openTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6, 8, 45),
          closeTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5, 8, 45),
          openPrice: 1.0720,
          closePrice: 1.0780,
          lots: 2.0, // High lot size
          profitLoss: 1200
        },
        {
          id: '2-t6',
          symbol: 'US30',
          type: 'buy',
          openTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6, 14, 30),
          closeTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6, 21, 0),
          openPrice: 34100,
          closePrice: 34230,
          lots: 0.7,
          profitLoss: 910
        },
        {
          id: '2-t7',
          symbol: 'USDCAD',
          type: 'sell',
          openTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7, 16, 0),
          closeTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6, 10, 0),
          openPrice: 1.3620,
          closePrice: 1.3580,
          lots: 1.2,
          profitLoss: 480
        }
      ];
    } else {
      return [
        {
          id: '3-t1',
          symbol: 'EURUSD',
          type: 'buy',
          openTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 8, 10),
          closeTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 8, 15),
          openPrice: 1.0760,
          closePrice: 1.0764,
          lots: 1.0,
          profitLoss: 40
        },
        {
          id: '3-t2',
          symbol: 'USDJPY',
          type: 'sell',
          openTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 9, 20),
          closeTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 9, 35),
          openPrice: 137.85,
          closePrice: 137.80,
          lots: 0.5,
          profitLoss: 25
        }
      ];
    }
  }

  public static getAllTraderRiskAnalyses(): RiskAnalysis[] {
    console.log('MLBreachDetectionService: Getting all trader risk analyses...');
    const traders = TraderService.getTraders();
    console.log('MLBreachDetectionService: Found traders:', traders.length);
    
    const analyses = traders.map(trader => {
      try {
        return this.analyzeTrader(trader.id);
      } catch (error) {
        console.error('MLBreachDetectionService: Error analyzing trader', trader.id, ':', error);
        return null;
      }
    }).filter(analysis => analysis !== null) as RiskAnalysis[];
    
    console.log('MLBreachDetectionService: Generated analyses:', analyses.length);
    return analyses;
  }
}

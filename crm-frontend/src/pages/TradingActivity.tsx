
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import PageHeader from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trader, TraderService } from '@/lib/models/trader';
import { Check, X, Shield } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import RiskAnalysisCard from '@/components/risk/RiskAnalysisCard';
import BreachDetectionTable from '@/components/risk/BreachDetectionTable';
import { MLBreachDetectionService } from '@/lib/services/riskAnalysisService';

type Trade = {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  openTime: Date;
  closeTime: Date;
  openPrice: number;
  closePrice: number;
  lots: number;
  profitLoss: number;
};

// Trade types for different data samples
type TradeDataSet = {
  trades: Trade[];
  totalTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  netProfit: number;
  largestWin: number;
  largestLoss: number;
  averageTradeDuration: string;
};

const TradingActivity = () => {
  const { traderId, challengeId } = useParams<{ traderId: string; challengeId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('stats');

  // Find the trader and challenge
  const trader = React.useMemo(() => {
    if (!traderId) return null;
    return TraderService.getTraderById(traderId);
  }, [traderId]);

  const challenge = React.useMemo(() => {
    if (!trader || !challengeId) return null;
    return trader.challenges.find(c => c.id === challengeId) || null;
  }, [trader, challengeId]);

  // Generate risk analysis for the trader
  const riskAnalysis = React.useMemo(() => {
    if (!traderId) return null;
    try {
      return MLBreachDetectionService.analyzeTrader(traderId);
    } catch (error) {
      console.error('Error analyzing trader risk:', error);
      return null;
    }
  }, [traderId]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Create different trading data based on traderId to simulate different scenarios
  const tradeData: TradeDataSet = React.useMemo(() => {
    // Default data set
    let dataset: TradeDataSet = {
      trades: [],
      totalTrades: 0,
      winRate: 0,
      averageWin: 0,
      averageLoss: 0,
      netProfit: 0,
      largestWin: 0,
      largestLoss: 0,
      averageTradeDuration: '0h 0m'
    };

    const today = new Date('2025-05-21');

    if (traderId === '1') {
      // Conservative trader with high win rate but smaller profits
      dataset = {
        trades: [
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
        ],
        totalTrades: 5,
        winRate: 80,
        averageWin: 77.5,
        averageLoss: 40,
        netProfit: 270,
        largestWin: 120,
        largestLoss: 40,
        averageTradeDuration: '1h 15m'
      };
    } else if (traderId === '2') {
      // Aggressive trader with big wins but also big losses
      dataset = {
        trades: [
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
            openTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 4, 9, 15),
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
            lots: 2.0,
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
        ],
        totalTrades: 7,
        winRate: 71.4,
        averageWin: 1223,
        averageLoss: 1135,
        netProfit: 3845,
        largestWin: 2525,
        largestLoss: 1220,
        averageTradeDuration: '6h 40m'
      };
    } else {
      // Balanced trader with mixed results
      dataset = {
        trades: [
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
          },
          {
            id: '3-t3',
            symbol: 'GBPUSD',
            type: 'buy',
            openTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 10, 5),
            closeTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 10, 45),
            openPrice: 1.2430,
            closePrice: 1.2410,
            lots: 0.7,
            profitLoss: -140
          },
          {
            id: '3-t4',
            symbol: 'XAUUSD',
            type: 'buy',
            openTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 11, 0),
            closeTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 13, 0),
            openPrice: 2000.50,
            closePrice: 2005.25,
            lots: 0.3,
            profitLoss: 142.5
          },
          {
            id: '3-t5',
            symbol: 'EURUSD',
            type: 'sell',
            openTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 14, 15),
            closeTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 15, 45),
            openPrice: 1.0780,
            closePrice: 1.0775,
            lots: 1.2,
            profitLoss: 60
          },
          {
            id: '3-t6',
            symbol: 'USDJPY',
            type: 'sell',
            openTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 16, 30),
            closeTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 17, 15),
            openPrice: 137.90,
            closePrice: 138.05,
            lots: 0.8,
            profitLoss: -120
          },
          {
            id: '3-t7',
            symbol: 'GBPUSD',
            type: 'buy',
            openTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 18, 0),
            closeTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 19, 30),
            openPrice: 1.2420,
            closePrice: 1.2440,
            lots: 0.6,
            profitLoss: 120
          },
          {
            id: '3-t8',
            symbol: 'EURUSD',
            type: 'buy',
            openTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 20, 45),
            closeTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 21, 30),
            openPrice: 1.0770,
            closePrice: 1.0760,
            lots: 0.5,
            profitLoss: -50
          },
          {
            id: '3-t9',
            symbol: 'XAUUSD',
            type: 'sell',
            openTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 22, 0),
            closeTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 2, 0),
            openPrice: 2010.75,
            closePrice: 2005.50,
            lots: 0.2,
            profitLoss: 105
          }
        ],
        totalTrades: 9,
        winRate: 55.6,
        averageWin: 78.5,
        averageLoss: 103.3,
        netProfit: 182.5,
        largestWin: 142.5,
        largestLoss: 140,
        averageTradeDuration: '1h 35m'
      };
    }

    return dataset;
  }, [traderId]);

  // Generate AI trading review based on the trader's data
  const generateAIReview = (): string => {
    if (traderId === '1') {
      // Conservative trader
      return `This trader demonstrates a conservative approach with a high win rate of 80%. They maintain relatively small position sizes (0.2-0.6 lots) and have a good risk management strategy with their largest loss being only $40.

The trader shows discipline by taking profits consistently, with an average win of $77.50. Their careful approach has resulted in a net profit of $270, which represents good steady growth without excessive risk.

Recommendation: This trader is reliable and consistent. Their approach aligns well with sustainable long-term growth. Consider approving their payout as they demonstrate proper risk management techniques.`;
    } else if (traderId === '2') {
      // Aggressive trader
      return `This trader exhibits an aggressive trading style with significantly larger position sizes (up to 2.0 lots) and holds trades for longer durations (averaging 6 hours 40 minutes). While they have achieved impressive wins, including a $2,525 gain on XAUUSD, they also incur substantial losses.

With a 71.4% win rate and a sizable $3,845 net profit, this trader is effective but operates with higher risk. Their trading style suggests they may experience more volatility in future performance.

Recommendation: While profitable, this trader's aggressive approach carries increased risk. Approve the payout but monitor future trading activity closely to ensure risk levels remain manageable.`;
    } else {
      // Balanced trader
      return `This trader shows a balanced approach with a moderate win rate of 55.6%. They trade with varied position sizes and maintain reasonable risk management with their largest loss at $140.

Their trading is characterized by frequent activity (9 trades) with an average trade duration of 1 hour 35 minutes. The net profit of $182.50 is positive but modest, suggesting methodical trading rather than aggressive risk-taking.

Recommendation: This trader demonstrates consistent discipline and balanced risk management. Their moderate approach indicates long-term sustainability. The payout can be approved as their trading style suggests reliability.`;
    }
  };

  const handleApprovePayout = () => {
    toast({
      title: "Payout Approved",
      description: `Payout for ${trader?.firstName} ${trader?.lastName} has been approved.`,
      variant: "default",
    });
    
    // Navigate back to the payouts page
    setTimeout(() => {
      navigate('/payouts');
    }, 1500);
  };

  const handleRejectPayout = () => {
    toast({
      title: "Payout Rejected",
      description: `Payout for ${trader?.firstName} ${trader?.lastName} has been rejected.`,
      variant: "destructive",
    });
    
    // Navigate back to the payouts page
    setTimeout(() => {
      navigate('/payout-request');
    }, 1500);
  };

  if (!trader || !challenge) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Trader or Challenge Not Found</h2>
        <p className="mb-6">The requested trader or challenge information could not be found.</p>
        <Button onClick={() => navigate('/payouts')}>Return to Payouts</Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Trading Activity Review"
        subtitle={`Review ${trader.firstName} ${trader.lastName}'s trading activity`}
        actions={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => navigate('/payout-request')} className="w-full sm:w-auto">
              Back to Payouts
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-6 mt-4 sm:mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Trader Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p>{trader.firstName} {trader.lastName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p>{trader.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Registration Date</p>
                <p>{new Date(trader.registeredAt).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Challenge Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p>{challenge.step}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Step</p>
                <p>{challenge.step}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge>{challenge.status}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Initial Balance</p>
                <p>{formatCurrency(challenge.initialBalance)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="font-semibold text-green-600">
                  {formatCurrency(challenge.initialBalance + tradeData.netProfit)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Profit/Loss</p>
                <p className={tradeData.netProfit >= 0 ? "text-green-600" : "text-red-600"}>
                  {formatCurrency(tradeData.netProfit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Analysis Section */}
      {riskAnalysis && (
        <div className="mb-6">
          <RiskAnalysisCard riskAnalysis={riskAnalysis} />
        </div>
      )}

      {/* Approval/Rejection Buttons */}
      <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4 mb-4 sm:mb-6">
        <Button
          onClick={handleApprovePayout}
          className="gap-2 w-full sm:w-auto"
          variant="default"
        >
          <Check className="h-4 w-4" /> Approve Payout
        </Button>
        <Button
          onClick={handleRejectPayout}
          className="gap-2 w-full sm:w-auto"
          variant="destructive"
        >
          <X className="h-4 w-4" /> Reject Payout
        </Button>
      </div>

      <Tabs defaultValue="stats" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto">
        <TabsList className="grid grid-cols-4 w-full max-w-lg mx-auto">
          <TabsTrigger value="stats">Trading Stats</TabsTrigger>
          <TabsTrigger value="trades">Trade History</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
          <TabsTrigger value="summary">Trading Summary</TabsTrigger>
        </TabsList>
        </div>
        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>Trading Performance</CardTitle>
              <CardDescription>Overview of trading activity and performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Trades</p>
                  <p className="text-2xl font-bold">{tradeData.totalTrades}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <p className="text-2xl font-bold">{tradeData.winRate}%</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Net Profit</p>
                  <p className={`text-2xl font-bold ${tradeData.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(tradeData.netProfit)}
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Average Win</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(tradeData.averageWin)}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Average Loss</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(tradeData.averageLoss)}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Average Trade Duration</p>
                  <p className="text-2xl font-bold">{tradeData.averageTradeDuration}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="trades">
          <Card>
            <CardHeader>
              <CardTitle>Trade History</CardTitle>
              <CardDescription>Detailed history of all trades</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Open Time</TableHead>
                    <TableHead>Close Time</TableHead>
                    <TableHead>Open Price</TableHead>
                    <TableHead>Close Price</TableHead>
                    <TableHead>Lots</TableHead>
                    <TableHead className="text-right">P/L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tradeData.trades.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell className="font-medium">{trade.symbol}</TableCell>
                      <TableCell>
                        <Badge variant={trade.type === 'buy' ? 'info' : 'secondary'}>
                          {trade.type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{trade.openTime.toLocaleString()}</TableCell>
                      <TableCell>{trade.closeTime.toLocaleString()}</TableCell>
                      <TableCell>{trade.openPrice}</TableCell>
                      <TableCell>{trade.closePrice}</TableCell>
                      <TableCell>{trade.lots}</TableCell>
                      <TableCell className={`text-right ${trade.profitLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(trade.profitLoss)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="risk">
          <Card>
            <CardHeader>
              <CardTitle>ML Breach Detection</CardTitle>
              <CardDescription>AI-powered risk analysis and breach detection</CardDescription>
            </CardHeader>
            <CardContent>
              {riskAnalysis ? (
                <div className="space-y-6">
                  <BreachDetectionTable breaches={riskAnalysis.breaches} />
                  
                  {riskAnalysis.breaches.length === 0 && (
                    <div className="text-center py-8">
                      <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Breaches Detected</h3>
                      <p className="text-muted-foreground">
                        This trader's activity appears to be within acceptable risk parameters.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Risk analysis could not be performed for this trader.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>AI Trading Review</CardTitle>
              <CardDescription>Analysis and recommendations based on trading patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-6 border rounded-lg bg-muted/50">
                  <p className="text-sm leading-relaxed whitespace-pre-line">
                    {generateAIReview()}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm font-medium mb-2">Trading Style</p>
                    <Badge className="mb-2" variant={
                      traderId === '1' ? 'secondary' : 
                      traderId === '2' ? 'destructive' : 
                      'default'
                    }>
                      {traderId === '1' ? 'Conservative' : 
                       traderId === '2' ? 'Aggressive' : 
                       'Balanced'}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      {traderId === '1' ? 'Careful approach with steady profits and minimal risk.' : 
                       traderId === '2' ? 'Bold strategy with significant rewards and higher risk exposure.' : 
                       'Methodical approach balancing risk and reward.'}
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm font-medium mb-2">Risk Assessment</p>
                    <div className="w-full bg-muted rounded-full h-2.5 mb-2">
                      <div className="bg-primary h-2.5 rounded-full" style={{ 
                        width: `${traderId === '1' ? '30%' : 
                                traderId === '2' ? '80%' : 
                                '50%'}` 
                      }}></div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {traderId === '1' ? 'Low risk profile with controlled exposure.' : 
                       traderId === '2' ? 'Higher risk profile with potential for volatility.' : 
                       'Moderate risk with reasonable protection against drawdowns.'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TradingActivity;

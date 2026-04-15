import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import PageHeader from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, FileCheck, Play, Download, Copy, TrendingUp, TrendingDown, User, Mail, Calendar, DollarSign, Activity, BarChart3, ArrowLeft, Clock, RefreshCw, Loader2, Wallet } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { apiService } from '@/services/apiService';
import { PayoutDetailsResponse } from '@/lib/types/payoutDetails';
import { ComplianceAnalysis } from '@/lib/types/complianceAnalysis';
import { PayoutActionDialog } from '@/components/payouts/PayoutActionDialog';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { payoutService } from '@/services/payoutService';
import { riskScanService, RiskEngineReport } from '@/services/riskScanService';
import RiskReportViewer from '@/components/risk/RiskReportViewer';
import PayoutAIAnalysisTab from '@/components/payouts/PayoutAIAnalysisTab';
import RiskEngineTab from '@/components/payouts/RiskEngineTab';
import AIRiskAnalysisTab from '@/components/payouts/AIRiskAnalysisTab';
import ActiveNotesPanel from '@/components/payouts/ActiveNotesPanel';
import AllNotesSheet from '@/components/payouts/AllNotesSheet';
import HighRiskBanner from '@/components/payouts/HighRiskBanner';
import { useInternalNotes } from '@/hooks/useInternalNotes';

const PayoutTradingActivity = () => {
  const { payoutId } = useParams<{ payoutId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('stats');
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false);
  const [isExtendReviewDialogOpen, setIsExtendReviewDialogOpen] = useState(false);
  const [extensionDays, setExtensionDays] = useState<string>('10');
  const [isSubmittingExtension, setIsSubmittingExtension] = useState(false);
  const [isAllNotesOpen, setIsAllNotesOpen] = useState(false);
  const [notesReviewedExtend, setNotesReviewedExtend] = useState(false);

  // Fetch payout details from Django API
  const { data: payoutDetails, isLoading, refetch } = useQuery({
    queryKey: ['payout-details', payoutId],
    queryFn: async () => {
      if (!payoutId) throw new Error('Payout ID is required');
      const response = await apiService.get<PayoutDetailsResponse>(`/admin/payouts/${payoutId}/`);
      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: !!payoutId,
  });

  const { summary: notesSummary } = useInternalNotes(payoutDetails?.trader_user_id);

  // Fetch compliance analysis from Django API
  const { data: complianceAnalysis, isLoading: isComplianceLoading, refetch: refetchCompliance } = useQuery({
    queryKey: ['compliance-analysis', payoutId],
    queryFn: async () => {
      if (!payoutId) throw new Error('Payout ID is required');
      const response = await apiService.get<ComplianceAnalysis>(`/payouts/compliance-analysis/${payoutId}/`);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: !!payoutId,
  });

  // Format currency
  const formatCurrency = (amount: unknown) => {
    const num = typeof amount === 'number'
      ? amount
      : typeof amount === 'string'
        ? parseFloat(amount)
        : (typeof amount === 'object' && amount && 'value' in (amount as any) && typeof (amount as any).value === 'number')
          ? (amount as any).value
          : NaN;
    if (Number.isNaN(num)) {
      return toText(amount);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  // Format duration from seconds to readable format
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Safely render values that might come as objects from API
  const toText = (val: unknown): string => {
    if (val === null || val === undefined) return 'N/A';
    const t = typeof val;
    if (t === 'string' || t === 'number' || t === 'boolean') return String(val);
    try {
      return JSON.stringify(val);
    } catch {
      return 'N/A';
    }
  };

  // Render AI recommendations as a proper list
  const renderRecommendations = (recommendations: unknown) => {
    if (!recommendations) return null;
    
    let items: string[] = [];
    
    if (Array.isArray(recommendations)) {
      items = recommendations.filter(item => typeof item === 'string');
    } else if (typeof recommendations === 'string') {
      try {
        const parsed = JSON.parse(recommendations);
        if (Array.isArray(parsed)) {
          items = parsed.filter(item => typeof item === 'string');
        } else {
          return <p className="text-sm text-muted-foreground">{recommendations}</p>;
        }
      } catch {
        return <p className="text-sm text-muted-foreground">{recommendations}</p>;
      }
    }
    
    if (items.length === 0) {
      return <p className="text-sm text-muted-foreground">No recommendations available</p>;
    }
    
    return (
      <ul className="text-sm text-muted-foreground space-y-2">
         {items.map((item, index) => (
           <li key={index} className="flex items-start gap-2">
             <span className="text-primary mt-1 flex-shrink-0">•</span>
             <span>{toText(item)}</span>
           </li>
         ))}
      </ul>
    );
  };

  // Safely coerce values to number when possible
  const toNumber = (val: unknown): number | null => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const n = parseFloat(val);
      return isNaN(n) ? null : n;
    }
    if (typeof val === 'object' && val) {
      const v: unknown = (val as any).value;
      if (typeof v === 'number') return v;
      if (typeof v === 'string') {
        const n = parseFloat(v);
        return isNaN(n) ? null : n;
      }
    }
    return null;
  };

  // Format dates that might arrive as various types
  const formatDateMaybe = (val: unknown) => {
    if (val === null || val === undefined) return 'N/A';
    if (typeof val === 'string' || typeof val === 'number') {
      const d = new Date(val as any);
      return isNaN(d.getTime()) ? toText(val) : d.toLocaleDateString();
    }
    return toText(val);
  };

  // Get trade type badge variant
  const getTradeTypeBadge = (cmd: string) => {
    const tradeType = parseInt(cmd);
    return tradeType === 0 ? 'info' : 'secondary'; // 0 = BUY, 1 = SELL
  };

  // Get trade type label
  const getTradeTypeLabel = (cmd: string) => {
    const tradeType = parseInt(cmd);
    return tradeType === 0 ? 'BUY' : 'SELL';
  };

  // Handle successful payout action
  const handlePayoutActionSuccess = () => {
    refetch();
    setTimeout(() => navigate('/payout-request'), 1500);
  };

  // Handle extending review
  const handleExtendReview = async () => {
    if (!payoutId) return;
    
    const days = parseInt(extensionDays) || 10;
    
    setIsSubmittingExtension(true);
    try {
      const response = await payoutService.extendReview(payoutId, {
        extension_business_days: days
      });
      
      toast({
        title: "Review Extended",
        description: `Payout review has been extended by ${days} business days.`,
      });
      
      setIsExtendReviewDialogOpen(false);
      setNotesReviewedExtend(false);
      refetch();

    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to extend review",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingExtension(false);
    }
  };

  // Handle running compliance analysis
  const handleRunComplianceAnalysis = async () => {
    if (!payoutId) return;
    
    setIsRunningAnalysis(true);
    const url = `/admin/payouts/trigger-analysis/`;
    console.log('Triggering compliance analysis with URL:', url);
    console.log('PayoutId from params:', payoutId);
    
    try {
      const response = await apiService.post(url, { payout_id: payoutId });
      if (response.error) {
        throw new Error(response.error);
      }
      
      toast({
        title: "Analysis Triggered",
        description: "Compliance analysis has been started. Results will be available shortly.",
      });
      
      // Refetch compliance analysis after a short delay to allow processing
      setTimeout(() => {
        refetchCompliance();
      }, 2000);
      
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to trigger compliance analysis",
        variant: "destructive",
      });
    } finally {
      setIsRunningAnalysis(false);
    }
  };

  // Export trade history to CSV
  const handleExportTradeHistory = () => {
    if (!payoutDetails?.trade_history) return;

    const csvRows = [];
    
    // Add CSV header
    csvRows.push([
      'Trade ID',
      'Account ID',
      'Phase',
      'Status',
      'Order',
      'Symbol',
      'Type',
      'Volume',
      'Open Time',
      'Close Time',
      'Open Price',
      'Close Price',
      'SL',
      'TP',
      'Profit'
    ]);

    // Add data rows
    payoutDetails.trade_history.forEach(account => {
      account.trades.forEach(trade => {
        csvRows.push([
          toText(trade.id),
          toText(account.account_id),
          toText(account.phase_type),
          toText(account.status),
          toText(trade.order),
          toText(trade.symbol),
          getTradeTypeLabel(trade.cmd),
          toText(trade.volume),
          toText(trade.open_time),
          toText(trade.close_time),
          toText(trade.open_price),
          toText(trade.close_price),
          toText(trade.sl || trade.stop_loss || 'N/A'),
          toText(trade.tp || trade.take_profit || 'N/A'),
          toText(trade.profit)
        ]);
      });
    });

    // Convert to CSV string
    const csvContent = csvRows.map(row => 
      row.map(field => 
        typeof field === 'string' && field.includes(',') 
          ? `"${field}"` 
          : field
      ).join(',')
    ).join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `trade-history-${payoutDetails.trader_name}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: "Trade history has been exported to CSV file.",
    });
  };

  // Copy trade history to clipboard
  const handleCopyTradeHistory = async () => {
    if (!payoutDetails?.trade_history) return;

    let clipboardText = 'Trade History\n\n';
    
    payoutDetails.trade_history.forEach(account => {
      clipboardText += `Account: ${toText(account.account_id)} | Phase: ${toText(account.phase_type)} | Status: ${toText(account.status)}\n`;
      clipboardText += 'Trade ID\tOrder\tSymbol\tType\tVolume\tOpen Time\tClose Time\tOpen Price\tClose Price\tSL\tTP\tProfit\n';
      
      account.trades.forEach(trade => {
        clipboardText += [
          toText(trade.id),
          toText(trade.order),
          toText(trade.symbol),
          getTradeTypeLabel(trade.cmd),
          toText(trade.volume),
          toText(trade.open_time),
          toText(trade.close_time),
          toText(trade.open_price),
          toText(trade.close_price),
          toText(trade.sl || trade.stop_loss || 'N/A'),
          toText(trade.tp || trade.take_profit || 'N/A'),
          toText(trade.profit)
        ].join('\t') + '\n';
      });
      
      clipboardText += '\n';
    });

    try {
      await navigator.clipboard.writeText(clipboardText);
      toast({
        title: "Copied to Clipboard",
        description: "Trade history has been copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy trade history to clipboard.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <p>Loading trading activity details...</p>
      </div>
    );
  }

  if (!payoutDetails) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Payout Not Found</h2>
        <p className="mb-6">The requested payout information could not be found.</p>
        <Button onClick={() => navigate('/payout-request')}>Return to Payouts</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Modern Header */}
      <div className="sticky top-0 z-10 backdrop-blur-lg bg-background/80 border-b">
        <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/payout-request')}
                className="hover:bg-primary/10 flex-shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent truncate">
                  Trading Activity Review
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
                  {payoutDetails.trader_name} • {payoutDetails.trader_email}
                </p>
              </div>
            </div>
            <Badge
              variant={
                payoutDetails.status === 'approved' ? 'default' :
                payoutDetails.status === 'rejected' ? 'destructive' :
                'secondary'
              }
              className="text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-1.5 flex-shrink-0"
            >
              {toText(payoutDetails.status).toUpperCase()}
            </Badge>
          </div>
          {notesSummary?.has_high_risk && (
            <HighRiskBanner onViewNotes={() => setIsAllNotesOpen(true)} />
          )}
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-8">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-fade-in">
          <Card className="relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all"></div>
            <CardContent className="relative pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-blue-500/10">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trader Info</p>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Name</p>
                  <p className="font-semibold text-lg">{toText(payoutDetails.trader_name)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">MT5 Account</p>
                  <p className="font-mono text-sm font-medium">{toText(payoutDetails.mt5_account_id)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl group-hover:bg-purple-500/10 transition-all"></div>
            <CardContent className="relative pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-purple-500/10">
                  <Activity className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Challenge</p>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Type</p>
                  <p className="font-semibold text-sm">{toText(payoutDetails.challenge_type)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Started</p>
                  <p className="font-medium text-sm">{formatDateMaybe(payoutDetails.challenge_start_date)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl group-hover:bg-green-500/10 transition-all"></div>
            <CardContent className="relative pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-green-500/10">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Balance</p>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Current</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(payoutDetails.current_balance)}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {(toNumber(payoutDetails.total_profit_loss) ?? 0) >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={(toNumber(payoutDetails.total_profit_loss) ?? 0) >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                    {formatCurrency(payoutDetails.total_profit_loss)}
                  </span>
                  <span className="text-muted-foreground text-xs">P/L</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-all"></div>
            <CardContent className="relative pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-amber-500/10">
                  <BarChart3 className="h-5 w-5 text-amber-600" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payout</p>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Amount Requested</p>
                  <p className="text-2xl font-bold">{formatCurrency(payoutDetails.amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Profit Share</p>
                  <p className="font-semibold">{payoutDetails.profit_share}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      {/* Active Notes Panel */}
      {payoutDetails?.trader_user_id && (
        <ActiveNotesPanel
          traderId={payoutDetails.trader_user_id}
          onOpenAllNotes={() => setIsAllNotesOpen(true)}
        />
      )}

      {/* Payout Request Details Card - Modern Design */}
      <Card className="mb-4 sm:mb-6 overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background px-4 sm:px-6 py-3 sm:py-4 border-b">
          <CardTitle className="text-lg sm:text-xl">Payout Request Details</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Requested on {format(new Date(payoutDetails.requested_at), 'PPP')}
          </p>
        </div>
        <CardContent className="p-3 sm:p-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-4 sm:p-5 border border-primary/20">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -mr-12 -mt-12"></div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Requested Amount</p>
              <p className="text-2xl sm:text-3xl font-bold mb-1">{formatCurrency(payoutDetails.amount)}</p>
              <Badge variant="outline" className="text-xs">
                {payoutDetails.is_custom_amount ? 'Custom' : 'Standard'}
              </Badge>
            </div>
            
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 p-4 sm:p-5 border border-green-500/20">
              <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full -mr-12 -mt-12"></div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Total Profit</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">{formatCurrency(payoutDetails.profit)}</p>
              <p className="text-xs text-muted-foreground">Share: {payoutDetails.profit_share}%</p>
            </div>
            
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-4 sm:p-5 border border-blue-500/20">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-12 -mt-12"></div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Released Fund</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1">{formatCurrency(payoutDetails.released_fund)}</p>
              <Badge 
                variant={
                  payoutDetails.status === 'approved' ? 'default' : 
                  payoutDetails.status === 'rejected' ? 'destructive' : 
                  'secondary'
                }
                className="text-xs"
              >
                {toText(payoutDetails.status).toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* Payment & Timeline Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Payment Method</p>
                  <p className="text-lg font-semibold capitalize">{toText(payoutDetails.method)}</p>
                  {payoutDetails.method_details?.crypto_type && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Type: {payoutDetails.method_details.crypto_type}
                    </p>
                  )}
                  {payoutDetails.method_details?.wallet_address && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                      {payoutDetails.method_details.wallet_address}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Timeline</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Requested:</span>
                  <span className="font-medium">{format(new Date(payoutDetails.requested_at), 'MMM dd, HH:mm')}</span>
                </div>
                {payoutDetails.reviewed_at && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Reviewed:</span>
                    <span className="font-medium">{format(new Date(payoutDetails.reviewed_at), 'MMM dd, HH:mm')}</span>
                  </div>
                )}
                {payoutDetails.paid_at && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Paid:</span>
                    <span className="font-medium">{format(new Date(payoutDetails.paid_at), 'MMM dd, HH:mm')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Alerts & Notes */}
          {payoutDetails.exclude_amount && (
            <div className="mt-4 rounded-lg border-l-4 border-warning bg-warning/5 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-sm mb-1">Excluded Amount</p>
                  <p className="text-2xl font-bold text-warning mb-2">{formatCurrency(payoutDetails.exclude_amount)}</p>
                  {payoutDetails.exclude_reason && (
                    <p className="text-sm text-muted-foreground">{payoutDetails.exclude_reason}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {payoutDetails.admin_note && (
            <div className="mt-4 rounded-lg border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Admin Note</p>
              <p className="text-sm leading-relaxed">{payoutDetails.admin_note}</p>
            </div>
          )}

          {payoutDetails.rejection_reason && (
            <div className="mt-4 rounded-lg border-l-4 border-destructive bg-destructive/5 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-sm text-destructive mb-2">Rejection Reason</p>
                  <p className="text-sm leading-relaxed">{payoutDetails.rejection_reason}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

        {/* Risk Analysis Section */}
        {(payoutDetails.total_breaches > 0 || (payoutDetails.risk_score && payoutDetails.risk_score > 50)) && (
          <Card className="border-none shadow-lg animate-fade-in">
            <div className="bg-gradient-to-r from-warning/10 via-warning/5 to-background px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/20">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <CardTitle className="text-xl">Risk Analysis</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">Automated risk assessment results</p>
                </div>
              </div>
            </div>
            <CardContent className="p-3 sm:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="p-3 sm:p-5 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Risk Score</p>
                  <p className="text-2xl sm:text-3xl font-bold mb-1">{toText(payoutDetails.risk_score)}<span className="text-sm sm:text-lg text-muted-foreground">/100</span></p>
                  <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                    <div 
                      className="bg-orange-500 h-1.5 rounded-full transition-all duration-500" 
                      style={{ width: `${payoutDetails.risk_score}%` }}
                    ></div>
                  </div>
                </div>
                <div className="p-3 sm:p-5 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Total Breaches</p>
                  <p className="text-2xl sm:text-3xl font-bold text-red-600">{payoutDetails.total_breaches}</p>
                </div>
                <div className="p-3 sm:p-5 rounded-xl bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Soft Breaches</p>
                  <p className="text-2xl sm:text-3xl font-bold text-yellow-600">{payoutDetails.soft_breaches.length}</p>
                </div>
                <div className="p-3 sm:p-5 rounded-xl bg-gradient-to-br from-destructive/10 to-destructive/5 border border-destructive/20">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Hard Breaches</p>
                  <p className="text-2xl sm:text-3xl font-bold text-destructive">{payoutDetails.hard_breaches.length}</p>
                </div>
              </div>
            
              {payoutDetails.ai_recommendations && (
                <div className="p-5 rounded-xl bg-gradient-to-br from-primary/5 to-transparent border">
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    AI Recommendations
                  </p>
                  {renderRecommendations(payoutDetails.ai_recommendations)}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payout Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4 animate-fade-in">
          <Button
            onClick={() => setIsExtendReviewDialogOpen(true)}
            size="lg"
            variant="outline"
            className="gap-2 px-4 sm:px-8 py-4 sm:py-6 text-sm sm:text-base shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto"
          >
            <Clock className="h-5 w-5" />
            Extend Review
          </Button>
          <Button
            onClick={() => setIsActionDialogOpen(true)}
            size="lg"
            className="gap-2 px-4 sm:px-8 py-4 sm:py-6 text-sm sm:text-base shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-primary w-full sm:w-auto"
          >
            <FileCheck className="h-5 w-5" />
            Take Action on Payout
          </Button>
        </div>

        <Tabs defaultValue="stats" value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6 animate-fade-in">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-6 bg-muted/50 p-1.5 rounded-xl backdrop-blur-sm">
                <TabsTrigger value="stats" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md text-xs sm:text-sm whitespace-nowrap">
                  Trading Stats
                </TabsTrigger>
                <TabsTrigger value="trades" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md text-xs sm:text-sm whitespace-nowrap">
                  Trade History
                </TabsTrigger>
                <TabsTrigger value="payout-history" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md text-xs sm:text-sm whitespace-nowrap">
                  Payout History
                </TabsTrigger>
                <TabsTrigger value="risk-scan" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md text-xs sm:text-sm whitespace-nowrap">
                  Consistency Scan
                </TabsTrigger>
                <TabsTrigger value="risk-analysis" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md text-xs sm:text-sm whitespace-nowrap">
                  Risk Analysis
                </TabsTrigger>
                <TabsTrigger value="ai-analysis" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md text-xs sm:text-sm whitespace-nowrap">
                  AI Analysis
                </TabsTrigger>
              </TabsList>
          </div>

        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>Trading Performance</CardTitle>
              <CardDescription>Overview of trading activity and performance metrics</CardDescription>
            </CardHeader>
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                  <div className="p-3 sm:p-5 rounded-xl bg-gradient-to-br from-primary/5 to-transparent border hover:shadow-md transition-all">
                    <p className="text-xs font-medium text-muted-foreground mb-1 sm:mb-2 uppercase tracking-wide">Total Trades</p>
                    <p className="text-2xl sm:text-3xl font-bold">{toText(payoutDetails.total_trades)}</p>
                  </div>
                  <div className="p-3 sm:p-5 rounded-xl bg-gradient-to-br from-blue-500/5 to-transparent border hover:shadow-md transition-all">
                    <p className="text-xs font-medium text-muted-foreground mb-1 sm:mb-2 uppercase tracking-wide">Win Rate</p>
                    <p className="text-2xl sm:text-3xl font-bold text-blue-600">{toText(payoutDetails.win_rate)}%</p>
                    <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                      <div 
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" 
                        style={{ width: `${payoutDetails.win_rate}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="p-3 sm:p-5 rounded-xl bg-gradient-to-br from-green-500/5 to-transparent border hover:shadow-md transition-all">
                    <p className="text-xs font-medium text-muted-foreground mb-1 sm:mb-2 uppercase tracking-wide">Net Profit</p>
                    <p className={`text-2xl sm:text-3xl font-bold ${(toNumber(payoutDetails.net_profit) ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(payoutDetails.net_profit)}
                    </p>
                  </div>
                  <div className="p-3 sm:p-5 rounded-xl bg-gradient-to-br from-emerald-500/5 to-transparent border hover:shadow-md transition-all">
                    <p className="text-xs font-medium text-muted-foreground mb-1 sm:mb-2 uppercase tracking-wide">Average Win</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-600">{formatCurrency(payoutDetails.average_win)}</p>
                  </div>
                  <div className="p-3 sm:p-5 rounded-xl bg-gradient-to-br from-red-500/5 to-transparent border hover:shadow-md transition-all">
                    <p className="text-xs font-medium text-muted-foreground mb-1 sm:mb-2 uppercase tracking-wide">Average Loss</p>
                    <p className="text-xl sm:text-2xl font-bold text-red-600">{formatCurrency(payoutDetails.average_loss)}</p>
                  </div>
                  <div className="p-3 sm:p-5 rounded-xl bg-gradient-to-br from-purple-500/5 to-transparent border hover:shadow-md transition-all">
                    <p className="text-xs font-medium text-muted-foreground mb-1 sm:mb-2 uppercase tracking-wide">Avg Duration</p>
                    <p className="text-xl sm:text-2xl font-bold">{formatDuration(Number(toNumber(payoutDetails.average_trade_duration) ?? 0))}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trades">
            <Card className="border-none shadow-lg">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:space-y-0 pb-4 p-3 sm:p-6">
              <div>
                <CardTitle className="text-base sm:text-lg">Trade History</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Account-wise trading history and performance</CardDescription>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyTradeHistory}
                  className="gap-2 flex-1 sm:flex-none"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportTradeHistory}
                  className="gap-2 flex-1 sm:flex-none"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {payoutDetails.trade_history?.map((account, accountIndex) => {
                  // Only show payouts for active account (the one being reviewed)
                  const isActiveAccount = account.status === 'active';
                  
                  // Merge trades and payouts into a single timeline for active account
                  const timeline: Array<{ type: 'trade' | 'payout'; data: any; timestamp: Date }> = [];
                  
                  // Add trades
                  account.trades?.forEach((trade) => {
                    timeline.push({
                      type: 'trade',
                      data: trade,
                      timestamp: new Date(trade.close_time)
                    });
                  });
                  
                  // Add payouts if this is the active account and payout history exists
                  if (isActiveAccount && payoutDetails.payout_history) {
                    payoutDetails.payout_history.forEach((payout) => {
                      timeline.push({
                        type: 'payout',
                        data: payout,
                        timestamp: new Date(payout.requested_at)
                      });
                    });
                  }
                  
                  // Sort by timestamp descending (most recent first)
                  timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
                  
                  return (
                    <div key={account.account_id || accountIndex} className="space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 sm:p-4 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                          <div>
                            <h4 className="font-semibold">Account: {toText(account.account_id)}</h4>
                            <p className="text-sm text-muted-foreground">
                              Phase: {toText(account.phase_type)} • Status: {toText(account.status)}
                            </p>
                          </div>
                          {isActiveAccount && payoutDetails.payout_history && payoutDetails.payout_history.length > 0 && (
                            <Badge variant="secondary" className="ml-2">
                              {payoutDetails.payout_history.length} {payoutDetails.payout_history.length === 1 ? 'Payout' : 'Payouts'}
                            </Badge>
                          )}
                        </div>
                        <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
                          {toText(account.status)}
                        </Badge>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Trade ID</TableHead>
                              <TableHead>Order</TableHead>
                              <TableHead>Symbol</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Volume</TableHead>
                              <TableHead>Open Time</TableHead>
                              <TableHead>Close Time</TableHead>
                              <TableHead>Open Price</TableHead>
                              <TableHead>Close Price</TableHead>
                              <TableHead>SL</TableHead>
                              <TableHead>TP</TableHead>
                              <TableHead>RRR</TableHead>
                              <TableHead className="text-right">P/L</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {timeline.map((item, index) => {
                              if (item.type === 'payout') {
                                const payout = item.data;
                                return (
                                  <TableRow key={`payout-${index}`} className="bg-primary/5 hover:bg-primary/10">
                                    <TableCell colSpan={13} className="py-3">
                                      <div className="flex items-center gap-4 flex-wrap">
                                        <div className="flex items-center gap-2">
                                          <Wallet className="h-4 w-4 text-primary" />
                                          <span className="font-semibold text-primary">PAYOUT REQUEST</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs">
                                          <span className="text-muted-foreground">Requested:</span>
                                          <span className="font-medium">{new Date(payout.requested_at).toLocaleString()}</span>
                                        </div>
                                        {payout.reviewed_at && (
                                          <div className="flex items-center gap-1 text-xs">
                                            <span className="text-muted-foreground">Reviewed:</span>
                                            <span className="font-medium">{new Date(payout.reviewed_at).toLocaleString()}</span>
                                          </div>
                                        )}
                                        <div className="flex items-center gap-1 text-xs">
                                          <span className="text-muted-foreground">Method:</span>
                                          <Badge variant="outline" className="capitalize text-xs">
                                            {payout.method}
                                          </Badge>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs">
                                          <span className="text-muted-foreground">Profit:</span>
                                          <span className="font-mono font-medium">${Number(payout.profit).toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs">
                                          <span className="text-muted-foreground">Share:</span>
                                          <span className="font-medium">{Number(payout.profit_share).toFixed(0)}%</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs">
                                          <span className="text-muted-foreground">Net:</span>
                                          <span className="font-semibold">${Number(payout.net_profit).toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs">
                                          <span className="text-muted-foreground">Released:</span>
                                          <span className={`font-medium ${
                                            Number(payout.released_fund) > 0 ? 'text-success' : 'text-muted-foreground'
                                          }`}>
                                            ${Number(payout.released_fund).toFixed(2)}
                                          </span>
                                        </div>
                                        <Badge 
                                          variant={
                                            payout.status === 'paid' ? 'default' : 
                                            payout.status === 'approved' ? 'secondary' : 
                                            payout.status === 'pending' ? 'warning' : 
                                            'destructive'
                                          }
                                          className="capitalize"
                                        >
                                          {payout.status}
                                        </Badge>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              } else {
                                const trade = item.data;
                                // Calculate RRR if possible
                                const calculateRRR = (trade: any) => {
                                  const sl = toNumber(trade.sl || trade.stop_loss);
                                  const tp = toNumber(trade.tp || trade.take_profit);
                                  const openPrice = toNumber(trade.open_price);
                                  
                                  if (sl && tp && openPrice) {
                                    const risk = Math.abs(openPrice - sl);
                                    const reward = Math.abs(tp - openPrice);
                                    if (risk > 0) {
                                      return (reward / risk).toFixed(2);
                                    }
                                  }
                                  return 'N/A';
                                };

                                return (
                                  <TableRow key={`trade-${toText(trade.id) || index}`}>
                                    <TableCell className="font-mono text-xs">{toText(trade.id)}</TableCell>
                                    <TableCell className="font-medium">{toText(trade.order)}</TableCell>
                                    <TableCell>{toText(trade.symbol)}</TableCell>
                                    <TableCell>
                                      <Badge variant={getTradeTypeBadge(toText(trade.cmd))}>
                                        {getTradeTypeLabel(toText(trade.cmd))}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>{toText(trade.volume)}</TableCell>
                                    <TableCell className="text-xs">{new Date(toText(trade.open_time)).toLocaleString()}</TableCell>
                                    <TableCell className="text-xs">{new Date(toText(trade.close_time)).toLocaleString()}</TableCell>
                                    <TableCell>{toText(trade.open_price)}</TableCell>
                                    <TableCell>{toText(trade.close_price)}</TableCell>
                                    <TableCell>{toText(trade.sl || trade.stop_loss) || 'N/A'}</TableCell>
                                    <TableCell>{toText(trade.tp || trade.take_profit) || 'N/A'}</TableCell>
                                    <TableCell>
                                      <span className={calculateRRR(trade) !== 'N/A' ? 'text-primary font-medium' : 'text-muted-foreground'}>
                                        {calculateRRR(trade)}
                                      </span>
                                    </TableCell>
                                    <TableCell className={`text-right font-medium ${(toNumber(trade.profit) ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                                      {formatCurrency(trade.profit)}
                                    </TableCell>
                                  </TableRow>
                                );
                              }
                            })}
                            {timeline.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={13} className="text-center text-muted-foreground py-8">
                                  No trades found for this account
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })}
                
                {payoutDetails.trade_history?.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No trade history available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>




        <TabsContent value="payout-history">
          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
              <CardDescription>Historical payout records for this trader</CardDescription>
            </CardHeader>
            <CardContent>
              {payoutDetails.payout_history && payoutDetails.payout_history.length > 0 ? (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Requested/Reviewed</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Profit</TableHead>
                      <TableHead>Share %</TableHead>
                      <TableHead>Net Amount</TableHead>
                      <TableHead>Released</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payoutDetails.payout_history.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell>
                          <div>
                            <div className="text-sm">
                              {format(new Date(payout.requested_at), 'MMM dd, yyyy HH:mm')}
                            </div>
                            {payout.reviewed_at && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                Reviewed: {format(new Date(payout.reviewed_at), 'MMM dd, yyyy HH:mm')}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm capitalize">{payout.method}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">
                            {formatCurrency(payout.profit)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{payout.profit_share}%</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">
                            {formatCurrency(payout.net_profit)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm font-semibold">
                            {formatCurrency(payout.released_fund)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            payout.status === 'approved' || payout.status === 'paid' 
                              ? 'default' 
                              : payout.status === 'rejected' 
                              ? 'destructive' 
                              : 'secondary'
                          }>
                            {payout.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No payout history available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk-scan">
          {payoutId && <RiskEngineTab payoutId={payoutId} challengeStartDate={payoutDetails?.challenge_start_date} totalProfit={payoutDetails?.total_profit_loss} />}
        </TabsContent>

        <TabsContent value="risk-analysis">
          {payoutId && <AIRiskAnalysisTab payoutId={payoutId} />}
        </TabsContent>

        <TabsContent value="ai-analysis">
          {payoutId && <PayoutAIAnalysisTab payoutId={payoutId} />}
        </TabsContent>
        </Tabs>

      {/* Payout Action Dialog */}
      {payoutId && payoutDetails && (
        <PayoutActionDialog
          isOpen={isActionDialogOpen}
          onClose={() => setIsActionDialogOpen(false)}
          onSuccess={handlePayoutActionSuccess}
          payoutId={payoutId}
          traderName={payoutDetails.trader_name}
          complianceAnalysis={complianceAnalysis}
          traderId={payoutDetails?.trader_user_id}
        />
      )}

      {/* Extend Review Dialog */}
      <Dialog open={isExtendReviewDialogOpen} onOpenChange={setIsExtendReviewDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Extend Review Period</DialogTitle>
            <DialogDescription>
              Set the payout to under review and extend the review period by a specified number of business days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="extension_days">Extension Period (Business Days)</Label>
              <Input
                id="extension_days"
                type="number"
                min="1"
                max="90"
                value={extensionDays}
                onChange={(e) => setExtensionDays(e.target.value)}
                placeholder="Enter number of days"
              />
              <p className="text-sm text-muted-foreground">
                Default: 10 business days. The payout status will be set to "under_review".
              </p>
            </div>
            {notesSummary && notesSummary.total_count > 0 && (
              <div className="p-4 border rounded-lg bg-amber-50 border-amber-200 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <Label className="text-sm font-medium text-amber-800">
                    Active Notes Review Required ({notesSummary.total_count})
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notes-reviewed-extend"
                    checked={notesReviewedExtend}
                    onCheckedChange={(checked) => setNotesReviewedExtend(checked === true)}
                  />
                  <Label htmlFor="notes-reviewed-extend" className="text-sm">
                    I have reviewed all active notes
                  </Label>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setIsExtendReviewDialogOpen(false); setNotesReviewedExtend(false); }}>
              Cancel
            </Button>
            <Button type="button" onClick={handleExtendReview} disabled={isSubmittingExtension || (!!notesSummary && notesSummary.total_count > 0 && !notesReviewedExtend)}>
              {isSubmittingExtension ? 'Extending...' : 'Extend Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* All Notes Sheet */}
      {payoutDetails?.trader_user_id && (
        <AllNotesSheet
          traderId={payoutDetails.trader_user_id}
          open={isAllNotesOpen}
          onOpenChange={setIsAllNotesOpen}
        />
      )}
      </div>
    </div>
  );
};

export default PayoutTradingActivity;
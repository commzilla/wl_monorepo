import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Brain, Search, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/apiService';
import { certificateService } from '@/services/certificateService';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';

interface ClientDropdownItem {
  id: string;
  full_name: string;
  email: string;
}

interface PayoutItem {
  payout_id: string;
  payout_value: number;
  payout_date: string;
  payout_status: string;
}

interface AIAnalysis {
  id: string;
  payout_id?: string;
  trader_id?: string;
  trader_name?: string;
  trader_email?: string;
  enrollment_id?: string;
  mt5_account_id?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error_message?: string;
  stats: any;
  trade_samples: any;
  llm_model: string;
  llm_prompt_version?: string;
  llm_request_payload?: any;
  llm_raw_response?: any;
  
  // AI Analysis fields
  summary?: string;
  confidence?: number;
  trading_style: any;
  risk_profile: any;
  consistency: any;
  ai_summary?: string;
  ai_trading_style: any;
  ai_risk_profile: any;
  ai_consistency: any;
  ai_recommendations: any;
  
  // Violations and classification
  violations?: Array<{
    rule?: string;
    rule_name?: string;
    category?: string;
    severity?: string;
    classification?: string;
    description?: string;
    explanation?: string;
    evidence?: string;
    impact?: string;
    affected_trade_ids?: number[];
  }>;
  overall_classification?: 'Compliant' | 'Soft Breach' | 'Hard Breach';
  
  // Adjusted payout
  adjusted_payout?: {
    original_profit?: number;
    original_net_profit?: number;
    excluded_profit?: number;
    recommended_payout?: number;
    adjustment_reason?: string;
    notes?: string;
  };
  
  // Recommendations
  recommendations?: {
    for_trader?: string[];
    for_prop_firm?: string[];
    internal_notes?: string[];
  };
  
  // Payout recommendation (new top-level field)
  payout_recommendation?: {
    decision?: 'approve' | 'reject' | 'manual_review';
    classification?: string;
    adjusted_payout?: {
      original_net_profit?: number;
      excluded_profit?: number;
      recommended_payout?: number;
      notes?: string;
    };
    confidence?: number;
    rationale?: string;
  };
  
  // Legacy fields
  recommendation?: 'approve' | 'reject' | 'manual_review';
  recommendation_confidence?: number;
  recommendation_rationale?: string;
  created_at: string;
  updated_at?: string;
}

const PayoutAIAnalysis = () => {
  const [clientComboboxOpen, setClientComboboxOpen] = useState(false);
  const [clientSearchValue, setClientSearchValue] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedPayoutId, setSelectedPayoutId] = useState<string>('');
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  
  const { toast } = useToast();

  // Fetch clients for dropdown
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients-dropdown'],
    queryFn: async () => {
      const response = await apiService.get<ClientDropdownItem[]>('/admin/clients-dropdown/');
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || [];
    },
  });

  const clientsList = Array.isArray(clients) ? clients : [];
  const filteredClients = clientsList.filter(client => 
    client && 
    client.full_name && 
    client.email &&
    (client.full_name.toLowerCase().includes(clientSearchValue.toLowerCase()) ||
     client.email.toLowerCase().includes(clientSearchValue.toLowerCase()))
  );

  // Fetch payouts for selected client
  const { data: payoutsResponse, isLoading: payoutsLoading, refetch: refetchPayouts } = useQuery({
    queryKey: ['client-payouts', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return null;
      
      const selectedClient = clientsList.find(client => client.id.toString() === selectedClientId);
      if (!selectedClient) return null;

      const response = await certificateService.lookupPayouts(selectedClient.email);
      return response;
    },
    enabled: false,
  });

  const payouts = payoutsResponse?.payouts || [];

  const selectedClient = clientsList.find(client => client && client.id && client.id.toString() === selectedClientId);

  const runAnalysisMutation = useMutation({
    mutationFn: async (payoutId: string) => {
      const response = await apiService.post<AIAnalysis>('/admin/run-ai-analysis/', {
        payout_id: payoutId,
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return response.data;
    },
    onSuccess: (data) => {
      setAnalysis(data);
      toast({
        title: "Analysis Complete",
        description: "AI analysis has been successfully generated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to run AI analysis",
        variant: "destructive",
      });
    },
  });

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedPayoutId('');
    setAnalysis(null);
    setClientComboboxOpen(false);
  };

  const handleLookupPayouts = () => {
    if (!selectedClientId) {
      toast({
        title: "Error",
        description: "Please select a client first",
        variant: "destructive",
      });
      return;
    }
    refetchPayouts();
  };

  const handleRunAnalysis = () => {
    if (!selectedPayoutId) {
      toast({
        title: "Error",
        description: "Please select a payout first",
        variant: "destructive",
      });
      return;
    }
    runAnalysisMutation.mutate(selectedPayoutId);
  };

  const getRecommendationBadge = (recommendation?: string) => {
    switch (recommendation) {
      case 'approve':
        return <Badge className="bg-green-500">Approve</Badge>;
      case 'reject':
        return <Badge variant="destructive">Reject</Badge>;
      case 'manual_review':
        return <Badge variant="secondary">Manual Review</Badge>;
      default:
        return <Badge variant="outline">N/A</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'running':
        return <Badge className="bg-blue-500">Running</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="page-container space-y-4 sm:space-y-6 animate-fade-in">
      <PageHeader
        title="Payout AI Analysis"
        subtitle="Generate AI-powered insights and risk analysis for payout requests"
      />

      {/* Client Selection Section */}
      <Card className="border-2 hover:border-primary/30 transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Search className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            Select Client & Payout
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Choose a client and lookup their payout requests to analyze
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Client Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Select Client</Label>
            <Popover open={clientComboboxOpen} onOpenChange={setClientComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={clientComboboxOpen}
                  className="w-full justify-between h-12 text-base"
                >
                  {selectedClient ? (
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{selectedClient.full_name}</span>
                      <span className="text-muted-foreground">({selectedClient.email})</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select client...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[600px] p-0" align="start">
                <div className="p-2">
                  <Input
                    placeholder="Search clients..."
                    value={clientSearchValue}
                    onChange={(e) => setClientSearchValue(e.target.value)}
                    className="mb-2"
                  />
                  <div className="max-h-60 overflow-y-auto">
                    {clientsLoading ? (
                      <div className="p-2 text-center text-sm text-muted-foreground">Loading...</div>
                    ) : filteredClients.length === 0 ? (
                      <div className="p-2 text-center text-sm text-muted-foreground">No clients found</div>
                    ) : (
                      filteredClients.map((client) => (
                        <div
                          key={client.id}
                          onClick={() => handleClientChange(client.id.toString())}
                          className={cn(
                            "flex items-center gap-2 p-3 rounded cursor-pointer hover:bg-accent transition-colors",
                            selectedClientId === client.id.toString() && "bg-accent"
                          )}
                        >
                          <Check
                            className={cn(
                              "h-4 w-4",
                              selectedClientId === client.id.toString() ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{client.full_name}</div>
                            <div className="text-sm text-muted-foreground">{client.email}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Lookup Payouts Button */}
          <div>
            <Button 
              onClick={handleLookupPayouts} 
              disabled={!selectedClientId || payoutsLoading}
              className="w-full h-12 text-base"
              size="lg"
            >
              {payoutsLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Looking up payouts...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-5 w-5" />
                  Lookup Payouts
                </>
              )}
            </Button>
          </div>

          {/* Payouts List */}
          {payouts && payouts.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Select Payout Request</Label>
              <div className="grid gap-3 max-h-[400px] overflow-y-auto">
                {payouts.map((payout: PayoutItem) => (
                  <Card
                    key={payout.payout_id}
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary/50 hover:shadow-md",
                      selectedPayoutId === payout.payout_id && "border-primary border-2 shadow-lg"
                    )}
                    onClick={() => setSelectedPayoutId(payout.payout_id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-lg">${payout.payout_value.toFixed(2)}</span>
                            <Badge variant="outline">{payout.payout_status}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-0.5">
                            <div>Requested: {new Date(payout.payout_date).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <Check
                          className={cn(
                            "h-6 w-6 text-primary",
                            selectedPayoutId === payout.payout_id ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {payouts && payouts.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No payouts found for this client
              </AlertDescription>
            </Alert>
          )}

          {/* Run Analysis Button */}
          {selectedPayoutId && (
            <Button 
              onClick={handleRunAnalysis} 
              disabled={runAnalysisMutation.isPending}
              className="w-full h-12 text-base"
              size="lg"
            >
              {runAnalysisMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Running AI Analysis...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-5 w-5" />
                  Run AI Analysis
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <Card className="border-2 animate-fade-in">
          <CardHeader className="bg-muted/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                AI Analysis Results
              </CardTitle>
              {getStatusBadge(analysis.status)}
            </div>
            <CardDescription className="text-sm sm:text-base mt-2">
              Generated using {analysis.llm_model}
              {analysis.llm_prompt_version && ` (${analysis.llm_prompt_version})`}
              {' • '}
              {new Date(analysis.created_at).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-6">
            {/* Analysis Metadata */}
            <Card className="border">
              <CardHeader className="bg-muted/20">
                <CardTitle className="text-lg">Analysis Metadata</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-4">
                {analysis.trader_name && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Trader</span>
                    <p className="text-base font-semibold mt-1">{analysis.trader_name}</p>
                    {analysis.trader_email && (
                      <p className="text-sm text-muted-foreground">{analysis.trader_email}</p>
                    )}
                  </div>
                )}
                {analysis.mt5_account_id && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">MT5 Account</span>
                    <p className="text-base font-semibold mt-1">{analysis.mt5_account_id}</p>
                  </div>
                )}
                {analysis.enrollment_id && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Enrollment ID</span>
                    <p className="text-base font-semibold mt-1">{analysis.enrollment_id}</p>
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Created</span>
                  <p className="text-base font-semibold mt-1">
                    {new Date(analysis.created_at).toLocaleString()}
                  </p>
                </div>
                {analysis.updated_at && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Updated</span>
                    <p className="text-base font-semibold mt-1">
                      {new Date(analysis.updated_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {analysis.status === 'failed' && analysis.error_message && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{analysis.error_message}</AlertDescription>
              </Alert>
            )}

            {analysis.status === 'completed' && (
              <>
                {/* Payout Recommendation (Primary Decision) */}
                {analysis.payout_recommendation && (
                  <Card className="border-4 border-primary shadow-lg">
                    <CardHeader className="bg-primary/10">
                      <CardTitle className="text-xl sm:text-2xl">Final Payout Recommendation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-4">
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">Decision</span>
                            <div className="mt-2">
                              {getRecommendationBadge(analysis.payout_recommendation.decision)}
                            </div>
                          </div>
                          {analysis.payout_recommendation.classification && (
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Classification</span>
                              <div className="mt-2">
                                <Badge 
                                  className={
                                    analysis.payout_recommendation.classification === 'Compliant' 
                                      ? 'bg-green-500 text-base px-3 py-1' 
                                      : analysis.payout_recommendation.classification.includes('Soft')
                                      ? 'bg-yellow-500 text-base px-3 py-1'
                                      : 'bg-red-500 text-base px-3 py-1'
                                  }
                                >
                                  {analysis.payout_recommendation.classification}
                                </Badge>
                              </div>
                            </div>
                          )}
                          {analysis.payout_recommendation.confidence !== undefined && (
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Confidence</span>
                              <p className="text-2xl font-bold mt-1">
                                {(analysis.payout_recommendation.confidence * 100).toFixed(0)}%
                              </p>
                            </div>
                          )}
                        </div>
                        {analysis.payout_recommendation.adjusted_payout && (
                          <div className="space-y-3">
                            {analysis.payout_recommendation.adjusted_payout.original_net_profit !== undefined && (
                              <div className="bg-muted/30 p-3 rounded">
                                <span className="text-xs text-muted-foreground">Original Net Profit</span>
                                <p className="text-lg font-bold">
                                  ${analysis.payout_recommendation.adjusted_payout.original_net_profit.toFixed(2)}
                                </p>
                              </div>
                            )}
                            {analysis.payout_recommendation.adjusted_payout.excluded_profit !== undefined && (
                              <div className="bg-muted/30 p-3 rounded">
                                <span className="text-xs text-muted-foreground">Excluded Profit</span>
                                <p className="text-lg font-bold text-destructive">
                                  ${analysis.payout_recommendation.adjusted_payout.excluded_profit.toFixed(2)}
                                </p>
                              </div>
                            )}
                            {analysis.payout_recommendation.adjusted_payout.recommended_payout !== undefined && (
                              <div className="bg-primary/20 p-3 rounded border-2 border-primary">
                                <span className="text-xs text-muted-foreground">Recommended Payout</span>
                                <p className="text-2xl font-bold text-primary">
                                  ${analysis.payout_recommendation.adjusted_payout.recommended_payout.toFixed(2)}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {analysis.payout_recommendation.rationale && (
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <span className="text-sm font-medium text-muted-foreground">Rationale</span>
                          <p className="text-base mt-2 leading-relaxed">
                            {analysis.payout_recommendation.rationale}
                          </p>
                        </div>
                      )}
                      {analysis.payout_recommendation.adjusted_payout?.notes && (
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <span className="text-sm font-medium text-muted-foreground">Notes</span>
                          <p className="text-sm mt-2">
                            {analysis.payout_recommendation.adjusted_payout.notes}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Legacy Recommendation Section (fallback) */}
                {!analysis.payout_recommendation && (analysis.recommendation || analysis.recommendation_confidence || analysis.recommendation_rationale) && (
                <Card className="border-2">
                  <CardHeader className="bg-muted/20">
                    <CardTitle className="text-xl">AI Recommendation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-medium">Decision:</span>
                      {getRecommendationBadge(analysis.recommendation)}
                    </div>
                    {analysis.recommendation_confidence !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-base font-medium">Confidence:</span>
                        <span className="text-lg font-semibold">
                          {(analysis.recommendation_confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {analysis.recommendation_rationale && (
                      <div className="space-y-2">
                        <span className="text-base font-medium">Rationale:</span>
                        <p className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg">
                          {analysis.recommendation_rationale}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                )}

                {/* Overall Classification */}
                {analysis.overall_classification && (
                  <Card className="border-2">
                    <CardHeader className="bg-muted/20">
                      <CardTitle className="text-xl">Overall Classification</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <Badge 
                          className={
                            analysis.overall_classification === 'Compliant' 
                              ? 'bg-green-500 text-lg px-4 py-2' 
                              : analysis.overall_classification === 'Soft Breach'
                              ? 'bg-yellow-500 text-lg px-4 py-2'
                              : 'bg-red-500 text-lg px-4 py-2'
                          }
                        >
                          {analysis.overall_classification}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Violations */}
                {analysis.violations && analysis.violations.length > 0 && (
                  <Card className="border-2">
                    <CardHeader className="bg-muted/20">
                      <CardTitle className="text-xl">Detected Violations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                      {analysis.violations.map((violation, idx) => (
                        <Card key={idx} className="border-l-4 border-l-destructive">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <span className="font-semibold text-base">
                                {violation.rule_name || violation.rule || 'Violation'}
                              </span>
                              <div className="flex gap-2">
                                {violation.classification && (
                                  <Badge 
                                    className={
                                      violation.classification === 'Soft Breach'
                                        ? 'bg-yellow-500'
                                        : violation.classification === 'Hard Breach'
                                        ? 'bg-red-500'
                                        : 'bg-gray-500'
                                    }
                                  >
                                    {violation.classification}
                                  </Badge>
                                )}
                                {violation.severity && (
                                  <Badge 
                                    variant={
                                      violation.severity === 'high' || violation.severity === 'hard' 
                                        ? 'destructive' 
                                        : 'secondary'
                                    }
                                  >
                                    {violation.severity}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {violation.category && (
                              <p className="text-sm font-medium text-muted-foreground">
                                <strong>Category:</strong> {violation.category}
                              </p>
                            )}
                            {(violation.description || violation.explanation) && (
                              <p className="text-sm text-muted-foreground">
                                {violation.explanation || violation.description}
                              </p>
                            )}
                            {violation.evidence && (
                              <div className="bg-muted/30 p-3 rounded">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Evidence:</p>
                                <p className="text-sm">{violation.evidence}</p>
                              </div>
                            )}
                            {violation.impact && (
                              <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                                <strong>Impact:</strong> {violation.impact}
                              </p>
                            )}
                            {violation.affected_trade_ids && violation.affected_trade_ids.length > 0 && (
                              <div className="text-sm">
                                <strong>Affected Trade IDs:</strong>{' '}
                                <span className="text-muted-foreground">
                                  {violation.affected_trade_ids.join(', ')}
                                </span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Adjusted Payout */}
                {analysis.adjusted_payout && Object.keys(analysis.adjusted_payout).length > 0 && (
                  <Card className="border-2">
                    <CardHeader className="bg-muted/20">
                      <CardTitle className="text-xl">Adjusted Payout</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-3 sm:p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        {(analysis.adjusted_payout.original_profit !== undefined || analysis.adjusted_payout.original_net_profit !== undefined) && (
                          <div className="bg-muted/30 p-4 rounded-lg">
                            <span className="text-sm font-medium text-muted-foreground">Original Profit</span>
                            <p className="text-2xl font-bold mt-1">
                              ${(analysis.adjusted_payout.original_net_profit || analysis.adjusted_payout.original_profit || 0).toFixed(2)}
                            </p>
                          </div>
                        )}
                        {analysis.adjusted_payout.excluded_profit !== undefined && (
                          <div className="bg-muted/30 p-4 rounded-lg">
                            <span className="text-sm font-medium text-muted-foreground">Excluded Profit</span>
                            <p className="text-2xl font-bold mt-1 text-destructive">
                              ${analysis.adjusted_payout.excluded_profit.toFixed(2)}
                            </p>
                          </div>
                        )}
                        {analysis.adjusted_payout.recommended_payout !== undefined && (
                          <div className="bg-primary/10 p-4 rounded-lg border-2 border-primary">
                            <span className="text-sm font-medium text-muted-foreground">Recommended Payout</span>
                            <p className="text-2xl font-bold mt-1 text-primary">
                              ${analysis.adjusted_payout.recommended_payout.toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                      {(analysis.adjusted_payout.adjustment_reason || analysis.adjusted_payout.notes) && (
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <span className="text-sm font-medium text-muted-foreground">
                            {analysis.adjusted_payout.adjustment_reason ? 'Adjustment Reason' : 'Notes'}
                          </span>
                          <p className="text-sm mt-2">
                            {analysis.adjusted_payout.adjustment_reason || analysis.adjusted_payout.notes}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Summary */}
                {(analysis.summary || analysis.ai_summary) && (
                  <Card className="border-2">
                    <CardHeader className="bg-muted/20">
                      <CardTitle className="text-xl">Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <p className="text-base leading-relaxed">
                        {analysis.summary || analysis.ai_summary}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Trading Style */}
                {((analysis.trading_style && Object.keys(analysis.trading_style).length > 0) || 
                  (analysis.ai_trading_style && Object.keys(analysis.ai_trading_style).length > 0)) && (
                  <Card className="border-2">
                    <CardHeader className="bg-muted/20">
                      <CardTitle className="text-xl">Trading Style</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                      {Object.entries(analysis.trading_style || analysis.ai_trading_style || {}).map(([key, value]) => (
                        <div key={key} className="space-y-2">
                          <span className="text-sm font-medium text-muted-foreground capitalize">
                            {key.replace(/_/g, ' ')}
                          </span>
                          {Array.isArray(value) ? (
                            <ul className="list-disc list-inside space-y-1 ml-2">
                              {value.map((item: any, idx: number) => (
                                <li key={idx} className="text-sm">
                                  {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                                </li>
                              ))}
                            </ul>
                          ) : typeof value === 'object' && value !== null ? (
                            <div className="bg-muted/30 p-3 rounded-lg space-y-1">
                              {Object.entries(value).map(([k, v]) => (
                                <div key={k} className="flex justify-between text-sm">
                                  <span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}:</span>
                                  <span className="font-semibold">
                                    {typeof v === 'number' ? v.toFixed(2) : String(v)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-base">{String(value)}</p>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Risk Profile */}
                {((analysis.risk_profile && Object.keys(analysis.risk_profile).length > 0) || 
                  (analysis.ai_risk_profile && Object.keys(analysis.ai_risk_profile).length > 0)) && (
                  <Card className="border-2">
                    <CardHeader className="bg-muted/20">
                      <CardTitle className="text-xl">Risk Profile</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                      {Object.entries(analysis.risk_profile || analysis.ai_risk_profile || {}).map(([key, value]) => (
                        <div key={key} className="space-y-2">
                          <span className="text-sm font-medium text-muted-foreground capitalize">
                            {key.replace(/_/g, ' ')}
                          </span>
                          {Array.isArray(value) ? (
                            <ul className="list-disc list-inside space-y-1 ml-2">
                              {value.map((item: any, idx: number) => (
                                <li key={idx} className="text-sm">
                                  {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                                </li>
                              ))}
                            </ul>
                          ) : typeof value === 'object' && value !== null ? (
                            <div className="bg-muted/30 p-3 rounded-lg space-y-1">
                              {Object.entries(value).map(([k, v]) => (
                                <div key={k} className="flex justify-between text-sm gap-2">
                                  <span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}:</span>
                                  <span className="font-semibold text-right">
                                    {typeof v === 'number' ? v.toFixed(2) : String(v)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-base font-semibold">
                              {typeof value === 'number' ? value.toFixed(2) : String(value)}
                            </p>
                          )}
                        </div>
                      ))}
                     </CardContent>
                  </Card>
                )}

                {/* Consistency */}
                {((analysis.consistency && Object.keys(analysis.consistency).length > 0) || 
                  (analysis.ai_consistency && Object.keys(analysis.ai_consistency).length > 0)) && (
                  <Card className="border-2">
                    <CardHeader className="bg-muted/20">
                      <CardTitle className="text-xl">Consistency Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                      {Object.entries(analysis.consistency || analysis.ai_consistency || {}).map(([key, value]) => (
                        <div key={key} className="space-y-2">
                          <span className="text-sm font-medium text-muted-foreground capitalize">
                            {key.replace(/_/g, ' ')}
                          </span>
                          {Array.isArray(value) ? (
                            <ul className="list-disc list-inside space-y-1 ml-2">
                              {value.map((item: any, idx: number) => (
                                <li key={idx} className="text-sm">
                                  {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                                </li>
                              ))}
                            </ul>
                          ) : typeof value === 'object' && value !== null ? (
                            <div className="bg-muted/30 p-3 rounded-lg space-y-1">
                              {Object.entries(value).map(([k, v]) => (
                                <div key={k} className="space-y-1">
                                  {typeof v === 'object' && v !== null ? (
                                    <div className="ml-2">
                                      <span className="text-xs text-muted-foreground capitalize">{k.replace(/_/g, ' ')}:</span>
                                      <div className="bg-background/50 p-2 rounded mt-1 space-y-1">
                                        {Object.entries(v as any).map(([k2, v2]) => (
                                          <div key={k2} className="flex justify-between text-xs gap-2">
                                            <span className="text-muted-foreground capitalize">{k2.replace(/_/g, ' ')}:</span>
                                            <span className="font-semibold">
                                              {typeof v2 === 'number' ? v2.toFixed(2) : String(v2)}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex justify-between text-sm gap-2">
                                      <span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}:</span>
                                      <span className="font-semibold">
                                        {typeof v === 'number' ? v.toFixed(2) : String(v)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-base">{String(value)}</p>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Recommendations */}
                {((analysis.recommendations && Object.keys(analysis.recommendations).length > 0) ||
                  (analysis.ai_recommendations && Object.keys(analysis.ai_recommendations).length > 0)) && (
                  <Card className="border-2">
                    <CardHeader className="bg-muted/20">
                      <CardTitle className="text-xl">Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 p-6">
                      {(analysis.recommendations || analysis.ai_recommendations) && (
                        <>
                          {((analysis.recommendations?.for_trader || analysis.ai_recommendations?.for_trader) && 
                            Array.isArray(analysis.recommendations?.for_trader || analysis.ai_recommendations?.for_trader)) && (
                            <div className="space-y-3">
                              <span className="text-base font-semibold">For Trader</span>
                              <ul className="list-disc list-inside space-y-2">
                                {(analysis.recommendations?.for_trader || analysis.ai_recommendations?.for_trader || []).map((rec: string, idx: number) => (
                                  <li key={idx} className="text-sm text-muted-foreground ml-2">{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {((analysis.recommendations?.for_prop_firm || analysis.ai_recommendations?.for_prop_firm) && 
                            Array.isArray(analysis.recommendations?.for_prop_firm || analysis.ai_recommendations?.for_prop_firm)) && (
                            <div className="space-y-3">
                              <span className="text-base font-semibold">For Prop Firm</span>
                              <ul className="list-disc list-inside space-y-2">
                                {(analysis.recommendations?.for_prop_firm || analysis.ai_recommendations?.for_prop_firm || []).map((rec: string, idx: number) => (
                                  <li key={idx} className="text-sm text-muted-foreground ml-2">{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {((analysis.recommendations?.internal_notes || analysis.ai_recommendations?.internal_notes) && 
                            Array.isArray(analysis.recommendations?.internal_notes || analysis.ai_recommendations?.internal_notes)) && (
                            <div className="space-y-3">
                              <span className="text-base font-semibold">Internal Notes</span>
                              <ul className="list-disc list-inside space-y-2">
                                {(analysis.recommendations?.internal_notes || analysis.ai_recommendations?.internal_notes || []).map((note: string, idx: number) => (
                                  <li key={idx} className="text-sm text-muted-foreground ml-2">{note}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Statistics */}
                {analysis.stats && Object.keys(analysis.stats).length > 0 && (
                  <Card className="border-2">
                    <CardHeader className="bg-muted/20">
                      <CardTitle className="text-xl">Trading Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {Object.entries(analysis.stats).map(([key, value]) => (
                          <div key={key} className="bg-muted/30 p-4 rounded-lg">
                            <span className="text-sm font-medium text-muted-foreground capitalize">
                              {key.replace(/_/g, ' ')}
                            </span>
                            <p className="text-lg font-semibold mt-1">
                              {typeof value === 'number' 
                                ? value.toFixed(2) 
                                : typeof value === 'object' && value !== null
                                  ? JSON.stringify(value, null, 2)
                                  : String(value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PayoutAIAnalysis;

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, Loader2, AlertCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { riskScanService, RiskScanReport } from '@/services/riskScanService';
import RiskReportViewer from '@/components/risk/RiskReportViewer';

interface RiskScanTabProps {
  payoutId: string | undefined;
  totalProfit?: number;
  profitShare?: number;
  challengeStartDate?: string;
}

const RiskScanTab: React.FC<RiskScanTabProps> = ({ payoutId, totalProfit, profitShare, challengeStartDate }) => {
  const { toast } = useToast();
  const [scanResult, setScanResult] = useState<RiskScanReport | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const scanMutation = useMutation({
    mutationFn: async () => {
      if (!payoutId) throw new Error('Payout ID is required');
      return await riskScanService.runRiskScan({ payoutId });
    },
    onSuccess: (data) => {
      setScanResult(data);
      setScanError(null);
      toast({
        title: 'Success',
        description: 'Risk scan completed successfully',
      });
    },
    onError: (error: Error) => {
      setScanError(error.message || 'Failed to run risk scan');
      setScanResult(null);
    },
  });

  const handleRunScan = () => {
    setScanError(null);
    scanMutation.mutate();
  };

  if (!payoutId) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Payout ID is required to run risk scan</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-none shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Risk Scan</CardTitle>
                <CardDescription className="mt-1">
                  Run comprehensive risk analysis using Risk Engine v2
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={handleRunScan}
              disabled={scanMutation.isPending}
            >
              {scanMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Scan...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  {scanResult ? 'Re-run Scan' : 'Run Risk Scan'}
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {!scanResult && !scanError && !scanMutation.isPending && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="p-4 rounded-full bg-muted/50 mb-4">
                <AlertTriangle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Scan Results</h3>
              <p className="text-muted-foreground text-sm max-w-md">
                Click "Run Risk Scan" to analyze this payout for potential risks and violations.
              </p>
            </div>
          )}
          
          {scanMutation.isPending && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Running risk analysis...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {scanError && (
        <Alert variant="destructive" className="animate-fade-in">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Risk Scan Failed</AlertTitle>
          <AlertDescription className="mt-2 whitespace-pre-wrap font-mono text-sm">
            {scanError}
          </AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {scanResult && scanResult.report && (
        <RiskReportViewer 
          report={scanResult.report} 
          totalProfit={totalProfit}
          profitShare={profitShare}
          challengeStartDate={challengeStartDate}
        />
      )}
    </div>
  );
};

export default RiskScanTab;

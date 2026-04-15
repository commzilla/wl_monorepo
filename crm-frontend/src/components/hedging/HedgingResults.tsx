import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HedgingAccountCard } from './HedgingAccountCard';
import { SeverityStats } from './SeverityStats';
import type { HedgingDetectResponse } from '@/lib/types/hedging';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle, Clock, Users, Timer, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HedgingResultsProps {
  results: HedgingDetectResponse;
}

export function HedgingResults({ results }: HedgingResultsProps) {
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy HH:mm');
    } catch {
      return dateStr;
    }
  };

  const highCount = results.results.filter(r => r.severity === 'HIGH').length;
  const mediumCount = results.results.filter(r => r.severity === 'MEDIUM').length;
  const lowCount = results.results.filter(r => r.severity === 'LOW').length;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardHeader className={cn(
          "pb-4",
          results.accounts_flagged > 0 
            ? "bg-gradient-to-r from-warning/10 to-transparent" 
            : "bg-gradient-to-r from-green-500/10 to-transparent"
        )}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-xl">
                {results.accounts_flagged > 0 ? (
                  <AlertTriangle className="h-5 w-5 text-warning" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                Analysis Complete
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{formatDate(results.range.from)}</span>
                <span className="text-muted-foreground/50">→</span>
                <span>{formatDate(results.range.to)}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="text-center px-4 py-2 rounded-lg bg-background/50 border">
                <div className="flex items-center justify-center gap-1.5">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-2xl font-bold">{results.accounts_flagged}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  of {results.requested_accounts.length} flagged
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {/* Severity Stats */}
          <SeverityStats high={highCount} medium={mediumCount} low={lowCount} />
          
          {/* Parameters */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-2">
            <span className="font-medium text-foreground">Parameters:</span>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50">
              <Timer className="h-3 w-3" />
              <span>Window: {results.params.window_seconds}s</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50">
              <Layers className="h-3 w-3" />
              <span>Min Pairs: {results.params.min_pairs}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50">
              <span>Max/Account: {results.params.max_pairs_per_account}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No Results */}
      {results.results.length === 0 && (
        <Card className="border-0 shadow-md">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold">No Hedging Detected</h3>
            <p className="text-muted-foreground text-center mt-2 max-w-md">
              None of the analyzed accounts showed hedging patterns within the specified parameters.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Account Results */}
      {results.results.map((result) => (
        <HedgingAccountCard key={result.account_id} result={result} />
      ))}
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HedgingSimilarAccountCard } from './HedgingSimilarAccountCard';
import { SeverityStats } from './SeverityStats';
import type { HedgingFindSimilarResponse } from '@/lib/types/hedging';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle, Clock, Target, ArrowLeftRight, Timer, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HedgingFindSimilarResultsProps {
  results: HedgingFindSimilarResponse;
}

export function HedgingFindSimilarResults({ results }: HedgingFindSimilarResultsProps) {
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy HH:mm');
    } catch {
      return dateStr;
    }
  };

  // Handle both response structures
  const similarAccountsFound = results.similar_accounts_found ?? results.similar_accounts?.length ?? 0;
  const seedHedgingEvents = results.seed_hedging_events ?? 0;
  const windowSeconds = results.params?.window_seconds ?? results.window_seconds ?? 5;
  const minMatches = results.params?.min_matches ?? 2;
  const maxResults = results.params?.max_results ?? 20;

  const highCount = results.similar_accounts?.filter(a => a.severity === 'HIGH').length ?? 0;
  const mediumCount = results.similar_accounts?.filter(a => a.severity === 'MEDIUM').length ?? 0;
  const lowCount = results.similar_accounts?.filter(a => a.severity === 'LOW').length ?? 0;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardHeader className={cn(
          "pb-4",
          similarAccountsFound > 0 
            ? "bg-gradient-to-r from-warning/10 to-transparent" 
            : "bg-gradient-to-r from-green-500/10 to-transparent"
        )}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-xl">
                {similarAccountsFound > 0 ? (
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
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="text-center px-4 py-2 rounded-lg bg-background/50 border">
                <div className="flex items-center justify-center gap-1.5">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-lg font-bold font-mono">#{results.seed_account_id}</span>
                </div>
                <div className="text-xs text-muted-foreground">Seed Account</div>
              </div>
              <div className="text-center px-4 py-2 rounded-lg bg-background/50 border">
                <div className="flex items-center justify-center gap-1.5">
                  <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-lg font-bold">{seedHedgingEvents}</span>
                </div>
                <div className="text-xs text-muted-foreground">Seed Events</div>
              </div>
              <div className="text-center px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
                <span className="text-2xl font-bold text-primary">{similarAccountsFound}</span>
                <div className="text-xs text-muted-foreground">Similar Found</div>
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
              <span>Window: {windowSeconds}s</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50">
              <Layers className="h-3 w-3" />
              <span>Min Matches: {minMatches}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50">
              <span>Max Results: {maxResults}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No Results */}
      {(!results.similar_accounts || results.similar_accounts.length === 0) && (
        <Card className="border-0 shadow-md">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold">No Similar Accounts Found</h3>
            <p className="text-muted-foreground text-center mt-2 max-w-md">
              {results.message || "No other accounts showed hedging patterns similar to the seed account."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Similar Account Results */}
      {results.similar_accounts?.map((account) => (
        <HedgingSimilarAccountCard key={account.account_id} account={account} />
      ))}
    </div>
  );
}

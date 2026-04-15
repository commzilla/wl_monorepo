import { format } from 'date-fns';
import { AlertTriangle, Clock, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SeverityStats } from './SeverityStats';
import { SimilarAccountCard } from './SimilarAccountCard';
import type { FindSimilarResponse } from '@/lib/types/copyTrading';

interface FindSimilarResultsProps {
  results: FindSimilarResponse;
}

export function FindSimilarResults({ results }: FindSimilarResultsProps) {
  const highSeverityCount = results.similar_accounts.filter(a => a.severity === 'HIGH').length;
  const mediumSeverityCount = results.similar_accounts.filter(a => a.severity === 'MEDIUM').length;
  const lowSeverityCount = results.similar_accounts.filter(a => a.severity === 'LOW').length;

  if (results.message) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="p-4 rounded-full bg-muted/50 mb-4">
            <AlertTriangle className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No Seed Trades Found</h3>
          <p className="text-muted-foreground text-sm text-center max-w-sm">
            {results.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seed Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <span className="font-semibold">Seed Account:</span>
              <span className="font-mono text-lg">{results.seed_account_id}</span>
            </div>
            <Badge variant="outline" className="gap-1.5">
              {results.seed_trades_count} seed trades analyzed
            </Badge>
            <Badge variant="outline" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-xs">
                {format(new Date(results.range.from), 'MMM d, HH:mm')} — {format(new Date(results.range.to), 'MMM d, HH:mm')}
              </span>
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Severity Stats */}
      <SeverityStats
        totalClusters={results.similar_accounts_found}
        highCount={highSeverityCount}
        mediumCount={mediumSeverityCount}
        lowCount={lowSeverityCount}
      />

      {/* Similar Accounts Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Similar Accounts Found</h2>

        {results.similar_accounts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-4 rounded-full bg-muted/50 mb-4">
                <AlertTriangle className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">No Similar Accounts</h3>
              <p className="text-muted-foreground text-sm text-center max-w-sm">
                No accounts matched the seed account's trading patterns within the specified parameters.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {results.similar_accounts.map((account, index) => (
              <SimilarAccountCard
                key={account.account_id}
                account={account}
                index={index}
                seedAccountId={results.seed_account_id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
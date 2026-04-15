import { useState } from 'react';
import { format } from 'date-fns';
import { Clock, TrendingUp, ChevronDown, ChevronUp, ExternalLink, BarChart3, Percent } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { SimilarAccount } from '@/lib/types/copyTrading';
import { cn } from '@/lib/utils';

interface SimilarAccountCardProps {
  account: SimilarAccount;
  index: number;
  seedAccountId: number;
}

const severityConfig = {
  LOW: {
    badge: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    card: 'border-yellow-500/20 hover:border-yellow-500/40',
  },
  MEDIUM: {
    badge: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    card: 'border-orange-500/20 hover:border-orange-500/40',
  },
  HIGH: {
    badge: 'bg-destructive/10 text-destructive border-destructive/20',
    card: 'border-destructive/20 hover:border-destructive/40',
  },
};

export function SimilarAccountCard({ account, index, seedAccountId }: SimilarAccountCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = severityConfig[account.severity];

  return (
    <Card className={cn('transition-all duration-200', config.card)}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs font-medium bg-muted/50 px-2 py-0.5 rounded">
                    #{index + 1}
                  </span>
                  <Badge variant="outline" className={cn('font-semibold', config.badge)}>
                    {account.severity}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg font-mono">{account.account_id}</span>
                  {account.enrollment?.client && (
                    <span className="text-muted-foreground">
                      ({account.enrollment.client.name})
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-4 text-muted-foreground text-sm">
                  <div className="flex items-center gap-1.5">
                    <BarChart3 className="h-4 w-4" />
                    <span className="font-medium">{account.matches}</span>
                    <span className="hidden md:inline">matches</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Percent className="h-4 w-4" />
                    <span className="font-medium">{(account.confidence_ratio * 100).toFixed(1)}%</span>
                    <span className="hidden md:inline">confidence</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <CardDescription className="mt-2 text-sm">{account.reason}</CardDescription>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-5 pt-0 pb-5">
            {/* Time Range & Symbols */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2 text-sm bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Match Range:</span>
                </div>
                <div className="pl-6 space-y-1">
                  <div>
                    <span className="text-muted-foreground">First: </span>
                    <span className="font-medium">{format(new Date(account.first_match_time), 'MMM d, yyyy HH:mm:ss')}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last: </span>
                    <span className="font-medium">{format(new Date(account.last_match_time), 'MMM d, yyyy HH:mm:ss')}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 text-sm bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Matched Symbols:</span>
                </div>
                <div className="pl-6 flex flex-wrap gap-1.5">
                  {account.matched_symbols.map((symbol) => (
                    <Badge key={symbol} variant="secondary" className="font-mono text-xs">
                      {symbol}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Account Details */}
            {account.enrollment && (
              <div className="rounded-lg border p-4 bg-background">
                <h4 className="text-sm font-semibold mb-3">Account Details</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block">Challenge</span>
                    <span className="font-medium">{account.enrollment.challenge}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Status</span>
                    <Badge variant="outline" className="text-xs mt-0.5">
                      {account.enrollment.enrollment_status}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Account Size</span>
                    <span className="font-medium">
                      {account.enrollment.account_size} {account.enrollment.currency}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Email</span>
                    <span className="font-medium truncate block">{account.enrollment.client.email}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`/enrollment-review/${account.enrollment!.enrollment_id}`, '_blank');
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-2" />
                    View Enrollment
                  </Button>
                </div>
              </div>
            )}

            {/* Evidence Table */}
            {account.evidence.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  Trade Evidence ({account.evidence.length})
                </h4>
                <div className="rounded-lg border overflow-hidden max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow className="bg-muted/30">
                        <TableHead className="font-semibold">Symbol</TableHead>
                        <TableHead className="font-semibold">Side</TableHead>
                        <TableHead className="font-semibold">Seed ({seedAccountId})</TableHead>
                        <TableHead className="font-semibold">Match ({account.account_id})</TableHead>
                        <TableHead className="font-semibold">Volume Diff</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {account.evidence.map((ev, idx) => (
                        <TableRow key={idx} className="hover:bg-muted/20">
                          <TableCell className="font-mono text-sm font-medium">{ev.seed.symbol}</TableCell>
                          <TableCell>
                            <Badge className={cn(
                              'text-xs',
                              ev.seed.side === 'BUY'
                              ? 'bg-primary/10 text-primary border-primary/20'
                              : 'bg-destructive/10 text-destructive border-destructive/20'
                            )}>
                              {ev.seed.side}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-mono">{format(new Date(ev.seed.open_time), 'HH:mm:ss')}</div>
                            <div className="text-muted-foreground">{ev.seed.volume} lots @ {ev.seed.open_price}</div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-mono">{format(new Date(ev.other.open_time), 'HH:mm:ss')}</div>
                            <div className="text-muted-foreground">{ev.other.volume} lots @ {ev.other.open_price}</div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {((ev.other.volume - ev.seed.volume) / ev.seed.volume * 100).toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
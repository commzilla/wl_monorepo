import { useState } from 'react';
import { ChevronDown, User, Mail, AlertTriangle, TrendingUp, Percent, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { HedgingSimilarAccount } from '@/lib/types/hedging';
import { format } from 'date-fns';

interface HedgingSimilarAccountCardProps {
  account: HedgingSimilarAccount;
}

export function HedgingSimilarAccountCard({ account }: HedgingSimilarAccountCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const severityConfig = {
    HIGH: {
      badge: 'bg-destructive text-destructive-foreground',
      border: 'border-l-destructive',
      bg: 'bg-destructive/5',
    },
    MEDIUM: {
      badge: 'bg-warning text-warning-foreground',
      border: 'border-l-warning',
      bg: 'bg-warning/5',
    },
    LOW: {
      badge: 'bg-muted text-muted-foreground',
      border: 'border-l-muted-foreground',
      bg: 'bg-muted/30',
    },
  };

  const config = severityConfig[account.severity];

  const formatTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM dd HH:mm:ss');
    } catch {
      return dateStr;
    }
  };

  const confidencePercent = (account.confidence_ratio * 100).toFixed(1);

  return (
    <Card className={cn("border-0 shadow-md border-l-4 overflow-hidden", config.border)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className={cn("pb-4", config.bg)}>
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            {/* Left side - Account info */}
            <div className="space-y-3 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold font-mono tracking-tight">
                  #{account.account_id}
                </h3>
                <Badge className={cn("font-medium", config.badge)}>
                  {account.severity}
                </Badge>
                <Badge variant="outline" className="font-mono gap-1">
                  <Percent className="h-3 w-3" />
                  {confidencePercent}% match
                </Badge>
              </div>
              
              {account.enrollment?.client && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    <span className="font-medium text-foreground">{account.enrollment.client.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{account.enrollment.client.email}</span>
                  </div>
                </div>
              )}
              
              {account.enrollment && (
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-xs font-normal">
                    {account.enrollment.challenge}
                  </Badge>
                  <Badge variant="secondary" className="text-xs font-normal">
                    <Shield className="h-3 w-3 mr-1" />
                    {account.enrollment.enrollment_status}
                  </Badge>
                  <Badge variant="secondary" className="text-xs font-normal">
                    {account.enrollment.account_size} {account.enrollment.currency}
                  </Badge>
                </div>
              )}

              {account.matched_symbols.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-xs text-muted-foreground mr-1">Symbols:</span>
                  {account.matched_symbols.map((symbol) => (
                    <Badge key={symbol} variant="outline" className="text-xs font-mono">
                      {symbol}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Right side - Stats and expand */}
            <div className="flex items-center gap-4">
              <div className="text-center px-4 py-2 rounded-lg bg-background border min-w-[100px]">
                <div className="flex items-center justify-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-2xl font-bold">{account.matches}</span>
                </div>
                <div className="text-xs text-muted-foreground">matching events</div>
              </div>
              
              {account.evidence.length > 0 && (
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <span className="hidden sm:inline">Evidence</span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 text-sm text-muted-foreground pt-2 border-t border-border/50 mt-3">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{account.reason}</span>
          </div>
        </CardHeader>

        {account.evidence.length > 0 && (
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4">
              <div className="rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="font-semibold">Symbol</TableHead>
                        <TableHead className="font-semibold">Time Window</TableHead>
                        <TableHead className="font-semibold text-center text-primary">Buy Order</TableHead>
                        <TableHead className="font-semibold text-center text-destructive">Sell Order</TableHead>
                        <TableHead className="font-semibold text-right text-primary">Buy Vol</TableHead>
                        <TableHead className="font-semibold text-right text-destructive">Sell Vol</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {account.evidence.map((ev, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{ev.symbol}</TableCell>
                          <TableCell className="text-xs">
                            <div className="space-y-0.5">
                              <div>{formatTime(ev.start_time)}</div>
                              <div className="text-muted-foreground">→ {formatTime(ev.end_time)}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            <div className="space-y-0.5">
                              <div className="text-primary font-medium">#{ev.buy.order}</div>
                              <div className="text-muted-foreground">{formatTime(ev.buy.open_time)}</div>
                              <div>@ {ev.buy.open_price}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            <div className="space-y-0.5">
                              <div className="text-destructive font-medium">#{ev.sell.order}</div>
                              <div className="text-muted-foreground">{formatTime(ev.sell.open_time)}</div>
                              <div>@ {ev.sell.open_price}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium text-primary">
                            {ev.buy.volume}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium text-destructive">
                            {ev.sell.volume}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        )}
      </Collapsible>
    </Card>
  );
}

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TraderBreakdown } from '@/services/topEarningTradersService';
import { TrendingUp, TrendingDown, DollarSign, Activity, ShoppingCart, Wallet, Users, Award } from 'lucide-react';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TraderBreakdownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  breakdown: TraderBreakdown | null;
  isLoading: boolean;
}

export const TraderBreakdownDialog: React.FC<TraderBreakdownDialogProps> = ({
  open,
  onOpenChange,
  breakdown,
  isLoading,
}) => {
  if (!breakdown && !isLoading) return null;

  const isProfitable = breakdown ? breakdown.summary.net_profit > 0 : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-[95vw] max-h-[92vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary/5 via-primary/3 to-transparent">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Trader Breakdown
              </DialogTitle>
              {breakdown && (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-foreground text-lg">{breakdown.client.name}</p>
                    <p className="text-sm text-muted-foreground">{breakdown.client.email}</p>
                  </div>
                  {breakdown.client.kyc_status && (
                    <Badge variant="outline" className="capitalize">
                      {breakdown.client.kyc_status}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[calc(92vh-120px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="space-y-4 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground">Loading trader breakdown...</p>
              </div>
            </div>
          ) : breakdown ? (
            <div className="space-y-6 p-6">
              {/* Financial Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/10 via-primary/5 to-background overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full blur-2xl"></div>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <DollarSign className="h-4 w-4 text-primary" />
                      </div>
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground">
                      ${breakdown.summary.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-destructive/10 via-destructive/5 to-background overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-destructive/10 rounded-full blur-2xl"></div>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-destructive/10">
                        <Wallet className="h-4 w-4 text-destructive" />
                      </div>
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Payouts</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-destructive">
                      ${breakdown.summary.total_payouts.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-background overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl"></div>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <CardTitle className="text-sm font-medium text-muted-foreground">Affiliate Commission</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                      ${breakdown.summary.total_affiliate_commission.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </CardContent>
                </Card>

                <Card className={`border-0 shadow-lg overflow-hidden relative ${
                  isProfitable 
                    ? 'bg-gradient-to-br from-green-500/10 via-green-500/5 to-background' 
                    : 'bg-gradient-to-br from-red-500/10 via-red-500/5 to-background'
                }`}>
                  <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl ${
                    isProfitable ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}></div>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${isProfitable ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        {isProfitable ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-3xl font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                      ${Math.abs(breakdown.summary.net_profit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">
                      Margin: {breakdown.summary.profit_margin.toFixed(2)}%
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Account Statistics */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Account Statistics</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Total Accounts</p>
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-muted">
                          <Award className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="text-3xl font-bold">{breakdown.summary.total_accounts}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Active</p>
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <Activity className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="text-3xl font-bold text-blue-600">{breakdown.summary.active_accounts}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Funded</p>
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        </div>
                        <span className="text-3xl font-bold text-green-600">{breakdown.summary.funded_accounts}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Breached</p>
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-red-500/10">
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        </div>
                        <span className="text-3xl font-bold text-red-600">{breakdown.summary.breached_accounts}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Tables */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Detailed Information</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Tabs defaultValue="orders" className="w-full">
                    <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
                      <TabsTrigger 
                        value="orders" 
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Orders ({breakdown.orders.length})
                      </TabsTrigger>
                      <TabsTrigger 
                        value="payouts"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3"
                      >
                        <Wallet className="h-4 w-4 mr-2" />
                        Payouts ({breakdown.payouts.length})
                      </TabsTrigger>
                      <TabsTrigger 
                        value="commissions"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3"
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Commissions ({breakdown.affiliate_commissions.length})
                      </TabsTrigger>
                      <TabsTrigger 
                        value="enrollments"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3"
                      >
                        <Activity className="h-4 w-4 mr-2" />
                        Enrollments ({breakdown.enrollments.length})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="orders" className="mt-0 p-6">
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead className="font-semibold">Product</TableHead>
                              <TableHead className="font-semibold">Amount</TableHead>
                              <TableHead className="font-semibold">Status</TableHead>
                              <TableHead className="font-semibold">Account Size</TableHead>
                              <TableHead className="font-semibold">Broker</TableHead>
                              <TableHead className="font-semibold">MT5 Account</TableHead>
                              <TableHead className="font-semibold">Date</TableHead>
                            </TableRow>
                          </TableHeader>
                    <TableBody>
                            {breakdown.orders.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center py-12">
                                  <div className="flex flex-col items-center gap-2">
                                    <ShoppingCart className="h-8 w-8 text-muted-foreground/50" />
                                    <p className="text-sm text-muted-foreground">No orders found</p>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : (
                              breakdown.orders.map((order) => (
                                <TableRow key={order.id} className="hover:bg-muted/50">
                                  <TableCell className="font-medium">{order.product_name}</TableCell>
                                  <TableCell className="font-semibold">${order.order_total_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="capitalize">{order.status}</Badge>
                                  </TableCell>
                                  <TableCell>{order.challenge_account_size ? `$${order.challenge_account_size.toLocaleString()}` : '-'}</TableCell>
                                  <TableCell className="text-muted-foreground">{order.challenge_broker_type || '-'}</TableCell>
                                  <TableCell className="font-mono text-xs text-muted-foreground">{order.mt5_account_id || '-'}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">{format(new Date(order.date_created), 'MMM dd, yyyy')}</TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>

                    <TabsContent value="payouts" className="mt-0 p-6">
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead className="font-semibold">Status</TableHead>
                              <TableHead className="text-right font-semibold">Amount</TableHead>
                              <TableHead className="text-right font-semibold">Released</TableHead>
                              <TableHead className="text-right font-semibold">Profit</TableHead>
                              <TableHead className="text-right font-semibold">Share %</TableHead>
                              <TableHead className="text-right font-semibold">Net Profit</TableHead>
                              <TableHead className="font-semibold">Method</TableHead>
                              <TableHead className="font-semibold">Requested</TableHead>
                              <TableHead className="font-semibold">Paid</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {breakdown.payouts.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={9} className="text-center py-12">
                                  <div className="flex flex-col items-center gap-2">
                                    <Wallet className="h-8 w-8 text-muted-foreground/50" />
                                    <p className="text-sm text-muted-foreground">No payouts found</p>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : (
                              breakdown.payouts.map((payout) => (
                                <TableRow key={payout.id} className="hover:bg-muted/50">
                                  <TableCell>
                                    <Badge variant={payout.status === 'paid' ? 'default' : 'secondary'} className="capitalize">
                                      {payout.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-medium">${payout.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                  <TableCell className="text-right text-muted-foreground">${payout.released_fund.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                  <TableCell className="text-right text-muted-foreground">${payout.profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                  <TableCell className="text-right text-muted-foreground">{payout.profit_share}%</TableCell>
                                  <TableCell className="text-right font-semibold text-green-600">${payout.net_profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                  <TableCell className="capitalize text-muted-foreground">{payout.method}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">{format(new Date(payout.requested_at), 'MMM dd, yyyy')}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">{payout.paid_at ? format(new Date(payout.paid_at), 'MMM dd, yyyy') : '-'}</TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>

                    <TabsContent value="commissions" className="mt-0 p-6">
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead className="font-semibold">Challenge</TableHead>
                              <TableHead className="text-right font-semibold">Commission</TableHead>
                              <TableHead className="font-semibold">Status</TableHead>
                              <TableHead className="font-semibold">Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {breakdown.affiliate_commissions.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center py-12">
                                  <div className="flex flex-col items-center gap-2">
                                    <Users className="h-8 w-8 text-muted-foreground/50" />
                                    <p className="text-sm text-muted-foreground">No commissions found</p>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : (
                              breakdown.affiliate_commissions.map((commission) => (
                                <TableRow key={commission.id} className="hover:bg-muted/50">
                                  <TableCell className="font-medium">{commission.challenge_name}</TableCell>
                                  <TableCell className="text-right font-semibold text-blue-600">
                                    ${commission.commission_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="capitalize">{commission.commission_status}</Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">{format(new Date(commission.created_at), 'MMM dd, yyyy')}</TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>

                    <TabsContent value="enrollments" className="mt-0 p-6">
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead className="font-semibold">Challenge</TableHead>
                              <TableHead className="font-semibold">Status</TableHead>
                              <TableHead className="text-right font-semibold">Account Size</TableHead>
                              <TableHead className="font-semibold">Broker</TableHead>
                              <TableHead className="font-semibold">MT5 Account</TableHead>
                              <TableHead className="font-semibold">Active</TableHead>
                              <TableHead className="font-semibold">Start Date</TableHead>
                              <TableHead className="font-semibold">Completed</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {breakdown.enrollments.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={8} className="text-center py-12">
                                  <div className="flex flex-col items-center gap-2">
                                    <Activity className="h-8 w-8 text-muted-foreground/50" />
                                    <p className="text-sm text-muted-foreground">No enrollments found</p>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : (
                              breakdown.enrollments.map((enrollment) => (
                                <TableRow key={enrollment.id} className="hover:bg-muted/50">
                                  <TableCell className="font-medium">{enrollment.challenge_name || '-'}</TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant={
                                        enrollment.status === 'live_in_progress' ? 'default' :
                                        enrollment.status === 'failed' ? 'destructive' :
                                        'secondary'
                                      }
                                      className="capitalize"
                                    >
                                      {enrollment.status.replace(/_/g, ' ')}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    ${enrollment.account_size.toLocaleString()} {enrollment.currency}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">{enrollment.broker_type}</TableCell>
                                  <TableCell className="font-mono text-xs text-muted-foreground">{enrollment.mt5_account_id || '-'}</TableCell>
                                  <TableCell>
                                    <Badge variant={enrollment.is_active ? 'default' : 'outline'}>
                                      {enrollment.is_active ? 'Yes' : 'No'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {enrollment.start_date ? format(new Date(enrollment.start_date), 'MMM dd, yyyy') : '-'}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {enrollment.completed_date ? format(new Date(enrollment.completed_date), 'MMM dd, yyyy') : '-'}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

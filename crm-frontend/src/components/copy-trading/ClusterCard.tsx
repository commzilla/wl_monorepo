 import { useState } from 'react';
 import { format } from 'date-fns';
 import { Users, Clock, TrendingUp, TrendingDown, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
 import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Button } from '@/components/ui/button';
 import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
 import type { CopyTradingCluster } from '@/lib/types/copyTrading';
 import { cn } from '@/lib/utils';
 
 interface ClusterCardProps {
   cluster: CopyTradingCluster;
   index: number;
 }
 
 const severityConfig = {
   LOW: {
     badge: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
     card: 'border-yellow-500/20 hover:border-yellow-500/40',
     icon: 'text-yellow-500',
   },
   MEDIUM: {
     badge: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
     card: 'border-orange-500/20 hover:border-orange-500/40',
     icon: 'text-orange-500',
   },
   HIGH: {
     badge: 'bg-destructive/10 text-destructive border-destructive/20',
     card: 'border-destructive/20 hover:border-destructive/40',
     icon: 'text-destructive',
   },
 };
 
 export function ClusterCard({ cluster, index }: ClusterCardProps) {
   const [isExpanded, setIsExpanded] = useState(false);
   const config = severityConfig[cluster.severity];
 
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
                     {cluster.severity}
                   </Badge>
                 </div>
                 
                 <div className="flex items-center gap-2">
                   <span className="font-bold text-lg">{cluster.symbol}</span>
                   {cluster.side === 'BUY' ? (
                     <Badge className="bg-green-500/10 text-green-500 border-green-500/20 gap-1">
                       <TrendingUp className="h-3 w-3" />
                       BUY
                     </Badge>
                   ) : (
                     <Badge className="bg-red-500/10 text-red-500 border-red-500/20 gap-1">
                       <TrendingDown className="h-3 w-3" />
                       SELL
                     </Badge>
                   )}
                 </div>
               </div>
               
               <div className="flex items-center gap-4">
                 <div className="hidden sm:flex items-center gap-4 text-muted-foreground text-sm">
                   <div className="flex items-center gap-1.5">
                     <Users className="h-4 w-4" />
                     <span className="font-medium">{cluster.accounts.length}</span>
                     <span className="hidden md:inline">accounts</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                     <Clock className="h-4 w-4" />
                     <span className="font-medium">{cluster.window_seconds}s</span>
                     <span className="hidden md:inline">window</span>
                   </div>
                 </div>
                 <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                   {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                 </Button>
               </div>
             </div>
             <CardDescription className="mt-2 text-sm">{cluster.reason}</CardDescription>
           </CardHeader>
         </CollapsibleTrigger>
 
         <CollapsibleContent>
           <CardContent className="space-y-5 pt-0 pb-5">
             {/* Time Range */}
             <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm bg-muted/30 rounded-lg p-3">
               <div className="flex items-center gap-2">
                 <span className="text-muted-foreground">Start:</span>
                 <span className="font-medium">{format(new Date(cluster.start_time), 'MMM d, yyyy HH:mm:ss')}</span>
               </div>
               <div className="flex items-center gap-2">
                 <span className="text-muted-foreground">End:</span>
                 <span className="font-medium">{format(new Date(cluster.end_time), 'MMM d, yyyy HH:mm:ss')}</span>
               </div>
             </div>
 
             {/* Accounts Table */}
             <div>
               <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                 <Users className="h-4 w-4 text-muted-foreground" />
                 Accounts Involved ({cluster.accounts_detail.length})
               </h4>
               <div className="rounded-lg border overflow-hidden">
                 <Table>
                   <TableHeader>
                     <TableRow className="bg-muted/30">
                       <TableHead className="font-semibold">Account ID</TableHead>
                       <TableHead className="font-semibold">Client</TableHead>
                       <TableHead className="font-semibold hidden md:table-cell">Email</TableHead>
                       <TableHead className="font-semibold hidden lg:table-cell">Challenge</TableHead>
                       <TableHead className="font-semibold">Status</TableHead>
                       <TableHead className="font-semibold hidden sm:table-cell">Account Size</TableHead>
                       <TableHead className="w-10"></TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {cluster.accounts_detail.map((account) => (
                       <TableRow key={account.account_id} className="hover:bg-muted/20">
                         <TableCell className="font-mono text-sm font-medium">{account.account_id}</TableCell>
                         <TableCell className="font-medium">{account.client?.name || '-'}</TableCell>
                         <TableCell className="hidden md:table-cell text-muted-foreground">
                           {account.client?.email || '-'}
                         </TableCell>
                         <TableCell className="hidden lg:table-cell">{account.challenge || '-'}</TableCell>
                         <TableCell>
                           {account.enrollment_status ? (
                             <Badge variant="outline" className="text-xs">
                               {account.enrollment_status}
                             </Badge>
                           ) : account.unmapped ? (
                             <Badge variant="secondary" className="text-xs">Unmapped</Badge>
                           ) : '-'}
                         </TableCell>
                         <TableCell className="hidden sm:table-cell">
                           {account.account_size ? (
                             <span className="font-medium">
                               {account.account_size} {account.currency || ''}
                             </span>
                           ) : '-'}
                         </TableCell>
                         <TableCell>
                           {account.enrollment_id && (
                             <Button
                               variant="ghost"
                               size="sm"
                               className="h-7 w-7 p-0"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 window.open(`/enrollment-review/${account.enrollment_id}`, '_blank');
                               }}
                             >
                               <ExternalLink className="h-3.5 w-3.5" />
                             </Button>
                           )}
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </div>
             </div>
 
             {/* Trades Table */}
             {cluster.trades.length > 0 && (
               <div>
                 <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                   <TrendingUp className="h-4 w-4 text-muted-foreground" />
                   Trade Details ({cluster.trades.length})
                 </h4>
                 <div className="rounded-lg border overflow-hidden max-h-64 overflow-y-auto">
                   <Table>
                     <TableHeader className="sticky top-0 bg-background">
                       <TableRow className="bg-muted/30">
                         <TableHead className="font-semibold">Account ID</TableHead>
                         <TableHead className="font-semibold">Order</TableHead>
                         <TableHead className="font-semibold">Open Time</TableHead>
                         <TableHead className="font-semibold">Open Price</TableHead>
                         <TableHead className="font-semibold">Volume</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {cluster.trades.map((trade) => (
                         <TableRow key={trade.order} className="hover:bg-muted/20">
                           <TableCell className="font-mono text-sm">{trade.account_id}</TableCell>
                           <TableCell className="font-mono text-sm">{trade.order}</TableCell>
                           <TableCell className="text-sm">
                             {format(new Date(trade.open_time), 'MMM d, HH:mm:ss')}
                           </TableCell>
                           <TableCell className="font-mono">{trade.open_price.toFixed(5)}</TableCell>
                           <TableCell className="font-medium">{trade.volume}</TableCell>
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
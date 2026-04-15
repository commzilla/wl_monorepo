 import { format } from 'date-fns';
 import { AlertTriangle, Clock } from 'lucide-react';
 import { Card, CardContent } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { ClusterCard } from './ClusterCard';
 import { SeverityStats } from './SeverityStats';
 import type { CopyTradingDetectResponse } from '@/lib/types/copyTrading';
 
 interface CopyTradingResultsProps {
   results: CopyTradingDetectResponse;
 }
 
 export function CopyTradingResults({ results }: CopyTradingResultsProps) {
   const highSeverityCount = results.clusters.filter(c => c.severity === 'HIGH').length;
   const mediumSeverityCount = results.clusters.filter(c => c.severity === 'MEDIUM').length;
   const lowSeverityCount = results.clusters.filter(c => c.severity === 'LOW').length;
 
   return (
     <div className="space-y-6">
       {/* Severity Stats */}
       <SeverityStats
         totalClusters={results.clusters_found}
         highCount={highSeverityCount}
         mediumCount={mediumSeverityCount}
         lowCount={lowSeverityCount}
       />
 
       {/* Clusters Section */}
       <div className="space-y-4">
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
           <h2 className="text-xl font-semibold">Detected Clusters</h2>
           <Badge variant="outline" className="gap-1.5 w-fit">
             <Clock className="h-3.5 w-3.5" />
             <span className="text-xs">
               {format(new Date(results.range.from), 'MMM d, HH:mm')} — {format(new Date(results.range.to), 'MMM d, HH:mm')}
             </span>
           </Badge>
         </div>
 
         {results.clusters.length === 0 ? (
           <Card className="border-dashed">
             <CardContent className="flex flex-col items-center justify-center py-16">
               <div className="p-4 rounded-full bg-muted/50 mb-4">
                 <AlertTriangle className="h-10 w-10 text-muted-foreground" />
               </div>
               <h3 className="text-lg font-medium mb-1">No Patterns Detected</h3>
               <p className="text-muted-foreground text-sm text-center max-w-sm">
                 No copy trading patterns were found across the provided accounts within the specified time window.
               </p>
             </CardContent>
           </Card>
         ) : (
           <div className="space-y-4">
             {results.clusters.map((cluster, index) => (
               <ClusterCard
                 key={`${cluster.symbol}-${cluster.start_time}-${index}`}
                 cluster={cluster}
                 index={index}
               />
             ))}
           </div>
         )}
       </div>
     </div>
   );
 }
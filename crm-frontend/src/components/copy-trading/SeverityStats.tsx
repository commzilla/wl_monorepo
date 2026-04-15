 import { AlertTriangle, AlertOctagon, AlertCircle, BarChart3 } from 'lucide-react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { cn } from '@/lib/utils';
 
 interface SeverityStatsProps {
   totalClusters: number;
   highCount: number;
   mediumCount: number;
   lowCount: number;
 }
 
 export function SeverityStats({ totalClusters, highCount, mediumCount, lowCount }: SeverityStatsProps) {
   const stats = [
     {
       label: 'Total Clusters',
       value: totalClusters,
       icon: BarChart3,
       color: 'text-primary',
       bg: 'bg-primary/10',
       border: 'border-primary/20',
     },
     {
       label: 'High Severity',
       value: highCount,
       icon: AlertOctagon,
       color: 'text-destructive',
       bg: 'bg-destructive/10',
       border: 'border-destructive/20',
     },
     {
       label: 'Medium Severity',
       value: mediumCount,
       icon: AlertTriangle,
       color: 'text-orange-500',
       bg: 'bg-orange-500/10',
       border: 'border-orange-500/20',
     },
     {
       label: 'Low Severity',
       value: lowCount,
       icon: AlertCircle,
       color: 'text-yellow-500',
       bg: 'bg-yellow-500/10',
       border: 'border-yellow-500/20',
     },
   ];
 
   return (
     <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
       {stats.map((stat) => (
         <Card key={stat.label} className={cn('transition-all duration-200 hover:shadow-md', stat.border)}>
           <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
             <CardTitle className={cn('text-sm font-medium', stat.color)}>
               {stat.label}
             </CardTitle>
             <div className={cn('p-2 rounded-lg', stat.bg)}>
               <stat.icon className={cn('h-4 w-4', stat.color)} />
             </div>
           </CardHeader>
           <CardContent>
             <div className={cn('text-3xl font-bold', stat.color)}>{stat.value}</div>
           </CardContent>
         </Card>
       ))}
     </div>
   );
 }
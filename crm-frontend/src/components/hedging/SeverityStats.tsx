import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SeverityStatsProps {
  high: number;
  medium: number;
  low: number;
  className?: string;
}

export function SeverityStats({ high, medium, low, className }: SeverityStatsProps) {
  const stats = [
    {
      label: 'High',
      count: high,
      icon: AlertTriangle,
      bgColor: 'bg-destructive/10',
      textColor: 'text-destructive',
      borderColor: 'border-destructive/20',
    },
    {
      label: 'Medium',
      count: medium,
      icon: AlertCircle,
      bgColor: 'bg-warning/10',
      textColor: 'text-warning',
      borderColor: 'border-warning/20',
    },
    {
      label: 'Low',
      count: low,
      icon: Info,
      bgColor: 'bg-muted',
      textColor: 'text-muted-foreground',
      borderColor: 'border-border',
    },
  ];

  return (
    <div className={cn("grid grid-cols-3 gap-3", className)}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg border",
            stat.bgColor,
            stat.borderColor
          )}
        >
          <stat.icon className={cn("h-5 w-5 shrink-0", stat.textColor)} />
          <div className="min-w-0">
            <div className={cn("text-xl font-bold leading-none", stat.textColor)}>
              {stat.count}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

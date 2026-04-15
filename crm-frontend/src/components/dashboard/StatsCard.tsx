
import React from 'react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    positive: boolean;
    label?: string;
  };
  className?: string;
}

const StatsCard = React.memo<StatsCardProps>(({ title, value, description, icon, trend, className }) => {
  return (
    <div className={cn('bg-card border border-border rounded-2xl p-4 shadow-sm', className)}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground leading-tight">{title}</p>
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground tracking-tight">
        {typeof value === 'string' ? value : (value?.toLocaleString() ?? 'N/A')}
      </p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
      {trend && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/40">
          <span className={cn(
            'inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full',
            trend.positive
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              : 'bg-rose-50 text-rose-600 border border-rose-200'
          )}>
            {trend.positive ? '↗' : '↘'} {Math.abs(trend.value)}%
          </span>
          <span className="text-xs text-muted-foreground">{trend.label || 'vs last period'}</span>
        </div>
      )}
    </div>
  );
});

StatsCard.displayName = 'StatsCard';

export default StatsCard;

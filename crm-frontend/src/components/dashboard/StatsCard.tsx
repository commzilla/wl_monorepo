
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';

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
  const { t } = useLanguage();
  
  return (
    <Card className={cn("group hover:scale-[1.02] transition-all duration-300", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground/80 mb-1">{title}</p>
            <p className="text-3xl font-bold text-foreground group-hover:text-glow transition-all duration-300">
              {typeof value === 'string' ? value : (value?.toLocaleString() ?? 'N/A')}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground/60 mt-1">{description}</p>
            )}
          </div>
          
          {icon && (
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-all duration-300">
              <div className="text-primary group-hover:scale-110 transition-transform duration-300">
                {icon}
              </div>
            </div>
          )}
        </div>
        
        {trend && (
          <div className="flex items-center gap-2 pt-3 border-t border-border/40">
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
              trend.positive
                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                : "bg-rose-50 text-rose-600 border border-rose-200"
            )}>
              <span>{trend.positive ? '↗' : '↘'}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
            <span className="text-xs text-muted-foreground/60">{trend.label || t('dashboard.vsLastMonth')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

StatsCard.displayName = 'StatsCard';

export default StatsCard;

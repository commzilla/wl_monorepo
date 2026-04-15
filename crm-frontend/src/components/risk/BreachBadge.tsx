
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { BreachSeverity, BreachCategory } from '@/lib/types/risk';
import { AlertTriangle, XCircle, Clock, TrendingUp, Users, Target, Shield, Activity } from 'lucide-react';

interface BreachBadgeProps {
  severity: BreachSeverity;
  category: BreachCategory;
  className?: string;
}

const BreachBadge = ({ severity, category, className }: BreachBadgeProps) => {
  const getVariant = () => {
    return severity === 'hard' ? 'destructive' : 'warning';
  };

  const getIcon = () => {
    const iconMap = {
      daily_loss: XCircle,
      total_loss: XCircle,
      trading_hours: Clock,
      lot_size: TrendingUp,
      frequency: Activity,
      strategy: Shield,
      risk_reward: Target,
      manipulation: AlertTriangle
    };

    const IconComponent = iconMap[category];
    return IconComponent ? <IconComponent className="h-3 w-3 mr-1" /> : null;
  };

  const getCategoryLabel = () => {
    const labelMap = {
      daily_loss: 'Daily Loss',
      total_loss: 'Total Loss',
      trading_hours: 'Trading Hours',
      lot_size: 'Lot Size',
      frequency: 'Frequency',
      strategy: 'Strategy',
      risk_reward: 'Risk/Reward',
      manipulation: 'Manipulation'
    };

    return labelMap[category];
  };

  return (
    <Badge variant={getVariant()} className={className}>
      {getIcon()}
      {getCategoryLabel()} ({severity === 'hard' ? 'Hard' : 'Soft'})
    </Badge>
  );
};

export default BreachBadge;

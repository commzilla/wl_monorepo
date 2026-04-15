import React from 'react';
import {
  BarChart,
  BookOpen,
  Calendar,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

type EmptyStateType = 'dashboard' | 'trades' | 'calendar' | 'analytics' | 'ai';

interface JournalEmptyStateProps {
  type: EmptyStateType;
  message?: string;
}

interface EmptyStateConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const CONFIG: Record<EmptyStateType, EmptyStateConfig> = {
  dashboard: {
    icon: <BarChart className="w-8 h-8" />,
    title: 'No Dashboard Data',
    description:
      'Start journaling your trades to see a comprehensive overview of your trading performance, metrics, and insights.',
    color: '#3AB3FF',
  },
  trades: {
    icon: <BookOpen className="w-8 h-8" />,
    title: 'No Trades Found',
    description:
      'Your trade journal is empty. Once you have closed trades, they will appear here for review and journaling.',
    color: '#1BBF99',
  },
  calendar: {
    icon: <Calendar className="w-8 h-8" />,
    title: 'No Calendar Data',
    description:
      'Your trading calendar will show daily performance once you start recording sessions and closing trades.',
    color: '#F59E0B',
  },
  analytics: {
    icon: <TrendingUp className="w-8 h-8" />,
    title: 'No Analytics Available',
    description:
      'Analytics require trade data to generate insights. Continue trading and journaling to unlock detailed performance analysis.',
    color: '#7570FF',
  },
  ai: {
    icon: <Sparkles className="w-8 h-8" />,
    title: 'AI Insights Unavailable',
    description:
      'The AI coach needs trading data to provide personalized analysis. Start trading and journaling to unlock AI-powered insights.',
    color: '#3AB3FF',
  },
};

const JournalEmptyState: React.FC<JournalEmptyStateProps> = ({ type, message }) => {
  const config = CONFIG[type];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div
        className="flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
        style={{
          backgroundColor: `${config.color}10`,
          border: `1px solid ${config.color}25`,
        }}
      >
        <span style={{ color: config.color }}>{config.icon}</span>
      </div>

      <h3 className="text-lg font-semibold text-[#E4EEF5] mb-2">{config.title}</h3>

      <p className="text-sm text-[#85A8C3] max-w-md leading-relaxed mb-6">
        {message || config.description}
      </p>

      <div
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
        style={{
          backgroundColor: `${config.color}10`,
          border: `1px solid ${config.color}25`,
          color: config.color,
        }}
      >
        {config.icon && <span style={{ color: config.color }}><BookOpen className="w-4 h-4" /></span>}
        <span>
          {type === 'trades'
            ? 'Waiting for trade data...'
            : type === 'ai'
              ? 'Start journaling to activate AI'
              : 'Start trading to see data'}
        </span>
      </div>
    </div>
  );
};

export default JournalEmptyState;

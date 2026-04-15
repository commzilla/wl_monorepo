import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Inbox,
  MessageCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { Conversation } from '@/services/supportService';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface ConversationTabsProps {
  conversations: Conversation[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  sourceFilter?: string;
  onSourceChange?: (source: string) => void;
}

interface TabItemProps {
  label: string;
  value: string;
  count: number;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  variant?: 'default' | 'blue' | 'orange' | 'green';
  pulse?: boolean;
}

const TabItem: React.FC<TabItemProps> = ({
  label,
  count,
  icon,
  isActive,
  onClick,
  variant = 'default',
  pulse = false
}) => {
  const variantStyles = {
    default: {
      badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      activeBadge: 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900',
      icon: 'text-slate-500',
    },
    blue: {
      badge: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
      activeBadge: 'bg-blue-600 text-white dark:bg-blue-500',
      icon: 'text-blue-500',
    },
    orange: {
      badge: 'bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
      activeBadge: 'bg-orange-600 text-white dark:bg-orange-500',
      icon: 'text-orange-500',
    },
    green: {
      badge: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
      activeBadge: 'bg-emerald-600 text-white dark:bg-emerald-500',
      icon: 'text-emerald-500',
    },
  };

  const styles = variantStyles[variant];

  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200',
        'hover:bg-slate-100 dark:hover:bg-slate-800',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500',
        isActive && 'bg-slate-100 dark:bg-slate-800'
      )}
    >
      <span className={cn(
        'transition-colors',
        styles.icon,
        isActive && 'opacity-100',
        !isActive && 'opacity-70 group-hover:opacity-100'
      )}>
        {icon}
      </span>

      <span className={cn(
        'font-medium text-sm transition-colors',
        isActive ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400',
        'group-hover:text-slate-900 dark:group-hover:text-slate-100'
      )}>
        {label}
      </span>

      <Badge
        className={cn(
          'ml-1 min-w-[24px] h-6 px-2 text-xs font-semibold rounded-full transition-all',
          isActive ? styles.activeBadge : styles.badge,
          pulse && count > 0 && 'animate-pulse'
        )}
      >
        {count}
      </Badge>
    </button>
  );
};

const sourceOptions = [
  { value: 'all', label: 'All Sources', icon: '🌐' },
  { value: 'widget', label: 'Widget', icon: '💬' },
  { value: 'discord', label: 'Discord', icon: '🎮' },
  { value: 'email', label: 'Email', icon: '📧' },
];

export const ConversationTabs: React.FC<ConversationTabsProps> = ({
  conversations,
  activeTab,
  onTabChange,
  sourceFilter = 'all',
  onSourceChange,
}) => {
  const counts = {
    all: conversations.length,
    active: conversations.filter(c => c.status === 'active').length,
    escalated: conversations.filter(c => c.status === 'escalated').length,
    resolved: conversations.filter(c => c.status === 'resolved').length,
  };

  const currentSource = sourceOptions.find(s => s.value === sourceFilter) || sourceOptions[0];

  return (
    <div className="flex items-center justify-between gap-4 p-1 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
      {/* Status Tabs */}
      <div className="flex items-center gap-1">
        <TabItem
          label="All"
          value="all"
          count={counts.all}
          icon={<Inbox className="h-4 w-4" />}
          isActive={activeTab === 'all'}
          onClick={() => onTabChange('all')}
          variant="default"
        />

        <TabItem
          label="Open"
          value="active"
          count={counts.active}
          icon={<MessageCircle className="h-4 w-4" />}
          isActive={activeTab === 'active'}
          onClick={() => onTabChange('active')}
          variant="blue"
        />

        <TabItem
          label="Escalated"
          value="escalated"
          count={counts.escalated}
          icon={<AlertTriangle className="h-4 w-4" />}
          isActive={activeTab === 'escalated'}
          onClick={() => onTabChange('escalated')}
          variant="orange"
          pulse={counts.escalated > 0}
        />

        <TabItem
          label="Resolved"
          value="resolved"
          count={counts.resolved}
          icon={<CheckCircle2 className="h-4 w-4" />}
          isActive={activeTab === 'resolved'}
          onClick={() => onTabChange('resolved')}
          variant="green"
        />
      </div>

      {/* Source Filter Dropdown */}
      {onSourceChange && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-3 gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              <span>{currentSource.icon}</span>
              <span className="hidden sm:inline">{currentSource.label}</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {sourceOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onSourceChange(option.value)}
                className={cn(
                  'flex items-center gap-2 cursor-pointer',
                  sourceFilter === option.value && 'bg-slate-100 dark:bg-slate-800'
                )}
              >
                <span>{option.icon}</span>
                <span>{option.label}</span>
                {sourceFilter === option.value && (
                  <CheckCircle2 className="h-4 w-4 ml-auto text-indigo-600" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

export default ConversationTabs;

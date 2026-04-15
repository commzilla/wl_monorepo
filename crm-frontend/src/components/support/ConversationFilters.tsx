import React from 'react';
import {
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Inbox,
  UserCheck,
} from 'lucide-react';
import { Conversation } from '@/services/supportService';
import { cn } from '@/lib/utils';

interface ConversationFiltersProps {
  conversations: Conversation[];
  activeStatus: string;
  onStatusChange: (status: string) => void;
  currentUserId?: string | null;
  globalCounts?: Record<string, number>;
}

interface FilterButtonProps {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
  color: 'slate' | 'blue' | 'orange' | 'green';
  icon: React.ReactNode;
}

const FilterButton: React.FC<FilterButtonProps> = ({
  label,
  count,
  isActive,
  onClick,
  color,
  icon,
}) => {
  const colorStyles = {
    slate: {
      active: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900',
      inactive: 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
      count: 'bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-200',
      activeCount: 'bg-white/20 text-white dark:bg-slate-900/30 dark:text-slate-900',
    },
    blue: {
      active: 'bg-blue-600 text-white',
      inactive: 'bg-white text-slate-700 hover:bg-blue-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-blue-950',
      count: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      activeCount: 'bg-white/20 text-white',
    },
    orange: {
      active: 'bg-orange-500 text-white',
      inactive: 'bg-white text-slate-700 hover:bg-orange-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-orange-950',
      count: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
      activeCount: 'bg-white/20 text-white',
    },
    green: {
      active: 'bg-emerald-600 text-white',
      inactive: 'bg-white text-slate-700 hover:bg-emerald-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-emerald-950',
      count: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
      activeCount: 'bg-white/20 text-white',
    },
  };

  const styles = colorStyles[color];

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-200 shadow-sm border',
        isActive ? styles.active + ' border-transparent shadow-md' : styles.inactive + ' border-slate-200 dark:border-slate-700'
      )}
    >
      {icon}
      <span>{label}</span>
      <span
        className={cn(
          'inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-xs font-bold transition-colors',
          isActive ? styles.activeCount : styles.count
        )}
      >
        {count}
      </span>
    </button>
  );
};

export const ConversationFilters: React.FC<ConversationFiltersProps> = ({
  conversations,
  activeStatus,
  onStatusChange,
  currentUserId,
  globalCounts,
}) => {
  const counts = {
    all: globalCounts?.all ?? conversations.length,
    active: globalCounts?.active ?? conversations.filter(c => c.status === 'active').length,
    escalated: globalCounts?.escalated ?? conversations.filter(c => c.status === 'escalated').length,
    resolved: globalCounts?.resolved ?? conversations.filter(c => c.status === 'resolved').length,
    assigned_to_me: currentUserId ? conversations.filter(c => c.assigned_agent_id === currentUserId).length : 0,
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterButton
        label="All"
        count={counts.all}
        isActive={activeStatus === 'all'}
        onClick={() => onStatusChange('all')}
        color="slate"
        icon={<Inbox className="h-4 w-4" />}
      />
      {currentUserId && (
        <FilterButton
          label="Assigned to me"
          count={counts.assigned_to_me}
          isActive={activeStatus === 'assigned_to_me'}
          onClick={() => onStatusChange('assigned_to_me')}
          color="blue"
          icon={<UserCheck className="h-4 w-4" />}
        />
      )}
      <FilterButton
        label="Open"
        count={counts.active}
        isActive={activeStatus === 'active'}
        onClick={() => onStatusChange('active')}
        color="blue"
        icon={<MessageSquare className="h-4 w-4" />}
      />
      <FilterButton
        label="Escalated"
        count={counts.escalated}
        isActive={activeStatus === 'escalated'}
        onClick={() => onStatusChange('escalated')}
        color="orange"
        icon={<AlertTriangle className="h-4 w-4" />}
      />
      <FilterButton
        label="Resolved"
        count={counts.resolved}
        isActive={activeStatus === 'resolved'}
        onClick={() => onStatusChange('resolved')}
        color="green"
        icon={<CheckCircle className="h-4 w-4" />}
      />
    </div>
  );
};

export default ConversationFilters;

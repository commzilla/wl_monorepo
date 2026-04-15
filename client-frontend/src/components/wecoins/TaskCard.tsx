import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink, FileText, CheckCircle, Coins, Clock, Sparkles } from 'lucide-react';
import { RewardTask } from '@/utils/api';
import { InstructionsModal } from './InstructionsModal';
import { SubmitTaskModal } from './SubmitTaskModal';

interface TaskCardProps {
  task: RewardTask;
  onTaskUpdate: () => void;
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Expired';
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return '< 1m';
}

function getUrgencyLevel(ms: number): 'normal' | 'warning' | 'critical' {
  if (ms <= 0) return 'critical';
  if (ms < 3600000) return 'critical';   // < 1 hour
  if (ms < 86400000) return 'warning';   // < 24 hours
  return 'normal';
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onTaskUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const cardRef = useRef<HTMLElement>(null);
  const shouldShowExpandButton = task.description.length > 150;
  const hasInstructions = task.instructions && task.instructions.trim().length > 0;

  // Countdown timer for expiring tasks
  useEffect(() => {
    if (!task.expires_at) return;

    const expiresAt = new Date(task.expires_at).getTime();
    const update = () => {
      const remaining = expiresAt - Date.now();
      setTimeRemaining(remaining > 0 ? remaining : 0);
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [task.expires_at]);

  // Check if task is "new" (created within last 48 hours)
  const isNew = !task.is_expired && (() => {
    const created = new Date(task.created_at).getTime();
    return Date.now() - created < 48 * 3600000;
  })();

  // Urgency styling
  const urgency = timeRemaining !== null && timeRemaining > 0
    ? getUrgencyLevel(timeRemaining)
    : null;

  const urgencyBorder = urgency === 'critical'
    ? 'border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
    : urgency === 'warning'
    ? 'border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
    : 'border-[rgba(40,191,255,0.08)]';

  const countdownColor = urgency === 'critical'
    ? 'bg-red-500/80 border-red-400/40'
    : urgency === 'warning'
    ? 'bg-amber-500/80 border-amber-400/40'
    : 'bg-[rgba(8,8,8,0.8)] border-[rgba(40,191,255,0.3)]';

  const getStatusBadge = () => {
    if (!task.submission_status) return null;

    const statusConfig: Record<string, { bg: string; text: string; border: string; label: string }> = {
      approved: {
        bg: 'bg-green-500/10',
        text: 'text-green-400',
        border: 'border-green-500/20',
        label: '\u2713 Completed'
      },
      pending: {
        bg: 'bg-yellow-500/10',
        text: 'text-yellow-400',
        border: 'border-yellow-500/20',
        label: '\u23f3 Pending'
      },
      rejected: {
        bg: 'bg-red-500/10',
        text: 'text-red-400',
        border: 'border-red-500/20',
        label: '\u2717 Rejected'
      },
      declined: {
        bg: 'bg-red-500/10',
        text: 'text-red-400',
        border: 'border-red-500/20',
        label: '\u2717 Declined'
      }
    };

    const config = statusConfig[task.submission_status];
    if (!config) return null;

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
        {config.label}
      </span>
    );
  };

  const isTaskDisabled = !task.can_submit;

  // Get task feature image or use placeholder
  const taskImage = task.feature_image;

  return (
    <article ref={cardRef} className={`flex flex-col h-full bg-[#0A1114] rounded-xl overflow-hidden hover:bg-[#0B1215] transition-all duration-300 border ${urgencyBorder} ${task.is_expired ? 'opacity-60' : ''}`}>
      {/* Task Image Section */}
      <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-[#0D1820] to-[#0A1418] flex items-center justify-center overflow-hidden">
        {taskImage ? (
          <img
            src={taskImage}
            alt={task.title}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="flex items-center justify-center">
            <Coins className="w-12 h-12 text-[#4EC1FF]/40" />
          </div>
        )}
        {/* Reward Badge Overlay */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(8,8,8,0.8)] backdrop-blur-sm border border-[rgba(40,191,255,0.3)]">
          <Coins className="w-4 h-4 text-[#4EC1FF]" />
          <span className="text-sm font-bold text-[#4EC1FF]">{task.reward_amount}</span>
        </div>
        {/* Expired Badge */}
        {task.is_expired && (
          <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-[rgba(8,8,8,0.8)] backdrop-blur-sm border border-red-500/30">
            <span className="text-xs font-semibold text-red-400">Expired</span>
          </div>
        )}
        {/* New Badge (mutually exclusive with Expired) */}
        {!task.is_expired && isNew && (
          <div className="absolute top-3 left-3 flex items-center gap-1 px-3 py-1.5 rounded-full bg-[rgba(8,8,8,0.8)] backdrop-blur-sm border border-[rgba(40,191,255,0.3)]">
            <Sparkles className="w-3.5 h-3.5 text-[#4EC1FF]" />
            <span className="text-xs font-semibold text-[#4EC1FF]">New</span>
          </div>
        )}
        {/* Countdown Timer Badge */}
        {timeRemaining !== null && timeRemaining > 0 && !task.is_expired && (
          <div className={`absolute bottom-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full backdrop-blur-sm border ${countdownColor}`}>
            <Clock className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-semibold text-white">{formatTimeRemaining(timeRemaining)}</span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="flex flex-col flex-grow px-5 py-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-[#E4EEF5] text-lg font-semibold tracking-[-0.4px] flex-1 line-clamp-2 mr-2">
            {task.title}
          </h3>
        </div>

        {getStatusBadge() && (
          <div className="mb-3">
            {getStatusBadge()}
          </div>
        )}

        <div className="flex-grow mb-4 overflow-hidden">
          <p className={`text-[#85A8C3] text-sm leading-relaxed tracking-[-0.42px] break-words ${
            !isExpanded && shouldShowExpandButton ? 'line-clamp-3' : ''
          }`}>
            {task.description}
          </p>

          {shouldShowExpandButton && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[#4EC1FF] text-sm font-medium mt-2 hover:text-[#28BFFF] transition-colors"
            >
              {isExpanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2 mt-auto">
          {/* Instructions Button */}
          {hasInstructions && (
            <button
              onClick={() => setShowInstructionsModal(true)}
              className="items-center border border-[#28BFFF] shadow-[0px_-8px_32px_0px_rgba(78,193,255,0.06)_inset] flex min-h-10 gap-2 justify-center overflow-hidden text-[#85A8C3] bg-[rgba(40,191,255,0.05)] px-4 py-2.5 rounded-lg hover:bg-[rgba(40,191,255,0.1)] transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span className="text-sm font-semibold">Instructions</span>
            </button>
          )}

          {/* Get Started Button */}
          {task.url && (
            <a
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`items-center border shadow-[0px_0px_40px_0px_rgba(79,214,255,0.40)_inset] bg-[rgba(8,8,8,0.01)] flex min-h-10 gap-2 justify-center overflow-hidden px-4 py-2.5 rounded-lg border-solid transition-colors ${
                isTaskDisabled
                  ? 'border-gray-600 text-gray-500 cursor-not-allowed opacity-50'
                  : 'border-[#126BA7] text-[#E4EEF5] hover:bg-[rgba(18,107,167,0.1)]'
              }`}
              onClick={(e) => isTaskDisabled && e.preventDefault()}
            >
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm font-semibold">Get Started</span>
            </a>
          )}

          {/* Submit Task Button */}
          <button
            onClick={() => setShowSubmitModal(true)}
            disabled={isTaskDisabled}
            className={`items-center border flex min-h-10 gap-2 justify-center overflow-hidden px-4 py-2.5 rounded-lg border-solid transition-colors ${
              task.is_expired
                ? 'border-gray-600 bg-gray-500/10 text-gray-500 cursor-not-allowed'
                : task.submission_status === 'approved'
                ? 'border-green-500/30 bg-green-500/10 text-green-400 cursor-not-allowed'
                : task.submission_status === 'pending'
                ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400 cursor-not-allowed'
                : task.submission_status === 'rejected' || task.submission_status === 'declined'
                ? 'border-[#4EC1FF] bg-[#4EC1FF]/10 text-[#4EC1FF] hover:bg-[#4EC1FF]/20'
                : 'border-[#4EC1FF] bg-[#4EC1FF]/10 text-[#4EC1FF] hover:bg-[#4EC1FF]/20'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-semibold">
              {task.is_expired ? 'Expired' :
               task.submission_status === 'approved' ? 'Completed' :
               task.submission_status === 'pending' ? 'Under Review' :
               task.submission_status === 'rejected' ? 'Resubmit' :
               task.submission_status === 'declined' ? 'Resubmit' :
               'Submit Task'}
            </span>
          </button>
        </div>
      </div>

      {/* Instructions Modal */}
      {showInstructionsModal && (
        <InstructionsModal
          task={task}
          onClose={() => setShowInstructionsModal(false)}
          anchorRef={cardRef}
        />
      )}

      {/* Submit Task Modal */}
      {showSubmitModal && (
        <SubmitTaskModal
          task={task}
          onClose={() => setShowSubmitModal(false)}
          onSuccess={onTaskUpdate}
          anchorRef={cardRef}
        />
      )}
    </article>
  );
};

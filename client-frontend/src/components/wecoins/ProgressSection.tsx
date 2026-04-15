import React, { useEffect, useState } from 'react';
import { Target, Trophy, Coins } from 'lucide-react';
import { RewardTask } from '@/utils/api';

interface ProgressSectionProps {
  tasks: RewardTask[];
}

export const ProgressSection: React.FC<ProgressSectionProps> = ({ tasks }) => {
  const [animatedPercent, setAnimatedPercent] = useState(0);

  const completedCount = tasks.filter(t => t.submission_status === 'approved').length;
  const totalCount = tasks.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const coinsEarned = tasks
    .filter(t => t.submission_status === 'approved')
    .reduce((sum, t) => sum + parseFloat(t.reward_amount || '0'), 0);

  const coinsAvailable = tasks
    .filter(t => t.submission_status !== 'approved')
    .reduce((sum, t) => sum + parseFloat(t.reward_amount || '0'), 0);

  // Animate the progress ring on mount
  useEffect(() => {
    const timeout = setTimeout(() => setAnimatedPercent(percent), 100);
    return () => clearTimeout(timeout);
  }, [percent]);

  // SVG ring calculations
  const radius = 50;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedPercent / 100) * circumference;

  return (
    <div className="flex flex-col md:flex-row items-center gap-6 p-5 rounded-2xl bg-[#0A1114] border border-[rgba(40,191,255,0.08)]">
      {/* Progress Ring */}
      <div className="relative flex-shrink-0" style={{ width: 120, height: 120 }}>
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          className="ring-glow"
        >
          <defs>
            <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#28BFFF" />
              <stop offset="100%" stopColor="#4EC1FF" />
            </linearGradient>
          </defs>
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="rgba(40,191,255,0.08)"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="url(#ring-gradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-[#E4EEF5]">{percent}%</span>
          <span className="text-[10px] text-[#85A8C3] uppercase tracking-wider">Complete</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 w-full md:w-auto md:flex-1">
        {/* Completed */}
        <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-[rgba(40,191,255,0.03)] border border-[rgba(40,191,255,0.06)]">
          <Target className="w-5 h-5 text-green-400" />
          <span className="text-xl font-bold text-[#E4EEF5]">{completedCount}/{totalCount}</span>
          <span className="text-[11px] text-[#85A8C3]">Completed</span>
        </div>

        {/* WeCoins Earned */}
        <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-[rgba(40,191,255,0.03)] border border-[rgba(40,191,255,0.06)]">
          <Trophy className="w-5 h-5 text-[#4EC1FF]" />
          <span className="text-xl font-bold text-[#E4EEF5]">{coinsEarned.toLocaleString()}</span>
          <span className="text-[11px] text-[#85A8C3]">Earned</span>
        </div>

        {/* Available */}
        <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-[rgba(40,191,255,0.03)] border border-[rgba(40,191,255,0.06)]">
          <Coins className="w-5 h-5 text-amber-400" />
          <span className="text-xl font-bold text-[#E4EEF5]">{coinsAvailable.toLocaleString()}</span>
          <span className="text-[11px] text-[#85A8C3]">Available</span>
        </div>
      </div>
    </div>
  );
};

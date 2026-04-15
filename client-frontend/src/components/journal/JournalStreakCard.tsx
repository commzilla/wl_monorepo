import React from 'react';
import { Flame, Trophy, TrendingDown, BookOpen } from 'lucide-react';

interface JournalStreakCardProps {
  journalStreak: number;
  winStreak: number;
  lossStreak: number;
}

const JournalStreakCard: React.FC<JournalStreakCardProps> = ({
  journalStreak,
  winStreak,
  lossStreak,
}) => {
  return (
    <div className="rounded-xl border border-[#1E2D3D] bg-[#0A1114]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[#1E2D3D]/60 px-5 py-4">
        <Flame className="h-4 w-4 text-[#F5A623]" />
        <h3 className="text-sm font-semibold text-[#E4EEF5]">Streaks</h3>
      </div>

      {/* Content */}
      <div className="space-y-4 p-5">
        {/* Journal Streak — emphasized */}
        <div className="rounded-lg border border-[#3AB3FF]/20 bg-[#3AB3FF]/5 p-4 text-center">
          <div className="mb-1 flex items-center justify-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-[#3AB3FF]" />
            <span className="text-[10px] uppercase tracking-wider text-[#85A8C3]/60">
              Journal Streak
            </span>
          </div>
          <p className="text-3xl font-bold text-[#3AB3FF]">
            {journalStreak}
            {journalStreak > 5 && (
              <span className="ml-1.5 text-lg" role="img" aria-label="fire">
                🔥
              </span>
            )}
          </p>
          <p className="mt-0.5 text-[10px] text-[#85A8C3]/50">consecutive days</p>
        </div>

        {/* Win & Loss Streaks */}
        <div className="grid grid-cols-2 gap-3">
          {/* Win Streak */}
          <div className="rounded-lg border border-[#1E2D3D]/60 bg-[#080808] p-3 text-center">
            <div className="mb-1 flex items-center justify-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-[#1BBF99]" />
              <span className="text-[10px] uppercase tracking-wider text-[#85A8C3]/60">
                Win Streak
              </span>
            </div>
            <p className="text-xl font-bold text-[#1BBF99]">{winStreak}</p>
            <p className="mt-0.5 text-[10px] text-[#85A8C3]/50">trades</p>
          </div>

          {/* Loss Streak */}
          <div className="rounded-lg border border-[#1E2D3D]/60 bg-[#080808] p-3 text-center">
            <div className="mb-1 flex items-center justify-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-[#ED5363]" />
              <span className="text-[10px] uppercase tracking-wider text-[#85A8C3]/60">
                Loss Streak
              </span>
            </div>
            <p className="text-xl font-bold text-[#ED5363]">{lossStreak}</p>
            <p className="mt-0.5 text-[10px] text-[#85A8C3]/50">trades</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JournalStreakCard;

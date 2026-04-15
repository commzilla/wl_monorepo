import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

interface TradeReplayControlsProps {
  currentIndex: number;
  totalTrades: number;
  isPlaying: boolean;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onFirst: () => void;
  onLast: () => void;
  onSpeedChange: (speed: number) => void;
}

const SPEEDS = [0.5, 1, 2, 4];

const TradeReplayControls: React.FC<TradeReplayControlsProps> = ({
  currentIndex,
  totalTrades,
  isPlaying,
  speed,
  onPlay,
  onPause,
  onPrev,
  onNext,
  onFirst,
  onLast,
  onSpeedChange,
}) => {
  const isFirst = currentIndex <= 0;
  const isLast = currentIndex >= totalTrades - 1;

  return (
    <div className="flex items-center justify-between rounded-xl border border-[#1E2D3D] bg-[#0A1114] px-4 py-3">
      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-[#E4EEF5]">
          {totalTrades > 0 ? currentIndex + 1 : 0}
        </span>
        <span className="text-xs text-[#85A8C3]/50">/</span>
        <span className="text-xs text-[#85A8C3]">{totalTrades}</span>
      </div>

      {/* Transport controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={onFirst}
          disabled={isFirst}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#85A8C3] transition-colors hover:bg-[#1E2D3D]/60 hover:text-[#E4EEF5] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#85A8C3]"
          title="First trade"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button
          onClick={onPrev}
          disabled={isFirst}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#85A8C3] transition-colors hover:bg-[#1E2D3D]/60 hover:text-[#E4EEF5] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#85A8C3]"
          title="Previous trade"
        >
          <SkipBack className="h-4 w-4" />
        </button>

        <button
          onClick={isPlaying ? onPause : onPlay}
          disabled={totalTrades === 0}
          className="mx-1 flex h-10 w-10 items-center justify-center rounded-full bg-[#3AB3FF]/10 text-[#3AB3FF] transition-colors hover:bg-[#3AB3FF]/20 disabled:opacity-30"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="ml-0.5 h-4 w-4" />
          )}
        </button>

        <button
          onClick={onNext}
          disabled={isLast}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#85A8C3] transition-colors hover:bg-[#1E2D3D]/60 hover:text-[#E4EEF5] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#85A8C3]"
          title="Next trade"
        >
          <SkipForward className="h-4 w-4" />
        </button>
        <button
          onClick={onLast}
          disabled={isLast}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#85A8C3] transition-colors hover:bg-[#1E2D3D]/60 hover:text-[#E4EEF5] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#85A8C3]"
          title="Last trade"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>

      {/* Speed selector */}
      <div className="flex items-center gap-1">
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
              speed === s
                ? 'bg-[#3AB3FF]/10 text-[#E4EEF5]'
                : 'text-[#85A8C3]/50 hover:text-[#85A8C3]'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
};

export default TradeReplayControls;

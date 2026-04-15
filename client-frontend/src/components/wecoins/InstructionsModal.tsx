import React, { useState, useEffect } from 'react';
import { X, FileText, Info, Coins } from 'lucide-react';
import { RewardTask } from '@/utils/api';

interface InstructionsModalProps {
  task: RewardTask;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement>;
}

export const InstructionsModal: React.FC<InstructionsModalProps> = ({ task, onClose, anchorRef }) => {
  const [topOffset, setTopOffset] = useState(0);

  useEffect(() => {
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const clamped = Math.max(16, Math.min(rect.top, window.innerHeight * 0.5));
      setTopOffset(clamped);
    }
  }, [anchorRef]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="flex justify-center p-4" style={{ paddingTop: `${topOffset}px`, minHeight: '100%' }}>
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-[#0A1114] rounded-2xl border border-[rgba(40,191,255,0.2)] shadow-[0_0_50px_rgba(58,179,255,0.3)] animate-scale-in flex flex-col h-fit">
        {/* Decorative gradient background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#3AB3FF]/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#4EC1FF]/5 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none"></div>

        {/* Header */}
        <div className="relative border-b border-[rgba(40,191,255,0.1)] bg-[rgba(40,191,255,0.03)] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[rgba(40,191,255,0.1)] border border-[rgba(40,191,255,0.2)]">
                <FileText className="w-5 h-5 text-[#4EC1FF]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[#E4EEF5] tracking-[-0.6px]">
                  Task Instructions
                </h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <Coins className="w-3.5 h-3.5 text-[#4EC1FF]" />
                  <span className="text-sm font-semibold text-[#4EC1FF]">
                    {task.reward_amount} WeCoins
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-[rgba(40,191,255,0.1)] transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-[#85A8C3]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative overflow-y-auto flex-1 px-6 py-6 space-y-6">
          {/* Feature Image Section */}
          {task.feature_image && (
            <div className="rounded-xl overflow-hidden border border-[rgba(40,191,255,0.15)] bg-[rgba(40,191,255,0.03)]">
              <img 
                src={task.feature_image} 
                alt={task.title}
                className="w-full h-auto max-h-48 object-contain"
              />
            </div>
          )}

          {/* Task Title Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-gradient-to-b from-[#4EC1FF] to-[#3AB3FF] rounded-full"></div>
              <h3 className="text-lg font-semibold text-[#E4EEF5]">Task Title</h3>
            </div>
            <p className="text-[#E4EEF5] text-base leading-relaxed pl-3">
              {task.title}
            </p>
          </div>

          {/* Task Description Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-gradient-to-b from-[#4EC1FF] to-[#3AB3FF] rounded-full"></div>
              <h3 className="text-lg font-semibold text-[#E4EEF5]">Description</h3>
            </div>
            <div 
              className="text-[#85A8C3] text-sm leading-relaxed pl-3 whitespace-pre-wrap"
              style={{ wordBreak: 'break-word' }}
            >
              {task.description}
            </div>
          </div>

          {/* Task Instructions Section */}
          {task.instructions && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-gradient-to-b from-[#4EC1FF] to-[#3AB3FF] rounded-full"></div>
                <h3 className="text-lg font-semibold text-[#E4EEF5]">How to Complete</h3>
              </div>
              <div className="pl-3 p-4 rounded-lg bg-[rgba(40,191,255,0.05)] border border-[rgba(40,191,255,0.15)]">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-[#4EC1FF] flex-shrink-0 mt-0.5" />
                  <div 
                    className="text-[#E4EEF5] text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ wordBreak: 'break-word' }}
                  >
                    {task.instructions.replace(/\*\*/g, '')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Example Image Section */}
          {task.example_image && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-gradient-to-b from-[#4EC1FF] to-[#3AB3FF] rounded-full"></div>
                <h3 className="text-lg font-semibold text-[#E4EEF5]">Example</h3>
              </div>
              <div className="pl-3">
                <div className="rounded-lg overflow-hidden border border-[rgba(40,191,255,0.15)] bg-[rgba(40,191,255,0.03)]">
                  <img 
                    src={task.example_image} 
                    alt="Task example"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Important Note */}
          <div className="p-4 rounded-lg bg-[rgba(255,193,7,0.05)] border border-[rgba(255,193,7,0.2)]">
            <div className="flex items-start gap-2">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[rgba(255,193,7,0.2)] flex-shrink-0 mt-0.5">
                <span className="text-[#FFC107] text-xs font-bold">!</span>
              </div>
              <p className="text-[#FFC107] text-xs leading-relaxed">
                <strong>Important:</strong> Make sure to follow all instructions carefully to ensure your submission is approved and you receive your WeCoins reward.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative border-t border-[rgba(40,191,255,0.1)] bg-[rgba(40,191,255,0.03)] px-6 py-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full items-center border border-[#28BFFF] shadow-[0px_-8px_32px_0px_rgba(78,193,255,0.06)_inset] flex min-h-11 gap-2 justify-center text-[#85A8C3] bg-[rgba(40,191,255,0.05)] px-4 py-3 rounded-lg hover:bg-[rgba(40,191,255,0.1)] transition-colors"
          >
            <span className="text-sm font-semibold">Got it!</span>
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};

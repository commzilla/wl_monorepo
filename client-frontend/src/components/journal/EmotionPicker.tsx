import React from 'react';

interface EmotionOption {
  value: string;
  emoji: string;
  label: string;
}

const EMOTION_OPTIONS: EmotionOption[] = [
  { value: 'confident', emoji: '\uD83D\uDCAA', label: 'Confident' },
  { value: 'calm', emoji: '\uD83E\uDDD8', label: 'Calm' },
  { value: 'anxious', emoji: '\uD83D\uDE30', label: 'Anxious' },
  { value: 'fearful', emoji: '\uD83D\uDE28', label: 'Fearful' },
  { value: 'greedy', emoji: '\uD83E\uDD11', label: 'Greedy' },
  { value: 'frustrated', emoji: '\uD83D\uDE24', label: 'Frustrated' },
  { value: 'revenge', emoji: '\uD83D\uDE21', label: 'Revenge' },
  { value: 'fomo', emoji: '\uD83D\uDE31', label: 'FOMO' },
  { value: 'bored', emoji: '\uD83D\uDE34', label: 'Bored' },
];

interface EmotionPickerProps {
  value: string;
  onChange: (emotion: string) => void;
}

const EmotionPicker: React.FC<EmotionPickerProps> = ({ value, onChange }) => {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Emotional state">
      {EMOTION_OPTIONS.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(isSelected ? '' : option.value)}
            className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs transition-all ${
              isSelected
                ? 'border-[#28BFFF]/50 bg-[#28BFFF]/10 text-[#E4EEF5]'
                : 'border-[#28BFFF]/10 bg-transparent text-[#85A8C3] hover:border-[#28BFFF]/25 hover:bg-[#28BFFF]/5'
            }`}
          >
            <span className="text-lg leading-none">{option.emoji}</span>
            <span className="font-medium">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default EmotionPicker;

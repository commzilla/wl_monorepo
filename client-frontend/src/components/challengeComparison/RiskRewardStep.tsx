
import React from 'react';

interface RiskRewardStepProps {
  selectedAnswer: 'up-to-1-2' | '1-2-to-1-4' | 'above-1-4' | null;
  onAnswerSelect: (answer: 'up-to-1-2' | '1-2-to-1-4' | 'above-1-4') => void;
  onNext: () => void;
  onBack: () => void;
}

export const RiskRewardStep: React.FC<RiskRewardStepProps> = ({
  selectedAnswer,
  onAnswerSelect,
  onNext,
}) => {
  const options = [
    { id: 'up-to-1-2', label: 'Up to 1:2' },
    { id: '1-2-to-1-4', label: 'Between 1:2 and 1:4' },
    { id: 'above-1-4', label: 'Above 1:4' },
  ] as const;

  const handleNext = () => {
    if (selectedAnswer) {
      onNext();
    }
  };

  return (
    <div className="text-center max-w-4xl mx-auto">
      {/* Step Number */}
      <div className="text-[#666666] text-xl mb-8">2</div>

      {/* Question */}
      <h2 className="text-3xl font-bold text-white mb-12">
        What is the average Risk/Reward ratio you aim to achieve in a trade?
      </h2>

      {/* Options */}
      <div className="flex flex-wrap justify-center gap-6 mb-12">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onAnswerSelect(option.id)}
            className={`
              px-8 py-4 rounded-lg border-2 font-medium transition-all duration-200
              ${selectedAnswer === option.id
                ? 'border-[#3AB3FF] bg-[#3AB3FF]/10 text-[#3AB3FF]'
                : 'border-[#333333] bg-[#2A2A2A] text-[#B8B8B8] hover:border-[#3AB3FF]/50'
              }
            `}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Next Button */}
      <button
        onClick={handleNext}
        disabled={!selectedAnswer}
        className={`
          px-8 py-3 rounded-lg font-semibold transition-all duration-200
          ${selectedAnswer
            ? 'bg-[#3AB3FF] hover:bg-[#2A9AE6] text-white'
            : 'bg-[#333333] text-[#666666] cursor-not-allowed'
          }
        `}
      >
        Next Question
      </button>
    </div>
  );
};

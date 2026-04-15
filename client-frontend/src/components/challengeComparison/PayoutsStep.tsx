
import React from 'react';

interface PayoutsStepProps {
  selectedAnswer: 'quick-low' | 'regular-medium' | null;
  onAnswerSelect: (answer: 'quick-low' | 'regular-medium') => void;
  onNext: () => void;
  onBack: () => void;
}

export const PayoutsStep: React.FC<PayoutsStepProps> = ({
  selectedAnswer,
  onAnswerSelect,
  onNext,
}) => {
  const options = [
    {
      id: 'quick-low',
      title: 'Quick first payout with low profit split, subsequent payouts at high profit split',
    },
    {
      id: 'regular-medium',
      title: 'Every 10 days, starting at a medium profit splits which will increase at each new payout',
    },
  ] as const;

  const handleNext = () => {
    if (selectedAnswer) {
      onNext();
    }
  };

  return (
    <div className="text-center max-w-4xl mx-auto">
      {/* Step Number */}
      <div className="text-[#666666] text-xl mb-8">3</div>

      {/* Question */}
      <h2 className="text-3xl font-bold text-white mb-12">
        What kind of payouts would satisfy you the most?
      </h2>

      {/* Options */}
      <div className="flex gap-6 mb-12 max-w-2xl mx-auto">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onAnswerSelect(option.id)}
            className={`
              p-6 rounded-lg border-2 font-medium transition-all duration-200 text-left
              ${selectedAnswer === option.id
                ? 'border-[#3AB3FF] bg-[#3AB3FF]/10 text-[#3AB3FF]'
                : 'border-[#333333] bg-[#2A2A2A] text-[#B8B8B8] hover:border-[#3AB3FF]/50'
              }
            `}
          >
            {option.title}
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

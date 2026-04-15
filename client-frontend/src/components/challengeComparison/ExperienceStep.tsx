
import React from 'react';

interface ExperienceStepProps {
  selectedAnswer: 'less-than-1' | '1-to-3' | 'more-than-3' | null;
  onAnswerSelect: (answer: 'less-than-1' | '1-to-3' | 'more-than-3') => void;
  onNext: () => void;
  onBack: () => void;
}

export const ExperienceStep: React.FC<ExperienceStepProps> = ({
  selectedAnswer,
  onAnswerSelect,
  onNext,
}) => {
  const options = [
    { id: 'less-than-1', label: 'Less than 1 year' },
    { id: '1-to-3', label: '1 to 3 years' },
    { id: 'more-than-3', label: 'More than 3 years' },
  ] as const;

  const handleNext = () => {
    if (selectedAnswer) {
      onNext();
    }
  };

  return (
    <div className="text-center max-w-4xl mx-auto">
      {/* Step Number */}
      <div className="text-[#666666] text-xl mb-8">1</div>

      {/* Question */}
      <h2 className="text-3xl font-bold text-white mb-4">
        How long is your trading experience?
      </h2>

      {/* Subtitle */}
      <p className="text-[#B8B8B8] text-lg mb-12 leading-relaxed max-w-2xl mx-auto">
        A very important data to understand at what stage of your trading career you are at the moment.
      </p>

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

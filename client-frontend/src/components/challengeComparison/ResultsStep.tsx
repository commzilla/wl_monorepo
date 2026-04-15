import React from 'react';
import { Info } from 'lucide-react';
import { QuizAnswers } from '../../pages/ChallengeComparisonPage';

interface ResultsStepProps {
  answers: QuizAnswers;
  onBack: () => void;
}

export const ResultsStep: React.FC<ResultsStepProps> = ({ answers }) => {
  // Simple logic to determine recommendation based on answers
  const getRecommendation = () => {
    // This is a simplified recommendation logic
    // In a real app, you'd have more sophisticated logic
    return 'WEFUND CHALLENGE';
  };

  const recommendation = getRecommendation();

  return (
    <div className="text-center max-w-4xl mx-auto">
      {/* Step Number */}

      <div className="text-[#666666] text-xl mb-8">4</div>

      {/* Title */}
      <h2 className="text-3xl font-bold text-white mb-12">
        Here's the perfect solution for you!
      </h2>

      {/* Recommendation Card */}
      <div className="bg-[#0A1114] border-2 border-[#3AB3FF] rounded-xl p-8 mb-8 max-w-3xl mx-auto">
        {/* Challenge Title */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <img src="/logo.svg" alt="WeFund Logo" className="w-8 h-8" />
          <h3 className="text-xl font-bold text-[#3AB3FF] uppercase tracking-wide">
            {recommendation}
          </h3>
        </div>

        {/* Description */}
        <p className="text-[#B8B8B8] text-lg mb-6 leading-relaxed">
          Remember that you can select the "Triple payday" add-on for FREE at checkout to request payouts on the 5th, 15th, and 25th of each month!
        </p>

        {/* Promo Code */}
        <div className="bg-[#0F2A35] border border-[#3AB3FF]/30 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center gap-2 text-[#3AB3FF]">
            <Info className="w-5 h-5" />
            <span className="font-medium">
              Use code QUIZSOAT15 at checkout within 72 hours to get a 15% discount on your WeFund Challenge!
            </span>
          </div>
        </div>

        {/* CTA Button */}
        <button className="bg-[#3AB3FF] hover:bg-[#2A9AE6] text-white font-semibold px-8 py-3 rounded-lg transition-colors duration-200">
          Start Challenge
        </button>
      </div>
    </div>
  );
};

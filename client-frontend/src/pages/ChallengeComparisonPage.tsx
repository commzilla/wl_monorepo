import React, { useState } from 'react';
import { WelcomeStep } from '@/components/challengeComparison/WelcomeStep';
import { ExperienceStep } from '@/components/challengeComparison/ExperienceStep';
import { RiskRewardStep } from '@/components/challengeComparison/RiskRewardStep';
import { PayoutsStep } from '@/components/challengeComparison/PayoutsStep';
import { ResultsStep } from '@/components/challengeComparison/ResultsStep';
import { ProgressIndicator } from '@/components/challengeComparison/ProgressIndicator';
import { CircleDollarSign } from 'lucide-react';


export interface QuizAnswers {
  experience: 'less-than-1' | '1-to-3' | 'more-than-3' | null;
  riskReward: 'up-to-1-2' | '1-2-to-1-4' | 'above-1-4' | null;
  payouts: 'quick-low' | 'regular-medium' | null;
}

const ChallengeComparisonPage: React.FC = () => {

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };


  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({
    experience: null,
    riskReward: null,
    payouts: null,
  });

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const updateAnswer = <K extends keyof QuizAnswers>(
    key: K,
    value: QuizAnswers[K]
  ) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeStep onNext={handleNext} />;
      case 1:
        return (
          <ExperienceStep
            selectedAnswer={answers.experience}
            onAnswerSelect={(answer) => updateAnswer('experience', answer)}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 2:
        return (
          <RiskRewardStep
            selectedAnswer={answers.riskReward}
            onAnswerSelect={(answer) => updateAnswer('riskReward', answer)}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <PayoutsStep
            selectedAnswer={answers.payouts}
            onAnswerSelect={(answer) => updateAnswer('payouts', answer)}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 4:
        return <ResultsStep answers={answers} onBack={handleBack} />;
      default:
        return <WelcomeStep onNext={handleNext} />;
    }
  };

  return (
    <main className="items-stretch border-t-[color:var(--border-cards-border,rgba(40,191,255,0.05))] border-l-[color:var(--border-cards-border,rgba(40,191,255,0.05))] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] flex min-w-60 flex-col overflow-hidden grow shrink w-full min-h-full bg-[#080808] px-8 pt-10 pb-[305px] rounded-[16px_0px_0px_0px] border-t border-solid border-l max-md:max-w-full max-md:pb-[100px] max-md:px-5">
        <header className="flex w-full items-center justify-between flex-wrap max-md:max-w-full">
          <div className="self-stretch flex min-w-60 items-center gap-2 text-[32px] text-[#E4EEF5] font-medium whitespace-nowrap tracking-[-0.96px] flex-wrap flex-1 shrink basis-7 my-auto max-md:max-w-full">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#1A2633] shadow-[0px_-8px_32px_0px_rgba(78,193,255,0.06)_inset]">
              <CircleDollarSign
                size={29}
                color="#4EC1FF"
              />
            </div>
            <h1 className="text-[#E4EEF5] self-stretch my-auto">
              Challenge Comparison
            </h1>
          </div>
          {/* Progress Indicator - Now inside header and aligned right */}
          <div className="flex-1 flex justify-end">
            <ProgressIndicator currentStep={currentStep} totalSteps={5} />
          </div>
        </header>
        {/* Quiz Content */}
        <div className={
          currentStep === 0
            ? "flex flex-col items-center justify-center min-h-[calc(100vh-200px)] w-full"
            : "flex items-center justify-center mt-12 w-full"
        }>
          {renderCurrentStep()}
        </div>
    </main>
  );
};

export default ChallengeComparisonPage;

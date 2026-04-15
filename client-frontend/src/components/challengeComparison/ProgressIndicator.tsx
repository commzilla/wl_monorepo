import React from 'react';
import { CheckCircle2, Play } from 'lucide-react';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
}) => {
  const steps = [
    { id: 0, label: 'Start' },
    { id: 1, label: 'Experience' },
    { id: 2, label: 'Trading Aim' },
    { id: 3, label: 'Payouts' },
    { id: 4, label: 'Your Result' },
  ];

  return (
    <div className="flex items-center space-x-4">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const circleLabel = index === 0 ? <Play className="w-4 h-4" /> : index;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex items-center">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${isCompleted 
                    ? 'bg-[#3AB3FF] text-white' 
                    : isCurrent 
                    ? 'bg-[#3AB3FF] text-white' 
                    : 'bg-[#2A2A2A] text-[#666666] border border-[#333333]'
                  }
                `}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  circleLabel
                )}
              </div>
              {isCurrent && (
                <span className="ml-2 text-[#3AB3FF] text-sm font-medium">
                  {step.label}
                </span>
              )}
            </div>
            {index < steps.length - 1 && (
              <div className="w-8 h-px bg-[#333333] mx-2" />
            )}
          </div>
        );
      })}
    </div>
  );
};

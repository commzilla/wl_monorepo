import React from 'react';

interface WelcomeStepProps {
  onNext: () => void;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext }) => {
  return (
    <div className="w-full max-w-4xl mx-auto text-center">

      <div className="mb-10">
        <div className="w-16 h-16 mx-auto bg-[#0A1114] rounded-lg flex items-center justify-center">
          <img src="/logo.svg" alt="WeFund Logo" className="w-8 h-8" />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-4xl font-bold text-white mb-6">
        Discover Your Ideal WeFund Trading Challenge
      </h1>

      {/* Description */}
      <p className="text-[#B8B8B8] text-lg mb-10 leading-relaxed max-w-2xl mx-auto">
        Take this quiz to discover the challenge that's tailored for your Trading Style.
        <br />
        Answer ONLY 5 simple questions, and get the result!
      </p>

      {/* CTA Button */}
      <a
        href="https://we-fund.com/#objectives"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block bg-[#3AB3FF] hover:bg-[#2A9AE6] text-white font-semibold px-8 py-3 rounded-lg transition-colors duration-200"
      >
        Let's Find Out
      </a>
    </div>
  );
};

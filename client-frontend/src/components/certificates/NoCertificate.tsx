import React, { useState } from 'react';

interface EmptyStateProps {
  title?: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  icon?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon
}) => {
  return (
    <section className="items-center border border-[#28BFFF] self-center flex max-w-lg flex-col text-sm text-[#E4EEF5] mt-12 p-6 rounded-2xl border-solid max-md:mt-10 max-md:px-5 bg-[#0A1114]">
      <div className="border border-[color:var(--border-Cards-border-gradient,#28BFFF)] shadow-[0px_0px_16px_0px_rgba(25,213,251,0.12),0px_-8px_32px_0px_rgba(78,193,255,0.06)_inset] flex min-h-11 w-11 h-11 bg-[rgba(40,191,255,0.05)] rounded-lg border-solid items-center justify-center">
        {icon && (
          <img
            src={icon}
            className="aspect-[1] object-contain w-6"
            alt="Empty state icon"
          />
        )}
      </div>
      
      {title && (
        <h2 className="text-[#E4EEF5] text-center font-semibold text-lg mt-4">
          {title}
        </h2>
      )}
      
      <p className="text-[#E4EEF5] text-center font-normal tracking-[-0.42px] w-[473px] mt-8 max-md:max-w-full">
        {description}
      </p>
      
      <button
        onClick={onAction}
        className="text-[#E4EEF5] self-stretch border border-[color:var(--border-primary-color,#3AB3FF)] shadow-[0px_3px_1px_0px_rgba(255,255,255,0.35)_inset] min-h-12 gap-2 font-semibold mt-8 px-5 py-4 rounded-lg border-solid hover:bg-[rgba(58,179,255,0.1)] transition-colors cursor-pointer"
      >
        {actionLabel}
      </button>
    </section>
  );
};

export const NoCertificate: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState('All certificates');

  const handleStartChallenge = () => {
    console.log('Starting new challenge from certificates page...');
  };

  const handleFilterChange = () => {
    console.log('Filter dropdown clicked');
  };

  return (
    <main className="items-stretch border-t-[color:var(--border-cards-border,rgba(40,191,255,0.05))] border-l-[color:var(--border-cards-border,rgba(40,191,255,0.05))] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] flex min-w-60 min-h-[936px] flex-col overflow-hidden bg-[#080808] p-8 rounded-[16px_0px_0px_0px] border-t border-solid border-l max-md:max-w-full max-md:pb-[100px] items-center justify-center">
      <header className="flex w-full items-center justify-between flex-wrap max-md:max-w-full">
        <div className="self-stretch flex min-w-60 items-center gap-2 text-[32px] text-[#E4EEF5] font-medium whitespace-nowrap tracking-[-0.96px] flex-wrap flex-1 shrink basis-7 my-auto max-md:max-w-full">
          <img
            src="https://cdn.builder.io/api/v1/image/assets/90ebc2b5ff7b4a20badecdc487273096/9c3f3302847bef0d195611f42d2d85337f7b0137?placeholderIfAbsent=true"
            className="aspect-[1] object-contain w-12 shadow-[0px_-8px_32px_0px_rgba(78,193,255,0.06)_inset] self-stretch min-h-12 shrink-0 my-auto"
            alt="Certificates icon"
          />
          <h1 className="text-[#E4EEF5] self-stretch my-auto">
            Certificates
          </h1>
        </div>
        
        <button
          onClick={handleFilterChange}
          className="items-center shadow-[0px_-8px_32px_0px_rgba(78,193,255,0.06)_inset] self-stretch flex min-h-12 gap-2 text-sm text-[#85A8C3] font-normal tracking-[-0.42px] bg-[rgba(40,191,255,0.05)] my-auto pl-4 pr-3 py-3.5 rounded-lg hover:bg-[rgba(40,191,255,0.1)] transition-colors cursor-pointer"
        >
          <span className="text-[#85A8C3] self-stretch my-auto">
            {selectedFilter}
          </span>
          <img
            src="https://cdn.builder.io/api/v1/image/assets/90ebc2b5ff7b4a20badecdc487273096/bbab564e26a02ba0df23bef2f57cbfe226dae916?placeholderIfAbsent=true"
            className="aspect-[1] object-contain w-5 self-stretch shrink-0 my-auto"
            alt="Dropdown arrow"
          />
        </button>
      </header>

      <EmptyState
        description="There's no certificate available yet. But no worries, we believe that will change soon. Are you ready to pass your WeFund Challenge?"
        actionLabel="Start New Challenge"
        onAction={handleStartChallenge}
        icon="https://cdn.builder.io/api/v1/image/assets/90ebc2b5ff7b4a20badecdc487273096/d88373a0058b4f1797203b5113d09e7f7b2f4f2c?placeholderIfAbsent=true"
      />
    </main>
  );
};
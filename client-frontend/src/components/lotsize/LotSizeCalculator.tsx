import React from 'react';
import { PositionSizeCalculatorEmbed } from './PositionSizeCalculatorEmbed';
import { Calculator } from 'lucide-react';

export const LotSizeCalculator: React.FC = () => {

  return (
    <main className="items-stretch border-t-[color:var(--border-cards-border,rgba(40,191,255,0.05))] border-l-[color:var(--border-cards-border,rgba(40,191,255,0.05))] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] flex min-w-60 flex-col overflow-hidden grow shrink w-full max-w-[1656px] bg-[#080808] px-4 md:px-8 pb-[114px] rounded-[16px_0px_0px_0px] border-t border-solid border-l max-md:pb-[100px]">
      <div className="flex flex-col items-center w-full">
        <header className="flex w-full items-center gap-2 text-[32px] text-[#E4EEF5] font-medium tracking-[-0.96px] justify-center max-md:max-w-full">
          <div className="self-stretch flex min-w-60 items-center gap-2 my-auto">
            <div className="aspect-[1] object-contain w-12 shadow-[0px_-8px_32px_0px_rgba(78,193,255,0.06)_inset] self-stretch min-h-12 shrink-0 my-auto bg-[#0A1114] rounded-lg flex items-center justify-center">
              <Calculator className="w-6 h-6 text-[color:var(--border-primary-color,#3AB3FF)]" strokeWidth={2} />
            </div>
            <h1 className="text-[#E4EEF5] self-stretch my-auto">
              Lotsize Calculator
            </h1>
          </div>
        </header>


        {/* FXVerify Position Size Calculator Embed */}
        <section className="mt-12 w-full max-w-4xl mx-auto px-4 md:px-0">
          <div className="bg-[#0A1114] border border-[color:var(--border-cards-border,rgba(40,191,255,0.05))] rounded-2xl p-4 md:p-6">
            <h2 className="text-[#E4EEF5] text-xl md:text-2xl font-medium mb-4 md:mb-6 text-center">
              Advanced Position Size Calculator
            </h2>
            <div className="w-full overflow-x-auto">
              <PositionSizeCalculatorEmbed className="w-full min-w-[320px]" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

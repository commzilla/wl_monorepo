import React from 'react';
import { useTranslation } from 'react-i18next';

export const NoWithdrawals = () => {
  const { t } = useTranslation();
  
  return (
    <div className="flex flex-col items-center p-6 rounded-2xl border border-solid border-[color:var(--border-cards-border,rgba(40,191,255,0.05))] max-w-[728px] max-md:px-5">
      {/* Icon Container */}
      <div className="flex flex-col justify-center items-center px-2 w-11 h-11 rounded-lg border border-solid shadow-lg bg-sky-400 bg-opacity-10 border-[color:var(--border-Cards-border-gradient,#28BFFF)] min-h-11">
        <div className="flex w-full min-h-7 text-sky-400">
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            <path
              d="M14 2C20.6274 2 26 7.37258 26 14C26 20.6274 20.6274 26 14 26C7.37258 26 2 20.6274 2 14C2 7.37258 7.37258 2 14 2Z"
              fill="currentColor"
              fillOpacity="0.1"
            />
            <path
              d="M14 6C17.866 6 21 9.134 21 13C21 16.866 17.866 20 14 20C10.134 20 7 16.866 7 13C7 9.134 10.134 6 14 6Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M11 11H17M11 15H17"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx="19"
              cy="9"
              r="3"
              fill="currentColor"
              fillOpacity="0.2"
              stroke="currentColor"
              strokeWidth="1"
            />
            <path
              d="M17.5 8.5L19 10L20.5 8.5"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Message */}
      <p className="mt-8 text-sm tracking-tight text-center text-slate-200 w-[473px] max-md:max-w-full">
        {t('withdrawalComponents.noWithdrawals')}
      </p>

      {/* Button */}
      <button className="gap-2 self-stretch px-5 py-4 mt-8 text-sm font-semibold rounded-lg border border-solid shadow-sm border-[color:var(--border-primary-color,#3AB3FF)] min-h-12 text-slate-200">
        {t('withdrawalComponents.startNewChallenge')}
      </button>
    </div>
  );
};

export default NoWithdrawals;
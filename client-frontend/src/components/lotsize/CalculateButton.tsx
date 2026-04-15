import React from 'react';

interface CalculateButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export const CalculateButton: React.FC<CalculateButtonProps> = ({
  onClick,
  disabled = false,
  className = ''
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-[#E4EEF5] self-center border border-[color:var(--border-Secondary-button-gradient,#126BA7)] shadow-[0px_0px_40px_0px_rgba(79,214,255,0.40)_inset] bg-[rgba(8,8,8,0.01)] min-h-12 gap-2 text-sm font-semibold whitespace-nowrap mt-12 px-6 py-4 rounded-lg border-solid transition-all duration-200 hover:shadow-[0px_0px_50px_0px_rgba(79,214,255,0.60)_inset] focus:outline-none focus:ring-2 focus:ring-[rgba(79,214,255,0.5)] disabled:opacity-50 disabled:cursor-not-allowed max-md:mt-10 max-md:px-5 ${className}`}
    >
      Calculate
    </button>
  );
};

import React, { useState } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  onChange,
  options,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(option => option.value === value);

  return (
    <div className={`flex min-w-60 flex-col items-stretch flex-1 shrink basis-[0%] max-md:max-w-full ${className}`}>
      <label className="gap-2.5 text-xs text-[rgba(133,168,195,1)] tracking-[-0.36px] pl-1">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="border flex min-h-12 w-full items-center gap-2 text-sm text-[rgba(228,238,245,1)] mt-1 pl-4 pr-3 py-3 rounded-[9px] border-[rgba(35,53,62,1)] border-solid bg-transparent focus:outline-none focus:ring-2 focus:ring-[rgba(40,191,255,0.3)] max-md:max-w-full"
        >
          <div className="self-stretch flex-1 shrink basis-[0%] my-auto text-left max-md:max-w-full">
            {selectedOption?.label || 'Select option'}
          </div>
          <svg
            className={`aspect-[1] object-contain w-5 self-stretch shrink-0 my-auto transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        
        {isOpen && (
          <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-[#080808] border border-[rgba(35,53,62,1)] rounded-[9px] shadow-lg max-h-60 overflow-y-auto overflow-x-hidden">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-3 text-sm text-[rgba(228,238,245,1)] hover:bg-[rgba(35,53,62,0.5)] focus:bg-[rgba(35,53,62,0.5)] focus:outline-none whitespace-normal"
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

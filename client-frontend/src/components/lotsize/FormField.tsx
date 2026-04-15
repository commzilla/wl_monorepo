import React from 'react';

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'number';
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  className = ''
}) => {
  return (
    <div className={`flex min-w-60 flex-col items-stretch flex-1 shrink basis-[0%] max-md:max-w-full ${className}`}>
      <label className="gap-2.5 text-xs text-[rgba(133,168,195,1)] tracking-[-0.36px] pl-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="self-stretch flex-1 shrink basis-[0%] border min-h-12 w-full gap-2 text-sm text-[rgba(228,238,245,1)] mt-1 pl-4 pr-3 py-3 rounded-[9px] border-[rgba(35,53,62,1)] border-solid bg-transparent focus:outline-none focus:ring-2 focus:ring-[rgba(40,191,255,0.3)] max-md:max-w-full"
      />
    </div>
  );
};

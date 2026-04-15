import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { formatCurrency } from '@/utils/currencyFormatter';

interface Enrollment {
  enrollment_id: string;
  account_id: string;
  challenge_name: string;
  account_size: number;
  currency?: string;
}

interface AccountSelectorProps {
  selectedEnrollment: Enrollment | null;
  availableEnrollments: Enrollment[];
  onEnrollmentChange: (enrollment: Enrollment) => void;
  className?: string;
}

export const AccountSelector: React.FC<AccountSelectorProps> = ({
  selectedEnrollment,
  availableEnrollments,
  onEnrollmentChange,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleEnrollmentSelect = (enrollment: Enrollment) => {
    onEnrollmentChange(enrollment);
    setIsOpen(false);
  };

  if (!selectedEnrollment || !availableEnrollments.length) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-[rgba(40,191,255,0.05)] border border-[rgba(40,191,255,0.05)] rounded-lg px-4 py-3 text-[#E4EEF5] hover:bg-[rgba(40,191,255,0.1)] transition-colors"
      >
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium">
            {selectedEnrollment.challenge_name}
          </span>
          <span className="text-xs text-[#85A8C3]">
            Account #{selectedEnrollment.account_id} • {formatCurrency(selectedEnrollment.account_size, selectedEnrollment.currency, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-[#85A8C3] transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full min-w-[300px] bg-[#0A1114] border border-[rgba(40,191,255,0.1)] rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {availableEnrollments.map((enrollment) => (
            <button
              key={enrollment.enrollment_id}
              onClick={() => handleEnrollmentSelect(enrollment)}
              className={`w-full flex flex-col items-start px-4 py-3 text-left hover:bg-[rgba(40,191,255,0.05)] transition-colors ${
                selectedEnrollment.enrollment_id === enrollment.enrollment_id ? 'bg-[rgba(40,191,255,0.1)]' : ''
              }`}
            >
              <span className="text-sm font-medium text-[#E4EEF5]">
                {enrollment.challenge_name}
              </span>
              <span className="text-xs text-[#85A8C3]">
                Account #{enrollment.account_id} • {formatCurrency(enrollment.account_size, enrollment.currency, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
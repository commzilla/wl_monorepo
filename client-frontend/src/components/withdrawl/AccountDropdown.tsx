import React, { useState } from 'react';
import { Wallet } from 'lucide-react';
import { formatCurrency } from '@/utils/currencyFormatter';

interface Account {
  enrollment_id: string;
  account_id: string;
  current_balance: number;
  profit: number;
  profit_share_percent: number;
  trader_share: number;
  next_withdrawal_date: string;
  payment_cycle: string;
  first_payout_delay_days: number;
  subsequent_cycle_days: number;
  min_net_amount: number;
  status: 'eligible' | 'not_eligible';
  message: string;
  currency?: string;
}

interface AccountDropdownProps {
  accounts: Account[];
  selectedAccount: Account | null;
  onAccountSelect: (account: Account) => void;
}

export function AccountDropdown({ accounts, selectedAccount, onAccountSelect }: AccountDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Add click outside handler
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);

  console.log('AccountDropdown rendered:', { accounts: accounts?.length || 0, selectedAccount, isOpen });

  if (!accounts || accounts.length === 0) {
    console.log('No accounts available, returning null');
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          console.log('Button clicked, toggling dropdown');
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-3 px-4 py-3 bg-[rgba(40,191,255,0.05)] border border-[rgba(40,191,255,0.2)] rounded-lg text-[#E4EEF5] text-sm font-medium hover:bg-[rgba(40,191,255,0.1)] transition-colors"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[rgba(40,191,255,0.1)]">
          <Wallet className="w-4 h-4 text-[#28BFFF]" />
        </div>
        <div className="flex flex-col items-start">
          <span className="text-xs text-[#9CA3AF] uppercase tracking-wide">Account</span>
          <span className="font-medium">
            {selectedAccount ? selectedAccount.account_id : accounts[0]?.account_id}
          </span>
        </div>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-2 w-72 bg-[#1A1A1A] border border-[rgba(40,191,255,0.2)] rounded-lg shadow-xl z-50 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="py-2">
            {accounts.map((account) => (
              <button
                key={account.enrollment_id}
                onClick={() => {
                  onAccountSelect(account);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-[rgba(40,191,255,0.05)] transition-colors flex items-center justify-between"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[#E4EEF5]">
                    Account {account.account_id}
                  </span>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-[#9CA3AF] capitalize">
                      {account.payment_cycle}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      account.status === 'eligible' 
                        ? 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]'
                        : 'bg-[rgba(255,193,7,0.1)] text-[#FFC107]'
                    }`}>
                      {account.status === 'eligible' ? 'Eligible' : 'Not Eligible'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-[#E4EEF5]">
                    {formatCurrency(account.trader_share || 0, account.currency)}
                  </div>
                  <div className="text-xs text-[#9CA3AF]">
                    Available
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
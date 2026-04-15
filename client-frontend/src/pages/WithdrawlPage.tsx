import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { MetricsCard } from '../components/withdrawl/MetricsCard';
import { AccountDropdown } from '../components/withdrawl/AccountDropdown';
import { PayoutHistoryTable } from '../components/withdrawl/PayoutHistoryTable';
import PayoutRequestPopUp from '../components/withdrawl/PayoutRequestPopUp';
import { fetchWithdrawalData, fetchPayoutHistoryByAccount, fetchGridChallenges } from '@/utils/api';
import { formatCurrency } from '@/utils/currencyFormatter';

export default function WithdrawlPage() {
  const { t } = useTranslation();
  const [showPayoutPopup, setShowPayoutPopup] = React.useState(false);
  const [selectedAccount, setSelectedAccount] = React.useState<any>(null);

  // Prevent body scroll when popup is open
  React.useEffect(() => {
    if (showPayoutPopup) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showPayoutPopup]);

  const { data: withdrawalData, isLoading, error } = useQuery({
    queryKey: ['withdrawal-data'],
    queryFn: () => fetchWithdrawalData(),
  });

  // Fetch all challenges to show in account selector even if not funded
  const { data: gridChallenges } = useQuery({
    queryKey: ['grid-challenges'],
    queryFn: () => fetchGridChallenges(),
  });

  // Merge withdrawal accounts with grid challenges to show all accounts
  const allAccounts = React.useMemo(() => {
    const withdrawalAccounts = withdrawalData?.accounts || [];
    const challenges = gridChallenges || [];
    
    // Create a map of withdrawal accounts by account_id for quick lookup
    const withdrawalAccountMap = new Map(
      withdrawalAccounts.map(acc => [acc.account_id, acc])
    );
    
    // Start with withdrawal accounts (they have full payout info)
    const mergedAccounts = [...withdrawalAccounts];
    
    // Add challenge accounts that are not in withdrawal accounts
    challenges.forEach(challenge => {
      const accountId = challenge.account_number.replace('#', '');
      if (!withdrawalAccountMap.has(accountId)) {
        // Parse account size from string like "$50,000.00" to number
        const parseAccountSize = (sizeStr: string) => {
          const cleaned = sizeStr.replace(/[$,]/g, '');
          return parseFloat(cleaned) || 0;
        };
        
        // Parse balance from string like "$50,000.00" to number
        const parseBalance = (balanceStr: string) => {
          const cleaned = balanceStr.replace(/[$,]/g, '');
          return parseFloat(cleaned) || 0;
        };
        
        // Create a withdrawal-like account object from challenge data
        mergedAccounts.push({
          enrollment_id: challenge.id,
          account_id: accountId,
          current_balance: parseBalance(challenge.balance),
          profit: 0,
          profit_share_percent: 0,
          trader_share: 0,
          next_withdrawal_date: '',
          payment_cycle: challenge.status_label.toLowerCase(),
          first_payout_delay_days: 0,
          subsequent_cycle_days: 0,
          min_net_amount: 0,
          status: 'not_eligible' as const,
          message: challenge.status_label === 'Payout Limit Reached'
            ? 'This account has reached its maximum number of payouts and is now closed.'
            : `Account is ${challenge.status_label}. Only funded accounts are eligible for withdrawal.`,
          currency: challenge.currency,
        });
      }
    });
    
    return mergedAccounts;
  }, [withdrawalData, gridChallenges]);

  // Fetch payout history for selected account
  const { data: payoutHistoryData, isLoading: isLoadingPayoutHistory } = useQuery({
    queryKey: ['payout-history', selectedAccount?.account_id],
    queryFn: () => selectedAccount ? fetchPayoutHistoryByAccount(selectedAccount.account_id) : Promise.resolve({ results: [], count: 0, next: null, previous: null }),
    enabled: !!selectedAccount?.account_id,
  });

  // Set default selected account when data loads
  React.useEffect(() => {
    if (allAccounts.length && !selectedAccount) {
      setSelectedAccount(allAccounts[0]);
    }
  }, [allAccounts, selectedAccount]);

  // Format data for display based on selected account
  const getMetricsData = () => {
    if (!selectedAccount) {
      return {
        withdrawalProfit: '--',
        profitShare: '--',
        clientPayout: '--',
        nextWithdrawal: '--'
      };
    }

    // Helper function to safely format percentage
    const formatPercentage = (value: any) => {
      const num = Number(value);
      if (isNaN(num)) return '--';
      return `${num.toFixed(2)}%`;
    };

    // Helper function to safely format date
    const formatDate = (dateString: string) => {
      if (!dateString) return '--';
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '--';
        return date.toLocaleDateString('en-US', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        }).toLowerCase();
      } catch {
        return '--';
      }
    };

    return {
      withdrawalProfit: formatCurrency(selectedAccount.profit, selectedAccount.currency),
      profitShare: formatPercentage(selectedAccount.profit_share_percent),
      clientPayout: formatCurrency(selectedAccount.trader_share, selectedAccount.currency),
      nextWithdrawal: formatDate(selectedAccount.next_withdrawal_date)
    };
  };

  const metricsData = getMetricsData();

  return (
    <>
      <main className="items-stretch border-t-[color:var(--border-cards-border,rgba(40,191,255,0.05))] border-l-[color:var(--border-cards-border,rgba(40,191,255,0.05))] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] flex min-w-0 flex-col grow bg-[#080808] w-full pt-10 pb-8 rounded-[16px_0px_0px_0px] border-t border-solid md:border-l min-h-full">
        <header className="flex w-full items-center justify-between flex-wrap max-md:max-w-full px-4 md:px-8">
          <div className="flex items-center gap-2 text-[24px] md:text-[32px] text-[#E4EEF5] font-medium tracking-[-0.72px] md:tracking-[-0.96px] flex-1 min-w-0">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[rgba(40,191,255,0.05)] shadow-[inset_0_-8px_32px_rgba(78,193,255,0.06)]">
              <img
                src="https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/166de964dbdf46bb7affe05e0442260709a3a7ed?placeholderIfAbsent=true"
                className="w-6 h-6 text-[#28BFFF]"
                alt="Withdrawal"
              />
            </div>
            <h1 className="text-[#E4EEF5] self-stretch my-auto">
              {t('withdrawal.title')}
            </h1>
          </div>
        </header>

        <div className="flex items-center justify-between flex-wrap px-4 md:px-8 mt-6">
          {/* Account Dropdown */}
          <AccountDropdown 
            accounts={allAccounts}
            selectedAccount={selectedAccount}
            onAccountSelect={setSelectedAccount}
          />

          {/* Request payout button */}
          {selectedAccount?.status === 'eligible' && (
            <button
              className="flex items-center gap-2 px-4 py-3 bg-[rgba(18,107,167,0.2)] border border-[#126BA7] rounded-lg text-[#E4EEF5] text-sm font-medium hover:bg-[rgba(18,107,167,0.3)] transition-colors"
              onClick={() => setShowPayoutPopup(true)}
            >
              <img
                src="https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/166de964dbdf46bb7affe05e0442260709a3a7ed?placeholderIfAbsent=true"
                className="w-5 h-5"
                alt="Request"
              />
              <span>{t('withdrawal.requestPayout')}</span>
            </button>
          )}
        </div>

        {/* Notification bar for not eligible status */}
        {selectedAccount?.status === 'not_eligible' && (
          <div className="mt-6 px-4 md:px-8">
            <div className="p-4 rounded-lg bg-[rgba(255,193,7,0.1)] border border-[rgba(255,193,7,0.3)] flex items-start md:items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[rgba(255,193,7,0.2)] flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#FFC107]">
                <path d="M12 8V12M12 16H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-[#FFC107] text-sm font-medium leading-relaxed">
              {selectedAccount.message}
            </p>
            </div>
          </div>
        )}
        
        <section className="mt-8 md:mt-12 max-md:max-w-full max-md:mt-10 px-4 md:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <MetricsCard
              icon="https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/ca84411b916d68c859bc8c9fc959bf8cb0f732b4?placeholderIfAbsent=true"
              label="Withdrawal profit"
              value={metricsData.withdrawalProfit}
            />
            <MetricsCard
              icon="https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/560c7be8d5d240ab12d40e24b5583c6b7d48160e?placeholderIfAbsent=true"
              label="Profit Share"
              value={metricsData.profitShare}
            />
            <MetricsCard
              icon="https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/37866d29ce4dbb11e24a58f86b32bcc02510808f?placeholderIfAbsent=true"
              label="Client Payout"
              value={metricsData.clientPayout}
            />
            <MetricsCard
              icon="https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/23fd712d2ce70453f188d2f6641437dffb6b7c70?placeholderIfAbsent=true"
              label="Next Withdrawal"
              value={metricsData.nextWithdrawal}
            />
          </div>
        </section>

        <section className="mt-8 px-4 md:px-8 pb-8">
          <h2 className="text-xl font-medium text-[#E4EEF5] mb-6">
            Payout History {selectedAccount && `- Account ${selectedAccount.account_id}`}
          </h2>
          <PayoutHistoryTable 
            payoutData={payoutHistoryData?.results || []} 
            isLoading={isLoadingPayoutHistory} 
          />
        </section>
      </main>
        
      {showPayoutPopup && selectedAccount && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-sm">
          <div className="w-full max-w-[500px] my-8">
            <PayoutRequestPopUp 
              onClose={() => setShowPayoutPopup(false)} 
              availableAmount={selectedAccount.trader_share || 0}
            />
          </div>
        </div>
      )}
    </>
  );
}
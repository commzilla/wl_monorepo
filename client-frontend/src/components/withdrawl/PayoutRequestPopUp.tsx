
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchEligibleAccounts, requestPayout, fetchPaymentMethods, type EligibleAccount, type ClientPaymentMethod } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import PayoutSuccessModal from './PayoutSuccessModal';
import { formatCurrency } from '@/utils/currencyFormatter';

interface PayoutRequestPopUpProps {
  onClose: () => void;
  availableAmount?: number;
}

interface PayoutDetails {
  id: string;
  profit: string;
  profit_share: string;
  net_profit: string;
  method: string;
  status: string;
  requested_at: string;
  currency?: string;
}

const PayoutRequestPopUp: React.FC<PayoutRequestPopUpProps> = ({ onClose, availableAmount = 0 }) => {
  const { t } = useTranslation();
  const [selectedAccount, setSelectedAccount] = useState<EligibleAccount | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<ClientPaymentMethod | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [payoutDetails, setPayoutDetails] = useState<PayoutDetails | null>(null);
  const { toast } = useToast();

  const { data: eligibleAccounts, isLoading, error } = useQuery({
    queryKey: ['eligible-accounts'],
    queryFn: fetchEligibleAccounts,
  });

  const { data: paymentMethods, isLoading: isLoadingPaymentMethods, error: paymentMethodsError } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: fetchPaymentMethods,
  });

  const payoutMutation = useMutation({
    mutationFn: requestPayout,
    onSuccess: (data) => {
      // Construct the complete payout details from the API response and selected data
      const payoutDetailsObj: PayoutDetails = {
        id: data.payout_id.toString(), // Using payout_id from API response
        profit: data.profit || selectedAccount?.net_profit?.toString() || '0',
        profit_share: selectedAccount?.profit_share?.toString() || '80', // Default to 80% if not available
        net_profit: data.amount || selectedAccount?.net_profit?.toString() || '0',
        method: selectedPaymentMethod?.payment_type || 'rise',
        status: 'pending', // New payout requests are always pending
        requested_at: new Date().toISOString(), // Current timestamp
        currency: selectedAccount?.currency,
      };
      
      setPayoutDetails(payoutDetailsObj);
      setShowSuccessModal(true);
    },
    onError: (error: any) => {
      // Check if the error is due to open trades
      if (error.message && error.message.includes("Please close all open trades")) {
        toast({
          title: "Open Trades Detected",
          description: "Please close all open trades before requesting a payout. All positions must be closed to proceed.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Payout Request Failed",
          description: error.message || "An error occurred while processing your payout request.",
          variant: "destructive",
        });
      }
    },
  });

  useEffect(() => {
    if (eligibleAccounts && eligibleAccounts.length > 0) {
      setSelectedAccount(eligibleAccounts[0]);
    }
  }, [eligibleAccounts]);

  useEffect(() => {
    if (paymentMethods && paymentMethods.length > 0) {
      // Set default payment method (first one or the one marked as default)
      const defaultMethod = paymentMethods.find(method => method.is_default) || paymentMethods[0];
      setSelectedPaymentMethod(defaultMethod);
    }
  }, [paymentMethods]);


  const handlePayoutRequest = () => {
    if (!selectedAccount || !selectedPaymentMethod) {
      toast({
        title: "Missing Information",
        description: "Please select an eligible account and payment method for payout",
        variant: "destructive",
      });
      return;
    }

    payoutMutation.mutate({
      enrollment_id: selectedAccount.enrollment_id,
      payment_method_id: selectedPaymentMethod.id,
    });
  };

  const getPaymentMethodLabel = (method: ClientPaymentMethod) => {
    if (method.label) return method.label;
    
    switch (method.payment_type) {
      case 'rise':
        return `Rise (${method.rise_email})`;
      case 'crypto':
        return `Crypto (${method.crypto_type?.toUpperCase() || 'Crypto'})`;
      default:
        return 'Payment Method';
    }
  };

  if (isLoading || isLoadingPaymentMethods) {
    return (
      <div className="flex flex-col justify-center px-10 py-8 rounded-2xl border border-solid bg-zinc-900 border-[color:var(--border-cards-border,rgba(40,191,255,0.05))] w-full animate-scale-in">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#28BFFF]"></div>
        </div>
      </div>
    );
  }

  if (error || paymentMethodsError || !eligibleAccounts || eligibleAccounts.length === 0 || !paymentMethods || paymentMethods.length === 0) {
    return (
      <div className="flex flex-col justify-center px-10 py-8 rounded-2xl border border-solid bg-zinc-900 border-[color:var(--border-cards-border,rgba(40,191,255,0.05))] w-full animate-scale-in">
        <h1 className="self-stretch w-full text-2xl font-medium tracking-tighter text-slate-200">
          {!eligibleAccounts || eligibleAccounts.length === 0 ? 'No Eligible Accounts' : 'No Payment Methods'}
        </h1>
        <p className="text-lg tracking-tight text-slate-400 mt-4">
          {error ? 'Error loading accounts. Please try again.' : 
           paymentMethodsError ? 'Error loading payment methods. Please try again.' :
           !eligibleAccounts || eligibleAccounts.length === 0 ? 'You currently have no accounts eligible for payout.' :
           'No payment methods found. Please add a payment method in settings first.'}
        </p>
        <div className="flex justify-end mt-6">
          <button
            className="gap-2 self-stretch px-4 py-3.5 my-auto whitespace-nowrap rounded-lg border border-solid shadow-sm bg-sky-400 bg-opacity-10 border-[color:var(--border-tertiary-button-gradient,#28BFFF)] min-h-11 text-slate-400"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center px-10 py-8 pb-10 rounded-2xl border border-solid bg-zinc-900 border-[color:var(--border-cards-border,rgba(40,191,255,0.05))] w-full animate-scale-in">
      {/* Header */}
      <h1 className="self-stretch w-full text-2xl font-medium tracking-tighter text-slate-200">
        {t('withdrawalComponents.payoutRequest')}
      </h1>

      {/* Main content */}
      <div className="flex flex-col justify-center mt-7 w-full">
        <p className="text-lg tracking-tight text-slate-400">
          {t('withdrawalComponents.selectAccount')}
        </p>

        {/* Account selector */}
        {eligibleAccounts.length > 1 && (
          <div className="mt-4">
            <label className="block text-sm text-slate-400 mb-2">Select Account:</label>
            <select
              value={selectedAccount?.enrollment_id || ''}
              onChange={(e) => {
                const account = eligibleAccounts.find(acc => acc.enrollment_id === e.target.value);
                setSelectedAccount(account || null);
              }}
              className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-[color:var(--border-cards-border,rgba(40,191,255,0.05))] text-slate-200"
            >
              {eligibleAccounts.map((account) => (
                <option key={account.enrollment_id} value={account.enrollment_id}>
                  Account {account.account_id} - {formatCurrency(account.net_profit, account.currency)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Payment Method Selection */}
        <div className="mt-6">
          <label className="block text-sm text-slate-400 mb-2">{t('withdrawalComponents.paymentMethod')}</label>
          {paymentMethods && paymentMethods.length > 1 ? (
            <select
              value={selectedPaymentMethod?.id || ''}
              onChange={(e) => {
                const method = paymentMethods.find(m => m.id === e.target.value);
                setSelectedPaymentMethod(method || null);
              }}
              className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-[color:var(--border-cards-border,rgba(40,191,255,0.05))] text-slate-200"
            >
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {getPaymentMethodLabel(method)}
                </option>
              ))}
            </select>
          ) : (
            <div className="px-4 py-2 rounded-lg bg-zinc-800 border border-[color:var(--border-cards-border,rgba(40,191,255,0.05))] text-slate-200">
              {selectedPaymentMethod && getPaymentMethodLabel(selectedPaymentMethod)}
            </div>
          )}
        </div>

        {/* Account details */}
        {selectedAccount && (
          <div className="mt-6 space-y-4">
            <div className="flex overflow-hidden gap-4 items-center px-6 py-5 w-full rounded-lg border border-solid border-[color:var(--border-Cards-border-gradient,#28BFFF)]">
              <div className="self-stretch my-auto w-36 text-sm tracking-tight text-ellipsis text-slate-400">
                Account ID:
              </div>
              <div className="self-stretch my-auto w-36 text-lg font-medium tracking-tighter text-slate-200">
                {selectedAccount.account_id}
              </div>
            </div>
            
            <div className="flex overflow-hidden gap-4 items-start px-6 py-5 w-full rounded-lg border border-solid border-[color:var(--border-Cards-border-gradient,#28BFFF)] bg-gradient-to-br from-[rgba(40,191,255,0.02)] to-transparent">
              <div className="self-stretch mt-1 w-36 text-sm tracking-tight text-ellipsis text-slate-400">
                Net Profit:
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <div className="text-2xl font-medium tracking-tighter text-teal-500">
                  {formatCurrency(selectedAccount.net_profit, selectedAccount.currency)}
                </div>
                {selectedAccount.net_profit_usd && selectedAccount.exchange_rate_to_usd && (
                  <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-[rgba(40,191,255,0.05)] border border-[rgba(40,191,255,0.1)]">
                    <div className="flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#28BFFF]">
                        <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M3 19H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="text-sm font-medium text-[#28BFFF]">
                        {formatCurrency(selectedAccount.net_profit_usd, 'USD')}
                      </span>
                    </div>
                    <div className="h-4 w-px bg-[rgba(40,191,255,0.2)]" />
                    <span className="text-xs text-slate-400">
                      Rate: {selectedAccount.exchange_rate_to_usd.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col px-4 py-3 rounded-lg bg-zinc-800">
                <span className="text-xs text-slate-400">Balance</span>
                <span className="text-sm font-medium text-slate-200">{formatCurrency(selectedAccount.balance, selectedAccount.currency)}</span>
              </div>
              <div className="flex flex-col px-4 py-3 rounded-lg bg-zinc-800">
                <span className="text-xs text-slate-400">Profit Share</span>
                <span className="text-sm font-medium text-slate-200">{selectedAccount.profit_share}%</span>
              </div>
              <div className="flex flex-col px-4 py-3 rounded-lg bg-zinc-800 gap-2">
                <span className="text-xs text-slate-400">Total Profit</span>
                <span className="text-sm font-medium text-slate-200">
                  {formatCurrency(selectedAccount.profit, selectedAccount.currency)}
                </span>
                {selectedAccount.profit_usd && (
                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-[rgba(40,191,255,0.1)]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#28BFFF] opacity-60">
                      <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-xs text-[#28BFFF]">
                      {formatCurrency(selectedAccount.profit_usd, 'USD')}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col px-4 py-3 rounded-lg bg-zinc-800">
                <span className="text-xs text-slate-400">WeFund Share</span>
                <span className="text-sm font-medium text-slate-200">{formatCurrency(selectedAccount.management_share, selectedAccount.currency)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Warning message */}
      <div className="flex gap-2.5 items-start mt-7 w-full text-sm tracking-tight text-rose-500">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-rose-500"
        >
          <path
            d="M12 8V12M12 16H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="flex-1 shrink text-rose-500 basis-0">
          Requesting a payout will close all open positions and orders.
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4 items-center justify-end mt-7 text-sm font-semibold">
        <button
          className="gap-2 self-stretch px-4 py-3.5 my-auto whitespace-nowrap rounded-lg border border-solid shadow-sm bg-sky-400 bg-opacity-10 border-[color:var(--border-tertiary-button-gradient,#28BFFF)] min-h-11 text-slate-400"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="gap-2 self-stretch px-5 py-3.5 my-auto rounded-lg border border-solid shadow-sm border-[color:var(--border-primary-color,#3AB3FF)] min-h-11 text-white bg-[#3AB3FF] hover:bg-[#2196f3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handlePayoutRequest}
          disabled={!selectedAccount || !selectedPaymentMethod || payoutMutation.isPending}
        >
          {payoutMutation.isPending ? 'Processing...' : 'Payout now'}
        </button>
      </div>

      {/* Success Modal */}
      {showSuccessModal && payoutDetails && (
        <PayoutSuccessModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            onClose();
          }}
          payoutDetails={payoutDetails}
        />
      )}
    </div>
  );
};

export default PayoutRequestPopUp;

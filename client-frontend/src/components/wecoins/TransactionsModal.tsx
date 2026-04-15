import React from 'react';
import { X, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { WeCoinWallet } from '@/utils/api';
import { format } from 'date-fns';

interface TransactionsModalProps {
  wallet: WeCoinWallet;
  onClose: () => void;
}

export const TransactionsModal: React.FC<TransactionsModalProps> = ({ wallet, onClose }) => {
  const getTransactionIcon = (type: string) => {
    return type === 'earn' ? (
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[rgba(40,191,255,0.1)]">
        <TrendingUp className="w-5 h-5 text-[#28BFFF]" />
      </div>
    ) : (
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[rgba(255,100,100,0.1)]">
        <TrendingDown className="w-5 h-5 text-[#FF6464]" />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-[#0A1114] rounded-2xl border border-[rgba(40,191,255,0.2)] shadow-[0_0_50px_rgba(58,179,255,0.3)] animate-scale-in">
        {/* Decorative gradient background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#3AB3FF]/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
        
        {/* Header */}
        <header className="relative flex items-center justify-between p-6 border-b border-[rgba(40,191,255,0.1)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[rgba(40,191,255,0.1)]">
              <Wallet className="w-5 h-5 text-[#28BFFF]" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-[#E4EEF5]">Transaction History</h2>
              <p className="text-sm text-[#85A8C3] mt-1">
                Current Balance: <span className="font-semibold text-[#28BFFF]">{parseFloat(wallet.balance).toFixed(0)} WeCoins</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-[#85A8C3]" />
          </button>
        </header>

        {/* Content */}
        <div className="modal-scroll-content relative p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {wallet.transactions && wallet.transactions.length > 0 ? (
            <div className="space-y-3">
              {wallet.transactions.map((transaction) => (
                <article
                  key={transaction.id}
                  className="bg-[#0B1215] rounded-xl p-5 border border-[rgba(40,191,255,0.1)] hover:border-[rgba(40,191,255,0.2)] transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    {getTransactionIcon(transaction.type)}

                    {/* Transaction Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-[#E4EEF5] font-medium mb-1">
                            {transaction.description}
                          </p>
                          <p className="text-sm text-[#85A8C3]">
                            {format(new Date(transaction.created_at), 'MMM dd, yyyy • hh:mm a')}
                          </p>
                        </div>

                        {/* Amount */}
                        <div className={`text-lg font-semibold ${
                          transaction.type === 'earn' ? 'text-[#28BFFF]' : 'text-[#FF6464]'
                        }`}>
                          {transaction.type === 'earn' ? '+' : '-'}{parseFloat(transaction.amount).toFixed(0)}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Wallet className="w-16 h-16 text-[#28BFFF] opacity-30 mb-4" />
              <p className="text-lg text-[#85A8C3]">No transactions yet.</p>
              <p className="text-sm text-[#85A8C3] mt-2 opacity-70">
                Complete tasks to earn WeCoins!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

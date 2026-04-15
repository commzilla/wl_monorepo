import React from 'react';
import { CheckCircle, X, Calendar, DollarSign, Percent, CreditCard, Clock } from 'lucide-react';
import { formatCurrency as formatCurrencyUtil } from '@/utils/currencyFormatter';

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

interface PayoutSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  payoutDetails: PayoutDetails;
}

const PayoutSuccessModal: React.FC<PayoutSuccessModalProps> = ({ 
  isOpen, 
  onClose, 
  payoutDetails
}) => {
  if (!isOpen) return null;

  const formatCurrency = (amount: string) => {
    return formatCurrencyUtil(parseFloat(amount), payoutDetails.currency);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getMethodLabel = (method: string) => {
    const methodMap: { [key: string]: string } = {
      'paypal': 'PayPal',
      'bank': 'Bank Transfer',
      'crypto': 'Cryptocurrency',
      'rise': 'Rise Payout'
    };
    return methodMap[method] || method;
  };

  const getStatusColor = (status: string) => {
    const statusColors: { [key: string]: string } = {
      'pending': 'text-yellow-500',
      'approved': 'text-green-500',
      'rejected': 'text-red-500',
      'paid': 'text-green-500',
      'cancelled': 'text-gray-500'
    };
    return statusColors[status] || 'text-yellow-500';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative flex flex-col items-center px-8 py-8 rounded-2xl border border-solid bg-zinc-900 border-[color:var(--border-cards-border,rgba(40,191,255,0.05))] max-w-[600px] mx-4 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none text-slate-400 hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Success Icon with Animation */}
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-6">
          <CheckCircle className="w-10 h-10 text-green-500 animate-pulse" />
        </div>

        {/* Success Message */}
        <h2 className="text-3xl font-bold tracking-tight text-slate-200 text-center mb-4">
          Payout Request Submitted!
        </h2>

        <p className="text-lg text-slate-400 text-center mb-6 leading-relaxed">
          Your payout request has been successfully submitted and is being processed by our team.
        </p>

        {/* Payout Details Grid */}
        <div className="w-full space-y-4 mb-8">
          {/* Transaction ID */}
          <div className="flex justify-between items-center p-4 rounded-lg bg-zinc-800/50 border border-[color:var(--border-cards-border,rgba(40,191,255,0.05))]">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-400">Transaction ID</span>
            </div>
            <span className="text-lg font-mono text-slate-200">{payoutDetails.id.split('-')[0]}</span>
          </div>

          {/* Net Payout Amount (Most Important) */}
          <div className="flex justify-between items-center p-4 rounded-lg bg-green-500/10 border border-green-500/30">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-500 font-semibold">Net Payout Amount</span>
            </div>
            <span className="text-2xl font-bold text-green-500">{formatCurrency(payoutDetails.net_profit)}</span>
          </div>

          {/* Profit Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex justify-between items-center p-4 rounded-lg bg-zinc-800/50 border border-[color:var(--border-cards-border,rgba(40,191,255,0.05))]">
              <span className="text-sm text-slate-400">Total Profit</span>
              <span className="text-lg font-semibold text-slate-200">{formatCurrency(payoutDetails.profit)}</span>
            </div>
            
            <div className="flex justify-between items-center p-4 rounded-lg bg-zinc-800/50 border border-[color:var(--border-cards-border,rgba(40,191,255,0.05))]">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-400">Your Share</span>
              </div>
              <span className="text-lg font-semibold text-blue-400">{parseFloat(payoutDetails.profit_share).toFixed(1)}%</span>
            </div>
          </div>

          {/* Method and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex justify-between items-center p-4 rounded-lg bg-zinc-800/50 border border-[color:var(--border-cards-border,rgba(40,191,255,0.05))]">
              <span className="text-sm text-slate-400">Payment Method</span>
              <span className="text-lg font-semibold text-slate-200">{getMethodLabel(payoutDetails.method)}</span>
            </div>
            
            <div className="flex justify-between items-center p-4 rounded-lg bg-zinc-800/50 border border-[color:var(--border-cards-border,rgba(40,191,255,0.05))]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-400">Status</span>
              </div>
              <span className={`text-lg font-semibold capitalize ${getStatusColor(payoutDetails.status)}`}>
                {payoutDetails.status}
              </span>
            </div>
          </div>

          {/* Request Date */}
          <div className="flex justify-between items-center p-4 rounded-lg bg-zinc-800/50 border border-[color:var(--border-cards-border,rgba(40,191,255,0.05))]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-400">Requested At</span>
            </div>
            <span className="text-lg font-medium text-slate-200">{formatDate(payoutDetails.requested_at)}</span>
          </div>
        </div>

        {/* Next Steps */}
        <div className="w-full p-6 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-6">
          <h3 className="text-lg font-semibold text-blue-400 mb-3">What's Next?</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0"></div>
              <span>Your request will be reviewed within 24-48 hours</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0"></div>
              <span>You'll receive an email confirmation shortly</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0"></div>
              <span>Funds will be transferred to your selected payment method</span>
            </li>
          </ul>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full px-8 py-4 rounded-lg bg-[#3AB3FF] hover:bg-[#2196f3] text-white font-semibold text-lg transition-colors duration-200 shadow-lg"
        >
          Continue to Dashboard
        </button>
      </div>
    </div>
  );
};

export default PayoutSuccessModal;
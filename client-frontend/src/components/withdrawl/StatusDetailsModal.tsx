import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TraderPayoutHistory } from '@/utils/api';
import { Info, AlertCircle, Clock, XCircle } from 'lucide-react';

interface StatusDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: TraderPayoutHistory;
}

export const StatusDetailsModal: React.FC<StatusDetailsModalProps> = ({
  isOpen,
  onClose,
  record
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusIcon = () => {
    switch (record.status) {
      case 'rejected':
        return <XCircle className="w-8 h-8 text-[#DC3545]" />;
      case 'extended_review':
        return <Clock className="w-8 h-8 text-[#FF9800]" />;
      case 'approved':
      case 'paid':
        return <AlertCircle className="w-8 h-8 text-[#28A745]" />;
      default:
        return <Info className="w-8 h-8 text-[#28BFFF]" />;
    }
  };

  const getStatusTitle = () => {
    switch (record.status) {
      case 'rejected':
        return 'Payout Rejected';
      case 'extended_review':
        return 'Extended Review';
      case 'approved':
      case 'paid':
        return record.exclude_details ? 'Payout Details' : 'Payout Approved';
      default:
        return 'Status Details';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-gradient-to-b from-[rgba(21,56,71,0.95)] to-[rgba(14,30,35,0.95)] border border-[rgba(40,191,255,0.2)] backdrop-blur-xl p-0 gap-0 block">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[rgba(40,191,255,0.2)]">
          <h2 className="text-xl font-semibold text-[#E4EEF5]">
            {getStatusTitle()}
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Status Icon */}
          <div className="flex flex-col items-center gap-3 pb-4 border-b border-[rgba(40,191,255,0.2)] mb-4">
            <div className="w-16 h-16 rounded-full bg-[rgba(40,191,255,0.1)] flex items-center justify-center">
              {getStatusIcon()}
            </div>
            <div className="text-center">
              <p className="text-xs text-[#85A8C3] mb-1">Transaction ID</p>
              <p className="text-sm font-medium text-[#E4EEF5]">{record.id.split('-')[0]}</p>
            </div>
          </div>

          {/* Status-specific content */}
          <div className="space-y-3 mb-4">
            {/* Rejected Status */}
            {record.status === 'rejected' && record.rejection_details && (
              <div className="rounded-xl bg-[rgba(220,53,69,0.1)] border border-[rgba(220,53,69,0.2)] p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-[#DC3545] mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-[#E4EEF5] mb-2">Rejection Reason</h4>
                    <p className="text-sm text-[#E4EEF5] leading-relaxed">
                      {record.rejection_details.rejection_reason}
                    </p>
                    {record.rejection_details.admin_note && (
                      <div className="mt-3 pt-3 border-t border-[rgba(220,53,69,0.2)]">
                        <p className="text-xs text-[#85A8C3] mb-1">Admin Note</p>
                        <p className="text-sm text-[#E4EEF5]">
                          {record.rejection_details.admin_note}
                        </p>
                      </div>
                    )}
                    {record.rejection_details.reviewed_at && (
                      <div className="mt-3 pt-3 border-t border-[rgba(220,53,69,0.2)]">
                        <p className="text-xs text-[#85A8C3] mb-1">Reviewed At</p>
                        <p className="text-sm text-[#E4EEF5]">
                          {formatDate(record.rejection_details.reviewed_at)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Extended Review Status */}
            {record.status === 'extended_review' && record.extended_review_details && (
              <div className="rounded-xl bg-[rgba(255,152,0,0.1)] border border-[rgba(255,152,0,0.2)] p-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[#FF9800] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-[#E4EEF5] mb-2">Review Period</h4>
                      <p className="text-sm text-[#E4EEF5]">
                        {record.extended_review_details.note}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg bg-[rgba(255,152,0,0.05)] border border-[rgba(255,152,0,0.1)] p-3">
                        <p className="text-xs text-[#85A8C3] mb-1">Review Days</p>
                        <p className="text-lg font-semibold text-[#FF9800]">
                          {record.extended_review_details.extended_review_days} days
                        </p>
                      </div>
                      
                      <div className="rounded-lg bg-[rgba(255,152,0,0.05)] border border-[rgba(255,152,0,0.1)] p-3">
                        <p className="text-xs text-[#85A8C3] mb-1">Review Until</p>
                        <p className="text-sm font-medium text-[#E4EEF5]">
                          {new Date(record.extended_review_details.extended_review_until).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Approved with Exclusions */}
            {(record.status === 'approved' || record.status === 'paid') && record.exclude_details && (
              <div className="rounded-xl bg-[rgba(40,167,69,0.1)] border border-[rgba(40,167,69,0.2)] p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[#28A745] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-[#E4EEF5] mb-2">Excluded Amount</h4>
                      <p className="text-sm text-[#E4EEF5] mb-3">
                        An amount was excluded from this payout.
                      </p>
                    </div>
                    
                    <div className="rounded-lg bg-[rgba(40,167,69,0.05)] border border-[rgba(40,167,69,0.1)] p-3">
                      <p className="text-xs text-[#85A8C3] mb-1">Excluded Amount</p>
                      <p className="text-2xl font-bold text-[#DC3545] mb-3">
                        {formatCurrency(record.exclude_details.exclude_amount)}
                      </p>
                      
                      <div className="pt-3 border-t border-[rgba(40,167,69,0.2)]">
                        <p className="text-xs text-[#85A8C3] mb-1">Reason</p>
                        <p className="text-sm text-[#E4EEF5]">
                          {record.exclude_details.exclude_reason}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-[#28BFFF] to-[#1E90D1] text-white font-medium hover:shadow-[0_0_20px_rgba(40,191,255,0.4)] transition-all duration-300"
          >
            Close
          </button>
          </div>
      </DialogContent>
    </Dialog>
  );
};

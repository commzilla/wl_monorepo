import React from 'react';
import { X, Package, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Redemption } from '@/utils/api';
import { format } from 'date-fns';

interface RedemptionHistoryModalProps {
  history: Redemption[];
  onClose: () => void;
}

export const RedemptionHistoryModal: React.FC<RedemptionHistoryModalProps> = ({ history, onClose }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      default:
        return <Clock className="w-5 h-5 text-[#85A8C3]" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium';
    switch (status) {
      case 'approved':
        return <span className={`${baseClasses} bg-green-500/10 text-green-400`}>Approved</span>;
      case 'rejected':
        return <span className={`${baseClasses} bg-red-500/10 text-red-400`}>Rejected</span>;
      case 'pending':
        return <span className={`${baseClasses} bg-yellow-500/10 text-yellow-400`}>Pending</span>;
      default:
        return <span className={`${baseClasses} bg-[rgba(40,191,255,0.1)] text-[#85A8C3]`}>{status}</span>;
    }
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
              <Package className="w-5 h-5 text-[#28BFFF]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#E4EEF5]">Redemption History</h2>
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
          {history.length > 0 ? (
            <div className="space-y-4">
              {history.map((redemption) => (
                <article
                  key={redemption.id}
                  className="bg-[#0B1215] rounded-xl p-5 border border-[rgba(40,191,255,0.1)] hover:border-[rgba(40,191,255,0.2)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left side: Item info */}
                    <div className="flex gap-4 flex-1">
                      {redemption.item_image && (
                        <div className="w-20 h-20 rounded-lg bg-[rgba(40,191,255,0.05)] flex items-center justify-center overflow-hidden flex-shrink-0">
                          <img
                            src={redemption.item_image}
                            alt={redemption.item_title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-lg font-semibold text-[#E4EEF5] truncate">
                            {redemption.item_title}
                          </h3>
                          {getStatusBadge(redemption.status)}
                        </div>
                        <p className="text-sm text-[#85A8C3] mb-2">
                          Category: {redemption.item_category}
                        </p>
                        <div className="flex items-center gap-4 text-sm flex-wrap">
                          <span className="text-[#28BFFF] font-semibold">
                            {parseFloat(redemption.item_required_wecoins).toFixed(0)} WeCoins
                          </span>
                          <span className="text-[#85A8C3]">
                            {format(new Date(redemption.created_at), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        {redemption.admin_comment && (
                          <div className="mt-2 p-2 bg-[rgba(40,191,255,0.05)] border border-[rgba(40,191,255,0.1)] rounded text-sm text-[#85A8C3]">
                            <strong className="text-[#E4EEF5]">Admin Note:</strong> {redemption.admin_comment}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right side: Status icon */}
                    <div className="flex-shrink-0">
                      {getStatusIcon(redemption.status)}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="w-16 h-16 text-[#28BFFF] opacity-30 mb-4" />
              <p className="text-lg text-[#85A8C3]">No redemption history yet.</p>
              <p className="text-sm text-[#85A8C3] mt-2 opacity-70">
                Redeem items with your WeCoins to see them here!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

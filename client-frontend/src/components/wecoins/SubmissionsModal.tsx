import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, FileText, Clock, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { fetchRewardSubmissions } from '@/utils/api';
import { format } from 'date-fns';

interface SubmissionsModalProps {
  onClose: () => void;
}

export const SubmissionsModal: React.FC<SubmissionsModalProps> = ({ onClose }) => {
  const { data: submissions, isLoading, error } = useQuery({
    queryKey: ['rewardSubmissions'],
    queryFn: fetchRewardSubmissions,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'rejected':
      case 'declined':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'pending':
      default:
        return <Clock className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      approved: {
        bg: 'bg-green-500/10',
        text: 'text-green-400',
        border: 'border-green-500/20',
        label: 'Approved'
      },
      pending: {
        bg: 'bg-yellow-500/10',
        text: 'text-yellow-400',
        border: 'border-yellow-500/20',
        label: 'Pending'
      },
      rejected: {
        bg: 'bg-red-500/10',
        text: 'text-red-400',
        border: 'border-red-500/20',
        label: 'Rejected'
      },
      declined: {
        bg: 'bg-red-500/10',
        text: 'text-red-400',
        border: 'border-red-500/20',
        label: 'Declined'
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
        {config.label}
      </span>
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
              <FileText className="w-5 h-5 text-[#28BFFF]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#E4EEF5]">My Submissions</h2>
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
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-[#85A8C3]">Loading submissions...</div>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-red-400">Failed to load submissions. Please try again later.</div>
            </div>
          ) : submissions && submissions.length > 0 ? (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <article
                  key={submission.id}
                  className="bg-[#0B1215] rounded-xl p-5 border border-[rgba(40,191,255,0.1)] hover:border-[rgba(40,191,255,0.2)] transition-colors"
                >
                  {/* Header with task title and status */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(submission.status)}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-[#E4EEF5] mb-1">
                          {submission.task_title}
                        </h3>
                        <p className="text-sm text-[#85A8C3]">
                          {format(new Date(submission.created_at), 'MMM d, yyyy • h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {submission.reward_amount !== "0.00" && (
                        <div className="px-3 py-1.5 rounded-full bg-[rgba(40,191,255,0.08)] border border-[rgba(40,191,255,0.2)]">
                          <span className="text-sm font-bold text-[#4EC1FF]">
                            +{submission.reward_amount} WeCoins
                          </span>
                        </div>
                      )}
                      {getStatusBadge(submission.status)}
                    </div>
                  </div>

                  {/* Notes */}
                  {submission.notes && (
                    <div className="mb-3">
                      <p className="text-sm text-[#85A8C3] leading-relaxed">
                        <span className="font-medium text-[#E4EEF5]">Your notes: </span>
                        {submission.notes}
                      </p>
                    </div>
                  )}

                  {/* Proof URL */}
                  {submission.proof_url && (
                    <div className="mb-3">
                      <a
                        href={submission.proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-[#28BFFF] hover:text-[#4EC1FF] transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Proof
                      </a>
                    </div>
                  )}

                  {/* Admin Comment */}
                  {submission.admin_comment && (
                    <div className="mt-3 pt-3 border-t border-[rgba(40,191,255,0.1)]">
                      <p className="text-sm text-[#85A8C3]">
                        <span className="font-medium text-[#E4EEF5]">Admin comment: </span>
                        {submission.admin_comment}
                      </p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="flex flex-col justify-center items-center py-12">
              <FileText className="w-16 h-16 text-[#28BFFF] opacity-30 mb-4" />
              <p className="text-lg text-[#85A8C3]">No submissions yet</p>
              <p className="text-sm text-[#85A8C3] mt-2 opacity-70">
                Complete tasks to see your submission history here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

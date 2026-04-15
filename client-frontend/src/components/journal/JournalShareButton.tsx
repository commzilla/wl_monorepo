import React, { useState } from 'react';
import { Share2, Copy, Check, Link2, Link2Off, Shield, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCreateShareLink, useShareLinks, useDeactivateShareLink, useJournalDashboard } from '@/hooks/useJournal';
import { useToast } from '@/hooks/use-toast';

interface JournalShareButtonProps {
  enrollmentId: string;
}

export const JournalShareButton: React.FC<JournalShareButtonProps> = ({ enrollmentId }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const createLink = useCreateShareLink();
  const { data: shareLinks } = useShareLinks();
  const deactivateLink = useDeactivateShareLink();
  const { data: dashboardData } = useJournalDashboard(enrollmentId);

  const existingLink = shareLinks?.find(
    (l) => l.enrollment_id === enrollmentId && l.is_active
  );

  const shareBaseUrl =
    import.meta.env.VITE_JOURNAL_SHARE_BASE_URL ||
    `${window.location.origin}/j`;

  const shareUrl = existingLink ? `${shareBaseUrl}/${existingLink.id}` : '';

  const handleCreateLink = async () => {
    try {
      await createLink.mutateAsync(enrollmentId);
    } catch {
      toast({ title: 'Error', description: 'Failed to create share link.', variant: 'destructive' });
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: 'Copied to clipboard!' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', description: 'Please copy the link manually.', variant: 'destructive' });
    }
  };

  const handleDeactivate = async () => {
    if (!existingLink) return;
    try {
      await deactivateLink.mutateAsync(existingLink.id);
      toast({ title: 'Share link deactivated' });
    } catch {
      toast({ title: 'Error', description: 'Failed to deactivate link.', variant: 'destructive' });
    }
  };

  const d = dashboardData;
  const pnlPositive = (d?.net_pnl ?? 0) >= 0;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 border-[#23353E]/50 bg-[#0A1114]/60 text-[#85A8C3] hover:text-[#E4EEF5] hover:border-[#3AB3FF]/40 hover:bg-[#3AB3FF]/10 transition-all duration-200"
      >
        <Share2 className="w-4 h-4" />
        Share
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80" onClick={() => setOpen(false)} />

          {/* Modal */}
          <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl bg-[#0D1419] border border-[#243545] shadow-2xl shadow-black/50 overflow-hidden">
            {/* Gradient accent */}
            <div className="h-1 bg-gradient-to-r from-[#3AB3FF] via-[#4EC1FF] to-[#3AB3FF]" />

            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-[#85A8C3] hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content */}
            <div className="px-6 py-5 space-y-5">
              {/* Header */}
              <div className="pr-6">
                <h2 className="text-lg font-semibold text-white">Share Your Journal</h2>
                <p className="text-sm text-[#85A8C3] mt-1">
                  Create a public link to showcase your trading performance
                </p>
              </div>

              {/* Stats preview */}
              {d && (
                <div className="rounded-xl bg-[#0A1114] border border-[#1E2D3D] p-4">
                  <p className="text-[11px] text-[#85A8C3] uppercase tracking-wider mb-3">Preview</p>
                  <div className="flex justify-between text-center">
                    <div className="flex-1">
                      <p className={`text-base font-bold ${pnlPositive ? 'text-[#1BBF99]' : 'text-[#ED5363]'}`}>
                        {pnlPositive ? '+' : ''}{d.net_pnl.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                      </p>
                      <p className="text-[11px] text-[#85A8C3]/60 mt-1">Net P&L</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-bold text-white">{d.win_rate.toFixed(1)}%</p>
                      <p className="text-[11px] text-[#85A8C3]/60 mt-1">Win Rate</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-bold text-white">{d.total_trades}</p>
                      <p className="text-[11px] text-[#85A8C3]/60 mt-1">Trades</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Share link section */}
              {existingLink ? (
                <div className="space-y-3">
                  {/* Copy URL bar */}
                  <div
                    onClick={handleCopy}
                    className="group flex items-center bg-[#0A1114] border border-[#1E2D3D] rounded-xl px-4 py-3 cursor-pointer hover:border-[#3AB3FF]/40 transition-colors"
                  >
                    <Link2 className="w-4 h-4 text-[#3AB3FF] shrink-0 mr-3" />
                    <span className="text-sm text-[#85A8C3] truncate flex-1 font-mono">{shareUrl}</span>
                    <span className={`ml-3 shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                      copied
                        ? 'bg-[#1BBF99]/15 text-[#1BBF99]'
                        : 'bg-[#3AB3FF]/10 text-[#3AB3FF] group-hover:bg-[#3AB3FF]/20'
                    }`}>
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between text-xs">
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[#3AB3FF] hover:text-[#4EC1FF] transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open preview
                    </a>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-[#85A8C3]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1BBF99] animate-pulse" />
                        Active
                      </span>
                      <button
                        onClick={handleDeactivate}
                        disabled={deactivateLink.isPending}
                        className="flex items-center gap-1.5 text-[#85A8C3]/60 hover:text-[#ED5363] transition-colors disabled:opacity-50"
                      >
                        <Link2Off className="w-3.5 h-3.5" />
                        Deactivate
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleCreateLink}
                  disabled={createLink.isPending}
                  className="w-full h-11 bg-gradient-to-r from-[#3AB3FF] to-[#4EC1FF] hover:from-[#4EC1FF] hover:to-[#3AB3FF] text-white font-medium rounded-xl shadow-lg shadow-[#3AB3FF]/20 transition-all duration-300"
                >
                  {createLink.isPending ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                  ) : (
                    <Link2 className="w-4 h-4 mr-2" />
                  )}
                  Generate Share Link
                </Button>
              )}

              {/* Privacy note */}
              <div className="flex items-start gap-3 text-[11px] text-[#85A8C3]/60 leading-relaxed">
                <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  Only your first name, account metrics, and trade data are shared. Your email, last name, and personal journal notes are never visible.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default JournalShareButton;

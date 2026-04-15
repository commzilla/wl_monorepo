import React from 'react';
import { Eye, Shield, AlertTriangle } from 'lucide-react';

interface SharedJournalBannerProps {
  mentorName: string;
  permissions: string[];
  isReadOnly?: boolean;
}

const SharedJournalBanner: React.FC<SharedJournalBannerProps> = ({
  mentorName,
  permissions,
  isReadOnly = true,
}) => {
  return (
    <div className="rounded-xl border border-[#7570FF]/20 bg-[#7570FF]/5 px-5 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7570FF]/15">
            <Eye className="h-4 w-4 text-[#7570FF]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-[#E4EEF5]">
                Shared with {mentorName}
              </p>
              {isReadOnly && (
                <span className="flex items-center gap-1 rounded-full bg-[#F59E0B]/10 px-2 py-0.5 text-[10px] font-medium text-[#F59E0B]">
                  <Shield className="h-2.5 w-2.5" />
                  Read-only
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-[10px] text-[#85A8C3]/50">Access:</span>
              {permissions.map((perm) => (
                <span
                  key={perm}
                  className="rounded bg-[#1E2D3D]/40 px-1.5 py-0.5 text-[9px] text-[#85A8C3]"
                >
                  {perm.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-[#85A8C3]/40">
          <AlertTriangle className="h-3 w-3" />
          Your mentor can view this journal
        </div>
      </div>
    </div>
  );
};

export default SharedJournalBanner;

import React, { useState } from 'react';
import { Users, Plus, Trash2, Shield, Loader2, Mail, Check, X } from 'lucide-react';
import { useMentorAccess, useGrantMentorAccess, useRevokeMentorAccess } from '@/hooks/useJournal';
import { MentorAccess } from '@/utils/journalApi';

interface MentorAccessManagerProps {
  enrollmentId: string;
}

const PERMISSION_OPTIONS = [
  { key: 'view_trades', label: 'View Trades', description: 'See trade history and statistics' },
  { key: 'view_journal', label: 'View Journal', description: 'Read journal entries and notes' },
  { key: 'view_analytics', label: 'View Analytics', description: 'Access analytics dashboards' },
  { key: 'add_comments', label: 'Add Comments', description: 'Leave feedback on trades' },
] as const;

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'rgba(27, 191, 153, 0.1)', text: '#1BBF99', label: 'Active' },
  pending: { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B', label: 'Pending' },
  revoked: { bg: 'rgba(237, 83, 99, 0.1)', text: '#ED5363', label: 'Revoked' },
};

const MentorAccessManager: React.FC<MentorAccessManagerProps> = ({ enrollmentId }) => {
  const { data, isLoading } = useMentorAccess(enrollmentId);
  const grantMutation = useGrantMentorAccess();
  const revokeMutation = useRevokeMentorAccess();
  const mentors = (data as MentorAccess[]) ?? [];

  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([
    'view_trades',
    'view_journal',
  ]);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  const handlePermissionToggle = (key: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handleInvite = () => {
    if (!email.trim() || selectedPermissions.length === 0) return;
    grantMutation.mutate(
      {
        mentor_email: email.trim(),
        permissions: selectedPermissions,
        enrollment_id: enrollmentId,
      },
      {
        onSuccess: () => {
          setEmail('');
          setSelectedPermissions(['view_trades', 'view_journal']);
          setShowInvite(false);
        },
      }
    );
  };

  const handleRevoke = (id: string) => {
    revokeMutation.mutate(id, {
      onSuccess: () => setConfirmRevokeId(null),
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[#7570FF]" />
          <h2 className="text-lg font-semibold text-[#E4EEF5]">Mentor Sharing</h2>
        </div>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="flex items-center gap-1.5 rounded-lg bg-[#3AB3FF]/10 px-3 py-1.5 text-xs font-medium text-[#3AB3FF] transition-colors hover:bg-[#3AB3FF]/20"
        >
          <Plus className="h-3.5 w-3.5" />
          Invite Mentor
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="rounded-xl border border-[#3AB3FF]/20 bg-[#0A1114] p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#85A8C3]">Mentor Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#85A8C3]/40" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mentor@example.com"
                className="w-full rounded-lg border border-[#1E2D3D] bg-transparent py-2 pl-10 pr-3 text-sm text-[#E4EEF5] placeholder:text-[#85A8C3]/30 focus:border-[#3AB3FF]/40 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-[#85A8C3]">Permissions</label>
            <div className="grid grid-cols-2 gap-2">
              {PERMISSION_OPTIONS.map((perm) => {
                const isSelected = selectedPermissions.includes(perm.key);
                return (
                  <button
                    key={perm.key}
                    onClick={() => handlePermissionToggle(perm.key)}
                    className={`flex items-start gap-2 rounded-lg border p-3 text-left transition-all ${
                      isSelected
                        ? 'border-[#3AB3FF]/30 bg-[#3AB3FF]/5'
                        : 'border-[#1E2D3D] hover:border-[#1E2D3D]/80'
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        isSelected
                          ? 'border-[#3AB3FF] bg-[#3AB3FF]'
                          : 'border-[#85A8C3]/30'
                      }`}
                    >
                      {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#E4EEF5]">{perm.label}</p>
                      <p className="text-[10px] text-[#85A8C3]/50">{perm.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleInvite}
              disabled={!email.trim() || selectedPermissions.length === 0 || grantMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-[#3AB3FF] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#3AB3FF]/90 disabled:opacity-50"
            >
              {grantMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Shield className="h-3.5 w-3.5" />
              )}
              Send Invitation
            </button>
            <button
              onClick={() => setShowInvite(false)}
              className="rounded-lg px-4 py-2 text-xs text-[#85A8C3] hover:text-[#E4EEF5]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Mentor list */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-[#1E2D3D] bg-[#0A1114]">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#3AB3FF] border-t-transparent" />
        </div>
      ) : mentors.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-[#1E2D3D] bg-[#0A1114]">
          <div className="text-center">
            <Users className="mx-auto mb-2 h-8 w-8 text-[#85A8C3]/20" />
            <p className="text-xs text-[#85A8C3]/50">
              No mentors have access yet. Invite a mentor to share your journal.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {mentors.map((mentor) => {
            const statusStyle = STATUS_STYLES[mentor.status] ?? STATUS_STYLES.pending;
            const isConfirming = confirmRevokeId === mentor.id;

            return (
              <div
                key={mentor.id}
                className="flex items-center justify-between rounded-xl border border-[#1E2D3D] bg-[#0A1114] px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1E2D3D]/60 text-xs font-bold text-[#85A8C3]">
                    {(mentor.mentor_name || mentor.mentor_email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[#E4EEF5]">
                        {mentor.mentor_name || mentor.mentor_email}
                      </p>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{
                          backgroundColor: statusStyle.bg,
                          color: statusStyle.text,
                        }}
                      >
                        {statusStyle.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#85A8C3]/50">{mentor.mentor_email}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {mentor.permissions.map((perm) => (
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

                {mentor.status !== 'revoked' && (
                  <div className="flex items-center gap-1">
                    {isConfirming ? (
                      <>
                        <button
                          onClick={() => handleRevoke(mentor.id)}
                          disabled={revokeMutation.isPending}
                          className="rounded-lg bg-[#ED5363]/10 px-3 py-1.5 text-[10px] font-medium text-[#ED5363] hover:bg-[#ED5363]/20"
                        >
                          {revokeMutation.isPending ? 'Revoking...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setConfirmRevokeId(null)}
                          className="rounded-lg p-1.5 text-[#85A8C3] hover:text-[#E4EEF5]"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmRevokeId(mentor.id)}
                        className="rounded-lg p-2 text-[#85A8C3]/40 transition-colors hover:bg-[#ED5363]/10 hover:text-[#ED5363]"
                        title="Revoke access"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MentorAccessManager;

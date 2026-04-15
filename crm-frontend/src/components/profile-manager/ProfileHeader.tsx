import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserCheck, Send, Loader2, Copy, Edit, Trash, Link, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { traderService } from '@/services/traderService';
import EditProfileDialog from './EditProfileDialog';
import DeleteProfileDialog from './DeleteProfileDialog';
import PasswordManagementDialog from './PasswordManagementDialog';

interface ProfileHeaderProps {
  traderId: string;
  userInfo: any;
  clientProfile: any;
  onImpersonate: () => void;
  onRiseInvite: () => void;
  isImpersonating: boolean;
  isInviting: boolean;
}

export default function ProfileHeader({
  traderId,
  userInfo,
  clientProfile,
  onImpersonate,
  onRiseInvite,
  isImpersonating,
  isInviting,
}: ProfileHeaderProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: `${label} copied to clipboard` });
  };

  const displayTrader = {
    id: traderId,
    firstName: userInfo?.first_name || '',
    lastName: userInfo?.last_name || '',
    email: userInfo?.email || '',
    phone: clientProfile?.phone || '',
    country: clientProfile?.country || '',
    fullAddress: clientProfile?.full_address || '',
    kycStatus: clientProfile?.kyc_status || 'not_submitted',
    hasLiveAccount: clientProfile?.has_live_account || false,
    registeredAt: new Date(userInfo?.date_joined || Date.now()),
    challenges: [],
    accounts: [],
  };

  const handleEditSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['trader-full-profile', traderId] });
    toast({ title: 'Trader Updated', description: 'Profile has been updated successfully' });
  };


  const kycStatus = clientProfile?.kyc_status;
  const kycVariant = kycStatus === 'approved' ? 'default' : kycStatus === 'rejected' ? 'destructive' : 'secondary';

  return (
    <>
      <div className="space-y-6">
        {/* Back nav */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/traders')}
          className="text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Traders
        </Button>

        {/* Main header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-lg font-semibold text-primary shrink-0">
              {(userInfo?.first_name?.[0] || '?')}{(userInfo?.last_name?.[0] || '')}
            </div>

            <div className="space-y-1 min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {userInfo?.first_name} {userInfo?.last_name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <button
                  onClick={() => copyToClipboard(userInfo?.email || '', 'Email')}
                  className="hover:text-foreground transition-colors flex items-center gap-1"
                >
                  {userInfo?.email}
                  <Copy className="h-3 w-3 opacity-50" />
                </button>
                <span className="text-border">•</span>
                <button
                  onClick={() => copyToClipboard(traderId, 'Trader ID')}
                  className="font-mono text-xs hover:text-foreground transition-colors flex items-center gap-1"
                >
                  {traderId.slice(0, 8)}...
                  <Copy className="h-3 w-3 opacity-50" />
                </button>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Badge variant={userInfo?.is_active ? 'default' : 'secondary'} className="text-xs">
                  {userInfo?.is_active ? 'Active' : 'Inactive'}
                </Badge>
                {kycStatus && (
                  <Badge variant={kycVariant} className="text-xs capitalize">
                    KYC: {kycStatus}
                  </Badge>
                )}
                {clientProfile?.has_live_account && (
                  <Badge variant="outline" className="text-xs border-green-500/30 text-green-600 dark:text-green-400">
                    Live Account
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Button
              onClick={() => setShowPasswordDialog(true)}
              variant="outline"
              size="sm"
            >
              <KeyRound className="h-4 w-4 mr-1" />
              Password
            </Button>
            <Button
              onClick={() => setShowEditDialog(true)}
              variant="outline"
              size="sm"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              onClick={onRiseInvite}
              variant="outline"
              size="sm"
              disabled={isInviting}
            >
              {isInviting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              Invite on Rise
            </Button>
            <Button
              onClick={onImpersonate}
              variant="outline"
              size="sm"
              disabled={isImpersonating}
            >
              {isImpersonating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserCheck className="h-4 w-4 mr-1" />}
              Impersonate
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              title="Copy Impersonate Link"
              disabled={isImpersonating}
              onClick={async () => {
                try {
                  const data = await traderService.impersonateTrader(traderId);
                  const link = `https://dashboard.we-fund.com/impersonate?ticket=${data.ticket}`;
                  navigator.clipboard.writeText(link);
                  toast({ title: 'Copied', description: 'Impersonate link copied to clipboard' });
                } catch (err: any) {
                  toast({ title: 'Failed', description: err.message || 'Could not generate link', variant: 'destructive' });
                }
              }}
            >
              <Link className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setShowDeleteDialog(true)}
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 border-destructive/30"
            >
              <Trash className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <EditProfileDialog
        trader={displayTrader}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={handleEditSuccess}
      />

      {/* Password Management */}
      <PasswordManagementDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        traderId={traderId}
        traderEmail={userInfo?.email || ''}
        traderName={`${userInfo?.first_name || ''} ${userInfo?.last_name || ''}`}
      />

      {/* Delete Confirmation */}
      <DeleteProfileDialog
        traderId={traderId}
        traderName={`${userInfo?.first_name || ''} ${userInfo?.last_name || ''}`}
        traderEmail={userInfo?.email || ''}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      />
    </>
  );
}

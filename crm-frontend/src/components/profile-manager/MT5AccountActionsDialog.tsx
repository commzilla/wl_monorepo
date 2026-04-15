import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PlayCircle,
  StopCircle,
  Power,
  PowerOff,
  RefreshCw,
  ArrowRightLeft,
  KeyRound,
  Info,
  Server,
  Loader2,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mt5Service } from '@/services/mt5Service';
import { cgmService } from '@/services/cgmService';
import { enrollmentReviewService } from '@/services/enrollmentReviewService';
import { toast } from 'sonner';

interface MT5AccountActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollmentId: string;
  challengeName: string;
  mt5AccountId?: string | number;
  onSuccess?: () => void;
}

export default function MT5AccountActionsDialog({
  open,
  onOpenChange,
  enrollmentId,
  challengeName,
  mt5AccountId,
  onSuccess,
}: MT5AccountActionsDialogProps) {
  const queryClient = useQueryClient();
  const [showChangeGroup, setShowChangeGroup] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [passwordMode, setPasswordMode] = useState<'main' | 'investor' | 'both'>('both');
  const [mainPassword, setMainPassword] = useState('');
  const [investorPassword, setInvestorPassword] = useState('');

  const accountId = mt5AccountId ? parseInt(String(mt5AccountId)) : null;

  // Fetch account details for live status
  const { data: accountDetails } = useQuery({
    queryKey: ['account-details', enrollmentId],
    queryFn: () => enrollmentReviewService.getAccountDetails(enrollmentId),
    enabled: open && !!enrollmentId,
    retry: false,
  });

  const { data: availableGroups, isLoading: isLoadingGroups } = useQuery({
    queryKey: ['mt5-groups'],
    queryFn: () => cgmService.getAvailableGroups(),
    enabled: showChangeGroup,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['account-details', enrollmentId] });
    queryClient.invalidateQueries({ queryKey: ['broker-details', enrollmentId] });
    onSuccess?.();
  };

  const activateTrading = useMutation({
    mutationFn: () => mt5Service.activateTrading(accountId!),
    onSuccess: (d) => { d.message ? toast.success(d.message) : toast.error(d.error); invalidate(); },
    onError: (e: any) => toast.error(e.message || 'Failed'),
  });

  const disableTrading = useMutation({
    mutationFn: () => mt5Service.disableTrading(accountId!),
    onSuccess: (d) => { d.message ? toast.success(d.message) : toast.error(d.error); invalidate(); },
    onError: (e: any) => toast.error(e.message || 'Failed'),
  });

  const enableMT5 = useMutation({
    mutationFn: () => mt5Service.enableMT5(accountId!),
    onSuccess: (d) => { d.message ? toast.success(d.message) : toast.error(d.error); invalidate(); },
    onError: (e: any) => toast.error(e.message || 'Failed'),
  });

  const disableMT5 = useMutation({
    mutationFn: () => mt5Service.disableMT5(accountId!),
    onSuccess: (d) => { d.message ? toast.success(d.message) : toast.error(d.error); invalidate(); },
    onError: (e: any) => toast.error(e.message || 'Failed'),
  });

  const retryCreate = useMutation({
    mutationFn: () => mt5Service.retryCreateMT5(enrollmentId),
    onSuccess: (d) => { d.message ? toast.success(d.message) : toast.error(d.error); invalidate(); },
    onError: (e: any) => toast.error(e.message || 'Failed'),
  });

  const changeGroup = useMutation({
    mutationFn: () => mt5Service.changeGroup(accountId!, selectedGroup),
    onSuccess: (d) => {
      d.message ? toast.success(d.message) : toast.error(d.error);
      setShowChangeGroup(false);
      setSelectedGroup('');
      invalidate();
    },
    onError: (e: any) => toast.error(e.message || 'Failed'),
  });

  const changePassword = useMutation({
    mutationFn: () => mt5Service.changePassword({
      enrollment_id: enrollmentId,
      mode: passwordMode,
      main_password: mainPassword || undefined,
      investor_password: investorPassword || undefined,
    }),
    onSuccess: (d) => {
      let msg = d.message || 'Password changed';
      if (d.main_password || d.investor_password) {
        msg += '\n\nNew Passwords:';
        if (d.main_password) msg += `\nMain: ${d.main_password}`;
        if (d.investor_password) msg += `\nInvestor: ${d.investor_password}`;
      }
      toast.success(msg, { duration: 10000 });
      setShowChangePassword(false);
      setMainPassword('');
      setInvestorPassword('');
      invalidate();
    },
    onError: (e: any) => toast.error(e.message || 'Failed'),
  });

  const anyPending = activateTrading.isPending || disableTrading.isPending ||
    enableMT5.isPending || disableMT5.isPending || retryCreate.isPending;

  const liveAccountId = accountDetails?.mt5_account_id || mt5AccountId;
  const isEnabled = accountDetails?.account_details?.isEnabled;
  const canTrade = accountDetails?.account_details?.canTrade;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            MT5 Account Actions
          </DialogTitle>
          <DialogDescription>
            {challengeName}
            {liveAccountId && <span className="font-mono ml-1">• MT5: {liveAccountId}</span>}
          </DialogDescription>
        </DialogHeader>

        {/* Status Badges */}
        {accountDetails?.success && (
          <div className="flex items-center gap-2">
            <Badge variant={isEnabled ? 'default' : 'destructive'} className="text-xs">
              {isEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
            <Badge variant={canTrade ? 'default' : 'secondary'} className="text-xs">
              {canTrade ? 'Can Trade' : 'Trading Disabled'}
            </Badge>
          </div>
        )}

        {/* Change Group Sub-Dialog */}
        {showChangeGroup ? (
          <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
            <Label>Select New Group</Label>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a group" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingGroups ? (
                  <SelectItem value="loading" disabled>Loading groups...</SelectItem>
                ) : (
                  availableGroups?.map((g) => (
                    <SelectItem key={g.group} value={g.group}>
                      {g.group}{g.description && ` - ${g.description}`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setShowChangeGroup(false); setSelectedGroup(''); }}>Cancel</Button>
              <Button size="sm" onClick={() => changeGroup.mutate()} disabled={!selectedGroup || changeGroup.isPending}>
                {changeGroup.isPending ? 'Changing...' : 'Change Group'}
              </Button>
            </div>
          </div>
        ) : showChangePassword ? (
          <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
            <div className="space-y-2">
              <Label>Password Type</Label>
              <Select value={passwordMode} onValueChange={(v: any) => setPasswordMode(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">Main Only</SelectItem>
                  <SelectItem value="investor">Investor Only</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(passwordMode === 'main' || passwordMode === 'both') && (
              <div className="space-y-2">
                <Label>Main Password</Label>
                <Input placeholder="Leave empty to auto-generate" value={mainPassword} onChange={(e) => setMainPassword(e.target.value)} />
              </div>
            )}
            {(passwordMode === 'investor' || passwordMode === 'both') && (
              <div className="space-y-2">
                <Label>Investor Password</Label>
                <Input placeholder="Leave empty to auto-generate" value={investorPassword} onChange={(e) => setInvestorPassword(e.target.value)} />
              </div>
            )}
            <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
              <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Leave empty to auto-generate MT5-compliant passwords.</p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setShowChangePassword(false); setMainPassword(''); setInvestorPassword(''); }}>Cancel</Button>
              <Button size="sm" onClick={() => changePassword.mutate()} disabled={changePassword.isPending}>
                {changePassword.isPending ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </div>
        ) : (
          /* Main Actions Grid */
          <div className="grid grid-cols-2 gap-2">
            <ActionButton
              icon={PlayCircle}
              label="Activate Trading"
              onClick={() => activateTrading.mutate()}
              disabled={!accountId || anyPending}
              loading={activateTrading.isPending}
            />
            <ActionButton
              icon={StopCircle}
              label="Disable Trading"
              onClick={() => disableTrading.mutate()}
              disabled={!accountId || anyPending}
              loading={disableTrading.isPending}
              variant="destructive"
            />
            <ActionButton
              icon={Power}
              label="Enable MT5"
              onClick={() => enableMT5.mutate()}
              disabled={!accountId || anyPending}
              loading={enableMT5.isPending}
            />
            <ActionButton
              icon={PowerOff}
              label="Disable MT5"
              onClick={() => disableMT5.mutate()}
              disabled={!accountId || anyPending}
              loading={disableMT5.isPending}
              variant="outline"
            />
            <ActionButton
              icon={RefreshCw}
              label="Retry Create MT5"
              onClick={() => retryCreate.mutate()}
              disabled={anyPending}
              loading={retryCreate.isPending}
              variant="outline"
            />
            <ActionButton
              icon={ArrowRightLeft}
              label="Change Group"
              onClick={() => setShowChangeGroup(true)}
              disabled={!accountId || anyPending}
              variant="outline"
            />
            <ActionButton
              icon={KeyRound}
              label="Change Password"
              onClick={() => setShowChangePassword(true)}
              disabled={!accountId || anyPending}
              variant="outline"
              className="col-span-2"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  loading,
  variant = 'default',
  className = '',
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  className?: string;
}) {
  return (
    <Button
      variant={variant}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={`justify-start gap-2 ${className}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {loading ? `${label}...` : label}
    </Button>
  );
}

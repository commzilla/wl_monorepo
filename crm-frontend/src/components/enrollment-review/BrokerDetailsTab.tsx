import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { enrollmentReviewService } from '@/services/enrollmentReviewService';
import { Eye, EyeOff, Copy, Server, Key, UserCheck, Info, AlertCircle, PlayCircle, StopCircle, Power, PowerOff, RefreshCw, ArrowRightLeft, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { mt5Service } from '@/services/mt5Service';
import { cgmService } from '@/services/cgmService';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import ChangePasswordDialog from './ChangePasswordDialog';

interface BrokerDetailsTabProps {
  enrollmentId: string;
}

const BrokerDetailsTab: React.FC<BrokerDetailsTabProps> = ({ enrollmentId }) => {
  const [showPasswords, setShowPasswords] = React.useState<{ [key: string]: boolean }>({});
  const [showChangeGroupDialog, setShowChangeGroupDialog] = React.useState(false);
  const [showChangePasswordDialog, setShowChangePasswordDialog] = React.useState(false);
  const [selectedGroup, setSelectedGroup] = React.useState<string>('');
  const queryClient = useQueryClient();

  const {
    data: brokerData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['broker-details', enrollmentId],
    queryFn: () => enrollmentReviewService.getBrokerDetails(enrollmentId),
    retry: false
  });

  const {
    data: accountDetails,
    isLoading: isLoadingDetails,
    error: detailsError
  } = useQuery({
    queryKey: ['account-details', enrollmentId],
    queryFn: () => enrollmentReviewService.getAccountDetails(enrollmentId),
    retry: false
  });

  const activateTradingMutation = useMutation({
    mutationFn: (accountId: number) => mt5Service.activateTrading(accountId),
    onSuccess: (data) => {
      if (data.message) {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ['account-details', enrollmentId] });
      } else if (data.error) {
        toast.error(data.error);
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to activate trading');
    }
  });

  const disableTradingMutation = useMutation({
    mutationFn: (accountId: number) => mt5Service.disableTrading(accountId),
    onSuccess: (data) => {
      if (data.message) {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ['account-details', enrollmentId] });
      } else if (data.error) {
        toast.error(data.error);
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to disable trading');
    }
  });

  const enableMT5Mutation = useMutation({
    mutationFn: (accountId: number) => mt5Service.enableMT5(accountId),
    onSuccess: (data) => {
      if (data.message) {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ['account-details', enrollmentId] });
      } else if (data.error) {
        toast.error(data.error);
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to enable MT5');
    }
  });

  const disableMT5Mutation = useMutation({
    mutationFn: (accountId: number) => mt5Service.disableMT5(accountId),
    onSuccess: (data) => {
      if (data.message) {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ['account-details', enrollmentId] });
      } else if (data.error) {
        toast.error(data.error);
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to disable MT5');
    }
  });

  const retryCreateMT5Mutation = useMutation({
    mutationFn: () => {
      console.log('Retry MT5 - enrollmentId:', enrollmentId);
      return mt5Service.retryCreateMT5(enrollmentId);
    },
    onSuccess: (data) => {
      console.log('Retry MT5 Success:', data);
      if (data.message) {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ['broker-details', enrollmentId] });
        queryClient.invalidateQueries({ queryKey: ['account-details', enrollmentId] });
      } else if (data.error) {
        toast.error(data.error);
      }
    },
    onError: (error: any) => {
      console.log('Retry MT5 Error:', error);
      const errorMessage = error?.message || 'Failed to retry MT5 creation';
      console.log('Displaying error toast:', errorMessage);
      toast.error(errorMessage);
    }
  });

  const changeGroupMutation = useMutation({
    mutationFn: ({ accountId, newGroup }: { accountId: number; newGroup: string }) => 
      mt5Service.changeGroup(accountId, newGroup),
    onSuccess: (data) => {
      if (data.message) {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ['account-details', enrollmentId] });
        setShowChangeGroupDialog(false);
        setSelectedGroup('');
      } else if (data.error) {
        toast.error(data.error);
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to change group');
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ mode, mainPassword, investorPassword }: { mode: 'main' | 'investor' | 'both'; mainPassword?: string; investorPassword?: string }) => 
      mt5Service.changePassword({
        enrollment_id: enrollmentId,
        mode,
        main_password: mainPassword,
        investor_password: investorPassword
      }),
    onSuccess: (data) => {
      if (data.message) {
        let successMessage = data.message;
        
        // Show new passwords if generated
        if (data.main_password || data.investor_password) {
          successMessage += '\n\nNew Passwords:';
          if (data.main_password) {
            successMessage += `\nMain: ${data.main_password}`;
          }
          if (data.investor_password) {
            successMessage += `\nInvestor: ${data.investor_password}`;
          }
        }
        
        toast.success(successMessage, { duration: 10000 });
        queryClient.invalidateQueries({ queryKey: ['broker-details', enrollmentId] });
        queryClient.invalidateQueries({ queryKey: ['account-details', enrollmentId] });
        setShowChangePasswordDialog(false);
      } else if (data.error) {
        toast.error(data.error);
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to change password');
    }
  });

  const { data: availableGroups, isLoading: isLoadingGroups } = useQuery({
    queryKey: ['mt5-groups'],
    queryFn: () => cgmService.getAvailableGroups(),
    enabled: showChangeGroupDialog
  });

  const handleActivateTrading = () => {
    if (accountDetails?.mt5_account_id) {
      activateTradingMutation.mutate(parseInt(accountDetails.mt5_account_id));
    }
  };

  const handleDisableTrading = () => {
    if (accountDetails?.mt5_account_id) {
      disableTradingMutation.mutate(parseInt(accountDetails.mt5_account_id));
    }
  };

  const handleEnableMT5 = () => {
    if (accountDetails?.mt5_account_id) {
      enableMT5Mutation.mutate(parseInt(accountDetails.mt5_account_id));
    }
  };

  const handleDisableMT5 = () => {
    if (accountDetails?.mt5_account_id) {
      disableMT5Mutation.mutate(parseInt(accountDetails.mt5_account_id));
    }
  };

  const handleRetryCreateMT5 = () => {
    retryCreateMT5Mutation.mutate();
  };

  const handleChangeGroup = () => {
    if (accountDetails?.mt5_account_id && selectedGroup) {
      changeGroupMutation.mutate({
        accountId: parseInt(accountDetails.mt5_account_id),
        newGroup: selectedGroup
      });
    }
  };

  const handleChangePassword = (mode: 'main' | 'investor' | 'both', mainPassword?: string, investorPassword?: string) => {
    changePasswordMutation.mutate({ mode, mainPassword, investorPassword });
  };

  const togglePasswordVisibility = (accountId: string, field: string) => {
    const key = `${accountId}-${field}`;
    setShowPasswords(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${field} copied to clipboard`);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  if (isLoading || isLoadingDetails) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error || !brokerData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Failed to load broker details</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">MT5 Account Details</h3>
        <p className="text-muted-foreground text-sm">
          Current and historical MT5 accounts for this enrollment
        </p>
      </div>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="default"
              size="sm"
              onClick={handleActivateTrading}
              disabled={activateTradingMutation.isPending || !accountDetails?.mt5_account_id}
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              {activateTradingMutation.isPending ? 'Activating...' : 'Activate Trading'}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDisableTrading}
              disabled={disableTradingMutation.isPending || !accountDetails?.mt5_account_id}
            >
              <StopCircle className="h-4 w-4 mr-2" />
              {disableTradingMutation.isPending ? 'Disabling...' : 'Disable Trading'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleEnableMT5}
              disabled={enableMT5Mutation.isPending || !accountDetails?.mt5_account_id}
            >
              <Power className="h-4 w-4 mr-2" />
              {enableMT5Mutation.isPending ? 'Enabling...' : 'Enable MT5'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisableMT5}
              disabled={disableMT5Mutation.isPending || !accountDetails?.mt5_account_id}
            >
              <PowerOff className="h-4 w-4 mr-2" />
              {disableMT5Mutation.isPending ? 'Disabling...' : 'Disable MT5'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetryCreateMT5}
              disabled={retryCreateMT5Mutation.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {retryCreateMT5Mutation.isPending ? 'Retrying...' : 'Retry Create MT5'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChangeGroupDialog(true)}
              disabled={!accountDetails?.mt5_account_id}
            >
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Change Group
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChangePasswordDialog(true)}
              disabled={!accountDetails?.mt5_account_id}
            >
              <KeyRound className="h-4 w-4 mr-2" />
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Group Dialog */}
      <Dialog open={showChangeGroupDialog} onOpenChange={setShowChangeGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change MT5 Group</DialogTitle>
            <DialogDescription>
              Select a new MT5 group for account {accountDetails?.mt5_account_id}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Group</Label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a group" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingGroups ? (
                    <SelectItem value="loading" disabled>Loading groups...</SelectItem>
                  ) : (
                    availableGroups?.map((group) => (
                      <SelectItem key={group.group} value={group.group}>
                        {group.group} {group.description && `- ${group.description}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowChangeGroupDialog(false);
                setSelectedGroup('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangeGroup}
              disabled={!selectedGroup || changeGroupMutation.isPending}
            >
              {changeGroupMutation.isPending ? 'Changing...' : 'Change Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <ChangePasswordDialog
        open={showChangePasswordDialog}
        onOpenChange={setShowChangePasswordDialog}
        onConfirm={handleChangePassword}
        accountId={accountDetails?.mt5_account_id}
        isPending={changePasswordMutation.isPending}
      />

      <div className="grid grid-cols-1 gap-6">
        {/* MT5 Account Details */}
        {accountDetails && accountDetails.success && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  MT5 Account Details
                </CardTitle>
                <Badge variant="secondary">
                  {accountDetails.applicationStatus || 'Active'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Account ID</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-background px-2 py-1 rounded">
                    {accountDetails.mt5_account_id}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(accountDetails.mt5_account_id, 'Account ID')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Additional Account Details */}
              {accountDetails.account_details && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Additional Account Information</h4>
                  
                  {/* Account Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                      <span className="text-sm font-medium">Account ID</span>
                      <code className="text-sm">{accountDetails.account_details.accountID}</code>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                      <span className="text-sm font-medium">Status</span>
                      <Badge variant={accountDetails.account_details.isEnabled ? "secondary" : "destructive"}>
                        {accountDetails.account_details.isEnabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                      <span className="text-sm font-medium">Can Trade</span>
                      <Badge variant={accountDetails.account_details.canTrade ? "secondary" : "destructive"}>
                        {accountDetails.account_details.canTrade ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                      <span className="text-sm font-medium">Leverage</span>
                      <code className="text-sm">1:{accountDetails.account_details.user?.leverage || 'N/A'}</code>
                    </div>
                  </div>

                  {/* User Information */}
                  {accountDetails.account_details.user && (
                    <div className="space-y-3">
                      <h5 className="text-sm font-medium">User Information</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                          <span className="text-sm font-medium">Name</span>
                          <span className="text-sm">{accountDetails.account_details.user.name}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                          <span className="text-sm font-medium">Email</span>
                          <span className="text-sm">{accountDetails.account_details.user.email}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                          <span className="text-sm font-medium">Phone</span>
                          <span className="text-sm">{accountDetails.account_details.user.phone || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                          <span className="text-sm font-medium">User Status</span>
                          <Badge variant="outline">{accountDetails.account_details.user.status}</Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Address Information */}
                  {accountDetails.account_details.user?.address && (
                    <div className="space-y-3">
                      <h5 className="text-sm font-medium">Address Information</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                          <span className="text-sm font-medium">Address</span>
                          <span className="text-sm">{accountDetails.account_details.user.address.address}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                          <span className="text-sm font-medium">City</span>
                          <span className="text-sm">{accountDetails.account_details.user.address.city}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                          <span className="text-sm font-medium">State</span>
                          <span className="text-sm">{accountDetails.account_details.user.address.state || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                          <span className="text-sm font-medium">Country</span>
                          <span className="text-sm">{accountDetails.account_details.user.address.country}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Trading Permissions */}
                  {accountDetails.account_details.user && (
                    <div className="space-y-3">
                      <h5 className="text-sm font-medium">Trading Permissions</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                          <span className="text-sm font-medium">Expert Advisor</span>
                          <Badge variant={accountDetails.account_details.user.enableExpertAdvisor ? "secondary" : "outline"}>
                            {accountDetails.account_details.user.enableExpertAdvisor ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                          <span className="text-sm font-medium">Trailing Stop</span>
                          <Badge variant={accountDetails.account_details.user.enableTrailingStop ? "secondary" : "outline"}>
                            {accountDetails.account_details.user.enableTrailingStop ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                          <span className="text-sm font-medium">API Connection</span>
                          <Badge variant={accountDetails.account_details.user.enableAPIConnection ? "secondary" : "outline"}>
                            {accountDetails.account_details.user.enableAPIConnection ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                          <span className="text-sm font-medium">Send Reports</span>
                          <Badge variant={accountDetails.account_details.user.hasSendReportEnabled ? "secondary" : "outline"}>
                            {accountDetails.account_details.user.hasSendReportEnabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Account Balance */}
                  {accountDetails.account_details.pltAccount && (
                    <div className="space-y-3">
                      <h5 className="text-sm font-medium">Account Balance</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                          <span className="text-sm font-medium">Current Balance</span>
                          <span className="text-sm font-mono">${accountDetails.account_details.pltAccount.balance.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                          <span className="text-sm font-medium">Previous Balance</span>
                          <span className="text-sm font-mono">${accountDetails.account_details.pltAccount.prevBalance.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                          <span className="text-sm font-medium">Credit</span>
                          <span className="text-sm font-mono">${accountDetails.account_details.pltAccount.credit.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                          <span className="text-sm font-medium">Previous Equity</span>
                          <span className="text-sm font-mono">${accountDetails.account_details.pltAccount.prevEquity.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Group Information */}
                  {accountDetails.account_details.group && (
                    <div className="space-y-3">
                      <h5 className="text-sm font-medium">Group Information</h5>
                      <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                        <span className="text-sm font-medium">Group Name</span>
                        <code className="text-sm">{accountDetails.account_details.group.name}</code>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error state for account details */}
        {accountDetails && !accountDetails.success && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-destructive">
                <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                <p className="font-medium">Failed to load account details</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {accountDetails.error || 'Unknown error occurred'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Broker Credentials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {brokerData?.accounts.map((account, index) => (
            <Card key={`${account.mt5_account_id}-${index}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    {account.phase} Credentials
                  </CardTitle>
                  <Badge variant="outline">
                    {account.broker_type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Account ID */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Account ID</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-background px-2 py-1 rounded">
                      {account.mt5_account_id}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(account.mt5_account_id, 'Account ID')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Trading Password */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Trading Password</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-background px-2 py-1 rounded">
                      {showPasswords[`${account.mt5_account_id}-password`] 
                        ? account.password 
                        : '••••••••'
                      }
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePasswordVisibility(account.mt5_account_id, 'password')}
                    >
                      {showPasswords[`${account.mt5_account_id}-password`] 
                        ? <EyeOff className="h-3 w-3" />
                        : <Eye className="h-3 w-3" />
                      }
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(account.password, 'Trading Password')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Investor Password */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Investor Password</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-background px-2 py-1 rounded">
                      {showPasswords[`${account.mt5_account_id}-investor`] 
                        ? account.investor_password 
                        : '••••••••'
                      }
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePasswordVisibility(account.mt5_account_id, 'investor')}
                    >
                      {showPasswords[`${account.mt5_account_id}-investor`] 
                        ? <EyeOff className="h-3 w-3" />
                        : <Eye className="h-3 w-3" />
                      }
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(account.investor_password, 'Investor Password')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {brokerData.accounts.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No MT5 accounts found for this enrollment</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BrokerDetailsTab;
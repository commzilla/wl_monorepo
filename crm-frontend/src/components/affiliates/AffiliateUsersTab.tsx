import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Eye, Users, UserPlus, UserCheck, Copy, Settings, Tag, Award, Check, X, UserCog, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { affiliateService } from '@/services/affiliateService';
import { AffiliateUser } from '@/types/affiliate';
import AffiliateUserDialog from './AffiliateUserDialog';
import { MakeAffiliateDialog } from './MakeAffiliateDialog';
import { AssignReferralCodeDialog } from './AssignReferralCodeDialog';
import AssignTierDialog from './AssignTierDialog';
import AffiliateApprovalDialog from './AffiliateApprovalDialog';
import { useNavigate } from 'react-router-dom';

interface AffiliateUsersTabProps {
  onCreateUser?: (data: any) => Promise<void>;
  onUpdateUser?: (id: string, data: any) => Promise<void>;
  onDeleteUser?: (id: string) => Promise<void>;
}

const AffiliateUsersTab: React.FC<AffiliateUsersTabProps> = ({
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ page: 1, page_size: 10 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [makeAffiliateDialogOpen, setMakeAffiliateDialogOpen] = useState(false);
  const [assignReferralCodeDialogOpen, setAssignReferralCodeDialogOpen] = useState(false);
  const [assignTierDialogOpen, setAssignTierDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [convertToClientDialogOpen, setConvertToClientDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'disapprove'>('approve');
  const [selectedUser, setSelectedUser] = useState<AffiliateUser | undefined>();

  // Fetch affiliate users
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['affiliate-users', filters, searchTerm],
    queryFn: () => affiliateService.getAffiliateUsers({ 
      ...filters, 
      search: searchTerm || undefined 
    }),
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: affiliateService.createAffiliateUser,
    onSuccess: () => {
      toast({ title: 'Success', description: 'Affiliate user created successfully' });
      queryClient.invalidateQueries({ queryKey: ['affiliate-users'] });
      setDialogOpen(false);
      setSelectedUser(undefined);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error?.message || 'Failed to create affiliate user', 
        variant: 'destructive' 
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      affiliateService.updateAffiliateUser(id, data),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Affiliate user updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['affiliate-users'] });
      setDialogOpen(false);
      setSelectedUser(undefined);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error?.message || 'Failed to update affiliate user', 
        variant: 'destructive' 
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: affiliateService.deleteAffiliateUser,
    onSuccess: () => {
      toast({ title: 'Success', description: 'Affiliate user deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['affiliate-users'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error?.message || 'Failed to delete affiliate user', 
        variant: 'destructive' 
      });
    },
  });

  // Make affiliate mutation
  const makeAffiliateMutation = useMutation({
    mutationFn: affiliateService.makeAffiliate,
    onSuccess: (data) => {
      toast({ 
        title: 'Success', 
        description: data.detail || 'User successfully converted to affiliate' 
      });
      queryClient.invalidateQueries({ queryKey: ['affiliate-users'] });
      setMakeAffiliateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error?.message || 'Failed to make user an affiliate', 
        variant: 'destructive' 
      });
    },
  });

  // Impersonate mutation
  const impersonateMutation = useMutation({
    mutationFn: (userId: string) => affiliateService.impersonateAffiliateUser(userId),
    onSuccess: (data, userId) => {
      const clientUrl = `https://dashboard.we-fund.com/impersonate?ticket=${data.ticket}`;
      window.open(clientUrl, "_blank");
      const user = users.find((u: AffiliateUser) => u.id === userId);
      toast({
        title: "Impersonation Started",
        description: `Successfully impersonating ${user?.username || 'user'}`,
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Impersonation Failed",
        description: error?.message || "Failed to impersonate user. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Assign referral code mutation
  const assignReferralCodeMutation = useMutation({
    mutationFn: affiliateService.assignReferralCode,
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: data.message || 'Referral code assigned successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['affiliate-users'] });
      setAssignReferralCodeDialogOpen(false);
      setSelectedUser(undefined);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to assign referral code',
        variant: 'destructive',
      });
    },
  });

  // Approve affiliate mutation
  const approveAffiliateMutation = useMutation({
    mutationFn: (userId: string) => affiliateService.approveAffiliate(userId),
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: data.detail || 'Affiliate approved successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['affiliate-users'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to approve affiliate',
        variant: 'destructive',
      });
    },
  });

  // Disapprove affiliate mutation
  const disapproveAffiliateMutation = useMutation({
    mutationFn: (userId: string) => affiliateService.disapproveAffiliate(userId),
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: data.detail || 'Affiliate disapproved successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['affiliate-users'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to disapprove affiliate',
        variant: 'destructive',
      });
    },
  });

  // Convert to client mutation
  const convertToClientMutation = useMutation({
    mutationFn: (userId: string) => affiliateService.convertToClient({ user_id: userId }),
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: data.role_changed 
          ? `User successfully converted to trader role` 
          : 'User already has trader role',
      });
      queryClient.invalidateQueries({ queryKey: ['affiliate-users'] });
      setConvertToClientDialogOpen(false);
      setSelectedUser(undefined);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to convert user to trader role',
        variant: 'destructive',
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) => affiliateService.resetAffiliatePassword({ user_id: userId }),
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: data.message || 'Password reset email sent successfully',
      });
      setResetPasswordDialogOpen(false);
      setSelectedUser(undefined);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to reset password',
        variant: 'destructive',
      });
    },
  });

  const handleCreateUser = async (data: any) => {
    await createUserMutation.mutateAsync(data);
  };

  const handleUpdateUser = async (data: any) => {
    if (!selectedUser) return;
    await updateUserMutation.mutateAsync({ id: selectedUser.id, data });
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this affiliate user?')) {
      await deleteUserMutation.mutateAsync(id);
    }
  };

  const handleEditUser = (user: AffiliateUser) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleMakeAffiliate = async (data: any) => {
    await makeAffiliateMutation.mutateAsync(data);
  };

  const handleImpersonate = (userId: string) => {
    impersonateMutation.mutate(userId);
  };

  const handleCopyReferralUrl = (referralCode: string) => {
    const referralUrl = `https://we-fund.com/register?ref=${referralCode}`;
    navigator.clipboard.writeText(referralUrl);
    toast({
      title: "Copied!",
      description: "Referral URL copied to clipboard",
    });
  };

  const handleOpenManager = (user: any) => {
    navigate(`/affiliates/manager/${user.id}`);
  };

  const handleAssignReferralCode = (user: AffiliateUser) => {
    setSelectedUser(user);
    setAssignReferralCodeDialogOpen(true);
  };

  const handleAssignTier = (user: AffiliateUser) => {
    setSelectedUser(user);
    setAssignTierDialogOpen(true);
  };

  const handleSubmitReferralCode = async (data: { user_id: string; referral_code: string }) => {
    await assignReferralCodeMutation.mutateAsync(data);
  };

  const handleApproveAffiliate = (user: AffiliateUser) => {
    setSelectedUser(user);
    setApprovalAction('approve');
    setApprovalDialogOpen(true);
  };

  const handleDisapproveAffiliate = (user: AffiliateUser) => {
    setSelectedUser(user);
    setApprovalAction('disapprove');
    setApprovalDialogOpen(true);
  };

  const handleConvertToClient = (user: AffiliateUser) => {
    setSelectedUser(user);
    setConvertToClientDialogOpen(true);
  };

  const handleResetPassword = (user: AffiliateUser) => {
    setSelectedUser(user);
    setResetPasswordDialogOpen(true);
  };

  const handleConfirmResetPassword = () => {
    if (!selectedUser) return;
    resetPasswordMutation.mutate(selectedUser.id);
  };

  const handleConfirmConvertToClient = () => {
    if (!selectedUser) return;
    convertToClientMutation.mutate(selectedUser.id);
  };

  const handleConfirmApproval = () => {
    if (!selectedUser) return;
    
    if (approvalAction === 'approve') {
      approveAffiliateMutation.mutate(selectedUser.id, {
        onSuccess: () => {
          setApprovalDialogOpen(false);
          setSelectedUser(undefined);
        },
      });
    } else {
      disapproveAffiliateMutation.mutate(selectedUser.id, {
        onSuccess: () => {
          setApprovalDialogOpen(false);
          setSelectedUser(undefined);
        },
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'inactive': return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      case 'suspended': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    }
  };

  const users = usersData?.results || [];
  const totalCount = usersData?.count || 0;
  const totalPages = Math.ceil(totalCount / filters.page_size);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Affiliate Users</h2>
          <p className="text-muted-foreground">
            Manage affiliate user accounts and profiles
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setMakeAffiliateDialogOpen(true)}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Make User Affiliate
          </Button>
          <Button onClick={() => {
            setSelectedUser(undefined);
            setDialogOpen(true);
          }} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Affiliate User
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Referral Code</TableHead>
                <TableHead>Referrals</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Approved</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No affiliate users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user: AffiliateUser) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.profile_picture} />
                          <AvatarFallback>
                            {user.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.username}</div>
                          <div className="text-sm text-muted-foreground">
                            ID: {user.id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getStatusColor(user.status)}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {user.affiliate_profile.referral_code}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleCopyReferralUrl(user.affiliate_profile.referral_code)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {user.affiliate_profile.referral_count}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.custom_commission_info?.is_active ? (
                        <div className="space-y-1">
                          <Badge 
                            variant="default"
                            className="bg-purple-500/10 text-purple-600 border-purple-500/20"
                          >
                            Custom
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {user.custom_commission_info.commission_rate && (
                              <div>{user.custom_commission_info.commission_rate}% rate</div>
                            )}
                            {user.custom_commission_info.fixed_amount_per_referral && (
                              <div>${user.custom_commission_info.fixed_amount_per_referral}/ref</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm">
                          {user.manual_tier_override_info ? (
                            <>
                              <div className="font-medium">
                                {user.manual_tier_override_info.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {user.manual_tier_override_info.commission_rate}% (Manual)
                              </div>
                            </>
                          ) : user.auto_tier_info ? (
                            <>
                              <div className="font-medium">
                                {user.auto_tier_info.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {user.auto_tier_info.commission_rate}%
                              </div>
                            </>
                          ) : user.effective_commission_rate ? (
                            <div className="text-muted-foreground">
                              {user.effective_commission_rate}%
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No commission</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.affiliate_profile.approved ? "default" : "secondary"}
                        className={user.affiliate_profile.approved 
                          ? "bg-green-500/10 text-green-600 border-green-500/20" 
                          : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                        }
                      >
                        {user.affiliate_profile.approved ? 'Approved' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenManager(user)}>
                            <Settings className="mr-2 h-4 w-4" />
                            Affiliate Manager
                          </DropdownMenuItem>
                          {!user.affiliate_profile.approved ? (
                            <DropdownMenuItem 
                              onClick={() => handleApproveAffiliate(user)}
                              className="text-green-600"
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Approve Affiliate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              onClick={() => handleDisapproveAffiliate(user)}
                              className="text-yellow-600"
                            >
                              <X className="mr-2 h-4 w-4" />
                              Disapprove Affiliate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleAssignReferralCode(user)}>
                            <Tag className="mr-2 h-4 w-4" />
                            Assign Referral Code
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAssignTier(user)}>
                            <Award className="mr-2 h-4 w-4" />
                            Assign Tier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleImpersonate(user.id)}>
                            <UserCheck className="mr-2 h-4 w-4" />
                            Impersonate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleConvertToClient(user)}>
                            <UserCog className="mr-2 h-4 w-4" />
                            Assign Trader Role
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                            <KeyRound className="mr-2 h-4 w-4" />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditUser(user)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((filters.page - 1) * filters.page_size) + 1} to{' '}
            {Math.min(filters.page * filters.page_size, totalCount)} of {totalCount} users
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={filters.page <= 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {filters.page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={filters.page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Assign Referral Code Dialog */}
      <AssignReferralCodeDialog
        open={assignReferralCodeDialogOpen}
        onOpenChange={setAssignReferralCodeDialogOpen}
        user={selectedUser || null}
        onSubmit={handleSubmitReferralCode}
        isSubmitting={assignReferralCodeMutation.isPending}
      />

      {/* Create/Edit Dialog */}
      <AffiliateUserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={selectedUser}
        onSubmit={selectedUser ? handleUpdateUser : handleCreateUser}
        isLoading={createUserMutation.isPending || updateUserMutation.isPending}
      />

      {/* Make Affiliate Dialog */}
      <MakeAffiliateDialog
        open={makeAffiliateDialogOpen}
        onOpenChange={setMakeAffiliateDialogOpen}
        onSubmit={handleMakeAffiliate}
        isLoading={makeAffiliateMutation.isPending}
      />

      {/* Assign Tier Dialog */}
      <AssignTierDialog
        open={assignTierDialogOpen}
        onOpenChange={setAssignTierDialogOpen}
        user={selectedUser || null}
      />

      {/* Approval Dialog */}
      <AffiliateApprovalDialog
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
        onConfirm={handleConfirmApproval}
        action={approvalAction}
        affiliateName={selectedUser?.username}
        isLoading={approveAffiliateMutation.isPending || disapproveAffiliateMutation.isPending}
      />

      {/* Convert to Client Dialog */}
      <AffiliateApprovalDialog
        open={convertToClientDialogOpen}
        onOpenChange={setConvertToClientDialogOpen}
        onConfirm={handleConfirmConvertToClient}
        action="approve"
        affiliateName={selectedUser?.username}
        isLoading={convertToClientMutation.isPending}
        title="Assign Trader Role"
        description={`Are you sure you want to assign the trader role to ${selectedUser?.username || 'this user'}? This will convert them from an affiliate to a client/trader.`}
        confirmText="Assign Role"
      />

      {/* Reset Password Dialog */}
      <AffiliateApprovalDialog
        open={resetPasswordDialogOpen}
        onOpenChange={setResetPasswordDialogOpen}
        onConfirm={handleConfirmResetPassword}
        action="approve"
        affiliateName={selectedUser?.username}
        isLoading={resetPasswordMutation.isPending}
        title="Reset Password"
        description={`Are you sure you want to reset the password for ${selectedUser?.username || 'this user'}? A new temporary password will be generated and sent to their email.`}
        confirmText="Reset Password"
      />
    </div>
  );
};

export default AffiliateUsersTab;
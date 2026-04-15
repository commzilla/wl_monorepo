import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { affiliateManagerService } from '@/services/affiliateManagerService';
import { useToast } from '@/hooks/use-toast';
import { Users, DollarSign, TrendingUp, CheckCircle, Mail, Phone, Calendar, Link as LinkIcon, Settings, Trash2 } from 'lucide-react';
import { z } from 'zod';

interface AffiliateManagerOverviewProps {
  userId: string;
}

const customCommissionSchema = z.object({
  is_active: z.boolean(),
  commission_rate: z.string().optional().refine(
    (val) => !val || (parseFloat(val) >= 0 && parseFloat(val) <= 100),
    { message: "Commission rate must be between 0 and 100" }
  ),
  fixed_amount_per_referral: z.string().optional().refine(
    (val) => !val || parseFloat(val) >= 0,
    { message: "Fixed amount must be positive" }
  ),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
}).refine(
  (data) => data.commission_rate || data.fixed_amount_per_referral,
  { message: "Either commission rate or fixed amount must be provided", path: ["commission_rate"] }
);

export const AffiliateManagerOverview: React.FC<AffiliateManagerOverviewProps> = ({ userId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCommissionForm, setShowCommissionForm] = useState(false);
  const [commissionData, setCommissionData] = useState({
    is_active: true,
    commission_rate: '',
    fixed_amount_per_referral: '',
    notes: '',
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['affiliate-manager-overview', userId],
    queryFn: () => affiliateManagerService.getOverview(userId),
  });

  const setCustomCommissionMutation = useMutation({
    mutationFn: (data: any) => affiliateManagerService.setCustomCommission(userId, data),
    onSuccess: (response) => {
      toast({
        title: 'Success',
        description: response.detail || 'Custom commission updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['affiliate-manager-overview', userId] });
      setShowCommissionForm(false);
      setCommissionData({
        is_active: true,
        commission_rate: '',
        fixed_amount_per_referral: '',
        notes: '',
      });
      setValidationErrors({});
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to update custom commission',
        variant: 'destructive',
      });
    },
  });

  const disableCustomCommissionMutation = useMutation({
    mutationFn: () => affiliateManagerService.disableCustomCommission(userId),
    onSuccess: (response) => {
      toast({
        title: 'Success',
        description: response.detail || 'Custom commission disabled successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['affiliate-manager-overview', userId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to disable custom commission',
        variant: 'destructive',
      });
    },
  });

  const handleSetCustomCommission = () => {
    setValidationErrors({});
    
    try {
      const validatedData = customCommissionSchema.parse({
        ...commissionData,
        commission_rate: commissionData.commission_rate || undefined,
        fixed_amount_per_referral: commissionData.fixed_amount_per_referral || undefined,
        notes: commissionData.notes || undefined,
      });

      setCustomCommissionMutation.mutate(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path) {
            errors[err.path[0]] = err.message;
          }
        });
        setValidationErrors(errors);
      }
    }
  };

  const handleDisableCustomCommission = () => {
    if (window.confirm('Are you sure you want to disable custom commission for this affiliate?')) {
      disableCustomCommissionMutation.mutate();
    }
  };

  const handleEditCustomCommission = () => {
    if (data?.custom_commission) {
      setCommissionData({
        is_active: data.custom_commission.is_active,
        commission_rate: data.custom_commission.commission_rate || '',
        fixed_amount_per_referral: data.custom_commission.fixed_amount_per_referral || '',
        notes: data.custom_commission.notes || '',
      });
      setShowCommissionForm(true);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data) return null;

  const statCards = [
    {
      title: 'Total Referrals',
      value: data.stats.total_referrals,
      icon: Users,
      color: 'text-blue-500',
    },
    {
      title: 'Approved Referrals',
      value: data.stats.approved_referrals,
      icon: CheckCircle,
      color: 'text-green-500',
    },
    {
      title: 'Total Payouts',
      value: data.stats.total_payouts,
      icon: DollarSign,
      color: 'text-purple-500',
    },
    {
      title: 'Total Earned',
      value: `$${parseFloat(data.stats.total_earned).toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Email:</span>
              <span className="text-sm">{data.user.email}</span>
            </div>
            {data.user.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Phone:</span>
                <span className="text-sm">{data.user.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Joined:</span>
              <span className="text-sm">
                {new Date(data.user.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <Badge variant={data.user.status === 'active' ? 'default' : 'secondary'}>
                {data.user.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Info */}
      {data.profile && (
        <Card>
          <CardHeader>
            <CardTitle>Affiliate Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium">Referral Code:</span>
                <code className="ml-2 text-sm bg-muted px-2 py-1 rounded">
                  {data.profile.referral_code}
                </code>
              </div>
              <div>
                <span className="text-sm font-medium">Status:</span>
                <Badge className="ml-2" variant={data.profile.approved ? 'default' : 'secondary'}>
                  {data.profile.approved ? 'Approved' : 'Pending'}
                </Badge>
              </div>
              {data.profile.current_tier_name && (
                <div>
                  <span className="text-sm font-medium">Current Tier:</span>
                  <span className="ml-2 text-sm">{data.profile.current_tier_name}</span>
                </div>
              )}
              <div>
                <span className="text-sm font-medium">Effective Rate:</span>
                <span className="ml-2 text-sm">{data.profile.effective_rate}%</span>
              </div>
            </div>
            {data.profile.website_url && (
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Website:</span>
                <a
                  href={data.profile.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {data.profile.website_url}
                </a>
              </div>
            )}
            {data.profile.promotion_strategy && (
              <div>
                <span className="text-sm font-medium">Promotion Strategy:</span>
                <p className="text-sm text-muted-foreground mt-1">
                  {data.profile.promotion_strategy}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Wallet */}
      {data.wallet && (
        <Card>
          <CardHeader>
            <CardTitle>Wallet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Balance</span>
              <p className="text-2xl font-bold">${parseFloat(data.wallet.balance).toFixed(2)}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Total Earned</span>
              <p className="text-xl">${parseFloat(data.wallet.total_earned).toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Commission Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Custom Commission
            </CardTitle>
            {!showCommissionForm && (
              <div className="flex gap-2">
                {data.custom_commission ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEditCustomCommission}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDisableCustomCommission}
                      disabled={disableCustomCommissionMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Disable
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCommissionForm(true)}
                  >
                    Set Custom Commission
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {showCommissionForm ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active">Active</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable the custom commission
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={commissionData.is_active}
                  onCheckedChange={(checked) =>
                    setCommissionData({ ...commissionData, is_active: checked })
                  }
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="commission_rate">
                    Commission Rate (%)
                  </Label>
                  <Input
                    id="commission_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="10.00"
                    value={commissionData.commission_rate}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                        setCommissionData({ ...commissionData, commission_rate: value });
                      }
                    }}
                    className={validationErrors.commission_rate ? 'border-red-500' : ''}
                  />
                  {validationErrors.commission_rate && (
                    <p className="text-sm text-red-500">{validationErrors.commission_rate}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fixed_amount">
                    Fixed Amount per Referral ($)
                  </Label>
                  <Input
                    id="fixed_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="50.00"
                    value={commissionData.fixed_amount_per_referral}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                        setCommissionData({ ...commissionData, fixed_amount_per_referral: value });
                      }
                    }}
                    className={validationErrors.fixed_amount_per_referral ? 'border-red-500' : ''}
                  />
                  {validationErrors.fixed_amount_per_referral && (
                    <p className="text-sm text-red-500">{validationErrors.fixed_amount_per_referral}</p>
                  )}
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Note: Either commission rate or fixed amount must be provided (or both)
              </p>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this custom commission..."
                  value={commissionData.notes}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 500) {
                      setCommissionData({ ...commissionData, notes: value });
                    }
                  }}
                  rows={3}
                  className={validationErrors.notes ? 'border-red-500' : ''}
                />
                <div className="flex justify-between">
                  {validationErrors.notes && (
                    <p className="text-sm text-red-500">{validationErrors.notes}</p>
                  )}
                  <p className="text-xs text-muted-foreground ml-auto">
                    {commissionData.notes.length}/500
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSetCustomCommission}
                  disabled={setCustomCommissionMutation.isPending}
                >
                  {setCustomCommissionMutation.isPending ? 'Saving...' : 'Save Custom Commission'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCommissionForm(false);
                    setCommissionData({
                      is_active: true,
                      commission_rate: '',
                      fixed_amount_per_referral: '',
                      notes: '',
                    });
                    setValidationErrors({});
                  }}
                  disabled={setCustomCommissionMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : data.custom_commission ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={data.custom_commission.is_active ? 'default' : 'secondary'}>
                  {data.custom_commission.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {data.custom_commission.commission_rate && (
                <div>
                  <span className="text-sm text-muted-foreground">Rate:</span>
                  <p className="text-lg font-semibold">{data.custom_commission.commission_rate}%</p>
                </div>
              )}
              {data.custom_commission.fixed_amount_per_referral && (
                <div>
                  <span className="text-sm text-muted-foreground">Fixed Amount:</span>
                  <p className="text-lg font-semibold">${data.custom_commission.fixed_amount_per_referral}</p>
                </div>
              )}
              {data.custom_commission.notes && (
                <div className="mt-3">
                  <span className="text-sm font-medium">Notes:</span>
                  <p className="text-sm text-muted-foreground mt-1">{data.custom_commission.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No custom commission set. Using tier-based commission.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

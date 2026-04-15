import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, AlertCircle, Phone, MapPin, Mail, Award, TrendingUp, Target, DollarSign, Calendar, Activity, CreditCard, TrendingDown, FileText, KeyRound, Loader2, UserCheck, Copy } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getCountryNameSafe } from '@/lib/utils/countryUtils';
import { challengeService, type ChallengeEnrollment } from '@/services/challengeService';
import { traderService } from '@/services/traderService';
import { apiService } from '@/services/apiService';
import { orderService } from '@/services/orderService';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

interface DisplayTrader {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  fullAddress: string;
  kycStatus: 'approved' | 'rejected' | 'pending' | 'not_submitted';
  hasLiveAccount: boolean;
  registeredAt: Date;
  challenges: { 
    id: string; 
    status: string;
    name?: string;
    type?: string;
    product_name?: string;
    target_amount?: number;
    current_amount?: number;
    start_date?: string;
    end_date?: string;
    profit_target?: number;
    max_loss?: number;
    daily_loss_limit?: number;
    phase?: string;
  }[];
  accounts: { status: string }[];
}

interface TraderViewDialogProps {
  trader: DisplayTrader;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TraderViewDialog: React.FC<TraderViewDialogProps> = ({
  trader,
  open,
  onOpenChange,
}) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string>('');
  const [showGeneratedPasswordDialog, setShowGeneratedPasswordDialog] = useState(false);
  const [fullAddressFromOrder, setFullAddressFromOrder] = useState<string>('');
  const [countryCodeFromOrder, setCountryCodeFromOrder] = useState<string>('');
  const [loadingAddress, setLoadingAddress] = useState(false);

  // Fetch detailed challenge enrollments
  const { 
    data: challengeEnrollments = [], 
    isLoading: challengesLoading,
    error: challengesError 
  } = useQuery({
    queryKey: ['challenge-enrollments', trader.email],
    queryFn: () => challengeService.getChallengeEnrollmentsByEmail(trader.email),
    enabled: open && !!trader.email
  });

  // Fetch address from orders
  const { data: orderData } = useQuery({
    queryKey: ['order-address', trader.email],
    queryFn: async () => {
      setLoadingAddress(true);
      try {
        const response = await orderService.getOrders({ 
          search: trader.email,
          page_size: 1 
        });
        
        if (response.results?.orders && response.results.orders.length > 0) {
          const order = response.results.orders[0];
          if (order.billing_address) {
            const addr = order.billing_address;
            const parts = [
              addr.address_line_1,
              addr.address_line_2,
              addr.city,
              addr.state,
              addr.postcode,
            ].filter(Boolean);
            const fullAddress = parts.join(', ');
            setFullAddressFromOrder(fullAddress);
            setCountryCodeFromOrder(addr.country || '');
            return fullAddress;
          }
        }
        return '';
      } finally {
        setLoadingAddress(false);
      }
    },
    enabled: open && !!trader.email
  });

  // Generate password mutation
  const generatePasswordMutation = useMutation({
    mutationFn: (length: number = 10) => apiService.post('/admin/users/generate-password/', { 
      email: trader.email,
      length 
    }),
    onSuccess: (response: any) => {
      if (response.data?.password) {
        setGeneratedPassword(response.data.password);
        setShowGeneratedPasswordDialog(true);
        toast({
          title: "Password Generated Successfully",
          description: response.data.message || "New password has been generated",
          variant: "default",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Password Generation Failed",
        description: error.message || "Failed to generate password. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: (email: string) => traderService.resetTraderPassword(email),
    onSuccess: (data) => {
      toast({
        title: "Password Reset Successfully",
        description: data.message || `New password has been sent to ${trader.email}`,
        variant: "default",
      });
      setShowResetPasswordDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Password Reset Failed",
        description: error.message || "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Impersonate mutation
  const impersonateMutation = useMutation({
    mutationFn: (userId: string) => traderService.impersonateTrader(userId),
    onSuccess: (data) => {
      const clientUrl = `https://dashboard.we-fund.com/impersonate?ticket=${data.ticket}`;
      window.open(clientUrl, "_blank");
      toast({
        title: "Impersonation Started",
        description: `Successfully impersonating ${trader.firstName} ${trader.lastName}`,
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Impersonation Failed",
        description: error.message || "Failed to impersonate trader. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleGeneratePassword = () => {
    generatePasswordMutation.mutate(12); // Generate 12-character password
  };

  const handleResetPassword = () => {
    resetPasswordMutation.mutate(trader.email);
  };

  const handleImpersonate = () => {
    impersonateMutation.mutate(trader.id);
  };

  const getKycStatusIcon = (status: DisplayTrader['kycStatus']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'rejected':
        return <XCircle size={16} className="text-red-500" />;
      case 'pending':
        return <Clock size={16} className="text-yellow-500" />;
      case 'not_submitted':
        return <AlertCircle size={16} className="text-gray-500" />;
    }
  };

  const getKycStatusText = (status: DisplayTrader['kycStatus']) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'pending':
        return 'Pending';
      case 'not_submitted':
        return 'Not Submitted';
    }
  };

  const getChallengeStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'passed':
      case 'phase_1_in_progress':
      case 'phase_2_in_progress':
      case 'live_in_progress':
        return 'default';
      case 'failed':
      case 'terminated':
        return 'destructive';
      case 'pending':
      case 'evaluation':
      case 'completed':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getPhaseStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'phase_1_in_progress':
      case 'phase_2_in_progress':
      case 'live_in_progress':
        return <Activity size={12} className="text-blue-500" />;
      case 'failed':
        return <XCircle size={12} className="text-red-500" />;
      case 'passed':
      case 'completed':
        return <CheckCircle size={12} className="text-green-500" />;
      default:
        return <Clock size={12} className="text-gray-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6 border-b">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-xl font-bold text-primary border-2 border-primary/20">
                  {trader.firstName[0]}{trader.lastName[0]}
                </div>
                {trader.hasLiveAccount && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <Award size={12} className="text-white" />
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{trader.firstName} {trader.lastName}</h2>
                <p className="text-muted-foreground font-normal">{trader.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleImpersonate}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                disabled={impersonateMutation.isPending}
              >
                {impersonateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}
                Impersonate
              </Button>
              <Button
                onClick={handleGeneratePassword}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                disabled={generatePasswordMutation.isPending}
              >
                {generatePasswordMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                Generate Password
              </Button>
              <Button
                onClick={() => setShowResetPasswordDialog(true)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <KeyRound className="h-4 w-4" />
                Reset Password
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Mail size={20} className="text-primary" />
                {t('traders.contactInfo') || 'Contact Information'}
              </h3>
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{trader.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">{trader.phone}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MapPin size={20} className="text-primary" />
                {t('traders.addressInfo') || 'Address Information'}
              </h3>
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('traders.fullAddress') || 'Full Address'}</p>
                  {loadingAddress ? (
                    <p className="text-sm text-muted-foreground">Loading address...</p>
                  ) : (
                    <p className="text-sm font-medium text-muted-foreground">
                      {fullAddressFromOrder || 
                       (trader.fullAddress && trader.fullAddress.trim() !== '' && trader.fullAddress !== 'Not provided' 
                        ? trader.fullAddress 
                        : 'No address information available')}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Country</p>
                  <p className="text-sm font-medium text-muted-foreground">
                    {countryCodeFromOrder 
                      ? getCountryNameSafe(countryCodeFromOrder)
                      : (trader.country && trader.country.trim() !== '' && trader.country !== 'Not specified' 
                        ? getCountryNameSafe(trader.country)
                        : 'No country information available')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Account Status */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle size={20} className="text-primary" />
                {t('traders.accountStatus') || 'Account Status'}
              </h3>
              <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">KYC Status</p>
                    <div className="flex items-center gap-2">
                      {getKycStatusIcon(trader.kycStatus)}
                      <span className="text-sm font-medium">{getKycStatusText(trader.kycStatus)}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">{t('traders.liveAccount') || 'Live Account'}</p>
                    <Badge variant={trader.hasLiveAccount ? "default" : "secondary"} className="text-xs">
                      {trader.hasLiveAccount ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('traders.registrationDate') || 'Registration Date'}</p>
                  <p className="text-sm font-medium">{trader.registeredAt.toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Trading Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp size={20} className="text-primary" />
                {t('traders.tradingInfo') || 'Trading Information'}
              </h3>
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{challengeEnrollments.length}</p>
                    <p className="text-xs text-muted-foreground">{t('traders.totalChallenges') || 'Total Challenges'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{trader.accounts.filter(a => a.status === 'active').length}</p>
                    <p className="text-xs text-muted-foreground">{t('traders.activeAccounts') || 'Active Accounts'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full Width Bottom Sections */}
        <div className="space-y-6 border-t pt-6">
          {/* Challenges Details */}
          {challengesLoading ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('traders.challengeDetails') || 'Challenge Details'}</h3>
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </div>
          ) : challengesError ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('traders.challengeDetails') || 'Challenge Details'}</h3>
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle size={48} className="mx-auto mb-2" />
                <p>Failed to load challenge details</p>
              </div>
            </div>
          ) : challengeEnrollments.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('traders.challengeDetails') || 'Challenge Details'}</h3>
              <div className="grid grid-cols-1 gap-4">
                {challengeEnrollments.map((enrollment: ChallengeEnrollment) => (
                  <div key={enrollment.id} className="border rounded-lg p-4 bg-card hover:shadow-md transition-shadow">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Target size={16} className="text-primary mt-0.5" />
                          <div>
                            <h4 className="font-semibold text-sm">
                              {enrollment.challenge.name}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {enrollment.challenge.step_type} Challenge
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getPhaseStatusIcon(enrollment.status)}
                          <Badge 
                            variant={getChallengeStatusVariant(enrollment.status)}
                            className="text-xs"
                          >
                            {enrollment.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Account Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                          <DollarSign size={12} className="text-green-600" />
                          <div>
                            <span className="text-muted-foreground">Account Size:</span>
                            <div className="font-medium">{formatCurrency(Number(enrollment.account_size))}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                          <Calendar size={12} className="text-blue-600" />
                          <div>
                            <span className="text-muted-foreground">Start Date:</span>
                            <div className="font-medium">{formatDate(enrollment.start_date)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                          <CreditCard size={12} className="text-purple-600" />
                          <div>
                            <span className="text-muted-foreground">Currency:</span>
                            <div className="font-medium">{enrollment.currency}</div>
                          </div>
                        </div>
                      </div>

                      {/* MT5 Account Details */}
                      {enrollment.mt5_account_id && (
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <h5 className="text-xs font-medium text-muted-foreground mb-2">MT5 Account Details</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Account ID:</span>
                              <span className="ml-2 font-mono">{enrollment.mt5_account_id}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Broker:</span>
                              <span className="ml-2 font-medium uppercase">{enrollment.broker_type}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Challenge Phases */}
                      {enrollment.challenge.phases && enrollment.challenge.phases.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-xs font-medium text-muted-foreground">Challenge Phases</h5>
                          <div className="grid grid-cols-1 gap-2">
                            {enrollment.challenge.phases.map((phase) => (
                              <div key={phase.id} className="p-2 border rounded bg-background/50">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium">{phase.phase_type_display}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {phase.trading_period}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                  {phase.profit_target && (
                                    <div className="flex items-center gap-1">
                                      <Target size={10} className="text-green-600" />
                                      <span className="text-muted-foreground">Target:</span>
                                      <span className="font-medium">{phase.profit_target}%</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <TrendingDown size={10} className="text-red-600" />
                                    <span className="text-muted-foreground">Max Loss:</span>
                                    <span className="font-medium">{phase.max_loss}%</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <AlertCircle size={10} className="text-orange-600" />
                                    <span className="text-muted-foreground">Daily Loss:</span>
                                    <span className="font-medium">{phase.max_daily_loss}%</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Calendar size={10} className="text-blue-600" />
                                    <span className="text-muted-foreground">Min Days:</span>
                                    <span className="font-medium">{phase.min_trading_days}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('traders.challengeDetails') || 'Challenge Details'}</h3>
              <div className="text-center py-8 text-muted-foreground">
                <Target size={48} className="mx-auto mb-2" />
                <p>No challenges found for this trader</p>
              </div>
            </div>
          )}

          {/* Accounts Details */}
          {trader.accounts.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('traders.accountDetails') || 'Account Details'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {trader.accounts.map((account, index) => (
                  <div key={index} className="border rounded-lg p-3 bg-card">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Account #{index + 1}</span>
                      <Badge variant={account.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                        {account.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Reset Password Confirmation Dialog */}
      <AlertDialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-600" />
              Reset Password for {trader.firstName} {trader.lastName}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This action will generate a new random password for <strong>{trader.email}</strong> and send it via email.
              </p>
              <p className="text-amber-600 font-medium">
                The trader will receive their new login credentials immediately.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetPasswordMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleResetPassword}
              disabled={resetPasswordMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {resetPasswordMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetting Password...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4 mr-2" />
                  Reset Password
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generated Password Dialog */}
      <AlertDialog open={showGeneratedPasswordDialog} onOpenChange={setShowGeneratedPasswordDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generated Password</AlertDialogTitle>
            <AlertDialogDescription>
              A new password has been generated for {trader.firstName} {trader.lastName}. 
              Please copy this password and share it securely with the trader.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <code className="text-lg font-mono font-bold">{generatedPassword}</code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(generatedPassword);
                  toast({
                    title: "Password Copied",
                    description: "Password has been copied to clipboard",
                    variant: "default",
                  });
                }}
              >
                Copy
              </Button>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowGeneratedPasswordDialog(false)}>
              Done
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default TraderViewDialog;

import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown, DollarSign, TrendingUp, AlertCircle, X } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { apiService } from '@/services/apiService';
import { cn } from "@/lib/utils";
import CloseTradesDialog from '@/components/enrollment-review/CloseTradesDialog';

interface PreSelectedClient {
  id: string;
  full_name: string;
  email: string;
}

interface PayoutRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preSelectedClient?: PreSelectedClient;
}

interface ClientDropdownItem {
  id: string;
  full_name: string;
  email: string;
}

interface ChallengeEnrollmentItem {
  id: string;
  mt5_account_id: string;
  account_size: string;
  status: string;
  trader_name: string;
  trader_email: string;
  challenge_name: string;
}

interface AccountPnLData {
  account_id: string;
  client_name: string;
  client_email: string;
  status: string;
  account_size: string;
  currency: string;
  raw_balance: string | null;
  raw_equity: string | null;
  available_pnl: string | null;
  profit_share_percent: string | null;
  net_pnl: string | null;
  open_positions: boolean;
}

interface PaymentMethod {
  id: string;
  payment_type: 'paypal' | 'bank' | 'crypto' | 'rise';
  paypal_email?: string;
  rise_email?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  iban?: string;
  swift_code?: string;
  bank_name?: string;
  bank_branch?: string;
  bank_country?: string;
  bank_currency?: string;
  crypto_type?: string;
  crypto_wallet_address?: string;
  is_default: boolean;
  label?: string;
  created_at: string;
}

interface PayoutFormData {
  trader: string;
  challenge_enrollment?: string;
  amount: string;
  profit: string;
  profit_share: string;
  method: string;
  method_details: Record<string, any>;
  admin_note?: string;
}

const PayoutRequestDialog: React.FC<PayoutRequestDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preSelectedClient,
}) => {
  const { toast } = useToast();
  const [clientComboboxOpen, setClientComboboxOpen] = useState(false);
  const [clientSearchValue, setClientSearchValue] = useState('');
  const [challengeComboboxOpen, setChallengeComboboxOpen] = useState(false);
  const [challengeSearchValue, setChallengeSearchValue] = useState('');
  const [showCloseTradesDialog, setShowCloseTradesDialog] = useState(false);
  const [formData, setFormData] = useState<PayoutFormData>({
    trader: preSelectedClient?.id || '',
    challenge_enrollment: '',
    amount: '',
    profit: '',
    profit_share: '80',
    method: '',
    method_details: {},
    admin_note: '',
  });

  // Sync preSelectedClient when dialog opens
  React.useEffect(() => {
    if (isOpen && preSelectedClient) {
      setFormData(prev => ({ ...prev, trader: preSelectedClient.id }));
    }
  }, [isOpen, preSelectedClient]);

  // Fetch clients for dropdown
  const { data: clients, isLoading: clientsLoading, error: clientsError } = useQuery({
    queryKey: ['clients-dropdown'],
    queryFn: async () => {
      const response = await apiService.get<ClientDropdownItem[]>('/admin/clients-dropdown/');
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || [];
    },
    enabled: isOpen && !preSelectedClient, // Only fetch when dialog is open and no pre-selected client
  });

  // When preSelectedClient is provided, include it in the clients list for lookups
  const clientsList = preSelectedClient 
    ? [preSelectedClient] 
    : (Array.isArray(clients) ? clients : []);

  // Filter clients based on search value - ensure it's always an array
  const filteredClients = clientsList.filter(client => 
    client && 
    client.full_name && 
    client.email &&
    (client.full_name.toLowerCase().includes(clientSearchValue.toLowerCase()) ||
     client.email.toLowerCase().includes(clientSearchValue.toLowerCase()))
  );

  // Fetch challenge enrollments for selected client
  const { data: challengeEnrollments, isLoading: challengesLoading, error: challengesError } = useQuery({
    queryKey: ['challenge-enrollments', formData.trader],
    queryFn: async () => {
      if (!formData.trader) return [];
      
      const selectedClient = clientsList.find(client => client.id.toString() === formData.trader);
      if (!selectedClient) return [];

      const response = await apiService.get<ChallengeEnrollmentItem[]>(
        `/admin/challenge-enrollment-dropdown/?search=${encodeURIComponent(selectedClient.email)}`
      );
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || [];
    },
    enabled: isOpen && !!formData.trader, // Only fetch when dialog is open and client is selected
  });

  const challengeEnrollmentsList = Array.isArray(challengeEnrollments) ? challengeEnrollments : [];

  // Filter challenge enrollments based on search value
  const filteredChallengeEnrollments = challengeEnrollmentsList.filter(enrollment => 
    enrollment && 
    enrollment.challenge_name && 
    enrollment.mt5_account_id &&
    (enrollment.challenge_name.toLowerCase().includes(challengeSearchValue.toLowerCase()) ||
     enrollment.mt5_account_id.toLowerCase().includes(challengeSearchValue.toLowerCase()) ||
     enrollment.status.toLowerCase().includes(challengeSearchValue.toLowerCase()))
  );

  // Get selected client and challenge enrollment for display
  const selectedClient = clientsList.find(client => client && client.id && client.id.toString() === formData.trader);
  const selectedChallengeEnrollment = challengeEnrollmentsList.find(enrollment => 
    enrollment && enrollment.id && enrollment.id.toString() === formData.challenge_enrollment
  );

  // Fetch P&L data when challenge enrollment is selected
  const { data: pnlData, isLoading: pnlLoading, error: pnlError } = useQuery({
    queryKey: ['account-pnl', selectedChallengeEnrollment?.mt5_account_id],
    queryFn: async () => {
      if (!selectedChallengeEnrollment?.mt5_account_id) return null;
      
      const response = await apiService.get<AccountPnLData>(
        `/admin/account/pnl/?account_id=${selectedChallengeEnrollment.mt5_account_id}`
      );
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: isOpen && !!selectedChallengeEnrollment?.mt5_account_id,
  });

  // Fetch payment methods for selected client
  const { data: paymentMethods, isLoading: paymentMethodsLoading, error: paymentMethodsError } = useQuery({
    queryKey: ['payment-methods', formData.trader],
    queryFn: async () => {
      if (!formData.trader) return [];
      
      try {
        const selectedClient = clientsList.find(client => client.id.toString() === formData.trader);
        const clientEmail = selectedClient?.email;
        console.log('Fetching payment methods for client email:', clientEmail);
        
        if (!clientEmail) {
          console.warn('No email found for selected client');
          return [];
        }
        
        const response = await apiService.get<PaymentMethod[]>(
          `/admin/trader/payment-methods/?identifier=${encodeURIComponent(clientEmail)}`
        );
        console.log('Payment methods API response:', response);
        if (response.error) {
          console.warn('Payment methods API error:', response.error);
          // If it's a 404, it means the user doesn't have "client" role
          if (response.status === 404) {
            console.warn('User not found as client or no payment methods exist');
          }
          return [];
        }
        return response.data || [];
      } catch (error) {
        console.warn('Payment methods API failed:', error);
        // Return empty array instead of throwing to allow graceful fallback
        return [];
      }
    },
    enabled: isOpen && !!formData.trader,
    retry: false, // Don't retry on server errors
  });

  const paymentMethodsList = Array.isArray(paymentMethods) ? paymentMethods : [];


  // Reset search when combobox closes
  const handleClientComboboxOpenChange = (open: boolean) => {
    setClientComboboxOpen(open);
    if (!open) {
      setClientSearchValue('');
    }
  };

  const handleChallengeComboboxOpenChange = (open: boolean) => {
    setChallengeComboboxOpen(open);
    if (!open) {
      setChallengeSearchValue('');
    }
  };

  // Reset challenge enrollment when client changes
  const handleClientChange = (clientId: string) => {
    setFormData({ 
      ...formData, 
      trader: clientId,
      challenge_enrollment: '' // Reset challenge selection when client changes
    });
    setClientComboboxOpen(false);
  };

  const createMutation = useMutation({
    mutationFn: async (data: {
      client_email: string;
      mt5_account_id: string;
      payment_method: string;
      method_details: Record<string, any>;
      admin_note?: string;
    }) => {
      const response = await apiService.post('/admin/trader/create-payout/', data);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payout request created successfully",
      });
      onSuccess();
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create payout request",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      trader: preSelectedClient?.id || '',
      challenge_enrollment: '',
      amount: '',
      profit: '',
      profit_share: '80',
      method: '',
      method_details: {},
      admin_note: '',
    });
  };

  const getMethodDetailsFromPaymentMethod = (method: PaymentMethod) => {
    switch (method.payment_type) {
      case 'paypal':
        return { paypal_email: method.paypal_email || '' };
      case 'rise':
        return { rise_email: method.rise_email || '' };
      case 'bank':
        return {
          bank_name: method.bank_name || '',
          bank_account: method.bank_account_number || '',
          routing_number: method.swift_code || '',
        };
      case 'crypto':
        return {
          crypto_wallet: method.crypto_wallet_address || '',
          crypto_type: method.crypto_type || 'BTC',
        };
      default:
        return {};
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Find the selected client and challenge enrollment
    const selectedClient = clients?.find(client => String(client.id) === formData.trader);
    const selectedEnrollment = challengeEnrollments?.find(enrollment => enrollment.id === formData.challenge_enrollment);
    
    if (!selectedClient || !selectedEnrollment) {
      toast({
        title: "Error",
        description: "Please select both client and challenge enrollment",
        variant: "destructive",
      });
      return;
    }
    
    // Prepare method details based on selected method
    let methodDetails = {};
    if (formData.method === 'paypal') {
      methodDetails = { paypal_email: formData.method_details.paypal_email || '' };
    } else if (formData.method === 'bank') {
      methodDetails = {
        bank_name: formData.method_details.bank_name || '',
        bank_account: formData.method_details.bank_account || '',
        routing_number: formData.method_details.routing_number || '',
      };
    } else if (formData.method === 'crypto') {
      methodDetails = {
        crypto_wallet: formData.method_details.crypto_wallet || '',
        crypto_type: formData.method_details.crypto_type || 'BTC',
      };
    } else if (formData.method === 'rise') {
      methodDetails = {
        rise_email: formData.method_details.rise_email || '',
      };
    }

    createMutation.mutate({
      client_email: selectedClient.email,
      mt5_account_id: selectedEnrollment.mt5_account_id,
      payment_method: formData.method,
      method_details: methodDetails,
      admin_note: formData.admin_note,
    });
  };

  const handleMethodDetailsChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      method_details: {
        ...prev.method_details,
        [key]: value,
      },
    }));
  };

  const renderMethodDetailsFields = () => {
    switch (formData.method) {
      case 'paypal':
        return (
          <div className="space-y-2">
            <Label htmlFor="paypal_email">PayPal Email</Label>
            <Input
              id="paypal_email"
              type="email"
              value={formData.method_details.paypal_email || ''}
              onChange={(e) => handleMethodDetailsChange('paypal_email', e.target.value)}
              placeholder="trader@example.com"
              required
            />
          </div>
        );
      
      case 'bank':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Bank Name</Label>
              <Input
                id="bank_name"
                value={formData.method_details.bank_name || ''}
                onChange={(e) => handleMethodDetailsChange('bank_name', e.target.value)}
                placeholder="Chase Bank"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_account">Account Number</Label>
              <Input
                id="bank_account"
                value={formData.method_details.bank_account || ''}
                onChange={(e) => handleMethodDetailsChange('bank_account', e.target.value)}
                placeholder="1234567890"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="routing_number">Routing Number</Label>
              <Input
                id="routing_number"
                value={formData.method_details.routing_number || ''}
                onChange={(e) => handleMethodDetailsChange('routing_number', e.target.value)}
                placeholder="021000021"
                required
              />
            </div>
          </div>
        );
      
      case 'crypto':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="crypto_type">Cryptocurrency</Label>
              <Select 
                value={formData.method_details.crypto_type || 'BTC'} 
                onValueChange={(value) => handleMethodDetailsChange('crypto_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                  <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                  <SelectItem value="USDT">Tether (USDT)</SelectItem>
                  <SelectItem value="USDC">USD Coin (USDC)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="crypto_wallet">Wallet Address</Label>
              <Input
                id="crypto_wallet"
                value={formData.method_details.crypto_wallet || ''}
                onChange={(e) => handleMethodDetailsChange('crypto_wallet', e.target.value)}
                placeholder="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
                required
              />
            </div>
          </div>
        );
      
      case 'rise':
        return (
          <div className="space-y-2">
            <Label htmlFor="rise_email">Rise Email</Label>
            <Input
              id="rise_email"
              type="email"
              value={formData.method_details.rise_email || ''}
              onChange={(e) => handleMethodDetailsChange('rise_email', e.target.value)}
              placeholder="trader@rise.com"
              required
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Create New Payout Request</h2>
              {preSelectedClient && (
                <p className="text-xs text-muted-foreground font-normal mt-0.5">
                  For {preSelectedClient.full_name} ({preSelectedClient.email})
                </p>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
          {!preSelectedClient && (
            <div className="space-y-2">
              <Label>Select Client</Label>
              <Popover open={clientComboboxOpen} onOpenChange={handleClientComboboxOpenChange}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientComboboxOpen}
                    className="w-full justify-between"
                    disabled={clientsLoading}
                  >
                    {selectedClient ? `${selectedClient.full_name} - ${selectedClient.email}` : 
                     clientsLoading ? "Loading clients..." : "Select client..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <div className="flex flex-col">
                    <div className="flex items-center border-b px-3">
                      <Input
                        placeholder="Search clients..."
                        value={clientSearchValue}
                        onChange={(e) => setClientSearchValue(e.target.value)}
                        className="h-9 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                    <div className="max-h-64 overflow-auto">
                      {clientsLoading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Loading clients...
                        </div>
                      ) : clientsError ? (
                        <div className="p-4 text-center text-sm text-destructive">
                          Error loading clients
                        </div>
                      ) : filteredClients.length > 0 ? (
                        filteredClients.map((client) => (
                          <div
                            key={client.id}
                            onClick={() => handleClientChange(String(client.id))}
                            className="flex items-center px-3 py-2 text-sm hover:bg-primary/20 hover:text-primary-foreground cursor-pointer"
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                formData.trader === String(client.id) ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            <span className="font-medium">{client.full_name} - {client.email}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No clients found
                        </div>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="space-y-2">
            <Label>Challenge Enrollment</Label>
            <Popover open={challengeComboboxOpen} onOpenChange={handleChallengeComboboxOpenChange}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={challengeComboboxOpen}
                  className="w-full justify-between"
                  disabled={challengesLoading || !formData.trader}
                >
                  {selectedChallengeEnrollment ? 
                    `${selectedChallengeEnrollment.challenge_name} - ${selectedChallengeEnrollment.mt5_account_id}` : 
                   challengesLoading ? "Loading challenges..." : 
                   !formData.trader ? "Select client first..." :
                   "Select challenge enrollment..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <div className="flex flex-col">
                  <div className="flex items-center border-b px-3">
                    <Input
                      placeholder="Search challenges..."
                      value={challengeSearchValue}
                      onChange={(e) => setChallengeSearchValue(e.target.value)}
                      className="h-9 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  <div className="max-h-64 overflow-auto">
                    {challengesLoading ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Loading challenges...
                      </div>
                    ) : challengesError ? (
                      <div className="p-4 text-center text-sm text-destructive">
                        Error loading challenges
                      </div>
                    ) : !formData.trader ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Please select a client first
                      </div>
                    ) : filteredChallengeEnrollments.length > 0 ? (
                      filteredChallengeEnrollments.map((enrollment) => (
                        <div
                          key={enrollment.id}
                          onClick={() => {
                            setFormData({ ...formData, challenge_enrollment: String(enrollment.id) });
                            setChallengeComboboxOpen(false);
                          }}
                          className="flex items-center px-3 py-2 text-sm hover:bg-primary/20 hover:text-primary-foreground cursor-pointer"
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              formData.challenge_enrollment === String(enrollment.id) ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{enrollment.challenge_name}</span>
                            <div className="text-xs text-muted-foreground">
                              <span>MT5: {enrollment.mt5_account_id}</span>
                              <span className="ml-2">Size: ${enrollment.account_size}</span>
                              <span className="ml-2">Status: {enrollment.status}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No challenge enrollments found
                      </div>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Account P&L Information */}
          {selectedChallengeEnrollment && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Live Account Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pnlLoading ? (
                  <div className="text-center text-sm text-muted-foreground py-4">
                    Loading account data...
                  </div>
                ) : pnlError ? (
                  <div className="flex items-center gap-2 text-sm text-destructive py-4">
                    <AlertCircle className="h-4 w-4" />
                    Error loading account data
                  </div>
                ) : pnlData ? (
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Account Size</div>
                      <div className="font-medium">${pnlData.account_size}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Current Balance</div>
                      <div className="font-medium">
                        {pnlData.raw_balance ? `$${parseFloat(pnlData.raw_balance).toFixed(2)}` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Current Equity</div>
                      <div className="font-medium">
                        {pnlData.raw_equity ? `$${parseFloat(pnlData.raw_equity).toFixed(2)}` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Available P&L</div>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${
                          pnlData.available_pnl && parseFloat(pnlData.available_pnl) > 0 
                            ? 'text-green-600' 
                            : pnlData.available_pnl && parseFloat(pnlData.available_pnl) < 0
                            ? 'text-red-600'
                            : ''
                        }`}>
                          {pnlData.available_pnl ? `$${parseFloat(pnlData.available_pnl).toFixed(2)}` : 'N/A'}
                        </span>
                        {pnlData.available_pnl && parseFloat(pnlData.available_pnl) > 0 && (
                          <TrendingUp className="h-3 w-3 text-green-600" />
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Profit Share %</div>
                      <div className="font-medium">
                        {pnlData.profit_share_percent ? `${pnlData.profit_share_percent}%` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Net P&L</div>
                      <div className={`font-medium ${
                        pnlData.net_pnl && parseFloat(pnlData.net_pnl) > 0 
                          ? 'text-green-600' 
                          : pnlData.net_pnl && parseFloat(pnlData.net_pnl) < 0
                          ? 'text-red-600'
                          : ''
                      }`}>
                        {pnlData.net_pnl ? `$${parseFloat(pnlData.net_pnl).toFixed(2)}` : 'N/A'}
                      </div>
                    </div>
                    <div className="col-span-2 md:col-span-6">
                      <div className="flex items-center gap-4 pt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Status:</span>
                          <Badge variant="outline">{pnlData.status}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Open Positions:</span>
                          <Badge variant={pnlData.open_positions ? "destructive" : "secondary"}>
                            {pnlData.open_positions ? "Yes" : "No"}
                          </Badge>
                          {pnlData.open_positions && selectedChallengeEnrollment && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => setShowCloseTradesDialog(true)}
                              className="flex items-center gap-1 h-6 px-2 text-xs"
                            >
                              <X className="h-3 w-3" />
                              Close All Trades
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profit">Total Profit ($)</Label>
              <div className="flex gap-2">
                <Input
                  id="profit"
                  type="number"
                  step="0.01"
                  value={formData.profit}
                  onChange={(e) => setFormData(prev => ({ ...prev, profit: e.target.value }))}
                  placeholder="0.00"
                  required
                  className="flex-1"
                />
                {pnlData?.available_pnl && parseFloat(pnlData.available_pnl) > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, profit: pnlData.available_pnl || '' }))}
                    className="px-3 whitespace-nowrap"
                  >
                    Use P&L (${parseFloat(pnlData.available_pnl).toFixed(2)})
                  </Button>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount">Payout Amount ($)</Label>
              <div className="flex gap-2">
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="Leave empty for auto-calculation"
                  className="flex-1"
                />
                {pnlData?.net_pnl && parseFloat(pnlData.net_pnl) > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, amount: pnlData.net_pnl || '' }))}
                    className="px-3 whitespace-nowrap"
                  >
                    Use Net P&L (${parseFloat(pnlData.net_pnl).toFixed(2)})
                  </Button>
                )}
              </div>
            </div>
          </div>
          {/* Payment Methods Section */}
          {formData.trader && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Client Payment Methods</Label>
                {paymentMethodsLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground bg-muted rounded-lg">
                    Loading payment methods...
                  </div>
                ) : paymentMethodsList.length > 0 ? (
                  <div className="grid gap-3">
                    {paymentMethodsList.map((method) => (
                      <Card 
                        key={method.id} 
                        className={`cursor-pointer transition-colors ${
                          formData.method === method.payment_type ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => {
                          setFormData(prev => ({ 
                            ...prev, 
                            method: method.payment_type,
                            method_details: getMethodDetailsFromPaymentMethod(method)
                          }));
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full border-2 ${
                                formData.method === method.payment_type 
                                  ? 'bg-primary border-primary' 
                                  : 'border-muted-foreground'
                              }`} />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium capitalize">{method.payment_type}</span>
                                  {method.is_default && (
                                    <Badge variant="secondary" className="text-xs">Default</Badge>
                                  )}
                                  {method.label && (
                                    <Badge variant="outline" className="text-xs">{method.label}</Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {method.payment_type === 'paypal' && method.paypal_email}
                                  {method.payment_type === 'rise' && method.rise_email}
                                  {method.payment_type === 'bank' && method.bank_name && (
                                    `${method.bank_name} - ${method.bank_account_number || 'N/A'}`
                                  )}
                                  {method.payment_type === 'crypto' && method.crypto_type && (
                                    `${method.crypto_type} - ${method.crypto_wallet_address?.substring(0, 20)}...`
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground bg-muted rounded-lg">
                    <div className="mb-2">No saved payment methods found for this client.</div>
                    <div className="text-xs">Please use the manual method selection below.</div>
                  </div>
                )}
              </div>

            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="admin_note">Admin Note (Optional)</Label>
            <Textarea
              id="admin_note"
              value={formData.admin_note}
              onChange={(e) => setFormData(prev => ({ ...prev, admin_note: e.target.value }))}
              placeholder="Internal notes..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2 border-t border-border/50 -mx-6 px-6 pb-1 mt-6 bg-muted/20 rounded-b-xl py-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending}
              className="flex-1"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Payout Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
      
      {selectedChallengeEnrollment && (
        <CloseTradesDialog
          open={showCloseTradesDialog}
          onOpenChange={setShowCloseTradesDialog}
          enrollmentId={selectedChallengeEnrollment.id}
          tradesCount={0}
        />
      )}
    </Dialog>
  );
};

export default PayoutRequestDialog;

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/apiService';
import { certificateService } from '@/services/certificateService';
import { cn } from '@/lib/utils';

interface GenerateCertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClientEmail?: string;
  defaultClientName?: string;
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

const GenerateCertificateDialog: React.FC<GenerateCertificateDialogProps> = ({
  open,
  onOpenChange,
  defaultClientEmail,
  defaultClientName,
}) => {
  const [step, setStep] = useState<'type' | 'details'>('type');
  const [certificateType, setCertificateType] = useState<'challenge' | 'payout'>('challenge');
  const [clientComboboxOpen, setClientComboboxOpen] = useState(false);
  const [clientSearchValue, setClientSearchValue] = useState('');
  const [challengeComboboxOpen, setChallengeComboboxOpen] = useState(false);
  const [challengeSearchValue, setChallengeSearchValue] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedCertificate, setGeneratedCertificate] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    client_id: '',
    challenge_enrollment_id: '',
    template_key: '',
    title: '',
    payout_id: '',
    profit_share: '',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const hasDefaultClient = !!(defaultClientEmail && defaultClientName);

  // Fetch clients for dropdown
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients-dropdown'],
    queryFn: async () => {
      const response = await apiService.get<ClientDropdownItem[]>('/admin/clients-dropdown/');
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || [];
    },
    enabled: open && (step === 'details' || hasDefaultClient),
  });

  const clientsList = Array.isArray(clients) ? clients : [];

  // Auto-select client when defaultClientEmail is provided
  React.useEffect(() => {
    if (hasDefaultClient && clientsList.length > 0 && !formData.client_id) {
      const match = clientsList.find(c => c.email === defaultClientEmail);
      if (match) {
        setFormData(prev => ({ ...prev, client_id: match.id.toString() }));
      }
    }
  }, [hasDefaultClient, clientsList, defaultClientEmail, formData.client_id]);

  const filteredClients = clientsList.filter(client => 
    client && 
    client.full_name && 
    client.email &&
    (client.full_name.toLowerCase().includes(clientSearchValue.toLowerCase()) ||
     client.email.toLowerCase().includes(clientSearchValue.toLowerCase()))
  );

  // Fetch challenge enrollments for selected client
  const { data: challengeEnrollments, isLoading: challengesLoading } = useQuery({
    queryKey: ['challenge-enrollments', formData.client_id],
    queryFn: async () => {
      if (!formData.client_id) return [];
      
      const selectedClient = clientsList.find(client => client.id.toString() === formData.client_id);
      if (!selectedClient) return [];

      const response = await apiService.get<ChallengeEnrollmentItem[]>(
        `/admin/challenge-enrollment-dropdown/?search=${encodeURIComponent(selectedClient.email)}`
      );
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || [];
    },
    enabled: open && step === 'details' && !!formData.client_id,
  });

  const challengeEnrollmentsList = Array.isArray(challengeEnrollments) ? challengeEnrollments : [];

  const filteredChallengeEnrollments = challengeEnrollmentsList.filter(enrollment => 
    enrollment && 
    enrollment.challenge_name && 
    enrollment.mt5_account_id &&
    (enrollment.challenge_name.toLowerCase().includes(challengeSearchValue.toLowerCase()) ||
     enrollment.mt5_account_id.toLowerCase().includes(challengeSearchValue.toLowerCase()))
  );

  const selectedClient = clientsList.find(client => client && client.id && client.id.toString() === formData.client_id);
  const selectedChallengeEnrollment = challengeEnrollmentsList.find(enrollment => 
    enrollment && enrollment.id && enrollment.id.toString() === formData.challenge_enrollment_id
  );

  const generateChallengeMutation = useMutation({
    mutationFn: async (data: {
      client_email: string;
      mt5_account_id?: string;
      template_key: string;
      title: string;
    }) => {
      const response = await certificateService.generateChallengeCertificate(data);
      if (!response) {
        throw new Error('Failed to generate certificate');
      }
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      setGeneratedCertificate(data);
      setShowSuccessModal(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate certificate",
        variant: "destructive",
      });
    },
  });

  const generatePayoutMutation = useMutation({
    mutationFn: async (data: {
      client_email: string;
      payout_id?: string;
      title: string;
      profit_share?: number;
    }) => {
      const response = await certificateService.generatePayoutCertificate(data);
      if (!response) {
        throw new Error('Failed to generate certificate');
      }
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      setGeneratedCertificate(data);
      setShowSuccessModal(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate payout certificate",
        variant: "destructive",
      });
    },
  });

  // Fetch payouts for selected client (payout certificate)
  const { data: payouts, isLoading: payoutsLoading, refetch: refetchPayouts } = useQuery({
    queryKey: ['client-payouts', formData.client_id],
    queryFn: async () => {
      if (!formData.client_id) return null;
      
      const selectedClient = clientsList.find(client => client.id.toString() === formData.client_id);
      if (!selectedClient) return null;

      const response = await certificateService.lookupPayouts(selectedClient.email);
      return response;
    },
    enabled: false, // Manual trigger only
  });

  const resetForm = () => {
    setStep('type');
    setCertificateType('challenge');
    setFormData({
      client_id: '',
      challenge_enrollment_id: '',
      template_key: '',
      title: '',
      payout_id: '',
      profit_share: '',
    });
    setClientSearchValue('');
    setChallengeSearchValue('');
    setShowSuccessModal(false);
    setGeneratedCertificate(null);
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setGeneratedCertificate(null);
    onOpenChange(false);
    resetForm();
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

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

  const handleClientChange = (clientId: string) => {
    setFormData({ 
      ...formData, 
      client_id: clientId,
      challenge_enrollment_id: '',
    });
    setClientComboboxOpen(false);
  };

  const handleTypeSelection = (type: 'challenge' | 'payout') => {
    setCertificateType(type);
    setStep('details');
  };

  const handleChallengeSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClient) {
      toast({
        title: "Error",
        description: "Please select a client",
        variant: "destructive",
      });
      return;
    }

    if (!formData.template_key || !formData.title) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    generateChallengeMutation.mutate({
      client_email: selectedClient.email,
      mt5_account_id: selectedChallengeEnrollment?.mt5_account_id,
      template_key: formData.template_key,
      title: formData.title,
    });
  };

  const handlePayoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClient) {
      toast({
        title: "Error",
        description: "Please select a client",
        variant: "destructive",
      });
      return;
    }

    if (!formData.title || !formData.profit_share) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    generatePayoutMutation.mutate({
      client_email: selectedClient.email,
      payout_id: formData.payout_id || undefined,
      title: formData.title,
      profit_share: formData.profit_share ? parseFloat(formData.profit_share) : undefined,
    });
  };

  const handleLookupPayouts = () => {
    if (!formData.client_id) {
      toast({
        title: "Error",
        description: "Please select a client first",
        variant: "destructive",
      });
      return;
    }
    refetchPayouts();
  };

  const handleBack = () => {
    setStep('type');
  };

  const renderTypeSelection = () => (
    <div className="space-y-6 py-6">
      <p className="text-sm text-muted-foreground text-center">
        Select the type of certificate you want to generate
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card 
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => handleTypeSelection('challenge')}
        >
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-3xl">🏆</span>
            </div>
            <h3 className="font-semibold text-lg">Challenge</h3>
            <p className="text-sm text-muted-foreground text-center">
              Generate certificate for challenge completion
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => handleTypeSelection('payout')}
        >
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-3xl">💰</span>
            </div>
            <h3 className="font-semibold text-lg">Payout</h3>
            <p className="text-sm text-muted-foreground text-center">
              Generate certificate for payout achievement
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderChallengeForm = () => (
    <form onSubmit={handleChallengeSubmit} className="space-y-4">
      {/* Select Client */}
      <div className="space-y-2">
        <Label>Select Client *</Label>
        <Popover open={clientComboboxOpen} onOpenChange={handleClientComboboxOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={clientComboboxOpen}
              className="w-full justify-between"
            >
              {selectedClient ? (
                <span className="flex items-center gap-2">
                  <span className="font-medium">{selectedClient.full_name}</span>
                  <span className="text-muted-foreground">({selectedClient.email})</span>
                </span>
              ) : (
                <span className="text-muted-foreground">Select client...</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[400px] p-0" align="start">
            <div className="p-2">
              <Input
                placeholder="Search clients..."
                value={clientSearchValue}
                onChange={(e) => setClientSearchValue(e.target.value)}
                className="mb-2"
              />
              <div className="max-h-60 overflow-y-auto">
                {clientsLoading ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">Loading...</div>
                ) : filteredClients.length === 0 ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">No clients found</div>
                ) : (
                  filteredClients.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => handleClientChange(client.id.toString())}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-accent",
                        formData.client_id === client.id.toString() && "bg-accent"
                      )}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4",
                          formData.client_id === client.id.toString() ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{client.full_name}</div>
                        <div className="text-sm text-muted-foreground">{client.email}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Select Challenge (Optional) */}
      <div className="space-y-2">
        <Label>Select Challenge (Optional)</Label>
        <Popover open={challengeComboboxOpen} onOpenChange={handleChallengeComboboxOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={challengeComboboxOpen}
              className="w-full justify-between"
              disabled={!formData.client_id}
            >
              {selectedChallengeEnrollment ? (
                <span className="flex items-center gap-2">
                  <span className="font-medium">{selectedChallengeEnrollment.challenge_name}</span>
                  <span className="text-muted-foreground">({selectedChallengeEnrollment.mt5_account_id})</span>
                </span>
              ) : (
                <span className="text-muted-foreground">
                  {formData.client_id ? 'Select challenge...' : 'Select client first'}
                </span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[400px] p-0" align="start">
            <div className="p-2">
              <Input
                placeholder="Search challenges..."
                value={challengeSearchValue}
                onChange={(e) => setChallengeSearchValue(e.target.value)}
                className="mb-2"
              />
              <div className="max-h-60 overflow-y-auto">
                {challengesLoading ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">Loading...</div>
                ) : filteredChallengeEnrollments.length === 0 ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">No challenges found</div>
                ) : (
                  filteredChallengeEnrollments.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      onClick={() => {
                        setFormData({ ...formData, challenge_enrollment_id: enrollment.id.toString() });
                        setChallengeComboboxOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-accent",
                        formData.challenge_enrollment_id === enrollment.id.toString() && "bg-accent"
                      )}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4",
                          formData.challenge_enrollment_id === enrollment.id.toString() ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{enrollment.challenge_name}</div>
                        <div className="text-sm text-muted-foreground">
                          MT5: {enrollment.mt5_account_id} • {enrollment.status}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Template Key */}
      <div className="space-y-2">
        <Label htmlFor="template_key">Template Type *</Label>
        <Select
          value={formData.template_key}
          onValueChange={(value) => setFormData({ ...formData, template_key: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select template type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="live_account">Live Account</SelectItem>
            <SelectItem value="phase_one">Phase One</SelectItem>
            <SelectItem value="phase_two">Phase Two</SelectItem>
            <SelectItem value="funded">Funded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Certificate Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter certificate title"
          required
        />
      </div>

      <DialogFooter className="gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
        >
          Back
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={generateChallengeMutation.isPending}>
          {generateChallengeMutation.isPending ? 'Generating...' : 'Generate Certificate'}
        </Button>
      </DialogFooter>
    </form>
  );

  const renderPayoutForm = () => (
    <form onSubmit={handlePayoutSubmit} className="space-y-4">
      {/* Select Client */}
      <div className="space-y-2">
        <Label>Select Client *</Label>
        <Popover open={clientComboboxOpen} onOpenChange={handleClientComboboxOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={clientComboboxOpen}
              className="w-full justify-between"
            >
              {selectedClient ? (
                <span className="flex items-center gap-2">
                  <span className="font-medium">{selectedClient.full_name}</span>
                  <span className="text-muted-foreground">({selectedClient.email})</span>
                </span>
              ) : (
                <span className="text-muted-foreground">Select client...</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[400px] p-0" align="start">
            <div className="p-2">
              <Input
                placeholder="Search clients..."
                value={clientSearchValue}
                onChange={(e) => setClientSearchValue(e.target.value)}
                className="mb-2"
              />
              <div className="max-h-60 overflow-y-auto">
                {clientsLoading ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">Loading...</div>
                ) : filteredClients.length === 0 ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">No clients found</div>
                ) : (
                  filteredClients.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => handleClientChange(client.id.toString())}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-accent",
                        formData.client_id === client.id.toString() && "bg-accent"
                      )}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4",
                          formData.client_id === client.id.toString() ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{client.full_name}</div>
                        <div className="text-sm text-muted-foreground">{client.email}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Lookup Payouts Button */}
      {formData.client_id && (
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={handleLookupPayouts}
            disabled={payoutsLoading}
            className="w-full"
          >
            {payoutsLoading ? 'Loading...' : 'Lookup Payouts'}
          </Button>
        </div>
      )}

      {/* Select Payout (Optional) */}
      {payouts && (
        <div className="space-y-2">
          <Label>Select Payout (Optional)</Label>
          <Select
            value={formData.payout_id}
            onValueChange={(value) => setFormData({ ...formData, payout_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select payout..." />
            </SelectTrigger>
            <SelectContent>
              {payouts.payouts.map((payout) => (
                <SelectItem key={payout.payout_id} value={payout.payout_id}>
                  ${payout.payout_value} - {payout.payout_date} ({payout.payout_status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="payout-title">Certificate Title *</Label>
        <Input
          id="payout-title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter certificate title"
          required
        />
      </div>

      {/* Profit Share */}
      <div className="space-y-2">
        <Label htmlFor="profit-share">Profit Share (USD) *</Label>
        <Input
          id="profit-share"
          type="number"
          step="0.01"
          min="0"
          value={formData.profit_share}
          onChange={(e) => setFormData({ ...formData, profit_share: e.target.value })}
          placeholder="e.g., 5000.00"
          required
        />
      </div>

      <DialogFooter className="gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
        >
          Back
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={generatePayoutMutation.isPending}>
          {generatePayoutMutation.isPending ? 'Generating...' : 'Generate Certificate'}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <>
      <Dialog open={open && !showSuccessModal} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {step === 'type' ? 'Generate Certificate' : `Generate ${certificateType === 'challenge' ? 'Challenge' : 'Payout'} Certificate`}
            </DialogTitle>
          </DialogHeader>

          {step === 'type' && renderTypeSelection()}
          {step === 'details' && certificateType === 'challenge' && renderChallengeForm()}
          {step === 'details' && certificateType === 'payout' && renderPayoutForm()}
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={handleSuccessModalClose}>
        <DialogContent className="sm:max-w-[900px] w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Certificate Generated Successfully! 🎉</DialogTitle>
          </DialogHeader>
          
          {generatedCertificate && (
            <div className="space-y-6">
              {/* Certificate Preview */}
              {generatedCertificate.image_url && (
                <div className="border rounded-lg overflow-hidden bg-muted/20">
                  <img 
                    src={generatedCertificate.image_url} 
                    alt="Certificate Preview"
                    className="w-full h-auto max-h-[300px] object-contain"
                  />
                </div>
              )}

              {/* Certificate Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Certificate ID</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={generatedCertificate.id} 
                      readOnly 
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyToClipboard(generatedCertificate.id, 'Certificate ID')}
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Certificate Type</Label>
                  <Input 
                    value={generatedCertificate.certificate_type || 'N/A'} 
                    readOnly 
                    className="capitalize"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-muted-foreground">Title</Label>
                  <Input 
                    value={generatedCertificate.title} 
                    readOnly 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Client Email</Label>
                  <Input 
                    value={generatedCertificate.client_email || 'N/A'} 
                    readOnly 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Issued Date</Label>
                  <Input 
                    value={generatedCertificate.issued_date || 'N/A'} 
                    readOnly 
                  />
                </div>

                {generatedCertificate.payout_id && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Payout ID</Label>
                    <Input 
                      value={generatedCertificate.payout_id} 
                      readOnly 
                    />
                  </div>
                )}

                {generatedCertificate.challenge_enrollment_id && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Challenge Enrollment ID</Label>
                    <Input 
                      value={generatedCertificate.challenge_enrollment_id} 
                      readOnly 
                    />
                  </div>
                )}

                {generatedCertificate.image_url && (
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-muted-foreground">Image URL</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        value={generatedCertificate.image_url} 
                        readOnly 
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyToClipboard(generatedCertificate.image_url, 'Image URL')}
                      >
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(generatedCertificate.image_url, '_blank')}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                )}

                {generatedCertificate.pdf_url && (
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-muted-foreground">PDF URL</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        value={generatedCertificate.pdf_url} 
                        readOnly 
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyToClipboard(generatedCertificate.pdf_url, 'PDF URL')}
                      >
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(generatedCertificate.pdf_url, '_blank')}
                      >
                        Download
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button onClick={handleSuccessModalClose} className="w-full">
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GenerateCertificateDialog;

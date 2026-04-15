import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, ChevronsUpDown, CalendarIcon } from 'lucide-react';
import { challengeService, ChallengeEnrollment, Challenge, ChallengeEnrollmentCreateData, ChallengeEnrollmentUpdateData, Client } from '@/services/challengeService';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ChallengeEnrollmentDialogProps {
  enrollment?: ChallengeEnrollment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** Pre-select and optionally lock the client by email */
  defaultClientEmail?: string;
  /** When true, the client field cannot be changed */
  lockClient?: boolean;
}

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'phase_1_in_progress', label: 'Phase 1 - In Progress' },
  { value: 'phase_1_passed', label: 'Phase 1 - Passed' },
  { value: 'phase_2_in_progress', label: 'Phase 2 - In Progress' },
  { value: 'phase_2_passed', label: 'Phase 2 - Passed' },
  { value: 'live_in_progress', label: 'Live - In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

const ChallengeEnrollmentDialog: React.FC<ChallengeEnrollmentDialogProps> = ({
  enrollment,
  open,
  onOpenChange,
  onSuccess,
  defaultClientEmail,
  lockClient,
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientComboboxOpen, setClientComboboxOpen] = useState(false);
  const [clientSearchValue, setClientSearchValue] = useState('');
  const [formData, setFormData] = useState({
    client: '',
    challenge: '',
    account_size: '',
    currency: 'USD',
    status: 'phase_1_in_progress' as ChallengeEnrollment['status'],
    is_active: true,
    notes: '',
    broker_type: 'mt5',
    mt5_account_id: '',
    mt5_password: '',
    mt5_investor_password: '',
    create_mt5_account: true,
    start_date: null as Date | null,
    live_start_date: null as Date | null,
    completed_date: null as Date | null,
  });

  // Filter clients based on search value
  const filteredClients = clients.filter(client =>
    client && 
    client.full_name && 
    client.email &&
    (client.full_name.toLowerCase().includes(clientSearchValue.toLowerCase()) ||
     client.email.toLowerCase().includes(clientSearchValue.toLowerCase()))
  );

  // Reset search when combobox closes
  const handleComboboxOpenChange = (open: boolean) => {
    setClientComboboxOpen(open);
    if (!open) {
      setClientSearchValue('');
    }
  };

  // Load challenges and clients for selection
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setClientsLoading(true);
        setClientsError(null);
        const [challengeList, clientList] = await Promise.all([
          challengeService.getChallenges(),
          challengeService.getClients()
        ]);
        setChallenges(challengeList);
        setClients(clientList);
      } catch (error) {
        console.error('Error loading data:', error);
        setClientsError(error);
      } finally {
        setClientsLoading(false);
      }
    };
    
    if (open) {
      loadData();
    }
  }, [open]);

  // Pre-fill form if editing
  useEffect(() => {
    if (enrollment) {
      console.log('Edit enrollment data:', enrollment);
      console.log('Available clients:', clients);
      console.log('Available challenges:', challenges);
      
      // For editing, find the client ID based on email
      const clientId = clients.find(c => c.email === enrollment.client_email)?.id || '';
      console.log('Found client ID:', clientId, 'for email:', enrollment.client_email);
      
      const newFormData = {
        client: String(clientId), // Ensure it's a string
        challenge: enrollment.challenge?.name || '',
        account_size: enrollment.account_size,
        currency: enrollment.currency,
        status: enrollment.status,
        is_active: typeof enrollment.is_active === 'boolean' ? enrollment.is_active : true,
        notes: enrollment.notes || '',
        broker_type: enrollment.broker_type || 'mt5',
        mt5_account_id: enrollment.mt5_account_id || '',
        mt5_password: enrollment.mt5_password || '',
        mt5_investor_password: enrollment.mt5_investor_password || '',
        create_mt5_account: false, // Always false for edits
        start_date: enrollment.start_date ? new Date(enrollment.start_date) : null,
        live_start_date: enrollment.live_start_date ? new Date(enrollment.live_start_date) : null,
        completed_date: enrollment.completed_date ? new Date(enrollment.completed_date) : null,
      };
      
      console.log('Setting form data:', newFormData);
      setFormData(newFormData);
    } else {
      // Reset form for new enrollment
      setFormData({
        client: '',
        challenge: '',
        account_size: '',
        currency: 'USD',
        status: 'phase_1_in_progress',
        is_active: true,
        notes: '',
        broker_type: 'mt5',
        mt5_account_id: '',
        mt5_password: '',
        mt5_investor_password: '',
        create_mt5_account: true,
        start_date: null,
        live_start_date: null,
        completed_date: null,
      });
    }
  }, [enrollment, clients, challenges, open]);

  // Auto-select client by defaultClientEmail (for Profile Manager create/edit)
  useEffect(() => {
    if (defaultClientEmail && clients.length > 0 && open) {
      const matched = clients.find(c => c.email === defaultClientEmail);
      if (matched && formData.client !== String(matched.id)) {
        setFormData(prev => ({ ...prev, client: String(matched.id) }));
      }
    }
  }, [defaultClientEmail, clients, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Find the selected challenge ID
      const selectedChallenge = challenges.find(c => c.name === formData.challenge);
      if (!selectedChallenge) {
        throw new Error('Please select a valid challenge');
      }

      if (!formData.client) {
        throw new Error('Please select a client');
      }

      if (enrollment) {
        const updateData: ChallengeEnrollmentUpdateData = {
          client: formData.client,
          challenge: selectedChallenge.id,
          account_size: parseFloat(formData.account_size),
          currency: formData.currency,
          status: formData.status,
          is_active: formData.is_active,
          notes: formData.notes,
          broker_type: formData.broker_type,
          mt5_account_id: formData.mt5_account_id || null,
          mt5_password: formData.mt5_password || null,
          mt5_investor_password: formData.mt5_investor_password || null,
          start_date: formData.start_date ? formData.start_date.toISOString().split('T')[0] : null,
          live_start_date: formData.live_start_date ? formData.live_start_date.toISOString().split('T')[0] : null,
          completed_date: formData.completed_date ? formData.completed_date.toISOString().split('T')[0] : null,
        };
        console.log('Update data being sent:', updateData);
        await challengeService.updateChallengeEnrollment(enrollment.id, updateData);
      } else {
        // For creation, include all required fields
        const createData: ChallengeEnrollmentCreateData & { create_mt5_account?: boolean } = {
          client: formData.client,
          challenge: selectedChallenge.id,
          order: null,
          account_size: parseFloat(formData.account_size),
          currency: formData.currency,
          status: formData.status,
          completed_date: null,
          is_active: formData.is_active,
          notes: formData.notes,
          broker_type: formData.broker_type,
          mt5_account_id: formData.mt5_account_id || null,
          mt5_password: formData.mt5_password || null,
          mt5_investor_password: formData.mt5_investor_password || null,
          create_mt5_account: formData.create_mt5_account,
        };
        await challengeService.createChallengeEnrollment(createData);
      }

      toast({
        title: "Success",
        description: enrollment ? "Challenge enrollment updated successfully" : "Challenge enrollment created successfully",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error saving enrollment:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save enrollment",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {enrollment ? 'Edit Challenge Enrollment' : 'Create Challenge Enrollment'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              {lockClient ? (
                <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm cursor-not-allowed opacity-70">
                  {formData.client && clients.find(c => String(c.id) === formData.client)
                    ? `${clients.find(c => String(c.id) === formData.client)?.full_name} (${clients.find(c => String(c.id) === formData.client)?.email})`
                    : clientsLoading ? 'Loading...' : 'Client not found'
                  }
                </div>
              ) : (
              <Popover open={clientComboboxOpen} onOpenChange={handleComboboxOpenChange}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientComboboxOpen}
                    className="w-full justify-between text-left font-normal"
                  >
                    {formData.client && clients.find(c => String(c.id) === formData.client) ? 
                      `${clients.find(c => String(c.id) === formData.client)?.full_name} (${clients.find(c => String(c.id) === formData.client)?.email})` 
                      : "Search and select client..."
                    }
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
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
                            onClick={() => {
                              setFormData({ ...formData, client: String(client.id) });
                              setClientComboboxOpen(false);
                            }}
                            className="flex items-center px-3 py-2 text-sm hover:bg-primary/20 hover:text-primary-foreground cursor-pointer"
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                String(client.id) === formData.client ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{client.full_name}</span>
                              <span className="text-sm text-muted-foreground">{client.email}</span>
                            </div>
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
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="challenge">Challenge</Label>
              <Select 
                value={formData.challenge} 
                onValueChange={(value) => setFormData({ ...formData, challenge: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select challenge" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border shadow-lg z-50">
                  {challenges.map((challenge) => (
                    <SelectItem key={challenge.id} value={challenge.name}>
                      {challenge.name} ({challenge.step_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="account_size">Account Size</Label>
              <Input
                id="account_size"
                type="number"
                step="0.01"
                placeholder="10000.00"
                value={formData.account_size}
                onChange={(e) => setFormData({ ...formData, account_size: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value: ChallengeEnrollment['status']) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="broker_type">Broker Type</Label>
              <Select value={formData.broker_type} onValueChange={(value) => setFormData({ ...formData, broker_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mt5">MT5</SelectItem>
                  <SelectItem value="mt4">MT4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Fields - only show for editing */}
          {enrollment && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.start_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.start_date ? format(formData.start_date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.start_date || undefined}
                      onSelect={(date) => setFormData({ ...formData, start_date: date || null })}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Live Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.live_start_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.live_start_date ? format(formData.live_start_date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.live_start_date || undefined}
                      onSelect={(date) => setFormData({ ...formData, live_start_date: date || null })}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {!enrollment && (
            <div className="flex items-center space-x-2">
              <Switch
                id="create_mt5_account"
                checked={formData.create_mt5_account}
                onCheckedChange={(checked) => {
                  setFormData({ 
                    ...formData, 
                    create_mt5_account: checked,
                    // Clear MT5 fields if auto-creating
                    mt5_account_id: checked ? '' : formData.mt5_account_id,
                    mt5_password: checked ? '' : formData.mt5_password,
                    mt5_investor_password: checked ? '' : formData.mt5_investor_password,
                  });
                }}
              />
              <Label htmlFor="create_mt5_account">Auto-create MT5 Account</Label>
            </div>
          )}

           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="space-y-2">
               <Label htmlFor="mt5_account_id">MT5 Account ID</Label>
               <Input
                 id="mt5_account_id"
                 placeholder="123456789"
                 value={formData.mt5_account_id}
                 onChange={(e) => setFormData({ ...formData, mt5_account_id: e.target.value })}
                 disabled={!enrollment && formData.create_mt5_account}
               />
             </div>
             
             <div className="space-y-2">
               <Label htmlFor="mt5_password">MT5 Password</Label>
               <Input
                 id="mt5_password"
                 type="password"
                 placeholder="Password"
                 value={formData.mt5_password}
                 onChange={(e) => setFormData({ ...formData, mt5_password: e.target.value })}
                 disabled={!enrollment && formData.create_mt5_account}
               />
             </div>
             
             <div className="space-y-2">
               <Label htmlFor="mt5_investor_password">MT5 Investor Password</Label>
               <Input
                 id="mt5_investor_password"
                 type="password"
                 placeholder="Investor Password"
                 value={formData.mt5_investor_password}
                 onChange={(e) => setFormData({ ...formData, mt5_investor_password: e.target.value })}
                 disabled={!enrollment && formData.create_mt5_account}
               />
             </div>
           </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {enrollment ? 'Update' : 'Create'} Enrollment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChallengeEnrollmentDialog;
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Check,
  ChevronsUpDown,
  CalendarIcon,
  Trophy,
  User,
  Server,
  Settings2,
  FileText,
  Target,
} from 'lucide-react';
import {
  challengeService,
  ChallengeEnrollment,
  Challenge,
  ChallengeEnrollmentCreateData,
  ChallengeEnrollmentUpdateData,
  Client,
} from '@/services/challengeService';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EnrollmentDialogProps {
  enrollment?: ChallengeEnrollment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultClientEmail?: string;
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

const EnrollmentDialog: React.FC<EnrollmentDialogProps> = ({
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
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState<any>(null);

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

  const filteredClients = clients.filter(
    (client) =>
      client &&
      client.full_name &&
      client.email &&
      (client.full_name.toLowerCase().includes(clientSearchValue.toLowerCase()) ||
        client.email.toLowerCase().includes(clientSearchValue.toLowerCase()))
  );

  const handleComboboxOpenChange = (open: boolean) => {
    setClientComboboxOpen(open);
    if (!open) setClientSearchValue('');
  };

  // Load challenges and clients
  useEffect(() => {
    const loadData = async () => {
      try {
        setClientsLoading(true);
        setClientsError(null);
        const [challengeList, clientList] = await Promise.all([
          challengeService.getChallenges(),
          challengeService.getClients(),
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
    if (open) loadData();
  }, [open]);

  // Pre-fill for editing
  useEffect(() => {
    if (enrollment) {
      const clientId = clients.find((c) => c.email === enrollment.client_email)?.id || '';
      setFormData({
        client: String(clientId),
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
        create_mt5_account: false,
        start_date: enrollment.start_date ? new Date(enrollment.start_date) : null,
        live_start_date: enrollment.live_start_date ? new Date(enrollment.live_start_date) : null,
        completed_date: enrollment.completed_date ? new Date(enrollment.completed_date) : null,
      });
    } else {
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

  // Auto-select client
  useEffect(() => {
    if (defaultClientEmail && clients.length > 0 && open) {
      const matched = clients.find((c) => c.email === defaultClientEmail);
      if (matched && formData.client !== String(matched.id)) {
        setFormData((prev) => ({ ...prev, client: String(matched.id) }));
      }
    }
  }, [defaultClientEmail, clients, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const selectedChallenge = challenges.find((c) => c.name === formData.challenge);
      if (!selectedChallenge) throw new Error('Please select a valid challenge');
      if (!formData.client) throw new Error('Please select a client');

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
        await challengeService.updateChallengeEnrollment(enrollment.id, updateData);
      } else {
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
        title: enrollment ? 'Enrollment Updated' : 'Enrollment Created',
        description: enrollment
          ? 'Challenge enrollment has been updated successfully.'
          : 'Challenge enrollment has been created successfully.',
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error saving enrollment:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save enrollment',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedClientDisplay = (() => {
    const c = clients.find((c) => String(c.id) === formData.client);
    if (c) return `${c.full_name} (${c.email})`;
    if (clientsLoading) return 'Loading…';
    return 'Client not found';
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[660px] max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-xl border-border/50">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Trophy size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {enrollment ? 'Edit Enrollment' : 'Create Enrollment'}
              </h2>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                {enrollment
                  ? `${enrollment.challenge?.name || 'Challenge'} · ${enrollment.client_name || ''}`
                  : 'Set up a new challenge enrollment'}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
          {/* Challenge */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Trophy size={12} />
              Challenge
            </h4>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Challenge</Label>
              <Select
                value={formData.challenge}
                onValueChange={(value) => setFormData({ ...formData, challenge: value })}
              >
                <SelectTrigger className="h-9 text-sm bg-muted/30 border-border/50">
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

          {/* Account Details */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Target size={12} />
              Account Details
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Account Size</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="10000.00"
                  value={formData.account_size}
                  onChange={(e) => setFormData({ ...formData, account_size: e.target.value })}
                  required
                  className="h-9 text-sm bg-muted/30 border-border/50 focus:bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Currency</Label>
                <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                  <SelectTrigger className="h-9 text-sm bg-muted/30 border-border/50">
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v: ChallengeEnrollment['status']) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger className="h-9 text-sm bg-muted/30 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Broker Type</Label>
                <Select value={formData.broker_type} onValueChange={(v) => setFormData({ ...formData, broker_type: v })}>
                  <SelectTrigger className="h-9 text-sm bg-muted/30 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mt5">MT5</SelectItem>
                    <SelectItem value="mt4">MT4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Dates - edit only */}
          {enrollment && (
            <div className="space-y-3">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <CalendarIcon size={12} />
                Dates
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal h-9 text-sm bg-muted/30 border-border/50',
                          !formData.start_date && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {formData.start_date ? format(formData.start_date, 'PPP') : 'Pick a date'}
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
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Live Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal h-9 text-sm bg-muted/30 border-border/50',
                          !formData.live_start_date && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {formData.live_start_date ? format(formData.live_start_date, 'PPP') : 'Pick a date'}
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
            </div>
          )}

          {/* MT5 Configuration */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Server size={12} />
              MT5 Configuration
            </h4>

            {!enrollment && (
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-muted/30 border border-border/50">
                <Switch
                  id="pm_create_mt5"
                  checked={formData.create_mt5_account}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      create_mt5_account: checked,
                      mt5_account_id: checked ? '' : formData.mt5_account_id,
                      mt5_password: checked ? '' : formData.mt5_password,
                      mt5_investor_password: checked ? '' : formData.mt5_investor_password,
                    })
                  }
                />
                <Label htmlFor="pm_create_mt5" className="text-sm cursor-pointer">
                  Auto-create MT5 Account
                </Label>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">MT5 Account ID</Label>
                <Input
                  placeholder="123456789"
                  value={formData.mt5_account_id}
                  onChange={(e) => setFormData({ ...formData, mt5_account_id: e.target.value })}
                  disabled={!enrollment && formData.create_mt5_account}
                  className="h-9 text-sm bg-muted/30 border-border/50 focus:bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">MT5 Password</Label>
                <Input
                  type="password"
                  placeholder="Password"
                  value={formData.mt5_password}
                  onChange={(e) => setFormData({ ...formData, mt5_password: e.target.value })}
                  disabled={!enrollment && formData.create_mt5_account}
                  className="h-9 text-sm bg-muted/30 border-border/50 focus:bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Investor Password</Label>
                <Input
                  type="password"
                  placeholder="Investor Pwd"
                  value={formData.mt5_investor_password}
                  onChange={(e) => setFormData({ ...formData, mt5_investor_password: e.target.value })}
                  disabled={!enrollment && formData.create_mt5_account}
                  className="h-9 text-sm bg-muted/30 border-border/50 focus:bg-background"
                />
              </div>
            </div>
          </div>

          {/* Notes & Active */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <FileText size={12} />
              Additional
            </h4>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea
                placeholder="Additional notes…"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="text-sm bg-muted/30 border-border/50 focus:bg-background resize-none"
              />
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-muted/30 border border-border/50">
              <Switch
                id="pm_is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="pm_is_active" className="text-sm cursor-pointer">
                Active
              </Label>
            </div>
          </div>
        </form>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/20">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="h-9"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isLoading}
            onClick={handleSubmit as any}
            className="h-9 min-w-[140px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Saving…
              </>
            ) : enrollment ? (
              'Update Enrollment'
            ) : (
              'Create Enrollment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EnrollmentDialog;

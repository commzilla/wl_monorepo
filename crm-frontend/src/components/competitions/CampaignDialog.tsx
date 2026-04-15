import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { competitionService, Competition, CompetitionCreateData, CompetitionRuleCreateData, RuleType, ValueType, RULE_TYPE_LABELS, VALUE_TYPE_LABELS, ChallengeMini } from '@/services/competitionService';
import { cgmService, Mt5Group } from '@/services/cgmService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CampaignDialogProps {
  isOpen: boolean;
  onClose: () => void;
  competition: Competition | null;
}

interface PrizeEntry {
  rank_from: number;
  rank_to: number;
  description: string;
}

interface RuleEntry {
  rule_type: RuleType;
  value: string;
  value_type: ValueType;
  description: string;
  is_active: boolean;
}

const CampaignDialog: React.FC<CampaignDialogProps> = ({ isOpen, onClose, competition }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!competition;

  // Fetch MT5 groups
  const { data: mt5Groups = [] } = useQuery({
    queryKey: ['mt5-groups'],
    queryFn: () => cgmService.getAvailableGroups(),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch available challenges
  const { data: fetchedChallenges = [] } = useQuery({
    queryKey: ['available-challenges'],
    queryFn: () => competitionService.getAvailableChallenges(),
    staleTime: 5 * 60 * 1000,
  });

  // Form state
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [organizerName, setOrganizerName] = useState('');
  const [startAt, setStartAt] = useState<Date | undefined>();
  const [endAt, setEndAt] = useState<Date | undefined>();
  const [initialBalance, setInitialBalance] = useState('');
  const [leverage, setLeverage] = useState('');
  const [mt5Group, setMt5Group] = useState('');
  const [allowedSymbols, setAllowedSymbols] = useState('');
  const [minTradesToQualify, setMinTradesToQualify] = useState('');
  const [rulesMarkdown, setRulesMarkdown] = useState('');
  const [useGlobalRules, setUseGlobalRules] = useState(true);
  const [prizePoolText, setPrizePoolText] = useState('');
  const [entryType, setEntryType] = useState<'free' | 'paid' | 'invite'>('free');
  const [entryFee, setEntryFee] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [autoCreateMt5, setAutoCreateMt5] = useState(true);
  const [enforceSingleEntry, setEnforceSingleEntry] = useState(true);
  const [allowTestUsers, setAllowTestUsers] = useState(false);
  const [prizes, setPrizes] = useState<PrizeEntry[]>([]);
  const [manualRules, setManualRules] = useState<RuleEntry[]>([]);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [organizerLogoFile, setOrganizerLogoFile] = useState<File | null>(null);
  const [challengeId, setChallengeId] = useState<string>('');

  // Get challenges from API fetch or competition data
  const availableChallenges = competition?.available_challenges || fetchedChallenges;

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (competition) {
        setTitle(competition.title);
        setShortDescription(competition.short_description);
        setFullDescription(competition.full_description);
        setOrganizerName(competition.organizer_name);
        setStartAt(new Date(competition.start_at));
        setEndAt(new Date(competition.end_at));
        setInitialBalance(competition.initial_balance);
        setLeverage(competition.leverage);
        setMt5Group(competition.mt5_group);
        setAllowedSymbols(competition.allowed_symbols?.join(', ') || '');
        setMinTradesToQualify(competition.min_trades_to_qualify?.toString() || '');
        setRulesMarkdown(competition.rules_markdown);
        setUseGlobalRules(competition.use_global_rules);
        setPrizePoolText(competition.prize_pool_text);
        setEntryType(competition.entry_type);
        setEntryFee(competition.entry_fee || '');
        setMaxParticipants(competition.max_participants?.toString() || '');
        setAutoCreateMt5(competition.auto_create_mt5);
        setEnforceSingleEntry(competition.enforce_single_entry);
        setAllowTestUsers(competition.allow_test_users);
        setPrizes(competition.prizes.map(p => ({
          rank_from: p.rank_from,
          rank_to: p.rank_to,
          description: p.description,
        })));
        setManualRules(competition.manual_rules?.map(r => ({
          rule_type: r.rule_type,
          value: r.value || '',
          value_type: r.value_type,
          description: r.description || '',
          is_active: r.is_active,
        })) || []);
        setChallengeId(competition.challenge || '');
      } else {
        // Reset to defaults
        setTitle('');
        setShortDescription('');
        setFullDescription('');
        setOrganizerName('');
        setStartAt(undefined);
        setEndAt(undefined);
        setInitialBalance('');
        setLeverage('');
        setMt5Group('');
        setAllowedSymbols('');
        setMinTradesToQualify('');
        setRulesMarkdown('');
        setUseGlobalRules(true);
        setPrizePoolText('');
        setEntryType('free');
        setEntryFee('');
        setMaxParticipants('');
        setAutoCreateMt5(true);
        setEnforceSingleEntry(true);
        setAllowTestUsers(false);
        setPrizes([]);
        setManualRules([]);
        setBannerFile(null);
        setOrganizerLogoFile(null);
        setChallengeId('');
        // Keep available challenges from last fetch for new competitions
      }
    }
  }, [isOpen, competition]);

  const createMutation = useMutation({
    mutationFn: (data: CompetitionCreateData) => competitionService.createCompetition(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      toast({ title: 'Campaign created successfully' });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create campaign', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CompetitionCreateData>) => 
      competitionService.updateCompetition(competition!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      toast({ title: 'Campaign updated successfully' });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update campaign', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Submitting with prizes:', prizes);

    const manualRulesData: CompetitionRuleCreateData[] = manualRules.map(r => ({
      rule_type: r.rule_type,
      value: r.value ? parseFloat(r.value) : null,
      value_type: r.value_type,
      description: r.description,
      is_active: r.is_active,
    }));

    const data: CompetitionCreateData = {
      title,
      short_description: shortDescription,
      full_description: fullDescription,
      organizer_name: organizerName,
      start_at: startAt ? startAt.toISOString() : '',
      end_at: endAt ? endAt.toISOString() : '',
      initial_balance: parseFloat(initialBalance) || 0,
      leverage,
      mt5_group: mt5Group,
      allowed_symbols: allowedSymbols ? allowedSymbols.split(',').map(s => s.trim()) : undefined,
      min_trades_to_qualify: minTradesToQualify ? parseInt(minTradesToQualify) : undefined,
      rules_markdown: rulesMarkdown,
      use_global_rules: useGlobalRules,
      prize_pool_text: prizePoolText,
      entry_type: entryType,
      entry_fee: entryFee ? parseFloat(entryFee) : undefined,
      max_participants: maxParticipants ? parseInt(maxParticipants) : undefined,
      auto_create_mt5: autoCreateMt5,
      enforce_single_entry: enforceSingleEntry,
      allow_test_users: allowTestUsers,
      prizes: prizes.map(p => ({
        rank_from: Number(p.rank_from),
        rank_to: Number(p.rank_to),
        description: p.description,
      })),
      manual_rules: useGlobalRules ? [] : manualRulesData,
      challenge: challengeId || null,
    };

    if (bannerFile) {
      data.banner = bannerFile;
    }

    if (organizerLogoFile) {
      data.organizer_logo = organizerLogoFile;
    }

    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const addPrize = () => {
    setPrizes([...prizes, { rank_from: 1, rank_to: 1, description: '' }]);
  };

  const updatePrize = (index: number, field: keyof PrizeEntry, value: string | number) => {
    const updated = [...prizes];
    updated[index] = { ...updated[index], [field]: value };
    setPrizes(updated);
  };

  const removePrize = (index: number) => {
    setPrizes(prizes.filter((_, i) => i !== index));
  };

  const addManualRule = () => {
    setManualRules([...manualRules, { 
      rule_type: 'mdl', 
      value: '', 
      value_type: 'percent', 
      description: '', 
      is_active: true 
    }]);
  };

  const updateManualRule = (index: number, field: keyof RuleEntry, value: string | boolean) => {
    const updated = [...manualRules];
    updated[index] = { ...updated[index], [field]: value };
    setManualRules(updated);
  };

  const removeManualRule = (index: number) => {
    setManualRules(manualRules.filter((_, i) => i !== index));
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Campaign' : 'Create New Campaign'}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Competition title"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organizer">Organizer Name *</Label>
                  <Input
                    id="organizer"
                    value={organizerName}
                    onChange={(e) => setOrganizerName(e.target.value)}
                    placeholder="Organizer name"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortDesc">Short Description *</Label>
                <Input
                  id="shortDesc"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="Brief description (max 500 chars)"
                  maxLength={500}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullDesc">Full Description *</Label>
                <Textarea
                  id="fullDesc"
                  value={fullDescription}
                  onChange={(e) => setFullDescription(e.target.value)}
                  placeholder="Detailed description"
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="banner">Banner Image</Label>
                  <Input
                    id="banner"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                  />
                  {(competition?.banner || bannerFile) && (
                    <div className="mt-2">
                      <img
                        src={bannerFile ? URL.createObjectURL(bannerFile) : competition?.banner || ''}
                        alt="Banner preview"
                        className="h-20 w-full object-cover rounded border"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {bannerFile ? 'New banner selected' : 'Current banner'}
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organizerLogo">Organizer Logo</Label>
                  <Input
                    id="organizerLogo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setOrganizerLogoFile(e.target.files?.[0] || null)}
                  />
                  {(competition?.organizer_logo || organizerLogoFile) && (
                    <div className="mt-2">
                      <img
                        src={organizerLogoFile ? URL.createObjectURL(organizerLogoFile) : competition?.organizer_logo || ''}
                        alt="Logo preview"
                        className="h-16 w-16 object-contain rounded border"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {organizerLogoFile ? 'New logo selected' : 'Current logo'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="challenge">Associated Challenge</Label>
                <Select 
                  value={challengeId ? challengeId : "none"} 
                  onValueChange={(val) => setChallengeId(val === "none" ? "" : val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a challenge (optional)">
                      {challengeId && challengeId !== "none" 
                        ? (availableChallenges.find(c => String(c.id) === String(challengeId))?.name || "No Challenge")
                        : "No Challenge"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    <SelectItem value="none">No Challenge</SelectItem>
                    {availableChallenges.map((challenge) => (
                      <SelectItem key={challenge.id} value={String(challenge.id)}>
                        {challenge.name} ({challenge.step_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Timing */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Timing</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startAt && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startAt ? format(startAt, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-background border z-50">
                      <Calendar
                        mode="single"
                        selected={startAt}
                        onSelect={setStartAt}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>End Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endAt && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endAt ? format(endAt, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-background border z-50">
                      <Calendar
                        mode="single"
                        selected={endAt}
                        onSelect={setEndAt}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Trading Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Trading Configuration</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="balance">Initial Balance *</Label>
                  <Input
                    id="balance"
                    type="number"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    placeholder="10000"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leverage">Leverage *</Label>
                  <Input
                    id="leverage"
                    value={leverage}
                    onChange={(e) => setLeverage(e.target.value)}
                    placeholder="1:100"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mt5Group">MT5 Group *</Label>
                  <Select value={mt5Group} onValueChange={setMt5Group}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select MT5 Group" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50">
                      {mt5Groups.map((group) => (
                        <SelectItem key={group.group} value={group.group}>
                          {group.group}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="symbols">Allowed Symbols</Label>
                  <Input
                    id="symbols"
                    value={allowedSymbols}
                    onChange={(e) => setAllowedSymbols(e.target.value)}
                    placeholder="EURUSD, GBPUSD, XAUUSD"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minTrades">Min Trades to Qualify</Label>
                  <Input
                    id="minTrades"
                    type="number"
                    value={minTradesToQualify}
                    onChange={(e) => setMinTradesToQualify(e.target.value)}
                    placeholder="5"
                  />
                </div>
              </div>
            </div>

            {/* Entry Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Entry Configuration</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="entryType">Entry Type *</Label>
                  <Select value={entryType} onValueChange={(v: 'free' | 'paid' | 'invite') => setEntryType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50">
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="invite">Invite Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {entryType === 'paid' && (
                  <div className="space-y-2">
                    <Label htmlFor="entryFee">Entry Fee</Label>
                    <Input
                      id="entryFee"
                      type="number"
                      value={entryFee}
                      onChange={(e) => setEntryFee(e.target.value)}
                      placeholder="99"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="maxParticipants">Max Participants</Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(e.target.value)}
                    placeholder="Unlimited"
                  />
                </div>
              </div>
            </div>

            {/* Prizes */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Prizes</h3>
                <Button type="button" variant="outline" size="sm" onClick={addPrize}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Prize
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prizePool">Prize Pool Text *</Label>
                <Textarea
                  id="prizePool"
                  value={prizePoolText}
                  onChange={(e) => setPrizePoolText(e.target.value)}
                  placeholder="$10,000 in prizes"
                  rows={3}
                  required
                />
              </div>

              {prizes.map((prize, index) => (
                <div key={index} className="flex items-end gap-2 p-3 border rounded-lg">
                  <div className="space-y-2 flex-1">
                    <Label>Rank From</Label>
                    <Input
                      type="number"
                      value={prize.rank_from}
                      onChange={(e) => updatePrize(index, 'rank_from', parseInt(e.target.value))}
                      min={1}
                    />
                  </div>
                  <div className="space-y-2 flex-1">
                    <Label>Rank To</Label>
                    <Input
                      type="number"
                      value={prize.rank_to}
                      onChange={(e) => updatePrize(index, 'rank_to', parseInt(e.target.value))}
                      min={1}
                    />
                  </div>
                  <div className="space-y-2 flex-[2]">
                    <Label>Description</Label>
                    <Input
                      value={prize.description}
                      onChange={(e) => updatePrize(index, 'description', e.target.value)}
                      placeholder="$5,000 cash prize"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePrize(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Rules */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Rules</h3>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="globalRules"
                  checked={useGlobalRules}
                  onCheckedChange={setUseGlobalRules}
                />
                <Label htmlFor="globalRules">Use Global Rules</Label>
              </div>

              {/* Manual Rules Section - Only show when not using global rules */}
              {!useGlobalRules && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Manual Rules</h4>
                    <Button type="button" variant="outline" size="sm" onClick={addManualRule}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Rule
                    </Button>
                  </div>

                  {manualRules.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No manual rules added. Click "Add Rule" to define custom rules.
                    </p>
                  )}

                  {manualRules.map((rule, index) => (
                    <div key={index} className="flex flex-col gap-3 p-3 border rounded-lg bg-background">
                      <div className="flex items-start gap-2">
                        <div className="space-y-2 flex-1">
                          <Label>Rule Type</Label>
                          <Select 
                            value={rule.rule_type} 
                            onValueChange={(v: RuleType) => updateManualRule(index, 'rule_type', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-background border z-50">
                              {Object.entries(RULE_TYPE_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 flex-1">
                          <Label>Value Type</Label>
                          <Select 
                            value={rule.value_type} 
                            onValueChange={(v: ValueType) => updateManualRule(index, 'value_type', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-background border z-50">
                              {Object.entries(VALUE_TYPE_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 w-24">
                          <Label>Value</Label>
                          <Input
                            type="number"
                            value={rule.value}
                            onChange={(e) => updateManualRule(index, 'value', e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div className="pt-7">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeManualRule(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="space-y-2 flex-1">
                          <Label>Description (optional)</Label>
                          <Input
                            value={rule.description}
                            onChange={(e) => updateManualRule(index, 'description', e.target.value)}
                            placeholder="Rule description"
                          />
                        </div>
                        <div className="flex items-center space-x-2 pt-6">
                          <Switch
                            id={`rule-active-${index}`}
                            checked={rule.is_active}
                            onCheckedChange={(checked) => updateManualRule(index, 'is_active', checked)}
                          />
                          <Label htmlFor={`rule-active-${index}`}>Active</Label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="rules">Rules (Markdown) *</Label>
                <Textarea
                  id="rules"
                  value={rulesMarkdown}
                  onChange={(e) => setRulesMarkdown(e.target.value)}
                  placeholder="# Competition Rules&#10;&#10;1. Rule one&#10;2. Rule two"
                  rows={6}
                  required
                />
              </div>
            </div>

            {/* System Flags */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">System Flags</h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoMt5"
                    checked={autoCreateMt5}
                    onCheckedChange={setAutoCreateMt5}
                  />
                  <Label htmlFor="autoMt5">Auto-create MT5 Account</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="singleEntry"
                    checked={enforceSingleEntry}
                    onCheckedChange={setEnforceSingleEntry}
                  />
                  <Label htmlFor="singleEntry">Enforce Single Entry</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="testUsers"
                    checked={allowTestUsers}
                    onCheckedChange={setAllowTestUsers}
                  />
                  <Label htmlFor="testUsers">Allow Test Users</Label>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : isEditing ? 'Update Campaign' : 'Create Campaign'}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignDialog;

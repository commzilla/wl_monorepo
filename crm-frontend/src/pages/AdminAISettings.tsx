import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Bot, Loader2, Save } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { adminAIService } from '@/services/adminAIService';
import type { AdminAIConfig, AdminAITrainingExample } from '@/types/adminAI';
import { cn } from '@/lib/utils';

// ===================================================================
// READ ACTION DEFINITIONS
// ===================================================================

const READ_ACTIONS = [
  { group: 'Enrollment', actions: [
    { key: 'lookup_enrollment', label: 'Lookup Enrollment' },
    { key: 'get_enrollment_snapshots', label: 'Enrollment Snapshots' },
  ]},
  { group: 'Trader', actions: [
    { key: 'lookup_trader', label: 'Lookup Trader' },
    { key: 'search_traders', label: 'Search Traders' },
    { key: 'get_kyc_status', label: 'KYC Status' },
  ]},
  { group: 'Payout & Orders', actions: [
    { key: 'lookup_payout', label: 'Lookup Payout' },
    { key: 'get_payout_config', label: 'Payout Config' },
    { key: 'get_order_history', label: 'Order History' },
  ]},
  { group: 'MT5', actions: [
    { key: 'get_mt5_account_details', label: 'Account Details' },
    { key: 'get_mt5_open_trades', label: 'Open Trades' },
    { key: 'get_trade_history', label: 'Trade History' },
    { key: 'get_account_metrics', label: 'Account Metrics' },
  ]},
  { group: 'Risk & Logs', actions: [
    { key: 'get_breach_history', label: 'Breach History' },
    { key: 'get_soft_breaches', label: 'Soft Breaches' },
    { key: 'get_event_logs', label: 'Event Logs' },
  ]},
];

// ===================================================================
// WRITE ACTION DEFINITIONS
// ===================================================================

const WRITE_ACTIONS = [
  { key: 'mt5_deposit', label: 'Deposit Funds', risk: 'high' as const },
  { key: 'mt5_withdraw', label: 'Withdraw Funds', risk: 'high' as const },
  { key: 'mt5_activate_trading', label: 'Activate Trading', risk: 'medium' as const },
  { key: 'mt5_disable_trading', label: 'Disable Trading', risk: 'medium' as const },
  { key: 'mt5_enable_account', label: 'Enable Account', risk: 'medium' as const },
  { key: 'mt5_disable_account', label: 'Disable Account', risk: 'critical' as const },
  { key: 'mt5_close_trades', label: 'Close Trades', risk: 'critical' as const },
  { key: 'mt5_change_password', label: 'Change Password', risk: 'high' as const },
  { key: 'mt5_change_group', label: 'Change Group', risk: 'critical' as const },
];

// Actions that ALWAYS require confirmation — matches backend ALWAYS_REQUIRE_CONFIRMATION
const ALWAYS_REQUIRE_CONFIRMATION = new Set([
  'mt5_deposit', 'mt5_withdraw', 'mt5_close_trades',
  'mt5_disable_account', 'mt5_change_password', 'mt5_change_group',
]);

const riskColors: Record<string, string> = {
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
};

// ===================================================================
// MAIN COMPONENT
// ===================================================================

const AdminAISettings = () => {
  const { isAdmin, isLoading: authLoading, hasPermission } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [config, setConfig] = useState<AdminAIConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Training examples state
  const [trainingExamples, setTrainingExamples] = useState<AdminAITrainingExample[]>([]);
  const [trainingLoading, setTrainingLoading] = useState(false);

  // Load config
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const data = await adminAIService.getConfig();
      setConfig(data);
    } catch (err: unknown) {
      toast({ title: 'Failed to load AI config', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadTrainingExamples = async () => {
    setTrainingLoading(true);
    try {
      const data = await adminAIService.getTrainingExamples();
      setTrainingExamples(data);
    } catch (err: unknown) {
      toast({ title: 'Failed to load training examples', variant: 'destructive' });
    } finally {
      setTrainingLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      const updated = await adminAIService.updateConfig(config);
      setConfig(updated);
      toast({ title: 'AI configuration saved successfully' });
    } catch (err: unknown) {
      toast({ title: 'Failed to save config', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const updateConfig = (updates: Partial<AdminAIConfig>) => {
    if (!config) return;
    setConfig({ ...config, ...updates });
  };

  const toggleArrayItem = (field: 'allowed_read_actions' | 'allowed_write_actions' | 'confirmation_required_actions', item: string) => {
    if (!config) return;
    const arr = config[field] || [];
    const updated = arr.includes(item)
      ? arr.filter((i) => i !== item)
      : [...arr, item];
    updateConfig({ [field]: updated });
  };

  const selectAllReadActions = () => {
    if (!config) return;
    updateConfig({ allowed_read_actions: READ_ACTIONS.flatMap((g) => g.actions.map((a) => a.key)) });
  };

  const deselectAllReadActions = () => {
    if (!config) return;
    updateConfig({ allowed_read_actions: [] });
  };

  const selectAllWriteActions = () => {
    if (!config) return;
    updateConfig({ allowed_write_actions: WRITE_ACTIONS.map((a) => a.key) });
  };

  const deselectAllWriteActions = () => {
    if (!config) return;
    updateConfig({ allowed_write_actions: [] });
  };

  const requireConfirmationForAll = () => {
    if (!config) return;
    updateConfig({ confirmation_required_actions: WRITE_ACTIONS.map((a) => a.key) });
  };

  // Defense-in-depth: redirect users without permission even if RoleBasedRoute is misconfigured
  if (!authLoading && !hasPermission('config.manage_ai_rules')) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Failed to load AI configuration.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Bot className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">AI Assistant Settings</h1>
            <p className="text-muted-foreground text-sm">Configure the admin AI assistant behavior and permissions</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="self-end sm:self-auto">
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => {
        setActiveTab(v);
        if (v === 'learning' && trainingExamples.length === 0) loadTrainingExamples();
      }}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="read-actions">Read Actions</TabsTrigger>
          <TabsTrigger value="write-actions">Write Actions</TabsTrigger>
          <TabsTrigger value="learning">Learning</TabsTrigger>
        </TabsList>

        {/* ============================================================= */}
        {/* GENERAL TAB */}
        {/* ============================================================= */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Enable/disable the assistant and set base parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Enable AI Assistant</Label>
                  <p className="text-sm text-muted-foreground">Turn the floating AI widget on or off for all admins</p>
                </div>
                <Switch
                  checked={config.ai_enabled}
                  onCheckedChange={(checked) => updateConfig({ ai_enabled: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label>Greeting Message</Label>
                <Textarea
                  value={config.ai_greeting}
                  onChange={(e) => updateConfig({ ai_greeting: e.target.value })}
                  rows={3}
                  placeholder="Hi! I'm your AI assistant. How can I help?"
                />
              </div>

              <div className="space-y-2">
                <Label>System Prompt (Optional)</Label>
                <Textarea
                  value={config.ai_system_prompt}
                  onChange={(e) => updateConfig({ ai_system_prompt: e.target.value })}
                  rows={5}
                  placeholder="Custom instructions appended to the base system prompt..."
                />
                <p className="text-xs text-muted-foreground">Additional instructions to guide the AI's behavior</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Temperature: {config.temperature}</Label>
                  <Slider
                    value={[config.temperature]}
                    onValueChange={([v]) => updateConfig({ temperature: v })}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                  <p className="text-xs text-muted-foreground">Lower = more focused, Higher = more creative</p>
                </div>

                <div className="space-y-2">
                  <Label>Max Tokens</Label>
                  <Input
                    type="number"
                    value={config.max_tokens}
                    onChange={(e) => updateConfig({ max_tokens: parseInt(e.target.value) || 4096 })}
                    min={256}
                    max={16384}
                  />
                  <p className="text-xs text-muted-foreground">Maximum response length</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================= */}
        {/* MODELS TAB */}
        {/* ============================================================= */}
        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Configuration</CardTitle>
              <CardDescription>Select models for each complexity tier and set thresholds. Powered by GPT-5.2, DeepSeek-Qwenn-7B and Gemini 2.5</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Simple Model (Tier 1)</Label>
                  <Input
                    value={config.simple_model ? 'WeFundAI-2.0-lite' : ''}
                    readOnly
                    className="cursor-default"
                  />
                  <p className="text-xs text-muted-foreground">For quick FAQ-type questions</p>
                </div>
                <div className="space-y-2">
                  <Label>Standard Model (Tier 2)</Label>
                  <Input
                    value={config.standard_model ? 'WeFundAI-2.0-flash' : ''}
                    readOnly
                    className="cursor-default"
                  />
                  <p className="text-xs text-muted-foreground">For data lookups & moderate queries</p>
                </div>
                <div className="space-y-2">
                  <Label>Pro Model (Tier 3)</Label>
                  <Input
                    value={config.pro_model ? 'WeFundAI-2.0-pro' : ''}
                    readOnly
                    className="cursor-default"
                  />
                  <p className="text-xs text-muted-foreground">For complex analysis & write ops</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Standard Threshold: {config.complexity_threshold_standard}/7</Label>
                  <Slider
                    value={[config.complexity_threshold_standard]}
                    onValueChange={([v]) => updateConfig({ complexity_threshold_standard: v })}
                    min={1}
                    max={7}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">Minimum complexity to use Standard model</p>
                </div>
                <div className="space-y-2">
                  <Label>Pro Threshold: {config.complexity_threshold_pro}/7</Label>
                  <Slider
                    value={[config.complexity_threshold_pro]}
                    onValueChange={([v]) => updateConfig({ complexity_threshold_pro: v })}
                    min={1}
                    max={7}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">Minimum complexity to use Pro model</p>
                </div>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg border border-border/30">
                <h4 className="text-sm font-medium mb-2">Complexity Scale</h4>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((level) => {
                    const isSimple = level < config.complexity_threshold_standard;
                    const isStandard = level >= config.complexity_threshold_standard && level < config.complexity_threshold_pro;
                    const isPro = level >= config.complexity_threshold_pro;
                    return (
                      <div key={level} className="flex-1 text-center">
                        <div
                          className={cn(
                            'h-8 rounded flex items-center justify-center text-xs font-medium',
                            isSimple && 'bg-green-500/20 text-green-400',
                            isStandard && 'bg-blue-500/20 text-blue-400',
                            isPro && 'bg-purple-500/20 text-purple-400'
                          )}
                        >
                          {level}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1">
                          {isSimple ? 'Lite' : isStandard ? 'Std' : 'Pro'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================= */}
        {/* READ ACTIONS TAB */}
        {/* ============================================================= */}
        <TabsContent value="read-actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Read Actions</CardTitle>
              <CardDescription>Control which data lookup tools the AI can use</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Enable Read Actions</Label>
                  <p className="text-sm text-muted-foreground">Allow AI to look up data from the CRM</p>
                </div>
                <Switch
                  checked={config.read_actions_enabled}
                  onCheckedChange={(checked) => updateConfig({ read_actions_enabled: checked })}
                />
              </div>

              {config.read_actions_enabled && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {(config.allowed_read_actions || []).length} of {READ_ACTIONS.flatMap((g) => g.actions).length} actions enabled
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={selectAllReadActions}>Select All</Button>
                      <Button variant="outline" size="sm" onClick={deselectAllReadActions}>Deselect All</Button>
                    </div>
                  </div>

                  {(config.allowed_read_actions || []).length === 0 && (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-400">
                      No read actions are enabled. The AI will not be able to look up any data.
                    </div>
                  )}

                  {READ_ACTIONS.map((group) => (
                    <div key={group.group}>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">{group.group}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {group.actions.map((action) => (
                          <div key={action.key} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30">
                            <Checkbox
                              checked={config.allowed_read_actions?.includes(action.key)}
                              onCheckedChange={() => toggleArrayItem('allowed_read_actions', action.key)}
                            />
                            <Label className="text-sm font-normal cursor-pointer">{action.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================= */}
        {/* WRITE ACTIONS TAB */}
        {/* ============================================================= */}
        <TabsContent value="write-actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Write Actions</CardTitle>
              <CardDescription>Control which MT5 operations the AI can execute</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Caution banner */}
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-400 text-lg">&#9888;</span>
                  <div>
                    <h4 className="text-sm font-medium text-yellow-300">Caution</h4>
                    <p className="text-xs text-yellow-400/80 mt-0.5">
                      Write actions allow the AI to make real changes to MT5 accounts. Each action can require confirmation before execution. Enable with care.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Enable Write Actions</Label>
                  <p className="text-sm text-muted-foreground">Allow AI to execute MT5 operations</p>
                </div>
                <Switch
                  checked={config.write_actions_enabled}
                  onCheckedChange={(checked) => updateConfig({ write_actions_enabled: checked })}
                />
              </div>

              {config.write_actions_enabled && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {(config.allowed_write_actions || []).length} of {WRITE_ACTIONS.length} actions enabled
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={selectAllWriteActions}>Enable All</Button>
                      <Button variant="outline" size="sm" onClick={deselectAllWriteActions}>Disable All</Button>
                      <Button variant="outline" size="sm" onClick={requireConfirmationForAll}>Require All Confirmations</Button>
                    </div>
                  </div>

                  {(config.allowed_write_actions || []).length === 0 && (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-400">
                      No write actions are enabled. The AI will not be able to execute any MT5 operations even though the master toggle is on.
                    </div>
                  )}

                  <div className="grid grid-cols-[1fr,auto,auto] gap-x-4 gap-y-1 items-center px-2 text-xs text-muted-foreground font-medium">
                    <span>Action</span>
                    <span>Enabled</span>
                    <span>Require Confirmation</span>
                  </div>
                  {WRITE_ACTIONS.map((action) => (
                    <div
                      key={action.key}
                      className="grid grid-cols-[1fr,auto,auto] gap-x-4 items-center p-2.5 rounded-lg hover:bg-muted/30 border border-border/20"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{action.label}</span>
                        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4', riskColors[action.risk])}>
                          {action.risk}
                        </Badge>
                      </div>
                      <Checkbox
                        checked={config.allowed_write_actions?.includes(action.key)}
                        onCheckedChange={() => toggleArrayItem('allowed_write_actions', action.key)}
                      />
                      <Checkbox
                        checked={ALWAYS_REQUIRE_CONFIRMATION.has(action.key) || config.confirmation_required_actions?.includes(action.key)}
                        onCheckedChange={() => {
                          if (ALWAYS_REQUIRE_CONFIRMATION.has(action.key)) return; // Cannot uncheck
                          toggleArrayItem('confirmation_required_actions', action.key);
                        }}
                        disabled={ALWAYS_REQUIRE_CONFIRMATION.has(action.key)}
                        title={ALWAYS_REQUIRE_CONFIRMATION.has(action.key) ? 'This action always requires confirmation (enforced by system)' : undefined}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================= */}
        {/* LEARNING TAB */}
        {/* ============================================================= */}
        <TabsContent value="learning" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Training Examples</CardTitle>
              <CardDescription>Manage few-shot training examples that guide AI responses</CardDescription>
            </CardHeader>
            <CardContent>
              {trainingLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : trainingExamples.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No training examples yet.</p>
                  <p className="text-xs mt-1">Training examples are automatically created from negative feedback with corrections.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trainingExamples.map((example) => (
                    <div key={example.id} className="border border-border/30 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={example.is_active ? 'border-green-500/50 text-green-400' : 'border-muted'}>
                            {example.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">Weight: {example.weight}/10</span>
                          {example.tags?.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px]">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={async () => {
                            try {
                              await adminAIService.updateTrainingExample(example.id, { is_active: !example.is_active });
                              loadTrainingExamples();
                            } catch {
                              toast({ title: 'Failed to update', variant: 'destructive' });
                            }
                          }}
                        >
                          {example.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Question</Label>
                        <p className="text-sm">{example.question}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Ideal Response</Label>
                        <p className="text-sm text-muted-foreground">{example.ideal_response.length > 200 ? example.ideal_response.slice(0, 200) + '...' : example.ideal_response}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAISettings;

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Settings, Bot, Code, Copy, Check, MessageCircle, Zap } from 'lucide-react';
import { apiService } from '@/services/apiService';

interface AIConfig {
  id: string;
  ai_enabled: boolean;
  ai_greeting: string;
  ai_system_prompt: string;
  simple_model: string;
  complex_model: string;
  complexity_threshold: number;
  read_actions_enabled: boolean;
  write_actions_enabled: boolean;
  confidence_threshold: number;
  escalation_keywords: string[];
}

interface WidgetConfig {
  widget_settings?: {
    ai_enabled?: boolean;
    greeting_message?: string;
    attachments_enabled?: boolean;
    max_attachment_size_mb?: number;
    allowed_file_types?: string[];
  };
  api_endpoints?: {
    base_url?: string;
    start_conversation?: string;
    send_message?: string;
    get_conversation?: string;
    list_conversations?: string;
    upload_attachment?: string;
    faq_search?: string;
  };
  embed_codes?: {
    html_script?: string;
    react_component?: string;
    nextjs_component?: string;
  };
}

const SupportWidgetAdmin: React.FC = () => {
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const [aiResponse, widgetResponse] = await Promise.all([
        apiService.get('/admin/support/ai-config/'),
        apiService.get('/admin/support/widget-config/')
      ]);
      console.log('AI Config Response:', aiResponse);
      console.log('Widget Config Response:', widgetResponse);
      // Handle both raw response and wrapped {data, status} response formats
      const aiData = aiResponse?.data || aiResponse;
      const widgetData = widgetResponse?.data || widgetResponse;
      setAiConfig(aiData as AIConfig);
      setWidgetConfig(widgetData || {});
    } catch (error) {
      console.error('Error loading configs:', error);
      toast.error('Failed to load support widget configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const saveAIConfig = async () => {
    if (!aiConfig) return;

    setIsSaving(true);
    try {
      const response = await apiService.patch('/admin/support/ai-config/', {
        ai_enabled: aiConfig.ai_enabled,
        ai_greeting: aiConfig.ai_greeting,
        ai_system_prompt: aiConfig.ai_system_prompt,
        simple_model: aiConfig.simple_model,
        complex_model: aiConfig.complex_model,
        complexity_threshold: aiConfig.complexity_threshold,
        confidence_threshold: aiConfig.confidence_threshold,
        escalation_keywords: aiConfig.escalation_keywords,
      });
      setAiConfig(response.data as AIConfig || response as unknown as AIConfig);
      toast.success('AI configuration saved successfully');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = async (code: string, type: string) => {
    if (!code) {
      toast.error('No code to copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(type);
      toast.success('Code copied to clipboard');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      toast.error('Failed to copy code');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!aiConfig) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        Failed to load AI configuration. Make sure the backend is running.
      </div>
    );
  }

  // Safe accessors for nested widget config
  const embedCodes = widgetConfig?.embed_codes || {};
  const apiEndpoints = widgetConfig?.api_endpoints || {};
  const widgetSettings = widgetConfig?.widget_settings || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageCircle className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Support Chat Widget</h1>
          <p className="text-muted-foreground">Configure AI-powered support chat for your customers</p>
        </div>
      </div>

      <Tabs defaultValue="ai-settings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="ai-settings" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI Settings
          </TabsTrigger>
          <TabsTrigger value="embed-codes" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Embed Codes
          </TabsTrigger>
          <TabsTrigger value="api-endpoints" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            API Endpoints
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* General AI Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  General Settings
                </CardTitle>
                <CardDescription>Basic AI configuration options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="ai-enabled">Enable AI Responses</Label>
                    <p className="text-sm text-muted-foreground">Allow AI to automatically respond to customers</p>
                  </div>
                  <Switch
                    id="ai-enabled"
                    checked={aiConfig.ai_enabled ?? false}
                    onCheckedChange={(checked) => setAiConfig({ ...aiConfig, ai_enabled: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="greeting">Greeting Message</Label>
                  <Textarea
                    id="greeting"
                    value={aiConfig.ai_greeting ?? ''}
                    onChange={(e) => setAiConfig({ ...aiConfig, ai_greeting: e.target.value })}
                    placeholder="Enter the greeting message..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="system-prompt">System Prompt (Optional)</Label>
                  <Textarea
                    id="system-prompt"
                    value={aiConfig.ai_system_prompt ?? ''}
                    onChange={(e) => setAiConfig({ ...aiConfig, ai_system_prompt: e.target.value })}
                    placeholder="Custom instructions for the AI..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Additional instructions merged with the default system prompt
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Model Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Model Configuration
                </CardTitle>
                <CardDescription>Configure AI model selection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="simple-model">Simple Query Model</Label>
                  <Input
                    id="simple-model"
                    value={aiConfig.simple_model ? 'WeFundAI-2.0-lite' : ''}
                    readOnly
                    className="cursor-default"
                    placeholder="WeFundAI-2.0-lite"
                  />
                  <p className="text-xs text-muted-foreground">
                    Fast, cost-optimized model for simple queries
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="complex-model">Complex Query Model</Label>
                  <Input
                    id="complex-model"
                    value={aiConfig.complex_model ? 'WeFundAI-2.0-flash' : ''}
                    readOnly
                    className="cursor-default"
                    placeholder="WeFundAI-2.0-flash"
                  />
                  <p className="text-xs text-muted-foreground">
                    Advanced model for complex reasoning
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="threshold">Complexity Threshold (characters)</Label>
                  <Input
                    id="threshold"
                    type="number"
                    value={aiConfig.complexity_threshold ?? 100}
                    onChange={(e) => setAiConfig({ ...aiConfig, complexity_threshold: parseInt(e.target.value) || 100 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Messages longer than this use the complex model
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confidence">Confidence Threshold</Label>
                  <Input
                    id="confidence"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={aiConfig.confidence_threshold ?? 0.85}
                    onChange={(e) => setAiConfig({ ...aiConfig, confidence_threshold: parseFloat(e.target.value) || 0.85 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum confidence for auto-response (0-1)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Escalation Keywords */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Escalation Keywords</CardTitle>
                <CardDescription>
                  Keywords that trigger immediate escalation to human agents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Textarea
                    value={(aiConfig.escalation_keywords || []).join(', ')}
                    onChange={(e) => setAiConfig({
                      ...aiConfig,
                      escalation_keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                    })}
                    placeholder="refund, money back, lawyer, legal, sue, scam, fraud"
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated list of keywords
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveAIConfig} disabled={isSaving} size="lg">
              {isSaving ? 'Saving...' : 'Save AI Configuration'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="embed-codes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>HTML Embed Code</CardTitle>
              <CardDescription>
                Add this script tag to your website's HTML to enable the chat widget
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{embedCodes.html_script || 'Embed code not available'}</code>
                </pre>
                {embedCodes.html_script && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(embedCodes.html_script || '', 'html')}
                  >
                    {copiedCode === 'html' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>React Component</CardTitle>
              <CardDescription>
                For React applications, use this component
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm max-h-96">
                  <code>{embedCodes.react_component || 'React component code not available'}</code>
                </pre>
                {embedCodes.react_component && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(embedCodes.react_component || '', 'react')}
                  >
                    {copiedCode === 'react' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next.js Component</CardTitle>
              <CardDescription>
                For Next.js applications, use this component
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm max-h-96">
                  <code>{embedCodes.nextjs_component || 'Next.js component code not available'}</code>
                </pre>
                {embedCodes.nextjs_component && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(embedCodes.nextjs_component || '', 'nextjs')}
                  >
                    {copiedCode === 'nextjs' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-endpoints" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Endpoints</CardTitle>
              <CardDescription>
                Use these endpoints for custom integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.keys(apiEndpoints).length > 0 ? (
                  Object.entries(apiEndpoints).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                        <code className="text-xs text-muted-foreground">{value || 'Not configured'}</code>
                      </div>
                      {value && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(value, key)}
                        >
                          {copiedCode === key ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">No API endpoints configured</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Widget Settings</CardTitle>
              <CardDescription>
                Current widget configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">AI Enabled</p>
                  <p className="font-medium">{widgetSettings.ai_enabled ? 'Yes' : 'No'}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Attachments</p>
                  <p className="font-medium">{widgetSettings.attachments_enabled ? 'Enabled' : 'Disabled'}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Max File Size</p>
                  <p className="font-medium">{widgetSettings.max_attachment_size_mb ?? 'N/A'} MB</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Allowed Types</p>
                  <p className="font-medium text-xs">{(widgetSettings.allowed_file_types || []).length} types</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SupportWidgetAdmin;

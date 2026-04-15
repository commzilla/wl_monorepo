
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Server, Shield, Activity, Database, Mail, Link } from 'lucide-react';
import { webhookService } from '@/services/webhookService';

const SystemSettings = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<string>('');
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookInitialLoading, setWebhookInitialLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchWebhookStatus();
  }, []);

  const fetchWebhookStatus = async () => {
    try {
      const status = await webhookService.getWebhookStatus();
      setWebhookStatus(status.status);
    } catch (error) {
      console.error('Failed to fetch webhook status:', error);
      toast({
        title: "Failed to load webhook status",
        description: "Could not retrieve current webhook status.",
        variant: "destructive",
      });
    } finally {
      setWebhookInitialLoading(false);
    }
  };

  const handleWebhookToggle = async (enabled: boolean) => {
    setWebhookLoading(true);
    try {
      const response = enabled 
        ? await webhookService.enableWebhook()
        : await webhookService.disableWebhook();
      
      setWebhookStatus(response.status);
      toast({
        title: `Webhook ${enabled ? 'enabled' : 'disabled'}`,
        description: `Webhook has been successfully ${enabled ? 'activated' : 'paused'}.`,
      });
    } catch (error) {
      toast({
        title: "Webhook update failed",
        description: `Failed to ${enabled ? 'enable' : 'disable'} webhook.`,
        variant: "destructive",
      });
    } finally {
      setWebhookLoading(false);
    }
  };

  const handleSystemUpdate = async () => {
    setIsUpdating(true);
    try {
      // Simulate system update
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({
        title: "System settings updated",
        description: "All system settings have been successfully updated.",
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update system settings.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Application Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Application Configuration
          </CardTitle>
          <CardDescription>
            Core application settings and configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Application Name</Label>
              <Input defaultValue="WeFund Trader Management" />
            </div>
            <div className="space-y-2">
              <Label>Application Version</Label>
              <Input defaultValue="v2.0" disabled className="bg-muted" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Support Email</Label>
              <Input defaultValue="support@wefund.com" />
            </div>
            <div className="space-y-2">
              <Label>Admin Email</Label>
              <Input defaultValue="admin@wefund.com" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Application Description</Label>
            <Textarea 
              defaultValue="Comprehensive trader management platform for WeFund proprietary trading firm"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Configuration
          </CardTitle>
          <CardDescription>
            Security policies and authentication settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Two-Factor Authentication Required</Label>
              <p className="text-sm text-muted-foreground">
                Require all users to enable 2FA for account access
              </p>
            </div>
            <Switch />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Verification Required</Label>
              <p className="text-sm text-muted-foreground">
                Require email verification for new user accounts
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Password Complexity Requirements</Label>
              <p className="text-sm text-muted-foreground">
                Enforce strong password requirements
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Session Timeout (minutes)</Label>
              <Input type="number" defaultValue="60" />
            </div>
            <div className="space-y-2">
              <Label>Max Login Attempts</Label>
              <Input type="number" defaultValue="5" />
            </div>
            <div className="space-y-2">
              <Label>Password Min Length</Label>
              <Input type="number" defaultValue="8" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Monitoring
          </CardTitle>
          <CardDescription>
            System health and performance monitoring
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg text-center">
              <div className="flex items-center justify-center mb-2">
                <Server className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-sm font-medium">System Status</p>
              <Badge variant="default" className="mt-1">Online</Badge>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <div className="flex items-center justify-center mb-2">
                <Database className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-sm font-medium">Database</p>
              <Badge variant="default" className="mt-1">Connected</Badge>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <div className="flex items-center justify-center mb-2">
                <Mail className="h-5 w-5 text-purple-500" />
              </div>
              <p className="text-sm font-medium">Email Service</p>
              <Badge variant="default" className="mt-1">Active</Badge>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <div className="flex items-center justify-center mb-2">
                <Shield className="h-5 w-5 text-orange-500" />
              </div>
              <p className="text-sm font-medium">Security</p>
              <Badge variant="default" className="mt-1">Protected</Badge>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable System Logging</Label>
              <p className="text-sm text-muted-foreground">
                Log system events and user activities
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Performance Monitoring</Label>
              <p className="text-sm text-muted-foreground">
                Monitor application performance metrics
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Log Retention (days)</Label>
              <Input type="number" defaultValue="90" />
            </div>
            <div className="space-y-2">
              <Label>Backup Frequency (hours)</Label>
              <Input type="number" defaultValue="24" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Configuration
          </CardTitle>
          <CardDescription>
            Configure email service settings and templates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SMTP Server</Label>
              <Input placeholder="smtp.example.com" />
            </div>
            <div className="space-y-2">
              <Label>SMTP Port</Label>
              <Input type="number" placeholder="587" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From Email</Label>
              <Input placeholder="noreply@wefund.com" />
            </div>
            <div className="space-y-2">
              <Label>From Name</Label>
              <Input placeholder="WeFund Support" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Send email notifications for system events
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Webhook Configuration
          </CardTitle>
          <CardDescription>
            Manage WooCommerce webhook integration settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable WooCommerce Webhook</Label>
              <p className="text-sm text-muted-foreground">
                Toggle WooCommerce webhook integration (ID: 2 - WeFund CRM - Nexada)
              </p>
            </div>
            <div className="flex items-center gap-2">
              {webhookInitialLoading ? (
                <Badge variant="outline">Loading...</Badge>
              ) : (
                <Badge variant={webhookStatus === 'active' ? 'default' : 'secondary'}>
                  {webhookStatus === 'active' ? 'Active' : 'Paused'}
                </Badge>
              )}
              <Switch
                checked={webhookStatus === 'active'}
                onCheckedChange={handleWebhookToggle}
                disabled={webhookLoading || webhookInitialLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Webhook ID</Label>
              <Input value="2" disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Webhook Name</Label>
              <Input value="WeFund CRM - Nexada" disabled className="bg-muted" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea 
              value="Integration webhook for WooCommerce order processing and synchronization with WeFund CRM system"
              disabled
              className="bg-muted"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* System Actions */}
      <Card>
        <CardHeader>
          <CardTitle>System Actions</CardTitle>
          <CardDescription>
            Administrative actions and system maintenance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button onClick={handleSystemUpdate} disabled={isUpdating}>
              {isUpdating ? "Updating..." : "Save All Settings"}
            </Button>
            <Button variant="outline">
              Export Configuration
            </Button>
            <Button variant="outline">
              System Backup
            </Button>
            <Button variant="destructive" className="ml-auto">
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemSettings;

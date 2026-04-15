import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  Mail,
  Globe,
  TrendingUp,
  Package,
  Bot,
  BotOff,
  CheckCircle,
  UserPlus,
  ShoppingCart,
} from 'lucide-react';
import {
  WhatsAppService,
  WhatsAppConversation,
} from '@/services/whatsappService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppLeadPanelProps {
  conversation: WhatsAppConversation;
  onUpdate: () => void;
}

const leadStatusOptions = [
  { value: 'new', label: 'New', color: 'bg-slate-100 text-slate-700' },
  { value: 'engaged', label: 'Engaged', color: 'bg-blue-100 text-blue-700' },
  { value: 'qualified', label: 'Qualified', color: 'bg-purple-100 text-purple-700' },
  { value: 'converted', label: 'Converted', color: 'bg-green-100 text-green-700' },
  { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-700' },
];

export function WhatsAppLeadPanel({ conversation, onUpdate }: WhatsAppLeadPanelProps) {
  const [loading, setLoading] = useState('');
  const auth = useAuth();
  const { toast } = useToast();

  const lead = conversation.lead_data || {};
  const recommendations = conversation.metadata?.recommendations || [];

  const handleToggleAI = async () => {
    setLoading('ai');
    try {
      await WhatsAppService.toggleAI(conversation.id, !conversation.ai_enabled);
      toast({ title: conversation.ai_enabled ? 'AI disabled' : 'AI enabled' });
      onUpdate();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setLoading('');
    }
  };

  const handleResolve = async () => {
    setLoading('resolve');
    try {
      await WhatsAppService.resolveConversation(conversation.id);
      toast({ title: 'Conversation resolved' });
      onUpdate();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setLoading('');
    }
  };

  const handleAssignToMe = async () => {
    setLoading('assign');
    try {
      const user = auth?.user;
      await WhatsAppService.assignAgent(conversation.id, user?.id || null);
      toast({ title: 'Assigned to you' });
      onUpdate();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setLoading('');
    }
  };

  const handleLeadStatusChange = async (value: string) => {
    try {
      await WhatsAppService.updateConversation(conversation.id, { lead_status: value as any });
      toast({ title: 'Lead status updated' });
      onUpdate();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 p-4">
      {/* Quick Actions */}
      <Card className="p-3 space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Actions
        </h4>
        <div className="grid grid-cols-1 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="justify-start h-8 text-xs"
            onClick={handleToggleAI}
            disabled={loading === 'ai'}
          >
            {conversation.ai_enabled ? (
              <>
                <BotOff className="h-3.5 w-3.5 mr-2 text-orange-500" />
                Disable AI
              </>
            ) : (
              <>
                <Bot className="h-3.5 w-3.5 mr-2 text-blue-500" />
                Enable AI
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start h-8 text-xs"
            onClick={handleAssignToMe}
            disabled={loading === 'assign'}
          >
            <UserPlus className="h-3.5 w-3.5 mr-2" />
            Assign to Me
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start h-8 text-xs"
            onClick={handleResolve}
            disabled={loading === 'resolve' || conversation.status === 'resolved'}
          >
            <CheckCircle className="h-3.5 w-3.5 mr-2 text-green-500" />
            Resolve
          </Button>
        </div>
      </Card>

      {/* Lead Status */}
      <Card className="p-3 space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Lead Status
        </h4>
        <Select value={conversation.lead_status} onValueChange={handleLeadStatusChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {leadStatusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {/* Lead Info */}
      <Card className="p-3 space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Lead Information
        </h4>
        {Object.keys(lead).length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No lead data captured yet</p>
        ) : (
          <div className="space-y-2">
            {lead.name && (
              <div className="flex items-center gap-2 text-xs">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{lead.name}</span>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-2 text-xs">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{lead.email}</span>
              </div>
            )}
            {lead.country && (
              <div className="flex items-center gap-2 text-xs">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{lead.country}</span>
              </div>
            )}
            {lead.trading_experience && (
              <div className="flex items-center gap-2 text-xs">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="capitalize">{lead.trading_experience}</span>
              </div>
            )}
            {lead.interested_products && lead.interested_products.length > 0 && (
              <div className="flex items-start gap-2 text-xs">
                <Package className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                <div className="flex flex-wrap gap-1">
                  {lead.interested_products.map((p: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Product Recommendations */}
      {recommendations.length > 0 && (
        <Card className="p-3 space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            AI Recommendations
          </h4>
          <div className="space-y-2">
            {recommendations.map((rec: any, i: number) => (
              <div key={i} className="bg-muted/50 rounded p-2 text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-3 w-3 text-blue-500" />
                  <span className="font-medium">
                    {rec.challenge_type} - {rec.account_size}
                  </span>
                </div>
                <p className="text-muted-foreground">{rec.reasoning}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Conversation Info */}
      <Card className="p-3 space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Conversation Info
        </h4>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Total Messages</span>
            <span className="font-medium text-foreground">{conversation.message_count}</span>
          </div>
          <div className="flex justify-between">
            <span>AI Messages</span>
            <span className="font-medium text-foreground">{conversation.ai_message_count}</span>
          </div>
          <div className="flex justify-between">
            <span>Assigned Agent</span>
            <span className="font-medium text-foreground">
              {conversation.assigned_agent_name || 'Unassigned'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Created</span>
            <span className="font-medium text-foreground">
              {new Date(conversation.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

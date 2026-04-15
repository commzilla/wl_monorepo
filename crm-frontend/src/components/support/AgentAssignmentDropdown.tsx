import React, { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SupportService, Conversation } from '@/services/supportService';
import { useToast } from '@/hooks/use-toast';
import { UserPlus } from 'lucide-react';
import { apiService } from '@/services/apiService';

interface Agent {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface AgentAssignmentDropdownProps {
  conversation: Conversation;
  onAssigned: (agentId: string | null, agentName?: string) => void;
}

export const AgentAssignmentDropdown: React.FC<AgentAssignmentDropdownProps> = ({
  conversation,
  onAssigned,
}) => {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    setLoading(true);
    try {
      // Try to get support agents from Django API
      const response = await apiService.get<Agent[]>('/admin/support/agents/');
      if (response.data) {
        setAgents(response.data);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
      // Fallback: empty list if endpoint doesn't exist
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (agentId: string) => {
    if (agentId === 'unassign') {
      setAssigning(true);
      try {
        await SupportService.assignAgent(conversation.id, null as any);
        onAssigned(null);
        toast({ title: 'Conversation unassigned' });
      } catch (error) {
        toast({ title: 'Error unassigning', variant: 'destructive' });
      } finally {
        setAssigning(false);
      }
      return;
    }

    setAssigning(true);
    try {
      await SupportService.assignAgent(conversation.id, agentId);
      const agent = agents.find(a => a.id === agentId);
      const agentName = agent ? `${agent.first_name} ${agent.last_name}` : undefined;
      onAssigned(agentId, agentName);
      toast({ title: `Assigned to ${agentName || 'agent'}` });
    } catch (error) {
      toast({ title: 'Error assigning agent', variant: 'destructive' });
    } finally {
      setAssigning(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase();
  };

  const currentAgent = agents.find(a => a.id === conversation.assigned_agent_id);

  return (
    <Select
      value={conversation.assigned_agent_id || 'unassigned'}
      onValueChange={handleAssign}
      disabled={loading || assigning}
    >
      <SelectTrigger className="w-[180px] h-8">
        <div className="flex items-center gap-2">
          {currentAgent ? (
            <>
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-xs bg-primary/10">
                  {getInitials(currentAgent.first_name, currentAgent.last_name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm truncate">
                {currentAgent.first_name} {currentAgent.last_name}
              </span>
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Assign agent</span>
            </>
          )}
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassign">
          <span className="text-muted-foreground">Unassigned</span>
        </SelectItem>
        {agents.map(agent => (
          <SelectItem key={agent.id} value={agent.id}>
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-xs bg-primary/10">
                  {getInitials(agent.first_name, agent.last_name)}
                </AvatarFallback>
              </Avatar>
              <span>{agent.first_name} {agent.last_name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default AgentAssignmentDropdown;

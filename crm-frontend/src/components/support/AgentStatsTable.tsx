import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowUpDown, Trophy, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EnhancedAgentStats {
  agent_id: string;
  agent_name: string;
  conversations_handled: number;
  conversations_resolved: number;
  resolution_rate: number;
  messages_sent: number;
  avg_response_time_minutes: number | null;
  avg_first_response_minutes: number | null;
  active_conversations: number;
}

interface AgentStatsTableProps {
  agents: EnhancedAgentStats[];
  formatDuration: (minutes: number | null) => string;
}

type SortField = 'conversations_handled' | 'resolution_rate' | 'avg_response_time_minutes' | 'messages_sent';

export const AgentStatsTable: React.FC<AgentStatsTableProps> = ({ agents, formatDuration }) => {
  const [sortField, setSortField] = useState<SortField>('conversations_handled');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedAgents = [...agents].sort((a, b) => {
    let aVal = a[sortField] ?? 0;
    let bVal = b[sortField] ?? 0;

    // For response time, lower is better so invert for "desc"
    if (sortField === 'avg_response_time_minutes') {
      aVal = a[sortField] ?? Infinity;
      bVal = b[sortField] ?? Infinity;
    }

    if (sortDirection === 'asc') {
      return aVal - bVal;
    }
    return bVal - aVal;
  });

  const getRankBadge = (index: number) => {
    if (index === 0) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (index === 1) return <Medal className="h-4 w-4 text-gray-400" />;
    if (index === 2) return <Medal className="h-4 w-4 text-amber-600" />;
    return <span className="text-xs text-muted-foreground w-4 text-center">{index + 1}</span>;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const SortHeader: React.FC<{ field: SortField; label: string }> = ({ field, label }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={cn(
          "h-3 w-3",
          sortField === field ? "text-foreground" : "text-muted-foreground"
        )} />
      </div>
    </TableHead>
  );

  if (agents.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4">
        No agent data available
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Agent</TableHead>
            <SortHeader field="conversations_handled" label="Convos" />
            <TableHead>Resolved</TableHead>
            <SortHeader field="resolution_rate" label="Res. Rate" />
            <SortHeader field="messages_sent" label="Messages" />
            <SortHeader field="avg_response_time_minutes" label="Avg Resp" />
            <TableHead>Active</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAgents.map((agent, index) => (
            <TableRow key={agent.agent_id}>
              <TableCell className="w-12">
                <div className="flex items-center justify-center">
                  {getRankBadge(index)}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs bg-primary/10">
                      {getInitials(agent.agent_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-sm">{agent.agent_name}</span>
                </div>
              </TableCell>
              <TableCell>
                <span className="font-semibold">{agent.conversations_handled}</span>
              </TableCell>
              <TableCell>
                <span>{agent.conversations_resolved}</span>
              </TableCell>
              <TableCell>
                <Badge
                  variant={agent.resolution_rate >= 70 ? "default" : agent.resolution_rate >= 50 ? "secondary" : "outline"}
                  className={cn(
                    agent.resolution_rate >= 70 && "bg-green-500/10 text-green-600 border-green-500/20",
                    agent.resolution_rate >= 50 && agent.resolution_rate < 70 && "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                  )}
                >
                  {agent.resolution_rate.toFixed(0)}%
                </Badge>
              </TableCell>
              <TableCell>
                <span>{agent.messages_sent}</span>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono text-xs">
                  {formatDuration(agent.avg_response_time_minutes)}
                </Badge>
              </TableCell>
              <TableCell>
                {agent.active_conversations > 0 ? (
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                    {agent.active_conversations}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default AgentStatsTable;

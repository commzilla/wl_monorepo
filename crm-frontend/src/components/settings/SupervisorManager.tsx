import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { engineService } from '@/services/engineService';
import { SupervisorProcess } from '@/lib/types/engine';
import { 
  Play, 
  Square, 
  RotateCcw, 
  RefreshCw, 
  Server,
  Clock,
  AlertCircle
} from 'lucide-react';

export function SupervisorManager() {
  const [processes, setProcesses] = useState<SupervisorProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const loadProcesses = async () => {
    try {
      setLoading(true);
      const response = await engineService.getSupervisorStatus();
      console.log('Supervisor status response:', response);
      
      // Parse the status string into process objects
      if (response && typeof response.status === 'string') {
        const processLines = response.status.trim().split('\n');
        const parsedProcesses = processLines.map(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 3) {
            return {
              name: parts[0],
              status: parts[1],
              timestamp: parts.slice(2).join(' ')
            };
          }
          return null;
        }).filter(Boolean) as SupervisorProcess[];
        
        setProcesses(parsedProcesses);
      } else {
        console.error('Invalid response format:', response);
        setProcesses([]);
        toast({
          title: "Error",
          description: "Invalid response format from supervisor API",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to load supervisor processes:', error);
      setProcesses([]); // Ensure we set an empty array on error
      toast({
        title: "Error",
        description: "Failed to load supervisor processes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProcesses();
  }, []);

  const handleProcessAction = async (processName: string, action: "start" | "stop" | "restart") => {
    try {
      setActionLoading(`${processName}-${action}`);
      await engineService.controlSupervisorProcess(processName, action);
      
      toast({
        title: "Success",
        description: `Process ${processName} ${action}ed successfully`,
      });
      
      // Refresh the process list after action
      await loadProcesses();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action} process ${processName}`,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getStateColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'RUNNING':
        return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'STOPPED':
        return 'bg-red-500/10 text-red-700 border-red-500/20';
      case 'STARTING':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
      case 'STOPPING':
        return 'bg-orange-500/10 text-orange-700 border-orange-500/20';
      case 'FATAL':
        return 'bg-red-600/10 text-red-800 border-red-600/20';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp || timestamp === 'Never') return 'Never';
    return timestamp;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Supervisor Manager</h2>
          <p className="text-muted-foreground">Manage supervisor processes</p>
        </div>
        <Button onClick={loadProcesses} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {Array.isArray(processes) && processes.map((process) => (
          <Card key={process.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Server className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-lg">{process.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Badge className={getStateColor(process.status)}>
                        {process.status}
                      </Badge>
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleProcessAction(process.name, 'start')}
                    disabled={process.status === 'RUNNING' || actionLoading === `${process.name}-start`}
                    size="sm"
                    variant="outline"
                  >
                    {actionLoading === `${process.name}-start` ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    onClick={() => handleProcessAction(process.name, 'stop')}
                    disabled={process.status === 'STOPPED' || actionLoading === `${process.name}-stop`}
                    size="sm"
                    variant="outline"
                  >
                    {actionLoading === `${process.name}-stop` ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    onClick={() => handleProcessAction(process.name, 'restart')}
                    disabled={actionLoading === `${process.name}-restart`}
                    size="sm"
                    variant="outline"
                  >
                    {actionLoading === `${process.name}-restart` ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Last Status: {formatTimestamp(process.timestamp)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {Array.isArray(processes) && processes.length === 0 && (
        <div className="text-center py-12">
          <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No supervisor processes found</p>
        </div>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Wrench, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ToolActivity {
  id: string;
  type: 'tool_call' | 'tool_result';
  name: string;
  args?: Record<string, any>;
  success?: boolean;
  data?: Record<string, any>;
  error?: string;
  timestamp: string;
}

interface AdminAIToolResultProps {
  activities: ToolActivity[];
}

const SENSITIVE_FIELDS = new Set([
  'new_password', 'password', 'investor_password', 'main_password',
  'secret', 'token', 'api_key',
]);

function redactSensitive(obj: Record<string, any>): Record<string, any> {
  const redacted: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.has(key)) {
      redacted[key] = '***REDACTED***';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      redacted[key] = redactSensitive(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

function formatToolName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function ToolActivityItem({ activity }: { activity: ToolActivity }) {
  const [expanded, setExpanded] = useState(false);
  const isCall = activity.type === 'tool_call';
  const isResult = activity.type === 'tool_result';

  return (
    <div className="border border-border/30 rounded-lg overflow-hidden bg-background/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/30 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        )}

        <Wrench className="h-3 w-3 text-muted-foreground flex-shrink-0" />

        <span className="font-medium text-foreground">{formatToolName(activity.name)}</span>

        {isCall && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-blue-500/50 text-blue-400 ml-auto">
            calling
          </Badge>
        )}

        {isResult && activity.success && (
          <div className="flex items-center gap-1 ml-auto">
            <CheckCircle className="h-3 w-3 text-green-400" />
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-green-500/50 text-green-400">
              success
            </Badge>
          </div>
        )}

        {isResult && !activity.success && (
          <div className="flex items-center gap-1 ml-auto">
            <XCircle className="h-3 w-3 text-red-400" />
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-red-500/50 text-red-400">
              error
            </Badge>
          </div>
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-2 border-t border-border/20">
          {isCall && activity.args && Object.keys(activity.args).length > 0 && (
            <div className="mt-2">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Parameters</span>
              <div className="mt-1 bg-muted/30 rounded p-2">
                <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap break-all">
                  {JSON.stringify(redactSensitive(activity.args || {}), null, 2)}
                </pre>
              </div>
            </div>
          )}

          {isResult && activity.data && Object.keys(activity.data).length > 0 && (
            <div className="mt-2">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Result</span>
              <div className="mt-1 bg-muted/30 rounded p-2 max-h-40 overflow-y-auto">
                <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap break-all">
                  {JSON.stringify(activity.data, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {isResult && activity.error && (
            <div className="mt-2">
              <span className="text-[10px] uppercase font-semibold text-red-400 tracking-wider">Error</span>
              <div className="mt-1 bg-red-500/10 rounded p-2">
                <span className="text-[11px] text-red-400">{activity.error}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminAIToolResult({ activities }: AdminAIToolResultProps) {
  if (activities.length === 0) return null;

  return (
    <div className="my-2 space-y-1.5 px-2">
      {activities.map((activity) => (
        <ToolActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
}

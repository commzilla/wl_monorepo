import React from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AdminAIConfirmationProps {
  toolName: string;
  params: Record<string, any>;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function formatToolName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

const SENSITIVE_FIELDS = new Set([
  'new_password', 'password', 'investor_password', 'main_password',
  'secret', 'token', 'api_key',
]);

function redactValue(key: string, value: unknown): string {
  if (SENSITIVE_FIELDS.has(key)) return '***REDACTED***';
  return String(value);
}

function getRiskLevel(toolName: string): { label: string; className: string } {
  const critical = ['mt5_close_trades', 'mt5_disable_account', 'mt5_change_group'];
  const high = ['mt5_deposit', 'mt5_withdraw', 'mt5_change_password'];
  const medium = ['mt5_activate_trading', 'mt5_disable_trading', 'mt5_enable_account'];

  if (critical.includes(toolName)) {
    return { label: 'Critical', className: 'bg-red-500/20 text-red-400 border-red-500/30' };
  }
  if (high.includes(toolName)) {
    return { label: 'High', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' };
  }
  if (medium.includes(toolName)) {
    return { label: 'Medium', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
  }
  return { label: 'Low', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
}

export function AdminAIConfirmation({
  toolName,
  params,
  description,
  onConfirm,
  onCancel,
  isLoading,
}: AdminAIConfirmationProps) {
  const risk = getRiskLevel(toolName);

  return (
    <div className="my-3 mx-2 border border-yellow-500/30 bg-yellow-500/5 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-yellow-500/20 bg-yellow-500/10">
        <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0" />
        <span className="text-sm font-medium text-yellow-300">Confirmation Required</span>
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ml-auto ${risk.className}`}>
          {risk.label} Risk
        </Badge>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        <div className="text-sm text-foreground">{description || `Execute ${formatToolName(toolName)}?`}</div>

        {/* Params table */}
        {Object.keys(params).length > 0 && (
          <div className="bg-muted/30 rounded-lg p-2.5">
            <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1.5">
              Action Details
            </div>
            <div className="space-y-1">
              {Object.entries(params).map(([key, value]) => (
                <div key={key} className="flex items-start gap-2 text-xs">
                  <span className="text-muted-foreground min-w-[80px]">{key.replace(/_/g, ' ')}:</span>
                  <span className="text-foreground font-medium break-all">{redactValue(key, value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            onClick={onCancel}
            disabled={isLoading}
          >
            <X className="h-3.5 w-3.5 mr-1.5" />
            Cancel
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            onClick={onConfirm}
            disabled={isLoading}
          >
            <Check className="h-3.5 w-3.5 mr-1.5" />
            {isLoading ? 'Processing...' : 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  );
}

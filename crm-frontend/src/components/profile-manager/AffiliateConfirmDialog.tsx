import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, ShieldAlert, Loader2 } from 'lucide-react';

interface AffiliateConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText: string;
  variant: 'default' | 'destructive' | 'warning';
  onConfirm: () => void;
  isLoading: boolean;
}

const variantConfig = {
  default: {
    icon: CheckCircle,
    iconBg: 'bg-primary/10 text-primary',
    button: 'default' as const,
  },
  destructive: {
    icon: ShieldAlert,
    iconBg: 'bg-destructive/10 text-destructive',
    button: 'destructive' as const,
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-yellow-500/10 text-yellow-600',
    button: 'default' as const,
  },
};

export default function AffiliateConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  variant,
  onConfirm,
  isLoading,
}: AffiliateConfirmDialogProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isLoading) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.iconBg}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-muted/20 border-t border-border/60">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant={config.button}
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className={variant === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : ''}
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

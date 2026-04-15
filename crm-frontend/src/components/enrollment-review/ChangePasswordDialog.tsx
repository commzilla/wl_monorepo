import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info } from 'lucide-react';

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (mode: 'main' | 'investor' | 'both', mainPassword?: string, investorPassword?: string) => void;
  accountId?: string;
  isPending: boolean;
}

const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  accountId,
  isPending
}) => {
  const [mode, setMode] = React.useState<'main' | 'investor' | 'both'>('both');
  const [mainPassword, setMainPassword] = React.useState('');
  const [investorPassword, setInvestorPassword] = React.useState('');

  const handleConfirm = () => {
    onConfirm(mode, mainPassword || undefined, investorPassword || undefined);
  };

  const handleClose = () => {
    setMode('both');
    setMainPassword('');
    setInvestorPassword('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change MT5 Password</DialogTitle>
          <DialogDescription>
            Change the password(s) for MT5 account {accountId}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Password Type</Label>
            <Select value={mode} onValueChange={(value: 'main' | 'investor' | 'both') => setMode(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="main">Main Password Only</SelectItem>
                <SelectItem value="investor">Investor Password Only</SelectItem>
                <SelectItem value="both">Both Passwords</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(mode === 'main' || mode === 'both') && (
            <div className="space-y-2">
              <Label htmlFor="main-password">Main Password</Label>
              <Input
                id="main-password"
                type="text"
                placeholder="Leave empty to auto-generate"
                value={mainPassword}
                onChange={(e) => setMainPassword(e.target.value)}
              />
            </div>
          )}

          {(mode === 'investor' || mode === 'both') && (
            <div className="space-y-2">
              <Label htmlFor="investor-password">Investor Password</Label>
              <Input
                id="investor-password"
                type="text"
                placeholder="Leave empty to auto-generate"
                value={investorPassword}
                onChange={(e) => setInvestorPassword(e.target.value)}
              />
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
            <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Leave password fields empty to auto-generate MT5-compliant passwords. New passwords will be displayed after successful change.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? 'Changing...' : 'Change Password'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePasswordDialog;

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, CreditCard, Pencil, Plus } from 'lucide-react';

export interface PaymentMethodFormData {
  payment_type: string;
  label: string;
  is_default: boolean;
  paypal_email: string;
  rise_email: string;
  bank_account_name: string;
  bank_account_number: string;
  iban: string;
  swift_code: string;
  bank_name: string;
  bank_branch: string;
  bank_country: string;
  bank_currency: string;
  crypto_type: string;
  crypto_wallet_address: string;
}

const EMPTY_FORM: PaymentMethodFormData = {
  payment_type: 'paypal',
  label: '',
  is_default: false,
  paypal_email: '',
  rise_email: '',
  bank_account_name: '',
  bank_account_number: '',
  iban: '',
  swift_code: '',
  bank_name: '',
  bank_branch: '',
  bank_country: '',
  bank_currency: '',
  crypto_type: '',
  crypto_wallet_address: '',
};

const PAYMENT_TYPES = [
  { value: 'paypal', label: 'PayPal' },
  { value: 'rise', label: 'Rise' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'crypto', label: 'Crypto' },
];

interface PaymentMethodDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentMethodFormData) => Promise<void>;
  method?: any | null;
}

export default function PaymentMethodDialog({ isOpen, onClose, onSubmit, method }: PaymentMethodDialogProps) {
  const [form, setForm] = useState<PaymentMethodFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEdit = !!method;

  useEffect(() => {
    if (method) {
      setForm({
        payment_type: method.payment_type || 'paypal',
        label: method.label || '',
        is_default: method.is_default || false,
        paypal_email: method.paypal_email || '',
        rise_email: method.rise_email || '',
        bank_account_name: method.bank_account_name || '',
        bank_account_number: method.bank_account_number || '',
        iban: method.iban || '',
        swift_code: method.swift_code || '',
        bank_name: method.bank_name || '',
        bank_branch: method.bank_branch || '',
        bank_country: method.bank_country || '',
        bank_currency: method.bank_currency || '',
        crypto_type: method.crypto_type || '',
        crypto_wallet_address: method.crypto_wallet_address || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [method, isOpen]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (form.payment_type === 'paypal' && !form.paypal_email.trim()) {
      errs.paypal_email = 'PayPal email is required';
    }
    if (form.payment_type === 'rise' && !form.rise_email.trim()) {
      errs.rise_email = 'Rise email is required';
    }
    if (form.payment_type === 'bank') {
      if (!form.bank_account_name.trim()) errs.bank_account_name = 'Account name is required';
      if (!form.bank_account_number.trim()) errs.bank_account_number = 'Account number is required';
      if (!form.bank_name.trim()) errs.bank_name = 'Bank name is required';
    }
    if (form.payment_type === 'crypto') {
      if (!form.crypto_type.trim()) errs.crypto_type = 'Crypto type is required';
      if (!form.crypto_wallet_address.trim()) errs.crypto_wallet_address = 'Wallet address is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSubmit(form);
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof PaymentMethodFormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 rounded-xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isEdit ? 'bg-amber-500/10' : 'bg-primary/10'}`}>
              {isEdit ? (
                <Pencil size={18} className="text-amber-600 dark:text-amber-400" />
              ) : (
                <CreditCard size={18} className="text-primary" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {isEdit ? 'Edit Payment Method' : 'Add Payment Method'}
              </h2>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                {isEdit ? 'Update the payment method details below' : 'Configure a new payment method for this trader'}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Label & Type Row */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Label" optional>
              <Input
                value={form.label}
                onChange={e => update('label', e.target.value)}
                placeholder="e.g. My PayPal"
                className="h-9 text-sm bg-muted/30 border-border/50 focus:bg-background"
              />
            </Field>
            <Field label="Payment Type" required>
              <Select value={form.payment_type} onValueChange={v => update('payment_type', v)}>
                <SelectTrigger className="h-9 text-sm bg-muted/30 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Type-specific fields */}
          {form.payment_type === 'paypal' && (
            <Field label="PayPal Email" error={errors.paypal_email} required>
              <Input
                type="email"
                value={form.paypal_email}
                onChange={e => update('paypal_email', e.target.value)}
                placeholder="user@example.com"
                className="h-9 text-sm bg-muted/30 border-border/50 focus:bg-background"
              />
            </Field>
          )}

          {form.payment_type === 'rise' && (
            <Field label="Rise Email" error={errors.rise_email} required>
              <Input
                type="email"
                value={form.rise_email}
                onChange={e => update('rise_email', e.target.value)}
                placeholder="user@rise.com"
                className="h-9 text-sm bg-muted/30 border-border/50 focus:bg-background"
              />
            </Field>
          )}

          {form.payment_type === 'bank' && (
            <>
              <Field label="Account Holder Name" error={errors.bank_account_name} required>
                <Input
                  value={form.bank_account_name}
                  onChange={e => update('bank_account_name', e.target.value)}
                  className="h-9 text-sm bg-muted/30 border-border/50 focus:bg-background"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Account Number" error={errors.bank_account_number} required>
                  <Input
                    value={form.bank_account_number}
                    onChange={e => update('bank_account_number', e.target.value)}
                    className="h-9 text-sm bg-muted/30 border-border/50 focus:bg-background"
                  />
                </Field>
                <Field label="Bank Name" error={errors.bank_name} required>
                  <Input
                    value={form.bank_name}
                    onChange={e => update('bank_name', e.target.value)}
                    className="h-9 text-sm bg-muted/30 border-border/50 focus:bg-background"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="IBAN" optional>
                  <Input
                    value={form.iban}
                    onChange={e => update('iban', e.target.value)}
                    className="h-9 text-sm bg-muted/30 border-border/50 focus:bg-background font-mono"
                  />
                </Field>
                <Field label="SWIFT Code" optional>
                  <Input
                    value={form.swift_code}
                    onChange={e => update('swift_code', e.target.value)}
                    className="h-9 text-sm bg-muted/30 border-border/50 focus:bg-background font-mono"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Branch" optional>
                  <Input
                    value={form.bank_branch}
                    onChange={e => update('bank_branch', e.target.value)}
                    className="h-9 text-sm bg-muted/30 border-border/50 focus:bg-background"
                  />
                </Field>
                <Field label="Country" optional>
                  <Input
                    value={form.bank_country}
                    onChange={e => update('bank_country', e.target.value)}
                    className="h-9 text-sm bg-muted/30 border-border/50 focus:bg-background"
                  />
                </Field>
                <Field label="Currency" optional>
                  <Input
                    value={form.bank_currency}
                    onChange={e => update('bank_currency', e.target.value)}
                    placeholder="USD"
                    className="h-9 text-sm bg-muted/30 border-border/50 focus:bg-background"
                  />
                </Field>
              </div>
            </>
          )}

          {form.payment_type === 'crypto' && (
            <>
              <Field label="Crypto Type" error={errors.crypto_type} required>
                <Input
                  value={form.crypto_type}
                  onChange={e => update('crypto_type', e.target.value)}
                  placeholder="e.g. USDT (TRC20)"
                  className="h-9 text-sm bg-muted/30 border-border/50 focus:bg-background"
                />
              </Field>
              <Field label="Wallet Address" error={errors.crypto_wallet_address} required>
                <Input
                  value={form.crypto_wallet_address}
                  onChange={e => update('crypto_wallet_address', e.target.value)}
                  placeholder="0x..."
                  className="h-9 text-sm bg-muted/30 border-border/50 focus:bg-background font-mono"
                />
              </Field>
            </>
          )}

          {/* Default toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-3">
            <div>
              <Label className="text-sm font-medium text-foreground">Default Method</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Use this as the primary payment method</p>
            </div>
            <Switch checked={form.is_default} onCheckedChange={v => update('is_default', v)} />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/20 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={saving}
            className="h-9"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={saving}
            className="h-9 min-w-[140px]"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                {isEdit ? 'Saving…' : 'Adding…'}
              </>
            ) : (
              <>
                {isEdit ? (
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                ) : (
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                )}
                {isEdit ? 'Save Changes' : 'Add Method'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  required,
  optional,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
        {optional && <span className="text-muted-foreground/60 text-[10px]">(optional)</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

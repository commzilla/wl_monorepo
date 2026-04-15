import React, { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2, Edit, Percent, DollarSign, Upload, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/layout/PageHeader';
import { discountCodeService, type DiscountCode } from '@/services/discountCodeService';

const CHALLENGE_TYPE_OPTIONS = [
  { value: '1-step-algo', label: '1-Step Algo' },
  { value: '1-step-pro', label: '1-Step Pro' },
  { value: '2-step', label: '2-Step' },
  { value: 'instant-funding', label: 'Instant Funding' },
];

const DiscountCodes = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<DiscountCode | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed' | 'buy_one_get_one',
    discount_value: '',
    max_uses: '',
    usage_limit_per_user: '',
    min_order_amount: '0',
    valid_from: '',
    valid_until: '',
    is_active: true,
    bogo_challenge_types: [] as string[],
  });

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ['discount-codes'],
    queryFn: () => discountCodeService.getDiscountCodes(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<DiscountCode>) => discountCodeService.createDiscountCode(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-codes'] });
      toast({ title: 'Success', description: 'Discount code created' });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DiscountCode> }) =>
      discountCodeService.updateDiscountCode(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-codes'] });
      toast({ title: 'Success', description: 'Discount code updated' });
      setEditingCode(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => discountCodeService.deleteDiscountCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-codes'] });
      toast({ title: 'Success', description: 'Discount code deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importMutation = useMutation({
    mutationFn: (file: File) => discountCodeService.bulkImportCSV(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['discount-codes'] });
      const parts = [`${data.created} created`, `${data.updated} updated`];
      if (data.errors?.length) parts.push(`${data.errors.length} errors`);
      toast({ title: 'Import Complete', description: parts.join(', ') });
    },
    onError: (error: Error) => {
      toast({ title: 'Import Failed', description: error.message, variant: 'destructive' });
    },
  });

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importMutation.mutate(file);
    e.target.value = '';
  };

  const resetForm = () => {
    setFormData({ code: '', discount_type: 'percentage', discount_value: '', max_uses: '', usage_limit_per_user: '', min_order_amount: '0', valid_from: '', valid_until: '', is_active: true, bogo_challenge_types: [] });
  };

  const openEdit = (code: DiscountCode) => {
    setEditingCode(code);
    setFormData({
      code: code.code,
      discount_type: code.discount_type,
      discount_value: code.discount_value,
      max_uses: code.max_uses?.toString() || '',
      usage_limit_per_user: code.usage_limit_per_user?.toString() || '',
      min_order_amount: code.min_order_amount,
      valid_from: code.valid_from || '',
      valid_until: code.valid_until || '',
      is_active: code.is_active,
      bogo_challenge_types: code.bogo_challenge_types || [],
    });
  };

  const handleSubmit = () => {
    const payload: Partial<DiscountCode> = {
      code: formData.code,
      discount_type: formData.discount_type,
      discount_value: formData.discount_value || '0',
      max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
      usage_limit_per_user: formData.usage_limit_per_user ? parseInt(formData.usage_limit_per_user) : null,
      min_order_amount: formData.min_order_amount,
      valid_from: formData.valid_from || null,
      valid_until: formData.valid_until || null,
      is_active: formData.is_active,
      bogo_challenge_types: formData.discount_type === 'buy_one_get_one' ? formData.bogo_challenge_types : [],
    };
    if (editingCode) {
      updateMutation.mutate({ id: editingCode.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const filteredCodes = useMemo(() => {
    return codes.filter((c) => c.code.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [codes, searchQuery]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discount Codes"
        subtitle="Manage discount codes for website checkout"
      />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search codes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <input type="file" ref={fileInputRef} accept=".csv" onChange={handleFileImport} className="hidden" />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importMutation.isPending} className="w-full sm:w-auto">
            <Upload className="w-4 h-4 mr-2" />
            {importMutation.isPending ? 'Importing...' : 'Import CSV'}
          </Button>
          <Button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Code
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Uses</TableHead>
                <TableHead>Per User</TableHead>
                <TableHead>Valid Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No discount codes found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCodes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell className="font-mono font-medium">{code.code}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {code.discount_type === 'percentage' ? <Percent className="w-3 h-3" /> : code.discount_type === 'buy_one_get_one' ? <Gift className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                        {code.discount_type === 'buy_one_get_one' ? 'BOGO' : code.discount_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {code.discount_type === 'buy_one_get_one'
                        ? (parseFloat(code.discount_value) > 0 ? `${code.discount_value}% + Free 2nd` : 'Free 2nd')
                        : code.discount_type === 'percentage' ? `${code.discount_value}%` : `$${code.discount_value}`}
                    </TableCell>
                    <TableCell>
                      {code.current_uses}{code.max_uses ? ` / ${code.max_uses}` : ' / Unlimited'}
                    </TableCell>
                    <TableCell>
                      {code.usage_limit_per_user ?? 'Unlimited'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {code.valid_from ? new Date(code.valid_from).toLocaleDateString() : 'Any'} -{' '}
                      {code.valid_until ? new Date(code.valid_until).toLocaleDateString() : 'Any'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={code.is_active ? 'default' : 'secondary'}>
                        {code.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(code)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => { if (confirm('Delete this code?')) deleteMutation.mutate(code.id); }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || !!editingCode} onOpenChange={(open) => {
        if (!open) { setIsCreateOpen(false); setEditingCode(null); resetForm(); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCode ? 'Edit Discount Code' : 'Create Discount Code'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Code</Label>
              <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="e.g. SAVE20" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Discount Type</Label>
                <Select value={formData.discount_type} onValueChange={(v) => setFormData({ ...formData, discount_type: v as 'percentage' | 'fixed' | 'buy_one_get_one', bogo_challenge_types: v === 'buy_one_get_one' ? formData.bogo_challenge_types : [] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="buy_one_get_one">Buy One Get One</SelectItem>
                  </SelectContent>
                </Select>
              </div>
                <div>
                <Label>{formData.discount_type === 'buy_one_get_one' ? 'Additional % Off (optional)' : 'Value'}</Label>
                <Input type="number" value={formData.discount_value} onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })} placeholder={formData.discount_type === 'buy_one_get_one' ? '0' : ''} />
              </div>
            </div>
            {formData.discount_type === 'buy_one_get_one' && (
              <div>
                <Label>Challenge Types *</Label>
                <p className="text-xs text-muted-foreground mb-2">Select which challenge types qualify for the free second enrollment</p>
                <div className="space-y-2 border rounded-md p-3">
                  {CHALLENGE_TYPE_OPTIONS.map((opt) => (
                    <div key={opt.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`bogo-${opt.value}`}
                        checked={formData.bogo_challenge_types.includes(opt.value)}
                        onCheckedChange={(checked) => {
                          setFormData({
                            ...formData,
                            bogo_challenge_types: checked
                              ? [...formData.bogo_challenge_types, opt.value]
                              : formData.bogo_challenge_types.filter((t) => t !== opt.value),
                          });
                        }}
                      />
                      <Label htmlFor={`bogo-${opt.value}`} className="cursor-pointer font-normal">
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Max Uses (empty = unlimited)</Label>
                <Input type="number" value={formData.max_uses} onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })} />
              </div>
              <div>
                <Label>Per User Limit (empty = unlimited)</Label>
                <Input type="number" value={formData.usage_limit_per_user} onChange={(e) => setFormData({ ...formData, usage_limit_per_user: e.target.value })} />
              </div>
              <div>
                <Label>Min Order Amount</Label>
                <Input type="number" value={formData.min_order_amount} onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Valid From</Label>
                <Input type="datetime-local" value={formData.valid_from} onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })} />
              </div>
              <div>
                <Label>Valid Until</Label>
                <Input type="datetime-local" value={formData.valid_until} onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateOpen(false); setEditingCode(null); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={
              createMutation.isPending || updateMutation.isPending ||
              (formData.discount_type === 'buy_one_get_one' && formData.bogo_challenge_types.length === 0)
            }>
              {editingCode ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiscountCodes;

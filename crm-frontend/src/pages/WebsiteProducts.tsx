import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Package, Search, Trash2, Edit, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/layout/PageHeader';
import { websiteProductService, type WebsiteProduct, type WebsiteProductVariant, type WebsiteProductAddon } from '@/services/websiteProductService';
import { challengeService } from '@/services/challengeService';

interface VariantFormData {
  id?: number;
  account_size: number;
  price: string;
  entry_fee: string;
  original_price: string;
  sku: string;
  broker_type: string;
  currency: string;
  is_active: boolean;
  sort_order: number;
  _isNew?: boolean;
  _deleted?: boolean;
}

interface AddonFormData {
  id?: number;
  name: string;
  description: string;
  price_type: string;
  price_value: string;
  is_active: boolean;
  sort_order: number;
  effect_type: string;
  effect_value: string;
  effect_from_payout: number | null;
  _isNew?: boolean;
  _deleted?: boolean;
}

const emptyVariant = (): VariantFormData => ({
  account_size: 0,
  price: '',
  entry_fee: '',
  original_price: '',
  sku: '',
  broker_type: 'mt5',
  currency: 'USD',
  is_active: true,
  sort_order: 0,
  _isNew: true,
});

const emptyAddon = (): AddonFormData => ({
  name: '',
  description: '',
  price_type: 'fixed',
  price_value: '',
  is_active: true,
  sort_order: 0,
  effect_type: 'none',
  effect_value: '',
  effect_from_payout: null,
  _isNew: true,
});

const WebsiteProducts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<WebsiteProduct | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    sku_prefix: '',
    description: '',
    challenge_type: '1-step-algo',
    challenge: null as number | null,
    is_active: true,
    is_pay_after_pass: false,
    sort_order: 0,
  });
  const [variants, setVariants] = useState<VariantFormData[]>([]);
  const [addons, setAddons] = useState<AddonFormData[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['website-products'],
    queryFn: () => websiteProductService.getProducts(),
  });

  const { data: challenges = [] } = useQuery({
    queryKey: ['challenges'],
    queryFn: () => challengeService.getChallenges(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<WebsiteProduct>) => websiteProductService.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-products'] });
      toast({ title: 'Success', description: 'Product created successfully' });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => websiteProductService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-products'] });
      toast({ title: 'Success', description: 'Product deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({ name: '', slug: '', sku_prefix: '', description: '', challenge_type: '1-step-algo', challenge: null, is_active: true, is_pay_after_pass: false, sort_order: 0 });
    setVariants([]);
    setAddons([]);
  };

  const openEdit = (product: WebsiteProduct) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      slug: product.slug,
      sku_prefix: product.sku_prefix,
      description: product.description,
      challenge_type: product.challenge_type,
      challenge: product.challenge || null,
      is_active: product.is_active,
      is_pay_after_pass: product.is_pay_after_pass || false,
      sort_order: product.sort_order,
    });
    setVariants(
      (product.variants || []).map((v) => ({
        id: v.id,
        account_size: v.account_size,
        price: v.price,
        entry_fee: v.entry_fee || '',
        original_price: v.original_price || '',
        sku: v.sku,
        broker_type: v.broker_type,
        currency: v.currency,
        is_active: v.is_active,
        sort_order: v.sort_order,
      }))
    );
    setAddons(
      (product.addons || []).map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        price_type: a.price_type,
        price_value: a.price_value,
        is_active: a.is_active,
        sort_order: a.sort_order,
        effect_type: a.effect_type || 'none',
        effect_value: a.effect_value || '',
        effect_from_payout: a.effect_from_payout ?? null,
      }))
    );
  };

  const handleSubmit = async () => {
    // Validate PAP products have entry fees on active variants
    if (formData.is_pay_after_pass) {
      const activeVariants = variants.filter(v => !v._deleted && v.is_active);
      const missingFees = activeVariants.filter(v => !v.entry_fee || parseFloat(v.entry_fee) <= 0);
      if (missingFees.length > 0) {
        toast({ title: 'Entry fee required', description: 'All active variants must have an entry fee for Pay After Pass products.', variant: 'destructive' });
        return;
      }
    }

    if (!editingProduct) {
      createMutation.mutate(formData);
      return;
    }

    setIsSaving(true);
    try {
      // Update product fields
      await websiteProductService.updateProduct(editingProduct.id, formData);

      // Process variant changes
      const originalIds = new Set((editingProduct.variants || []).map((v) => v.id));
      const currentIds = new Set(variants.filter((v) => v.id && !v._deleted).map((v) => v.id));

      // Delete removed variants
      for (const id of originalIds) {
        if (!currentIds.has(id)) {
          await websiteProductService.deleteVariant(id);
        }
      }

      // Create new variants
      for (const v of variants) {
        if (v._isNew && !v._deleted) {
          await websiteProductService.createVariant({
            product: editingProduct.id,
            account_size: v.account_size,
            price: v.price,
            entry_fee: v.entry_fee || undefined,
            original_price: v.original_price || undefined,
            sku: v.sku,
            broker_type: v.broker_type,
            currency: v.currency,
            is_active: v.is_active,
            sort_order: v.sort_order,
          } as any);
        }
      }

      // Update existing variants
      for (const v of variants) {
        if (v.id && !v._isNew && !v._deleted && originalIds.has(v.id)) {
          await websiteProductService.updateVariant(v.id, {
            account_size: v.account_size,
            price: v.price,
            entry_fee: v.entry_fee || undefined,
            original_price: v.original_price || undefined,
            sku: v.sku,
            broker_type: v.broker_type,
            currency: v.currency,
            is_active: v.is_active,
            sort_order: v.sort_order,
          } as any);
        }
      }

      // Process addon changes
      const originalAddonIds = new Set((editingProduct.addons || []).map((a) => a.id));
      const currentAddonIds = new Set(addons.filter((a) => a.id && !a._deleted).map((a) => a.id));

      // Delete removed addons
      for (const id of originalAddonIds) {
        if (!currentAddonIds.has(id)) {
          await websiteProductService.deleteAddon(id);
        }
      }

      // Create new addons
      for (const a of addons) {
        if (a._isNew && !a._deleted) {
          await websiteProductService.createAddon({
            name: a.name,
            description: a.description,
            price_type: a.price_type,
            price_value: a.price_value,
            is_active: a.is_active,
            sort_order: a.sort_order,
            effect_type: a.effect_type,
            effect_value: a.effect_value,
            effect_from_payout: a.effect_from_payout,
            products: [editingProduct.id],
          });
        }
      }

      // Update existing addons
      for (const a of addons) {
        if (a.id && !a._isNew && !a._deleted && originalAddonIds.has(a.id)) {
          await websiteProductService.updateAddon(a.id, {
            name: a.name,
            description: a.description,
            price_type: a.price_type,
            price_value: a.price_value,
            is_active: a.is_active,
            sort_order: a.sort_order,
            effect_type: a.effect_type,
            effect_value: a.effect_value,
            effect_from_payout: a.effect_from_payout,
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['website-products'] });
      toast({ title: 'Success', description: 'Product updated successfully' });
      setEditingProduct(null);
      resetForm();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const updateVariant = (index: number, field: keyof VariantFormData, value: any) => {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  };

  const removeVariant = (index: number) => {
    setVariants((prev) => {
      const v = prev[index];
      if (v._isNew) {
        return prev.filter((_, i) => i !== index);
      }
      return prev.map((item, i) => (i === index ? { ...item, _deleted: true } : item));
    });
  };

  const updateAddon = (index: number, field: keyof AddonFormData, value: any) => {
    setAddons((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)));
  };

  const removeAddon = (index: number) => {
    setAddons((prev) => {
      const a = prev[index];
      if (a._isNew) {
        return prev.filter((_, i) => i !== index);
      }
      return prev.map((item, i) => (i === index ? { ...item, _deleted: true } : item));
    });
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.challenge_type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const challengeTypeLabel = (type: string) => {
    switch (type) {
      case '1-step-algo': return '1 Step Algo';
      case '1-step-pro': return '1 Step Pro';
      case '2-step': return '2 Step';
      case 'instant-funding': return 'Instant Funding';
      default: return type;
    }
  };

  const visibleVariants = variants.filter((v) => !v._deleted);
  const visibleAddons = addons.filter((a) => !a._deleted);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Website Products"
        subtitle="Manage products displayed on the website storefront"
      />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading products...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No products found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base">{product.name}</CardTitle>
                  </div>
                  <Badge variant={product.is_active ? 'default' : 'secondary'}>
                    {product.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">{challengeTypeLabel(product.challenge_type)}</Badge>
                  {product.is_pay_after_pass && (
                    <Badge variant="default" className="bg-amber-500/90 text-white">PAP</Badge>
                  )}
                  <span>SKU: {product.sku_prefix}</span>
                  {!product.challenge && <Badge variant="destructive" className="text-xs">No challenge linked</Badge>}
                </div>
                {product.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                )}
                <div className="text-sm">
                  <span className="font-medium">{product.variants?.length || 0}</span> variants,{' '}
                  <span className="font-medium">{product.addons?.length || 0}</span> addons
                </div>
                {product.variants?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {product.variants.map((v) => (
                      <Badge key={v.id} variant="outline" className="text-xs">
                        ${(v.account_size / 1000)}k - ${v.price}
                      </Badge>
                    ))}
                  </div>
                )}
                {product.addons?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {product.addons.map((a) => (
                      <Badge key={a.id} variant="secondary" className="text-xs">
                        {a.name} {a.price_type === 'free' ? '(Free)' : a.price_type === 'percentage' ? `${a.price_value}%` : `$${a.price_value}`}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={() => openEdit(product)}>
                    <Edit className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm('Delete this product?')) deleteMutation.mutate(product.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || !!editingProduct} onOpenChange={(open) => {
        if (!open) { setIsCreateOpen(false); setEditingProduct(null); resetForm(); }
      }}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Create Product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>SKU Prefix</Label>
                <Input value={formData.sku_prefix} onChange={(e) => setFormData({ ...formData, sku_prefix: e.target.value })} />
              </div>
              <div>
                <Label>Challenge Type</Label>
                <Select value={formData.challenge_type} onValueChange={(v) => setFormData({ ...formData, challenge_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-step-algo">1 Step Algo</SelectItem>
                    <SelectItem value="1-step-pro">1 Step Pro</SelectItem>
                    <SelectItem value="2-step">2 Step</SelectItem>
                    <SelectItem value="instant-funding">Instant Funding</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Challenge Configuration</Label>
                <Select
                  value={formData.challenge ? String(formData.challenge) : 'none'}
                  onValueChange={(v) => setFormData({ ...formData, challenge: v === 'none' ? null : parseInt(v) })}
                >
                  <SelectTrigger><SelectValue placeholder="Select challenge..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No challenge linked</SelectItem>
                    {challenges.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name} ({c.step_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={formData.sort_order} onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Label>Active</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                >
                  {formData.is_active ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                  {formData.is_active ? 'Yes' : 'No'}
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFormData({ ...formData, is_pay_after_pass: !formData.is_pay_after_pass })}
              >
                {formData.is_pay_after_pass ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
              </Button>
              <div>
                <Label className="text-sm font-medium">Pay After Pass</Label>
                <p className="text-xs text-muted-foreground">
                  Clients pay a small entry fee upfront and full price only after passing the challenge
                </p>
              </div>
            </div>

            {/* Variants Section */}
            {editingProduct && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Variants ({visibleVariants.length})</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setVariants((prev) => [...prev, emptyVariant()])}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Variant
                    </Button>
                  </div>

                  {visibleVariants.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No variants yet. Add one to define account sizes and pricing.</p>
                  )}

                  {variants.map((variant, index) => {
                    if (variant._deleted) return null;
                    return (
                      <div key={variant.id || `new-${index}`} className="border rounded-lg p-3 space-y-3 relative">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {variant.account_size > 0 ? `$${(variant.account_size / 1000)}k` : 'New Variant'}
                            {variant._isNew && <Badge variant="secondary" className="ml-2 text-xs">New</Badge>}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeVariant(index)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className={`grid grid-cols-1 ${formData.is_pay_after_pass ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-3`}>
                          <div>
                            <Label className="text-xs">Account Size ($)</Label>
                            <Input
                              type="number"
                              value={variant.account_size || ''}
                              onChange={(e) => updateVariant(index, 'account_size', parseInt(e.target.value) || 0)}
                              placeholder="e.g. 100000"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Price ($)</Label>
                            <Input
                              value={variant.price}
                              onChange={(e) => updateVariant(index, 'price', e.target.value)}
                              placeholder="e.g. 547.00"
                            />
                          </div>
                          {formData.is_pay_after_pass && (
                            <div>
                              <Label className="text-xs">Entry Fee ($)</Label>
                              <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={variant.entry_fee}
                                onChange={(e) => updateVariant(index, 'entry_fee', e.target.value)}
                                placeholder="e.g. 8.00"
                              />
                            </div>
                          )}
                          <div>
                            <Label className="text-xs">Original Price ($)</Label>
                            <Input
                              value={variant.original_price}
                              onChange={(e) => updateVariant(index, 'original_price', e.target.value)}
                              placeholder="Strikethrough price"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs">SKU</Label>
                            <Input
                              value={variant.sku}
                              onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                              placeholder="e.g. ALGO-100K-MT5"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Broker</Label>
                            <Select value={variant.broker_type} onValueChange={(v) => updateVariant(index, 'broker_type', v)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="mt5">MetaTrader 5</SelectItem>
                                <SelectItem value="ctrader">cTrader</SelectItem>
                                <SelectItem value="tradelocker">TradeLocker</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-end gap-2 pb-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateVariant(index, 'is_active', !variant.is_active)}
                            >
                              {variant.is_active ? <ToggleRight className="w-4 h-4 text-primary" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                              <span className="text-xs ml-1">{variant.is_active ? 'Active' : 'Inactive'}</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Addons Section */}
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Add-ons ({visibleAddons.length})</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAddons((prev) => [...prev, emptyAddon()])}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Add-on
                    </Button>
                  </div>

                  {visibleAddons.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No add-ons yet. Add one to offer optional upgrades with this product.</p>
                  )}

                  {addons.map((addon, index) => {
                    if (addon._deleted) return null;
                    return (
                      <div key={addon.id || `new-addon-${index}`} className="border rounded-lg p-3 space-y-3 relative">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {addon.name || 'New Add-on'}
                            {addon._isNew && <Badge variant="secondary" className="ml-2 text-xs">New</Badge>}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeAddon(index)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Name</Label>
                            <Input
                              value={addon.name}
                              onChange={(e) => updateAddon(index, 'name', e.target.value)}
                              placeholder="e.g. 90% Profit Split"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Price Type</Label>
                              <Select value={addon.price_type} onValueChange={(v) => updateAddon(index, 'price_type', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="fixed">Fixed Price</SelectItem>
                                  <SelectItem value="percentage">% of Variant Price</SelectItem>
                                  <SelectItem value="free">Free</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">{addon.price_type === 'percentage' ? 'Percentage (%)' : 'Price ($)'}</Label>
                              <Input
                                value={addon.price_value}
                                onChange={(e) => updateAddon(index, 'price_value', e.target.value)}
                                placeholder={addon.price_type === 'percentage' ? '10' : '0.00'}
                                disabled={addon.price_type === 'free'}
                              />
                            </div>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Description</Label>
                          <Textarea
                            value={addon.description}
                            onChange={(e) => updateAddon(index, 'description', e.target.value)}
                            placeholder="Describe what this add-on offers..."
                            className="min-h-[60px]"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs">Effect Type</Label>
                            <Select value={addon.effect_type} onValueChange={(v) => updateAddon(index, 'effect_type', v)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Effect</SelectItem>
                                <SelectItem value="profit_split">Profit Split Override</SelectItem>
                                <SelectItem value="accelerated_payout">Accelerated Payout</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">
                              {addon.effect_type === 'profit_split' ? 'Profit Split %' :
                               addon.effect_type === 'accelerated_payout' ? 'Payout Delay (days)' :
                               'Effect Value'}
                            </Label>
                            <Input
                              value={addon.effect_value}
                              onChange={(e) => updateAddon(index, 'effect_value', e.target.value)}
                              placeholder={addon.effect_type === 'profit_split' ? 'e.g. 90' :
                                           addon.effect_type === 'accelerated_payout' ? 'e.g. 14' : ''}
                              disabled={addon.effect_type === 'none'}
                            />
                          </div>
                          {addon.effect_type === 'profit_split' && (
                            <div>
                              <Label className="text-xs">From Payout #</Label>
                              <Input
                                type="number"
                                value={addon.effect_from_payout ?? ''}
                                onChange={(e) => updateAddon(index, 'effect_from_payout', e.target.value ? parseInt(e.target.value) : null)}
                                placeholder="e.g. 3 (blank = all)"
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Sort Order</Label>
                            <Input
                              type="number"
                              value={addon.sort_order}
                              onChange={(e) => updateAddon(index, 'sort_order', parseInt(e.target.value) || 0)}
                              className="w-20"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateAddon(index, 'is_active', !addon.is_active)}
                          >
                            {addon.is_active ? <ToggleRight className="w-4 h-4 text-primary" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                            <span className="text-xs ml-1">{addon.is_active ? 'Active' : 'Inactive'}</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateOpen(false); setEditingProduct(null); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSaving || createMutation.isPending}>
              {isSaving ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WebsiteProducts;

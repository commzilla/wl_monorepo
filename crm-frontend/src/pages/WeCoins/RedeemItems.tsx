import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, Upload, Image as ImageIcon, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { redeemItemService } from '@/services/redeemItemService';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import type { RedeemItem, CreateRedeemItemData, RedeemItemCategory, RedeemItemExpireAction } from '@/lib/types/redeemItem';
import { CATEGORY_LABELS, EXPIRE_ACTION_LABELS } from '@/lib/types/redeemItem';

const RedeemItems = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RedeemItem | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other' as RedeemItemCategory,
    required_wecoins: '',
    stock_quantity: '0',
    max_per_user: '0',
    is_active: true,
    coupon_code: '',
    addon_code: '',
    image_file: null as File | null,
    starts_at: null as Date | null,
    expires_at: null as Date | null,
    expire_action: 'deactivate' as RedeemItemExpireAction,
    is_archived: false,
  });

  // Fetch items
  const { data: items, isLoading } = useQuery({
    queryKey: ['redeem-items', categoryFilter, activeFilter, searchQuery],
    queryFn: () => redeemItemService.getItems({
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      is_active: activeFilter === 'all' ? undefined : activeFilter === 'active',
      search: searchQuery || undefined,
    }),
  });

  // Create item mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateRedeemItemData) => redeemItemService.createItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redeem-items'] });
      toast({ title: 'Success', description: 'Redeem item created successfully' });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to create item', variant: 'destructive' });
    },
  });

  // Update item mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateRedeemItemData }) =>
      redeemItemService.updateItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redeem-items'] });
      toast({ title: 'Success', description: 'Item updated successfully' });
      setIsEditDialogOpen(false);
      setSelectedItem(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update item', variant: 'destructive' });
    },
  });

  // Delete item mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => redeemItemService.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redeem-items'] });
      toast({ title: 'Success', description: 'Item deleted successfully' });
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to delete item', variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'other',
      required_wecoins: '',
      stock_quantity: '0',
      max_per_user: '0',
      is_active: true,
      coupon_code: '',
      addon_code: '',
      image_file: null,
      starts_at: null,
      expires_at: null,
      expire_action: 'deactivate',
      is_archived: false,
    });
    setImagePreview(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, image_file: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = () => {
    createMutation.mutate({
      title: formData.title,
      description: formData.description,
      category: formData.category,
      required_wecoins: parseFloat(formData.required_wecoins),
      stock_quantity: parseInt(formData.stock_quantity),
      max_per_user: parseInt(formData.max_per_user),
      is_active: formData.is_active,
      coupon_code: formData.coupon_code || undefined,
      addon_code: formData.addon_code || undefined,
      image_file: formData.image_file || undefined,
      starts_at: formData.starts_at ? formData.starts_at.toISOString() : undefined,
      expires_at: formData.expires_at ? formData.expires_at.toISOString() : undefined,
      expire_action: formData.expire_action,
      is_archived: formData.is_archived,
    });
  };

  const handleEdit = (item: RedeemItem) => {
    setSelectedItem(item);
    setFormData({
      title: item.title,
      description: item.description,
      category: item.category,
      required_wecoins: item.required_wecoins.toString(),
      stock_quantity: item.stock_quantity.toString(),
      max_per_user: item.max_per_user.toString(),
      is_active: item.is_active,
      coupon_code: item.coupon_code || '',
      addon_code: item.addon_code || '',
      image_file: null,
      starts_at: item.starts_at ? new Date(item.starts_at) : null,
      expires_at: item.expires_at ? new Date(item.expires_at) : null,
      expire_action: item.expire_action || 'deactivate',
      is_archived: item.is_archived ?? false,
    });
    setImagePreview(item.image_url);
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedItem) return;
    updateMutation.mutate({
      id: selectedItem.id,
      data: {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        required_wecoins: parseFloat(formData.required_wecoins),
        stock_quantity: parseInt(formData.stock_quantity),
        max_per_user: parseInt(formData.max_per_user),
        is_active: formData.is_active,
        coupon_code: formData.coupon_code || undefined,
        addon_code: formData.addon_code || undefined,
        image_file: formData.image_file || undefined,
        starts_at: formData.starts_at ? formData.starts_at.toISOString() : null,
        expires_at: formData.expires_at ? formData.expires_at.toISOString() : null,
        expire_action: formData.expire_action,
        is_archived: formData.is_archived,
      },
    });
  };

  const handleDelete = (item: RedeemItem) => {
    setSelectedItem(item);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedItem) {
      deleteMutation.mutate(selectedItem.id);
    }
  };

  const getCategoryBadgeVariant = (category: RedeemItemCategory) => {
    switch (category) {
      case 'discount':
        return 'default';
      case 'subscription':
        return 'secondary';
      case 'merch':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getAvailabilityBadge = (item: RedeemItem) => {
    if (item.is_archived) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="text-muted-foreground">Archived</Badge>
            </TooltipTrigger>
            <TooltipContent>This item has been archived</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    if (item.is_available) {
      return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/25">Available</Badge>;
    }
    if (item.is_scheduled) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/20 hover:bg-amber-500/25">Scheduled</Badge>
            </TooltipTrigger>
            <TooltipContent>
              Available from {item.starts_at ? format(new Date(item.starts_at), 'PPp') : 'N/A'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    if (item.is_expired) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="destructive">Expired</Badge>
            </TooltipTrigger>
            <TooltipContent>
              Expired on {item.expires_at ? format(new Date(item.expires_at), 'PPp') : 'N/A'}.
              Action: {EXPIRE_ACTION_LABELS[item.expire_action] || item.expire_action}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return <Badge variant="secondary">Unavailable</Badge>;
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      <PageHeader title="WeCoins Redeem Items" />

      <Card>
        <CardContent className="p-3 sm:p-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Item
            </Button>
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Image</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Required WeCoins</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading items...
                    </TableCell>
                  </TableRow>
                ) : items?.data && items.data.length > 0 ? (
                  items.data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="w-12 h-12 object-cover rounded-md"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell>
                        <Badge variant={getCategoryBadgeVariant(item.category)}>
                          {CATEGORY_LABELS[item.category]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        {item.required_wecoins} WeCoins
                      </TableCell>
                      <TableCell>
                        {item.stock_quantity === 0 ? (
                          <span className="text-muted-foreground">Unlimited</span>
                        ) : (
                          item.stock_quantity
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.is_active ? 'default' : 'secondary'}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getAvailabilityBadge(item)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No items found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
          setSelectedItem(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditDialogOpen ? 'Edit Item' : 'Create Item'}</DialogTitle>
            <DialogDescription>
              {isEditDialogOpen ? 'Update the item details below' : 'Fill in the details to create a new redeemable item'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter item title"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter item description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: RedeemItemCategory) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="required_wecoins">Required WeCoins *</Label>
                <Input
                  id="required_wecoins"
                  type="number"
                  step="0.01"
                  value={formData.required_wecoins}
                  onChange={(e) => setFormData({ ...formData, required_wecoins: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock_quantity">Stock Quantity</Label>
                <Input
                  id="stock_quantity"
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  placeholder="0 for unlimited"
                />
                <p className="text-xs text-muted-foreground">Leave 0 for unlimited redemptions</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_per_user">Max Redemptions Per User</Label>
                <Input
                  id="max_per_user"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.max_per_user}
                  onChange={(e) => setFormData({ ...formData, max_per_user: e.target.value })}
                  placeholder="0 for unlimited"
                />
                <p className="text-xs text-muted-foreground">0 = unlimited</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="is_active">Active Status</Label>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  {formData.is_active ? 'Active' : 'Inactive'}
                </Label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="coupon_code">Coupon Code</Label>
                <Input
                  id="coupon_code"
                  value={formData.coupon_code}
                  onChange={(e) => setFormData({ ...formData, coupon_code: e.target.value })}
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="addon_code">Addon Code</Label>
                <Input
                  id="addon_code"
                  value={formData.addon_code}
                  onChange={(e) => setFormData({ ...formData, addon_code: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Scheduling & Expiration Section */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium text-sm">Scheduling & Expiration</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Starts At</Label>
                  <DateTimePicker
                    value={formData.starts_at}
                    onChange={(date) => setFormData({ ...formData, starts_at: date })}
                  />
                  <p className="text-xs text-muted-foreground">Leave empty for immediate availability</p>
                </div>

                <div className="space-y-2">
                  <Label>Expires At</Label>
                  <DateTimePicker
                    value={formData.expires_at}
                    onChange={(date) => setFormData({ ...formData, expires_at: date })}
                  />
                  <p className="text-xs text-muted-foreground">Leave empty for no expiry</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>On Expiration</Label>
                  <Select
                    value={formData.expire_action}
                    onValueChange={(value: RedeemItemExpireAction) => setFormData({ ...formData, expire_action: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EXPIRE_ACTION_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Action taken when item expires</p>
                </div>

                <div className="space-y-2">
                  <Label>Archived</Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch
                      checked={formData.is_archived}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_archived: checked })}
                    />
                    <Label className="cursor-pointer text-sm">
                      {formData.is_archived ? 'Archived' : 'Not archived'}
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_file">Item Image</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="image_file"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('image_file')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image
                </Button>
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded-md"
                  />
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                setSelectedItem(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={isEditDialogOpen ? handleUpdate : handleCreate}
              disabled={!formData.title || !formData.required_wecoins}
            >
              {isEditDialogOpen ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedItem?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RedeemItems;

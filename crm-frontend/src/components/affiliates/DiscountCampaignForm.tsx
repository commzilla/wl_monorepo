
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DiscountCampaign } from '@/types/affiliate';

interface DiscountCampaignFormProps {
  discount?: DiscountCampaign | null;
  onSubmit: (data: {
    id?: string;
    name: string;
    description?: string;
    discount_type: string;
    discount_value: number;
    valid_from: string;
    valid_to: string;
    is_active: boolean;
    usage_limit?: number;
  }) => void;
  isLoading: boolean;
}

const DiscountCampaignForm: React.FC<DiscountCampaignFormProps> = ({ discount, onSubmit, isLoading }) => {
  const [name, setName] = useState(discount?.name || '');
  const [description, setDescription] = useState(discount?.description || '');
  const [discountType, setDiscountType] = useState(discount?.discount_type || 'percentage');
  const [discountValue, setDiscountValue] = useState(discount?.discount_value || 0);
  const [validFrom, setValidFrom] = useState(
    discount?.valid_from ? new Date(discount.valid_from).toISOString().slice(0, 16) : ''
  );
  const [validTo, setValidTo] = useState(
    discount?.valid_to ? new Date(discount.valid_to).toISOString().slice(0, 16) : ''
  );
  const [isActive, setIsActive] = useState(discount?.is_active ?? true);
  const [usageLimit, setUsageLimit] = useState(discount?.usage_limit || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: discount?.id,
      name,
      description,
      discount_type: discountType,
      discount_value: discountValue,
      valid_from: new Date(validFrom).toISOString(),
      valid_to: new Date(validTo).toISOString(),
      is_active: isActive,
      usage_limit: usageLimit ? parseInt(usageLimit as string) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Campaign Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter campaign name"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter campaign description"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="discountType">Discount Type</Label>
          <Select value={discountType} onValueChange={(value: 'percentage' | 'fixed_amount') => setDiscountType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage (%)</SelectItem>
              <SelectItem value="fixed_amount">Fixed Amount ($)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="discountValue">
            Discount Value {discountType === 'percentage' ? '(%)' : '($)'}
          </Label>
          <Input
            id="discountValue"
            type="number"
            min="0"
            max={discountType === 'percentage' ? "100" : undefined}
            step={discountType === 'percentage' ? "1" : "0.01"}
            value={discountValue}
            onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="validFrom">Valid From</Label>
          <Input
            id="validFrom"
            type="datetime-local"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="validTo">Valid To</Label>
          <Input
            id="validTo"
            type="datetime-local"
            value={validTo}
            onChange={(e) => setValidTo(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="usageLimit">Usage Limit (optional)</Label>
        <Input
          id="usageLimit"
          type="number"
          min="1"
          value={usageLimit}
          onChange={(e) => setUsageLimit(e.target.value)}
          placeholder="Leave empty for unlimited usage"
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isActive"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        <Label htmlFor="isActive">Campaign is active</Label>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : discount ? 'Update Campaign' : 'Create Campaign'}
        </Button>
      </div>
    </form>
  );
};

export default DiscountCampaignForm;

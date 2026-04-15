
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, ToggleLeft, ToggleRight } from 'lucide-react';
import { DiscountCampaign } from '@/types/affiliate';

interface AffiliateDiscountsProps {
  discounts: DiscountCampaign[] | undefined;
  isLoading: boolean;
  onCreateDiscount: () => void;
  onEditDiscount: (discount: DiscountCampaign) => void;
  onToggleDiscount: (id: string, isActive: boolean) => void;
}

const AffiliateDiscounts: React.FC<AffiliateDiscountsProps> = ({
  discounts,
  isLoading,
  onCreateDiscount,
  onEditDiscount,
  onToggleDiscount,
}) => {
  const formatDiscountValue = (type: string, value: number) => {
    return type === 'percentage' ? `${value}%` : `$${value.toFixed(2)}`;
  };

  const isDiscountActive = (discount: DiscountCampaign) => {
    const now = new Date();
    const validFrom = new Date(discount.valid_from);
    const validTo = new Date(discount.valid_to);
    return discount.is_active && now >= validFrom && now <= validTo;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Discount Campaigns</CardTitle>
            <CardDescription>Create and manage promotional discount campaigns</CardDescription>
          </div>
          <Button onClick={onCreateDiscount}>
            <Plus className="w-4 h-4 mr-2" />
            Create Campaign
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {!discounts || discounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No discount campaigns found. Create your first campaign to get started.
              </div>
            ) : (
              discounts.map((discount) => (
                <div key={discount.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{discount.name}</h3>
                      <p className="text-sm text-muted-foreground">{discount.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={isDiscountActive(discount) ? "default" : "secondary"}
                        className={isDiscountActive(discount) ? "bg-green-100 text-green-800" : ""}
                      >
                        {isDiscountActive(discount) ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggleDiscount(discount.id, !discount.is_active)}
                      >
                        {discount.is_active ? (
                          <ToggleRight className="w-4 h-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-gray-400" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditDiscount(discount)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Discount:</span>
                      <span className="ml-2 text-lg font-semibold text-primary">
                        {formatDiscountValue(discount.discount_type, discount.discount_value)}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Valid Period:</span>
                      <div className="ml-2">
                        <div>{new Date(discount.valid_from).toLocaleDateString()}</div>
                        <div>to {new Date(discount.valid_to).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Usage:</span>
                      <span className="ml-2">
                        {discount.usage_count}{discount.usage_limit ? `/${discount.usage_limit}` : ''}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AffiliateDiscounts;

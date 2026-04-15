
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, DollarSign, Target, AlertTriangle } from 'lucide-react';
import EditChallengeProductDialog from './EditChallengeProductDialog';
import DeleteChallengeProductDialog from './DeleteChallengeProductDialog';
import { ChallengeProduct } from '@/services/challengeService';

interface ChallengeProductCardProps {
  product: ChallengeProduct;
  onUpdate: () => void;
}

const ChallengeProductCard: React.FC<ChallengeProductCardProps> = ({ product, onUpdate }) => {
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage}%`;
  };

  return (
    <>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{product.name}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={product.is_active ? "default" : "secondary"}>
                {product.is_active ? "Active" : "Inactive"}
              </Badge>
              <Badge variant="outline">
                {product.challenge_type === 'one_step' ? '1-Step' : '2-Step'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Account Size</p>
                <p className="font-medium">{formatCurrency(product.account_size)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Entry Fee</p>
                <p className="font-medium">{formatCurrency(product.entry_fee)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Phase 1 Target</p>
                <p className="font-medium">{formatPercentage(product.profit_target_phase_1)}</p>
              </div>
            </div>
            
            {product.profit_target_phase_2 && (
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Phase 2 Target</p>
                  <p className="font-medium">{formatPercentage(product.profit_target_phase_2)}</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Daily Loss</p>
                <p className="font-medium">{formatPercentage(product.max_daily_loss)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-xs text-muted-foreground">Total Loss</p>
                <p className="font-medium">{formatPercentage(product.max_total_loss)}</p>
              </div>
            </div>
          </div>

          {product.rules && Object.keys(product.rules).length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Rules</p>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {JSON.stringify(product.rules, null, 2)}
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setEditOpen(true)}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-red-600 hover:text-red-700"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <EditChallengeProductDialog
        product={product}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={onUpdate}
      />

      <DeleteChallengeProductDialog
        product={product}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onSuccess={onUpdate}
      />
    </>
  );
};

export default ChallengeProductCard;

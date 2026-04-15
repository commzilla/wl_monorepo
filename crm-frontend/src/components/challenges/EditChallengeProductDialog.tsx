
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ChallengeProductForm from './ChallengeProductForm';
import { ChallengeProduct } from '@/services/challengeService';

interface EditChallengeProductDialogProps {
  product: ChallengeProduct;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const EditChallengeProductDialog: React.FC<EditChallengeProductDialogProps> = ({
  product,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const handleSuccess = () => {
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Challenge Product</DialogTitle>
        </DialogHeader>
        <ChallengeProductForm 
          product={product}
          onSuccess={handleSuccess} 
        />
      </DialogContent>
    </Dialog>
  );
};

export default EditChallengeProductDialog;


import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import ChallengeProductForm from './ChallengeProductForm';

interface AddChallengeProductDialogProps {
  onSuccess?: () => void;
}

const AddChallengeProductDialog: React.FC<AddChallengeProductDialogProps> = ({ onSuccess }) => {
  const [open, setOpen] = React.useState(false);

  const handleSuccess = () => {
    setOpen(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Challenge Product
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Challenge Product</DialogTitle>
        </DialogHeader>
        <ChallengeProductForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
};

export default AddChallengeProductDialog;

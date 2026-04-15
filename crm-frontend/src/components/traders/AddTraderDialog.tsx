
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import TraderForm from './TraderForm';

interface AddTraderDialogProps {
  onSuccess?: () => void;
}

const AddTraderDialog: React.FC<AddTraderDialogProps> = ({ onSuccess }) => {
  const { t } = useLanguage();
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
          {t('traders.addTrader') || 'Add Trader'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-semibold">
            {t('traders.addTrader') || 'Add New Trader'}
          </DialogTitle>
        </DialogHeader>
        <div className="px-1">
          <TraderForm onSuccess={handleSuccess} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddTraderDialog;

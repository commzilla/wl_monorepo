
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Edit } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import EditTraderForm from './EditTraderForm';

interface DisplayTrader {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  fullAddress: string;
  kycStatus: 'approved' | 'rejected' | 'pending' | 'not_submitted';
  hasLiveAccount: boolean;
  registeredAt: Date;
  challenges: { id: string; status: string }[];
  accounts: { status: string }[];
}

interface EditTraderDialogProps {
  trader: DisplayTrader;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const EditTraderDialog: React.FC<EditTraderDialogProps> = ({ 
  trader, 
  open, 
  onOpenChange, 
  onSuccess 
}) => {
  const { t } = useLanguage();

  const handleSuccess = () => {
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] lg:max-w-[1000px] w-[95vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader className="pb-6 border-b">
          <DialogTitle className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-lg font-bold text-primary border-2 border-primary/20">
              <Edit size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-primary">
                {t('traders.editTrader') || 'Edit Trader'}
              </h2>
              <p className="text-muted-foreground font-normal">
                {trader.firstName} {trader.lastName} - {trader.email}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="py-6">
          <EditTraderForm trader={trader} onSuccess={handleSuccess} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditTraderDialog;

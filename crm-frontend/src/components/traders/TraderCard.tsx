
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, Clock, Award, Eye, Edit, Trash, MapPin, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { getCountryNameSafe } from '@/lib/utils/countryUtils';
import { traderService } from '@/services/traderService';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import TraderViewDialog from './TraderViewDialog';
import EditTraderDialog from './EditTraderDialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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

interface TraderCardProps {
  trader: DisplayTrader;
  onUpdated?: () => void;
  onDeleted?: () => void;
}

const TraderCard: React.FC<TraderCardProps> = ({ trader, onUpdated, onDeleted }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showViewDialog, setShowViewDialog] = React.useState(false);
  const [showEditDialog, setShowEditDialog] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const getKycStatusIcon = (status: DisplayTrader['kycStatus']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'rejected':
        return <XCircle size={16} className="text-red-500" />;
      case 'pending':
        return <Clock size={16} className="text-yellow-500" />;
      case 'not_submitted':
        return <XCircle size={16} className="text-gray-500" />;
    }
  };

  const getKycStatusText = (status: DisplayTrader['kycStatus']) => {
    switch (status) {
      case 'approved':
        return t('traders.kycStatus.approved') || 'Approved';
      case 'rejected':
        return t('traders.kycStatus.rejected') || 'Rejected';
      case 'pending':
        return t('traders.kycStatus.pending') || 'Pending';
      case 'not_submitted':
        return t('traders.kycStatus.notSubmitted') || 'Not Submitted';
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowEditDialog(true);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await traderService.deleteTrader(trader.id);
      toast({
        title: 'Trader Deleted',
        description: `${trader.firstName} ${trader.lastName} has been deleted successfully`,
      });
      onDeleted?.();
    } catch (error: any) {
      console.error('Error deleting trader:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete trader',
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowViewDialog(true);
  };

  const handleTraderUpdated = () => {
    setShowEditDialog(false);
    onUpdated?.();
  };

  const handleProfileManager = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/traders/${trader.id}/review`);
  };

  return (
    <>
      <Card className="group hover:shadow-lg hover:border-primary/50 transition-all duration-200">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            {/* Left Section - Trader Info */}
            <div className="flex items-start space-x-4 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-base sm:text-xl font-bold text-primary border-2 border-primary/20">
                  {trader.firstName[0]}{trader.lastName[0]}
                </div>
                {trader.hasLiveAccount && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <Award size={12} className="text-white" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                  <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">
                    {trader.firstName} {trader.lastName}
                  </h3>
                  <div className="flex items-center gap-1">
                    {getKycStatusIcon(trader.kycStatus)}
                    <span className="text-xs sm:text-sm font-medium">{getKycStatusText(trader.kycStatus)}</span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground mb-1 truncate">{trader.email}</p>

                {trader.fullAddress && trader.fullAddress !== 'Not provided' && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <MapPin size={12} className="flex-shrink-0" />
                    {trader.fullAddress}
                  </p>
                )}

                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Challenges:</span>
                    <span className="text-sm font-semibold text-primary">{trader.challenges.length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Active Accounts:</span>
                    <span className="text-sm font-semibold text-green-600">
                      {trader.accounts.filter(a => a.status === 'active').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section - Actions */}
            <div className="flex flex-wrap items-center gap-2 opacity-100 sm:opacity-60 group-hover:opacity-100 transition-opacity">
              <Button
                variant="outline"
                size="sm"
                onClick={handleView}
                className="h-9 px-3"
              >
                <Eye size={16} className="mr-1" />
                Quick Review
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleProfileManager}
                className="h-9 px-3"
              >
                <Settings size={16} className="mr-1" />
                Profile Manager
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                className="h-9 px-3"
              >
                <Edit size={16} className="mr-1" />
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-destructive border-destructive/20 hover:bg-destructive hover:text-destructive-foreground"
                    disabled={isDeleting}
                  >
                    <Trash size={16} className="mr-1" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="sm:max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <Trash size={20} className="text-destructive" />
                      {t('traders.deleteTrader') || 'Delete Trader'}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-left">
                      {t('traders.deleteConfirm', { TraderName: `${trader.firstName} ${trader.lastName}` }) || `Are you sure you want to delete ${trader.firstName} ${trader.lastName}?`}
                      <br />
                      <span className="text-destructive font-medium">
                        {t('traders.deleteWarning') || 'This action cannot be undone.'}
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete Trader'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      <TraderViewDialog
        trader={trader}
        open={showViewDialog}
        onOpenChange={setShowViewDialog}
      />

      <EditTraderDialog
        trader={trader}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={handleTraderUpdated}
      />
    </>
  );
};

export default TraderCard;

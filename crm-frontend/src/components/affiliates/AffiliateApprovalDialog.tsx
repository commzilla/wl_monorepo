import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AffiliateApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  action: 'approve' | 'disapprove';
  affiliateName?: string;
  isLoading?: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
}

const AffiliateApprovalDialog: React.FC<AffiliateApprovalDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  action,
  affiliateName,
  isLoading = false,
  title,
  description,
  confirmText,
}) => {
  const defaultTitle = action === 'approve' ? 'Approve Affiliate' : 'Disapprove Affiliate';
  const defaultDescription = action === 'approve' ? (
    <>
      Are you sure you want to approve{' '}
      <span className="font-semibold">{affiliateName}</span> as an affiliate?
      This will allow them to start earning commissions.
    </>
  ) : (
    <>
      Are you sure you want to disapprove{' '}
      <span className="font-semibold">{affiliateName}</span>?
      This will prevent them from earning commissions until re-approved.
    </>
  );
  const defaultConfirmText = action === 'approve' ? 'Approve' : 'Disapprove';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {title || defaultTitle}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {description || defaultDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={
              action === 'approve'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-yellow-600 hover:bg-yellow-700'
            }
          >
            {isLoading ? 'Processing...' : (confirmText || defaultConfirmText)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AffiliateApprovalDialog;

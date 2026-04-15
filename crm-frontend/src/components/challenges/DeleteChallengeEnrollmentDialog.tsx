import React, { useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react';
import { challengeService, ChallengeEnrollment } from '@/services/challengeService';

interface DeleteChallengeEnrollmentDialogProps {
  enrollment: ChallengeEnrollment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const DeleteChallengeEnrollmentDialog: React.FC<DeleteChallengeEnrollmentDialogProps> = ({
  enrollment,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!enrollment) return;

    setIsDeleting(true);
    try {
      await challengeService.deleteChallengeEnrollment(enrollment.id);
      toast({
        title: "Success",
        description: "Challenge enrollment deleted successfully",
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error deleting enrollment:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete enrollment",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <AlertDialogTitle className="text-lg font-semibold text-red-900">
                Delete Challenge Enrollment
              </AlertDialogTitle>
            </div>
          </div>
        </AlertDialogHeader>
        
        <AlertDialogDescription className="text-gray-700 space-y-3">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="font-medium text-red-800 mb-2">
              ⚠️ This action cannot be undone!
            </p>
            <p className="text-sm text-red-700">
              You are about to permanently delete the challenge enrollment for:
            </p>
          </div>
          
          {enrollment && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div>
                <span className="font-medium">Trader:</span> {enrollment.client_name}
              </div>
              <div>
                <span className="font-medium">Email:</span> {enrollment.client_email}
              </div>
              <div>
                <span className="font-medium">Challenge:</span> {enrollment.challenge.name}
              </div>
              <div>
                <span className="font-medium">Account Size:</span> {enrollment.account_size} {enrollment.currency}
              </div>
              {enrollment.mt5_account_id && (
                <div>
                  <span className="font-medium">MT5 Account:</span> {enrollment.mt5_account_id}
                </div>
              )}
            </div>
          )}
          
          <div className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="font-medium text-yellow-800 mb-1">Before proceeding:</p>
            <ul className="list-disc list-inside space-y-1 text-yellow-700">
              <li>Ensure all related trading data has been backed up</li>
              <li>Verify that the trader has been notified if necessary</li>
              <li>Consider deactivating instead of deleting if you may need the data later</li>
            </ul>
          </div>
          
          <p className="font-medium text-gray-800">
            Are you absolutely sure you want to delete this challenge enrollment?
          </p>
        </AlertDialogDescription>

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDeleting ? 'Deleting...' : 'Delete Enrollment'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteChallengeEnrollmentDialog;
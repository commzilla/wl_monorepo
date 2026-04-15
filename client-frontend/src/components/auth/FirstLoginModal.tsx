
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateClientName } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import { Edit2 } from 'lucide-react';

interface FirstLoginModalProps {
  isOpen: boolean;
  initialFirstName: string;
  initialLastName: string;
  onComplete: () => void;
}

export const FirstLoginModal: React.FC<FirstLoginModalProps> = ({
  isOpen,
  initialFirstName,
  initialLastName,
  onComplete,
}) => {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleConfirm = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: "Error",
        description: "Both first and last name are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      await updateClientName({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      
      toast({
        title: "Success",
        description: "Your name has been confirmed successfully",
      });
      
      onComplete();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update name",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditName = () => {
    setIsEditing(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px] bg-[#0A1016] border-[#23353E]">
        <DialogHeader>
          <DialogTitle className="text-[#E4EEF5] text-xl font-semibold">
            Confirm your legal name
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Body Text */}
          <div className="text-[#85A8C3] text-sm leading-relaxed">
            <p className="mb-3">
              Please confirm your first and last name exactly as they appear on your government ID / KYC documents.
            </p>
            <p className="mb-3">
              You can only confirm or edit it once. After this step, the name will be locked.
            </p>
            <p className="text-[#FF6B6B]">
              If the name here doesn't match your KYC documents, your verification and payouts may be delayed or rejected.
            </p>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-[#85A8C3] text-sm font-medium">
                First name
              </Label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
                className="bg-[#0A1016] border-[#23353E] text-[#E4EEF5] placeholder-[#85A8C3] focus:ring-[#4EC1FF] focus:border-[#4EC1FF]"
                disabled={!isEditing}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-[#85A8C3] text-sm font-medium">
                Last name
              </Label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your last name"
                className="bg-[#0A1016] border-[#23353E] text-[#E4EEF5] placeholder-[#85A8C3] focus:ring-[#4EC1FF] focus:border-[#4EC1FF]"
                disabled={!isEditing}
                required
              />
            </div>

            {/* Helper Note */}
            <p className="text-[#85A8C3] text-xs mt-2">
              This must match your KYC documents (passport, national ID, driver's license, etc.).
            </p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            {!isEditing ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleEditName}
                  className="border-[#23353E] text-[#85A8C3] hover:bg-[#23353E] hover:text-[#E4EEF5]"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit name
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirm}
                  disabled={loading}
                  className="bg-[#4EC1FF] hover:bg-[#3AB3FF] text-[#E4EEF5] font-semibold px-6"
                >
                  {loading ? 'Confirming...' : 'Confirm'}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className="bg-[#4EC1FF] hover:bg-[#3AB3FF] text-[#E4EEF5] font-semibold px-6"
              >
                {loading ? 'Confirming...' : 'Confirm'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

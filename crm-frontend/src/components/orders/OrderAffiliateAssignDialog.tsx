import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { orderService, AssignAffiliateData } from '@/services/orderService';
import { affiliateService } from '@/services/affiliateService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AffiliateUser } from '@/types/affiliate';

interface OrderAffiliateAssignDialogProps {
  orderId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAffiliateAssigned: () => void;
}

export const OrderAffiliateAssignDialog: React.FC<OrderAffiliateAssignDialogProps> = ({
  orderId,
  open,
  onOpenChange,
  onAffiliateAssigned,
}) => {
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<string>('');
  const [affiliates, setAffiliates] = useState<AffiliateUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchAffiliates();
    }
  }, [open]);

  const fetchAffiliates = async () => {
    try {
      setLoading(true);
      const response = await affiliateService.getAffiliateUsers();
      setAffiliates(response.results || []);
    } catch (error: any) {
      toast({
        title: "Failed to load affiliates",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedAffiliateId) {
      toast({
        title: "Please select an affiliate",
        variant: "destructive",
      });
      return;
    }

    try {
      setAssigning(true);

      // Use numeric ID if the selected value is a pure number; otherwise send as-is (UUIDs)
      const isNumeric = /^\d+$/.test(selectedAffiliateId);
      const payload: AssignAffiliateData = {
        affiliate_user_id: isNumeric ? Number(selectedAffiliateId) : selectedAffiliateId,
      };

      const response = await orderService.assignOrderAffiliate(orderId, payload);
      
      toast({
        title: "Affiliate assigned successfully",
        description: response.commission_amount ? `Commission amount: $${response.commission_amount}` : undefined,
      });
      
      onAffiliateAssigned();
      onOpenChange(false);
      setSelectedAffiliateId('');
    } catch (error: any) {
      toast({
        title: "Failed to assign affiliate",
        description: error?.message || 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Affiliate to Order #{orderId}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="affiliate">Select Affiliate User</Label>
            <Select 
              value={selectedAffiliateId} 
              onValueChange={setSelectedAffiliateId}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder={loading ? "Loading affiliates..." : "Choose an affiliate"} />
              </SelectTrigger>
              <SelectContent>
                {affiliates.map((affiliate) => (
                  <SelectItem key={affiliate.id} value={affiliate.id.toString()}>
                    {affiliate.username} - {affiliate.affiliate_profile.referral_code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={assigning}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={loading || assigning || !selectedAffiliateId}>
            {assigning ? "Assigning..." : "Assign Affiliate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/apiService';

interface Certificate {
  id: string;
  user: string;
  user_username: string;
  certificate_type: 'phase_pass' | 'payout';
  title: string;
  enrollment_id?: string;
  payout_id?: string;
  image_url?: string;
  pdf_url?: string;
  issued_date: string;
  expiry_date?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface CertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificate?: Certificate | null;
}

interface CertificateFormData {
  user: string;
  certificate_type: 'phase_pass' | 'payout';
  title: string;
  enrollment_id?: string;
  payout_id?: string;
  image_url?: string;
  pdf_url?: string;
  expiry_date?: string;
  metadata?: Record<string, any>;
}

const CertificateDialog: React.FC<CertificateDialogProps> = ({
  open,
  onOpenChange,
  certificate,
}) => {
  const [formData, setFormData] = useState<CertificateFormData>({
    user: '',
    certificate_type: 'phase_pass',
    title: '',
    enrollment_id: '',
    payout_id: '',
    image_url: '',
    pdf_url: '',
    expiry_date: '',
    metadata: {},
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isEditing = !!certificate;
  const hideUserField = isEditing && !!formData.user;

  useEffect(() => {
    if (certificate) {
      setFormData({
        user: certificate.user,
        certificate_type: certificate.certificate_type,
        title: certificate.title,
        enrollment_id: certificate.enrollment_id || '',
        payout_id: certificate.payout_id || '',
        image_url: certificate.image_url || '',
        pdf_url: certificate.pdf_url || '',
        expiry_date: certificate.expiry_date || '',
        metadata: certificate.metadata || {},
      });
    } else {
      setFormData({
        user: '',
        certificate_type: 'phase_pass',
        title: '',
        enrollment_id: '',
        payout_id: '',
        image_url: '',
        pdf_url: '',
        expiry_date: '',
        metadata: {},
      });
    }
  }, [certificate]);

  const mutation = useMutation({
    mutationFn: async (data: CertificateFormData) => {
      const endpoint = isEditing ? `/certificates2/${certificate!.id}/` : '/certificates2/';
      const method = isEditing ? 'put' : 'post';
      
      // Clean up empty fields
      const cleanData = { ...data };
      if (!cleanData.enrollment_id) delete cleanData.enrollment_id;
      if (!cleanData.payout_id) delete cleanData.payout_id;
      if (!cleanData.image_url) delete cleanData.image_url;
      if (!cleanData.pdf_url) delete cleanData.pdf_url;
      if (!cleanData.expiry_date) delete cleanData.expiry_date;
      
      const response = await apiService[method](endpoint, cleanData);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      toast({
        title: "Success",
        description: `Certificate ${isEditing ? 'updated' : 'created'} successfully`,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} certificate: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.user || !formData.title) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!formData.image_url && !formData.pdf_url) {
      toast({
        title: "Error",
        description: "At least one file URL (image or PDF) must be provided",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate(formData);
  };

  const handleInputChange = (field: keyof CertificateFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Certificate' : 'Create New Certificate'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!hideUserField && (
              <div className="space-y-2">
                <Label htmlFor="user">User ID *</Label>
                <Input
                  id="user"
                  value={formData.user}
                  onChange={(e) => handleInputChange('user', e.target.value)}
                  placeholder="Enter user ID"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="certificate_type">Certificate Type *</Label>
              <Select
                value={formData.certificate_type}
                onValueChange={(value: 'phase_pass' | 'payout') => 
                  handleInputChange('certificate_type', value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phase_pass">Challenge Phase Pass</SelectItem>
                  <SelectItem value="payout">Payout Certificate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter certificate title"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="enrollment_id">Enrollment ID</Label>
              <Input
                id="enrollment_id"
                value={formData.enrollment_id}
                onChange={(e) => handleInputChange('enrollment_id', e.target.value)}
                placeholder="Enter enrollment ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payout_id">Payout ID</Label>
              <Input
                id="payout_id"
                value={formData.payout_id}
                onChange={(e) => handleInputChange('payout_id', e.target.value)}
                placeholder="Enter payout ID"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL</Label>
            <Input
              id="image_url"
              value={formData.image_url}
              onChange={(e) => handleInputChange('image_url', e.target.value)}
              placeholder="Enter image URL"
              type="url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pdf_url">PDF URL</Label>
            <Input
              id="pdf_url"
              value={formData.pdf_url}
              onChange={(e) => handleInputChange('pdf_url', e.target.value)}
              placeholder="Enter PDF URL"
              type="url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiry_date">Expiry Date</Label>
            <Input
              id="expiry_date"
              type="date"
              value={formData.expiry_date}
              onChange={(e) => handleInputChange('expiry_date', e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CertificateDialog;

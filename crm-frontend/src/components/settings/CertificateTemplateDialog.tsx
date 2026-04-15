import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { certificateService } from '@/services/certificateService';
import { toast } from 'sonner';
import type { CertificateTemplate } from '@/types/certificate';
import { CertificateVisualEditor } from './CertificateVisualEditor';

interface CertificateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: CertificateTemplate | null;
  onSuccess: () => void;
}

type FormData = Omit<CertificateTemplate, 'id' | 'available_images'>;

export const CertificateTemplateDialog = ({
  open,
  onOpenChange,
  template,
  onSuccess,
}: CertificateTemplateDialogProps) => {
  const isEditing = !!template;

  // Fetch available images when dialog opens
  const { data: availableImages = [] } = useQuery({
    queryKey: ['certificate-templates', 'images'],
    queryFn: async () => {
      try {
        // Try to get available images from existing templates first
        const templates = await certificateService.getTemplates();
        if (templates.length > 0 && templates[0].available_images) {
          return templates[0].available_images;
        }
        
        // If no templates exist or no available_images, return fallback images
        return [
          "Live Account Certificate.png",
          "official_funded.jpg", 
          "payout_certificate.jpg",
          "phase_one.jpg",
          "phase_two.jpg"
        ];
      } catch (error) {
        console.error('Failed to fetch available images:', error);
        // Return fallback images on error
        return [
          "Live Account Certificate.png",
          "official_funded.jpg", 
          "payout_certificate.jpg",
          "phase_one.jpg",
          "phase_two.jpg"
        ];
      }
    },
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: template ? {
      key: template.key,
      title: template.title,
      background_file: template.background_file,
      name_x: template.name_x,
      name_y: template.name_y,
      name_font_size: template.name_font_size,
      date_x: template.date_x,
      date_y: template.date_y,
      date_font_size: template.date_font_size,
      certificate_type: template.certificate_type,
      profitshare_x: template.profitshare_x,
      profitshare_y: template.profitshare_y,
      profitshare_font_size: template.profitshare_font_size,
      is_active: template.is_active,
    } : {
      key: '',
      title: '',
      background_file: '',
      name_x: 100,
      name_y: 100,
      name_font_size: 50,
      date_x: 100,
      date_y: 200,
      date_font_size: 36,
      certificate_type: 'phase',
      profitshare_x: 100,
      profitshare_y: 300,
      profitshare_font_size: 36,
      is_active: true,
    },
  });

  // Reset form when template changes (for editing)
  useEffect(() => {
    if (template) {
      reset({
        key: template.key,
        title: template.title,
        background_file: template.background_file,
        name_x: template.name_x,
        name_y: template.name_y,
        name_font_size: template.name_font_size,
        date_x: template.date_x,
        date_y: template.date_y,
        date_font_size: template.date_font_size,
        certificate_type: template.certificate_type,
        profitshare_x: template.profitshare_x,
        profitshare_y: template.profitshare_y,
        profitshare_font_size: template.profitshare_font_size,
        is_active: template.is_active,
      });
    } else {
      reset({
        key: '',
        title: '',
        background_file: '',
        name_x: 100,
        name_y: 100,
        name_font_size: 50,
        date_x: 100,
        date_y: 200,
        date_font_size: 36,
        certificate_type: 'phase',
        profitshare_x: 100,
        profitshare_y: 300,
        profitshare_font_size: 36,
        is_active: true,
      });
    }
  }, [template, reset]);

  const createMutation = useMutation({
    mutationFn: certificateService.createTemplate,
    onSuccess: () => {
      toast.success('Certificate template created successfully');
      onSuccess();
    },
    onError: () => {
      toast.error('Failed to create certificate template');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<FormData> }) =>
      certificateService.updateTemplate(id, data),
    onSuccess: () => {
      toast.success('Certificate template updated successfully');
      onSuccess();
    },
    onError: () => {
      toast.error('Failed to update certificate template');
    },
  });

  const onSubmit = (data: FormData) => {
    if (isEditing && template) {
      updateMutation.mutate({ id: template.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const backgroundFile = watch('background_file');
  const isActive = watch('is_active');
  const formCertificateType = watch('certificate_type');
  
  // Watch all position values for live updates
  const nameX = watch('name_x');
  const nameY = watch('name_y');
  const nameFontSize = watch('name_font_size');
  const dateX = watch('date_x');
  const dateY = watch('date_y');
  const dateFontSize = watch('date_font_size');
  const profitShareX = watch('profitshare_x');
  const profitShareY = watch('profitshare_y');
  const profitShareFontSize = watch('profitshare_font_size');

  const handleNamePositionChange = (position: { x: number; y: number; fontSize: number }) => {
    setValue('name_x', position.x);
    setValue('name_y', position.y);
    setValue('name_font_size', position.fontSize);
  };

  const handleDatePositionChange = (position: { x: number; y: number; fontSize: number }) => {
    setValue('date_x', position.x);
    setValue('date_y', position.y);
    setValue('date_font_size', position.fontSize);
  };

  const handleProfitSharePositionChange = (position: { x: number; y: number; fontSize: number }) => {
    setValue('profitshare_x', position.x);
    setValue('profitshare_y', position.y);
    setValue('profitshare_font_size', position.fontSize);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Certificate Template' : 'Create Certificate Template'}
          </DialogTitle>
          <DialogDescription>
            Configure the certificate template with background image and text positioning.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="key">Key</Label>
              <Input
                id="key"
                {...register('key', { required: 'Key is required' })}
                placeholder="e.g., live_account"
              />
              {errors.key && (
                <p className="text-sm text-destructive">{errors.key.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                {...register('title', { required: 'Title is required' })}
                placeholder="e.g., Live Account Certificate"
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="background_file">Background Image</Label>
            <Select 
              value={backgroundFile || undefined} 
              onValueChange={(value) => setValue('background_file', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select background image" />
              </SelectTrigger>
              <SelectContent>
                {availableImages.map((image) => (
                  <SelectItem key={image} value={image}>
                    {image}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.background_file && (
              <p className="text-sm text-destructive">{errors.background_file.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="certificate_type">Certificate Type</Label>
            <Select value={formCertificateType || 'phase'} onValueChange={(value) => setValue('certificate_type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select certificate type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phase">Phase</SelectItem>
                <SelectItem value="payout">Payout</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <CertificateVisualEditor
            backgroundFile={backgroundFile}
            namePosition={{ x: nameX || 100, y: nameY || 100, fontSize: nameFontSize || 50 }}
            datePosition={{ x: dateX || 100, y: dateY || 200, fontSize: dateFontSize || 36 }}
            profitSharePosition={formCertificateType === 'payout' ? { x: profitShareX || 100, y: profitShareY || 300, fontSize: profitShareFontSize || 36 } : undefined}
            onNamePositionChange={handleNamePositionChange}
            onDatePositionChange={handleDatePositionChange}
            onProfitSharePositionChange={formCertificateType === 'payout' ? handleProfitSharePositionChange : undefined}
            availableImages={availableImages}
            showProfitShare={formCertificateType === 'payout'}
          />

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={(checked) => setValue('is_active', checked)}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
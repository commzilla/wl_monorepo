import React, { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { blogService } from '@/services/blogService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2, X } from 'lucide-react';

interface BlogImageUploadProps {
  value: string;
  altText: string;
  onChange: (url: string) => void;
  onAltChange: (alt: string) => void;
}

const BlogImageUpload: React.FC<BlogImageUploadProps> = ({ value, altText, onChange, onAltChange }) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => blogService.uploadImage(file),
    onSuccess: (res) => {
      if (res.error) {
        toast({ title: 'Upload failed', description: res.error, variant: 'destructive' });
        return;
      }
      if (res.data?.url) {
        onChange(res.data.url);
        toast({ title: 'Image uploaded' });
      }
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">Featured Image</Label>
      {value ? (
        <div className="relative rounded-md overflow-hidden border">
          <img src={value} alt={altText} className="w-full h-32 object-cover" />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6"
            onClick={() => onChange('')}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div
          className="border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          {uploadMutation.isPending ? (
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          ) : (
            <>
              <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Click to upload</p>
            </>
          )}
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <div>
        <Label className="text-xs">Alt Text (SEO)</Label>
        <Input value={altText} onChange={e => onAltChange(e.target.value)} placeholder="Describe the image" className="text-sm" />
      </div>
    </div>
  );
};

export default BlogImageUpload;

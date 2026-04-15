import React, { useCallback, useRef, useState } from 'react';
import { Upload, ImageIcon, Loader2, X } from 'lucide-react';
import { useUploadScreenshot } from '@/hooks/useJournal';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

interface ScreenshotUploaderProps {
  url: string;
  onUpload: (url: string) => void;
  label: string;
}

const ScreenshotUploader: React.FC<ScreenshotUploaderProps> = ({ url, onUpload, label }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadMutation = useUploadScreenshot();

  const validateAndUpload = useCallback(
    (file: File) => {
      setError(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('Only JPEG, PNG, and WebP images are accepted.');
        return;
      }

      if (file.size > MAX_SIZE_BYTES) {
        setError('File size must be under 5MB.');
        return;
      }

      uploadMutation.mutate(file, {
        onSuccess: (data) => {
          onUpload(data.url);
        },
        onError: () => {
          setError('Upload failed. Please try again.');
        },
      });
    },
    [onUpload, uploadMutation]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        validateAndUpload(file);
      }
    },
    [validateAndUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        validateAndUpload(file);
      }
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [validateAndUpload]
  );

  const handleRemove = useCallback(() => {
    onUpload('');
    setError(null);
  }, [onUpload]);

  const isUploading = uploadMutation.isPending;

  if (url) {
    return (
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-[#85A8C3]">{label}</span>
        <div className="group relative overflow-hidden rounded-lg border border-[#28BFFF]/10">
          <img
            src={url}
            alt={label}
            className="h-40 w-full object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute right-2 top-2 rounded-full bg-[#080808]/70 p-1 text-[#E4EEF5] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[#080808]/90"
            aria-label={`Remove ${label}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-[#85A8C3]">{label}</span>
      <div
        role="button"
        tabIndex={0}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 transition-colors ${
          isDragging
            ? 'border-[#28BFFF]/50 bg-[#28BFFF]/10'
            : 'border-[#28BFFF]/15 bg-transparent hover:border-[#28BFFF]/30 hover:bg-[#28BFFF]/5'
        } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        {isUploading ? (
          <>
            <Loader2 className="mb-2 h-6 w-6 animate-spin text-[#28BFFF]" />
            <span className="text-xs text-[#85A8C3]">Uploading...</span>
          </>
        ) : (
          <>
            {isDragging ? (
              <ImageIcon className="mb-2 h-6 w-6 text-[#28BFFF]" />
            ) : (
              <Upload className="mb-2 h-6 w-6 text-[#85A8C3]/60" />
            )}
            <span className="text-xs text-[#85A8C3]">
              {isDragging ? 'Drop image here' : 'Drag & drop or click to upload'}
            </span>
            <span className="mt-1 text-[10px] text-[#85A8C3]/50">
              JPEG, PNG, WebP (max 5MB)
            </span>
          </>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        aria-label={`Upload ${label}`}
      />
      {error && <p className="text-xs text-[#ED5363]">{error}</p>}
    </div>
  );
};

export default ScreenshotUploader;

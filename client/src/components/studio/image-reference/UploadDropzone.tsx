'use client';

import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, XCircle, Loader2 } from 'lucide-react';

interface UploadDropzoneProps {
  label?: string;
  description?: string;
  accept?: string[];
  maxSizeBytes?: number;
  disabled?: boolean;
  autoUpload?: boolean;
  valueLabel?: string | null;
  initialPreviewUrl?: string | null;
  onUploaded?: (record: unknown) => void;
  onClear?: () => void;
  uploadHandler?: (file: File) => Promise<unknown>;
  onFileSelected?: (file: File | null) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  helperActionLabel?: string;
  onHelperAction?: () => void;
}

const DEFAULT_ACCEPT = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
];

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

export default function UploadDropzone({
  label = 'Reference Image',
  description = 'Upload a JPG, PNG, or WebP under 10MB.',
  accept = DEFAULT_ACCEPT,
  maxSizeBytes = 10 * 1024 * 1024,
  disabled = false,
  autoUpload = true,
  valueLabel,
  initialPreviewUrl = null,
  onUploaded,
  onClear,
  uploadHandler,
  onFileSelected,
  onUploadingChange,
  helperActionLabel,
  onHelperAction,
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialPreviewUrl ?? null);
  const [isUploading, setIsUploading] = useState(false);

  const updatePreview = useCallback((next: string | null) => {
    setPreviewUrl((prev) => {
      if (prev && prev.startsWith('blob:')) {
        URL.revokeObjectURL(prev);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (initialPreviewUrl) {
      updatePreview(initialPreviewUrl);
    }
  }, [initialPreviewUrl, updatePreview]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (onUploadingChange) {
      onUploadingChange(isUploading);
    }
  }, [isUploading, onUploadingChange]);

  const validateFile = useCallback(
    (file: File) => {
      if (!accept.includes(file.type)) {
        return 'Unsupported file type.';
      }

      if (file.size > maxSizeBytes) {
        return `File is too large. Max size ${formatBytes(maxSizeBytes)}.`;
      }

      return null;
    },
    [accept, maxSizeBytes]
  );

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || !files.length || disabled) return;
      const file = files[0];
      const validationMessage = validateFile(file);
      if (validationMessage) {
        setError(validationMessage);
        return;
      }

      setError(null);

      if (!autoUpload) {
        const tempUrl = URL.createObjectURL(file);
        updatePreview(tempUrl);
        onFileSelected?.(file);
        return;
      }

      if (!uploadHandler || !onUploaded) {
        console.warn('[UploadDropzone] uploadHandler is required when autoUpload is true.');
        return;
      }

      setIsUploading(true);

      try {
        const tempUrl = URL.createObjectURL(file);
        updatePreview(tempUrl);
        const record = await uploadHandler(file);
        const nextPreview = (record as any)?.publicUrl || tempUrl;
        updatePreview(nextPreview);
        onUploaded(record);
      } catch (err: any) {
        console.error('[UploadDropzone] Upload failed', err);
        setError(err?.response?.data?.message || 'Upload failed. Please try again.');
        updatePreview(null);
        onFileSelected?.(null);
      } finally {
        setIsUploading(false);
      }
    },
    [autoUpload, disabled, onFileSelected, onUploaded, updatePreview, uploadHandler, validateFile]
  );

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      handleFiles(event.target.files);
      event.target.value = '';
    },
    [handleFiles]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      handleFiles(event.dataTransfer.files);
    },
    [disabled, handleFiles]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-white/50 flex items-center gap-2">
            {description}
            {helperActionLabel && onHelperAction && (
              <button
                type="button"
                onClick={onHelperAction}
                className="text-[var(--banana-gold)] underline decoration-dotted text-xs hover:text-white transition-colors"
              >
                {helperActionLabel}
              </button>
            )}
          </p>
        </div>
        {(valueLabel || previewUrl) && onClear && (
          <button
            type="button"
            onClick={() => {
              onClear();
              updatePreview(null);
              onFileSelected?.(null);
              setError(null);
            }}
            className="text-xs text-white/60 hover:text-white flex items-center gap-1"
            disabled={disabled || isUploading}
          >
            <XCircle className="w-4 h-4" />
            Remove
          </button>
        )}
      </div>
      <label
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={`relative block border-2 border-dashed rounded-2xl p-4 md:p-6 transition-all cursor-pointer ${
          disabled
            ? 'opacity-60 cursor-not-allowed'
            : isDragging
            ? 'border-[var(--banana-gold)] bg-[var(--banana-gold)]/5'
            : 'border-white/10 hover:border-white/30'
        }`}
      >
        <input
          type="file"
          accept={accept.join(',')}
          className="hidden"
          disabled={disabled}
          onChange={handleInputChange}
        />
        <div className="flex flex-col items-center gap-3 text-center">
          {previewUrl ? (
            <motion.img
              src={previewUrl}
              alt="Reference preview"
              className="w-32 h-32 object-cover rounded-xl border border-white/10 shadow-lg"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            />
          ) : (
            <span className="p-3 rounded-full bg-white/5">
              {isUploading ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <UploadCloud className="w-6 h-6 text-white/70" />
              )}
            </span>
          )}
          <div>
            <p className="text-sm font-semibold text-white">
              {previewUrl ? 'Replace reference image' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-xs text-white/50 mt-1">
              Supported: JPG, PNG, WebP, GIF, BMP - max {formatBytes(maxSizeBytes)}
            </p>
            {valueLabel && (
              <p className="text-[11px] text-white/40 mt-1 truncate">{valueLabel}</p>
            )}
          </div>
        </div>
      </label>
      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}


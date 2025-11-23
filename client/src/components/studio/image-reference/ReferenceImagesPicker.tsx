"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";

interface ReferenceImagesPickerProps {
  files: File[];
  onAddFiles: (files: File[]) => void;
  onRemoveAt: (index: number) => void;
  maxCount: number;
  accept?: string[];
  maxSizeBytes?: number;
  disabled?: boolean;
  helperActionLabel?: string;
  onHelperAction?: () => void;
}

const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

export default function ReferenceImagesPicker({
  files,
  onAddFiles,
  onRemoveAt,
  maxCount,
  accept = ["image/jpeg", "image/png", "image/webp"],
  maxSizeBytes = 10 * 1024 * 1024,
  disabled = false,
  helperActionLabel,
  onHelperAction,
}: ReferenceImagesPickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previews = useMemo(() =>
    files.map((f) => ({ file: f, url: URL.createObjectURL(f) })), [files]
  );

  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  const remainingSlots = Math.max(0, maxCount - files.length);

  const validateFiles = useCallback((incoming: File[]): string | null => {
    for (const file of incoming) {
      if (!accept.includes(file.type)) {
        return "Unsupported file type.";
      }
      if (file.size > maxSizeBytes) {
        return `File too large. Max ${formatBytes(maxSizeBytes)}.`;
      }
    }
    return null;
  }, [accept, maxSizeBytes]);

  const handleSelect = useCallback((list: FileList | null) => {
    if (!list || disabled) return;
    const incoming = Array.from(list);
    const limited = incoming.slice(0, remainingSlots);
    const message = validateFiles(limited);
    if (message) {
      setError(message);
      // Reset the file input so selecting the same file triggers onChange
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setError(null);
    if (limited.length) onAddFiles(limited);
    // Always reset the file input so selecting the same file again works
    if (inputRef.current) inputRef.current.value = '';
  }, [disabled, onAddFiles, remainingSlots, validateFiles]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-white">
          Reference Images <span className="text-white/50">(1–{maxCount})</span>
        </label>
        <div className="flex items-center gap-3">
          {helperActionLabel && (
            <button
              type="button"
              onClick={onHelperAction}
              className="text-xs text-white/60 underline decoration-dotted hover:text-white transition-colors"
              disabled={disabled}
            >
              {helperActionLabel}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 gap-2">
        {previews.map((p, idx) => (
          <div key={`${p.file.name}-${idx}`} className="relative group border border-white/10 rounded-lg overflow-hidden bg-white/5">
            <img src={p.url} alt={p.file.name} className="w-full h-24 object-cover" />
            <button
              type="button"
              onClick={() => onRemoveAt(idx)}
              className="absolute top-1 right-1 p-1 rounded-full bg-black/60 border border-white/20 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove"
              disabled={disabled}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {/* Add more tile */}
        {remainingSlots > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="group flex flex-col items-center justify-center h-24 border border-dashed border-white/20 rounded-lg text-white/60 hover:text-white hover:border-white/40 transition-colors bg-white/5"
            disabled={disabled}
            aria-label={remainingSlots === maxCount ? 'Add images' : 'Add more images'}
          >
            <Plus className="w-6 h-6 mb-1 opacity-80 group-hover:opacity-100" />
            <div className="text-[11px] font-medium tracking-wide">
              {remainingSlots === maxCount ? 'Add images' : 'Add more'}
            </div>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept.join(',')}
        multiple
        className="hidden"
        onChange={(e) => {
          handleSelect(e.target.files);
          // Ensure same-file reselection triggers a change
          e.currentTarget.value = '';
        }}
      />

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}

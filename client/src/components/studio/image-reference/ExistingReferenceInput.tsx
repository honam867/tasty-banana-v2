'use client';

interface ExistingReferenceInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string | null;
}

export default function ExistingReferenceInput({
  value,
  onChange,
  disabled = false,
  error,
}: ExistingReferenceInputProps) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-white">Reference Image ID</p>
        <p className="text-xs text-white/50">
          Paste the ID of an image you previously uploaded or generated.
        </p>
      </div>
      <input
        placeholder="ref_123e4567-e89b-12d3-a456-426614174000"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 w-full outline-none focus:border-[var(--banana-gold)]/60 transition-colors disabled:opacity-50"
        type="text"
      />
      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <p className="text-[11px] text-white/40">
        You can find this ID inside the details drawer of a previous generation or in the
        uploads section (coming soon).
      </p>
    </div>
  );
}

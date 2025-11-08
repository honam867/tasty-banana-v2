'use client';

interface AssetLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AssetLibraryModal({ isOpen, onClose }: AssetLibraryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md p-6 text-center space-y-4">
        <h3 className="text-xl font-semibold text-white">Asset Library</h3>
        <p className="text-sm text-white/60">
          Asset picker is currently in development. Soon you&apos;ll be able to reuse uploaded
          references directly from here.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-3 rounded-full bg-white text-black font-semibold hover:bg-white/90 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

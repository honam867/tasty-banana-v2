'use client';

import { useCallback, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import PromptInput from '@/components/studio/PromptInput';
import BottomControls from '@/components/studio/BottomControls';
import UploadDropzone from './UploadDropzone';
import ExistingReferenceInput from './ExistingReferenceInput';
import AssetLibraryModal from './AssetLibraryModal';
import ReferenceImagesPicker from './ReferenceImagesPicker';
import { useGenerationsContext } from '@/contexts/GenerationsContext';
import { generateImageMultipleReference } from '@/lib/api/imageMultipleReference';
import { GENERATION_LIMITS } from '@/lib/constants';
import type { AspectRatio } from '@/types/generation';

const REFERENCE_MIN = 1;
const REFERENCE_MAX = 5;

const clampNumberOfImages = (value: number) =>
  Math.min(value, GENERATION_LIMITS.MAX_OUTPUTS_API);

export default function MultipleReferenceForm() {
  const { addOptimisticGeneration } = useGenerationsContext();

  // Prompt/config
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [numberOfImages, setNumberOfImages] = useState(1);

  // Target selection
  const [useExistingTarget, setUseExistingTarget] = useState(false);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [existingTargetId, setExistingTargetId] = useState('');

  // Reference selection
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);

  // UI states
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);

  const promptLength = prompt.trim().length;
  const isPromptValid =
    promptLength >= GENERATION_LIMITS.PROMPT_MIN_LENGTH &&
    promptLength <= GENERATION_LIMITS.PROMPT_MAX_LENGTH;

  const hasTarget = useExistingTarget
    ? existingTargetId.trim().length > 0
    : !!targetFile;

  const referenceCount = referenceFiles.length;
  const hasReferences = referenceCount >= REFERENCE_MIN && referenceCount <= REFERENCE_MAX;

  const handleAddReferences = useCallback((files: File[]) => {
    setReferenceFiles((prev) => {
      const space = Math.max(0, REFERENCE_MAX - prev.length);
      return [...prev, ...files.slice(0, space)];
    });
  }, []);

  const handleRemoveReferenceAt = useCallback((index: number) => {
    setReferenceFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const generateDisabled =
    !isPromptValid || !hasTarget || !hasReferences || isGenerating;

  const handleGenerate = useCallback(async () => {
    if (!isPromptValid) {
      setError(
        `Prompt must be between ${GENERATION_LIMITS.PROMPT_MIN_LENGTH} and ${GENERATION_LIMITS.PROMPT_MAX_LENGTH} characters.`
      );
      return;
    }
    if (!hasTarget) {
      setError('Please upload a target image or provide an existing target ID.');
      return;
    }
    if (!hasReferences) {
      setError(`Please add ${REFERENCE_MIN}-${REFERENCE_MAX} reference images.`);
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      const response = await generateImageMultipleReference({
        prompt: prompt.trim(),
        aspectRatio,
        numberOfImages: clampNumberOfImages(numberOfImages),
        targetImageFile: !useExistingTarget ? targetFile ?? undefined : undefined,
        targetImageId: useExistingTarget ? existingTargetId.trim() : undefined,
        referenceImageFiles: referenceFiles,
      });

      if (response.success && response.data) {
        addOptimisticGeneration({
          generationId: response.data.generationId,
          status: 'pending',
          progress: 0,
          createdAt: new Date().toISOString(),
          metadata: {
            prompt: prompt.trim(),
            numberOfImages: clampNumberOfImages(numberOfImages),
            aspectRatio: aspectRatio || '1:1',
            operationType: 'image_multiple_reference',
          },
          images: [],
        });
      }
    } catch (err: any) {
      console.error('[MultipleReference] Generation error', err);
      setError(
        err?.response?.data?.message ||
          'Failed to start the multiple reference generation. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  }, [
    addOptimisticGeneration,
    aspectRatio,
    isPromptValid,
    numberOfImages,
    prompt,
    targetFile,
    existingTargetId,
    useExistingTarget,
    referenceFiles,
    hasTarget,
    hasReferences,
  ]);

  const targetHelper = useMemo(() => (
    <div className="space-y-3">
      {!useExistingTarget ? (
        <>
          <UploadDropzone
            label="Target Image"
            description="Upload a JPG, PNG, or WebP under 10MB."
            autoUpload={false}
            onFileSelected={(file) => setTargetFile(file)}
            onClear={() => setTargetFile(null)}
            disabled={isGenerating}
            valueLabel={targetFile?.name || null}
            helperActionLabel="Browse assets"
            onHelperAction={() => setIsAssetModalOpen(true)}
          />
          <button
            type="button"
            className="text-xs text-white/60 underline decoration-dotted hover:text-white transition-colors"
            onClick={() => {
              setUseExistingTarget(true);
              setTargetFile(null);
              setError(null);
            }}
          >
            Use existing target ID instead
          </button>
        </>
      ) : (
        <>
          <ExistingReferenceInput
            value={existingTargetId}
            onChange={setExistingTargetId}
            disabled={isGenerating}
          />
          <button
            type="button"
            className="text-xs text-white/60 underline decoration-dotted hover:text-white transition-colors"
            onClick={() => {
              setUseExistingTarget(false);
              setExistingTargetId('');
              setError(null);
            }}
          >
            Go back to upload target
          </button>
        </>
      )}
    </div>
  ), [existingTargetId, isGenerating, targetFile, useExistingTarget]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="space-y-6 max-w-3xl md:max-w-4xl">
          {/* Target */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">Target Image</label>
            {targetHelper}
          </div>

          {/* References */}
          <ReferenceImagesPicker
            files={referenceFiles}
            onAddFiles={handleAddReferences}
            onRemoveAt={handleRemoveReferenceAt}
            maxCount={REFERENCE_MAX}
            helperActionLabel="Browse assets"
            onHelperAction={() => setIsAssetModalOpen(true)}
            disabled={isGenerating}
          />

          {/* Prompt */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Prompt <span className="text-red-400">(Required)</span>
            </label>
            <PromptInput
              value={prompt}
              onChange={setPrompt}
              showToolbar
              showHints={false}
              maxLength={GENERATION_LIMITS.PROMPT_MAX_LENGTH}
              disabled={isGenerating}
              autoResize={false}
              maxHeight="240px"
              minHeight="120px"
            />
            <div className="flex justify-between text-xs text-white/40 mt-2">
              <span>Describe how to apply the references to the target image.</span>
              <span>
                {promptLength}/{GENERATION_LIMITS.PROMPT_MAX_LENGTH}
              </span>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 border border-red-500/40 bg-red-500/10 rounded-xl text-sm text-red-300">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      <BottomControls
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
        numberOfImages={numberOfImages}
        onNumberOfImagesChange={setNumberOfImages}
        selectorsDisabled={isGenerating}
        generateDisabled={generateDisabled}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        generateLabel="Generate with Multiple References"
        highlightOnReady={!generateDisabled && !isGenerating}
      />

      <AssetLibraryModal isOpen={isAssetModalOpen} onClose={() => setIsAssetModalOpen(false)} />
    </div>
  );
}


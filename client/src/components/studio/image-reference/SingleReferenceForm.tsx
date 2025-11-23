'use client';

import { useCallback, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import PromptInput from '@/components/studio/PromptInput';
import BottomControls from '@/components/studio/BottomControls';
import ReferenceTypeSelector from './ReferenceTypeSelector';
import UploadDropzone from './UploadDropzone';
import ExistingReferenceInput from './ExistingReferenceInput';
import AssetLibraryModal from './AssetLibraryModal';
import { generateImageReference } from '@/lib/api/imageReference';
import { useGenerationsContext } from '@/contexts/GenerationsContext';
import { GENERATION_LIMITS, HINT_TYPES } from '@/lib/constants';
import type { AspectRatio, ReferenceType, ImageReferenceParams } from '@/types/generation';

const clampNumberOfImages = (value: number) =>
  Math.min(value, GENERATION_LIMITS.MAX_OUTPUTS_API);

export default function SingleReferenceForm() {
  const { addOptimisticGeneration } = useGenerationsContext();

  const [prompt, setPrompt] = useState('');
  const [useExistingReference, setUseExistingReference] = useState(false);
  const [referenceType, setReferenceType] = useState<ReferenceType>('subject');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [numberOfImages, setNumberOfImages] = useState(1);
  const [referenceFile, setReferenceFile] = useState<File | undefined>(undefined);
  const [existingReferenceId, setExistingReferenceId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);

  const promptLength = prompt.trim().length;
  const isPromptValid =
    promptLength >= GENERATION_LIMITS.PROMPT_MIN_LENGTH &&
    promptLength <= GENERATION_LIMITS.PROMPT_MAX_LENGTH;

  const referenceImageId = useExistingReference ? existingReferenceId.trim() || null : null;
  const hasReferenceFile = !useExistingReference && !!referenceFile;

  const handleGenerate = useCallback(async () => {
    if (!isPromptValid) {
      setError(
        `Prompt must be between ${GENERATION_LIMITS.PROMPT_MIN_LENGTH} and ${GENERATION_LIMITS.PROMPT_MAX_LENGTH} characters.`
      );
      return;
    }

    if (!referenceImageId && !hasReferenceFile) {
      setError('Please upload a reference image or provide an existing reference ID.');
      return;
    }

    const payload: ImageReferenceParams = {
      prompt: prompt.trim(),
      referenceImageId: referenceImageId || undefined,
      referenceType,
      aspectRatio,
      numberOfImages: clampNumberOfImages(numberOfImages),
      projectId: undefined,
    };

    try {
      setIsGenerating(true);
      setError(null);
      const response = await generateImageReference({
        ...payload,
        referenceFile: !useExistingReference && referenceFile ? referenceFile : undefined,
      });

      if (response.success && response.data) {
        addOptimisticGeneration({
          generationId: response.data.generationId,
          status: 'pending',
          progress: 0,
          createdAt: new Date().toISOString(),
          metadata: {
            prompt: payload.prompt,
            numberOfImages: payload.numberOfImages ?? 1,
            aspectRatio: payload.aspectRatio || '1:1',
            projectId: payload.projectId,
            referenceType: payload.referenceType,
            referenceImageId:
              response.data.metadata?.referenceImageId || payload.referenceImageId,
            operationType: 'image_reference',
          },
          images: [],
        });
        // Do not clear reference selections to allow repeated generations.
      }
    } catch (err: any) {
      console.error('[ImageReference] Generation error', err);
      setError(
        err?.response?.data?.message ||
          'Failed to start the reference generation. Please try again.'
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
    referenceFile,
    useExistingReference,
    referenceType,
  ]);

  const generateDisabled =
    !isPromptValid || (!referenceImageId && !hasReferenceFile) || isGenerating || isUploading;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
        <div className="space-y-5 max-w-3xl md:max-w-4xl">
          <ReferenceTypeSelector
            value={referenceType}
            onChange={setReferenceType}
            disabled={isGenerating}
          />

          {!useExistingReference ? (
            <div className="space-y-3">
              <UploadDropzone
                autoUpload={false}
                onFileSelected={(file) => setReferenceFile(file ?? undefined)}
                onClear={() => setReferenceFile(undefined)}
                disabled={isGenerating}
                valueLabel={referenceFile?.name || null}
                onUploadingChange={setIsUploading}
                helperActionLabel="Browse assets"
                onHelperAction={() => setIsAssetModalOpen(true)}
              />
              <button
                type="button"
                className="text-xs text-white/60 underline decoration-dotted hover:text-white transition-colors"
                onClick={() => {
                  setUseExistingReference(true);
                  setReferenceFile(undefined);
                  setError(null);
                }}
              >
                Use existing reference ID instead
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <ExistingReferenceInput
                value={existingReferenceId}
                onChange={setExistingReferenceId}
                disabled={isGenerating}
              />
              <button
                type="button"
                className="text-xs text-white/60 underline decoration-dotted hover:text-white transition-colors"
                onClick={() => {
                  setUseExistingReference(false);
                  setExistingReferenceId('');
                  setError(null);
                }}
              >
                Go back to upload
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Prompt <span className="text-red-400">(Required)</span>
            </label>
            <PromptInput
              value={prompt}
              onChange={setPrompt}
              showToolbar
              showHints={false}
              hintType={HINT_TYPES.IMAGE_REFERENCE}
              maxLength={GENERATION_LIMITS.PROMPT_MAX_LENGTH}
              disabled={isGenerating}
              autoResize={false}
              maxHeight="240px"
              minHeight="120px"
            />
            <div className="flex justify-between text-xs text-white/40 mt-2">
              <span>Describe what you want Gemini to create.</span>
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
        generateLabel="Generate with Reference"
        highlightOnReady={!generateDisabled && !isGenerating}
      />
      <AssetLibraryModal isOpen={isAssetModalOpen} onClose={() => setIsAssetModalOpen(false)} />
    </div>
  );
}

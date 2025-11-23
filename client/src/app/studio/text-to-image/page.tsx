'use client';

import { useState } from 'react';
import TabNavigation from '@/components/studio/TabNavigation';
import PromptInput from '@/components/studio/PromptInput';
import BottomControls from '@/components/studio/BottomControls';
import { generateTextToImage } from '@/lib/api/textToImage';
import { useGenerationsContext } from '@/contexts/GenerationsContext';
import { GENERATION_LIMITS, HINT_TYPES } from '@/lib/constants';
import type { AspectRatio } from '@/types/generation';
import type { GenerationItem } from '@/lib/api/generations';

export default function TextToImagePage() {
  // Form state
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [numberOfImages, setNumberOfImages] = useState(2);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generations context for optimistic updates
  const { addOptimisticGeneration } = useGenerationsContext();

  const handleGenerate = async () => {
    // Validation
    if (prompt.length < GENERATION_LIMITS.PROMPT_MIN_LENGTH) {
      setError(`Prompt must be at least ${GENERATION_LIMITS.PROMPT_MIN_LENGTH} characters`);
      return;
    }

    if (prompt.length > GENERATION_LIMITS.PROMPT_MAX_LENGTH) {
      setError(`Prompt must not exceed ${GENERATION_LIMITS.PROMPT_MAX_LENGTH} characters`);
      return;
    }

    try {
      setError(null);
      setIsGenerating(true);

      // Cap numberOfImages at API limit
      const apiNumberOfImages = Math.min(
        numberOfImages,
        GENERATION_LIMITS.MAX_OUTPUTS_API
      );

      const response = await generateTextToImage({
        prompt,
        aspectRatio,
        numberOfImages: apiNumberOfImages,
      });

      if (response.success && response.data) {
        // Create optimistic generation item
        const optimisticGeneration: GenerationItem = {
          generationId: response.data.generationId,
          status: 'pending',
          progress: 0,
          createdAt: new Date().toISOString(),
          metadata: {
            prompt,
            numberOfImages: apiNumberOfImages,
            aspectRatio,
          },
          images: [],
        };

        // Add to generations list immediately
        addOptimisticGeneration(optimisticGeneration);

        console.log('[Text-to-Image] Job queued:', response.data);
      }

      // Reset form state after successful submission
      setIsGenerating(false);
    } catch (err: any) {
      console.error('[Text-to-Image] Generation error:', err);
      setIsGenerating(false);
      setError(
        err.response?.data?.message || err.response?.data?.error?.message || 'Failed to start generation. Please try again.'
      );
    }
  };

  const isValid =
    prompt.length >= GENERATION_LIMITS.PROMPT_MIN_LENGTH &&
    prompt.length <= GENERATION_LIMITS.PROMPT_MAX_LENGTH;

  return (
    <>
      {/* Tab Navigation */}
      <TabNavigation />

      {/* Content Area - Flex Column */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Section - Scrollable Prompt Area */}
        <div className="flex-1 overflow-y-auto p-2 md:p-6">
          <div className="max-w-4xl">
            {/* Prompt Input */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Prompt <span className="text-red-400">(Required)</span>
              </label>
              <PromptInput
                value={prompt}
                onChange={setPrompt}
                showToolbar={true}
                showHints={true}
                hintType={HINT_TYPES.TEXT_TO_IMAGE}
                maxLength={GENERATION_LIMITS.PROMPT_MAX_LENGTH}
                disabled={isGenerating}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
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
          generateDisabled={!isValid || isGenerating}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          highlightOnReady={isValid && !isGenerating}
        />
      </div>
    </>
  );
}

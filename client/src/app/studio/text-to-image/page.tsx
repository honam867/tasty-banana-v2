'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import TabNavigation from '@/components/studio/TabNavigation';
import PromptInput from '@/components/studio/PromptInput';
import AspectRatioSelector from '@/components/studio/AspectRatioSelector';
import NumberOfImagesSelector from '@/components/studio/NumberOfImagesSelector';
import QualitySelector from '@/components/studio/QualitySelector';
import { generateTextToImage } from '@/lib/api/textToImage';
import { useWebSocketEvent } from '@/hooks/useWebSocket';
import { useTokenBalance } from '@/lib/api/tokens';
import { GENERATION_LIMITS, HINT_TYPES } from '@/lib/constants';
import type { AspectRatio } from '@/types/generation';
import type {
  GenerationProgressEvent,
  GenerationCompletedEvent,
  GenerationFailedEvent,
} from '@/types/websocket';

export default function TextToImagePage() {
  // Form state
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [numberOfImages, setNumberOfImages] = useState(2);
  const [quality, setQuality] = useState('standard');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Token balance
  const { balance, refetch: refetchBalance } = useTokenBalance();

  // WebSocket event handlers
  useWebSocketEvent<GenerationProgressEvent>(
    'generation_progress',
    (data) => {
      if (data.generationId === generationId) {
        setProgress(data.progress);
        setStatusMessage(data.message);
      }
    },
    [generationId]
  );

  useWebSocketEvent<GenerationCompletedEvent>(
    'generation_completed',
    (data) => {
      if (data.generationId === generationId) {
        setIsGenerating(false);
        setProgress(100);
        setStatusMessage('Generation completed!');
        setGenerationId(null);
        
        // Refresh token balance
        refetchBalance();

        // TODO: Display images in right panel
        console.log('[Text-to-Image] Generation completed:', data.result);
      }
    },
    [generationId]
  );

  useWebSocketEvent<GenerationFailedEvent>(
    'generation_failed',
    (data) => {
      if (data.generationId === generationId) {
        setIsGenerating(false);
        setError(data.error);
        setStatusMessage('Generation failed');
        setGenerationId(null);
      }
    },
    [generationId]
  );

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
      setProgress(0);
      setStatusMessage('Queueing generation...');

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
        setGenerationId(response.data.generationId);
        setStatusMessage(response.data.message);
        console.log('[Text-to-Image] Job queued:', response.data);
      }
    } catch (err: any) {
      console.error('[Text-to-Image] Generation error:', err);
      setIsGenerating(false);
      setError(
        err.response?.data?.message || 'Failed to start generation. Please try again.'
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
        <div className="flex-1 overflow-y-auto p-6">
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

            {/* Progress */}
            {isGenerating && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{statusMessage}</span>
                  <span className="text-white font-medium">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section - Fixed Controls */}
        <div className="border-t border-gray-800 bg-gray-900/95 backdrop-blur-sm">
          <div className="p-6 max-w-4xl">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Left Side - 3 Controls */}
              <AspectRatioSelector
                value={aspectRatio}
                onChange={setAspectRatio}
                disabled={isGenerating}
              />
              <NumberOfImagesSelector
                value={numberOfImages}
                onChange={setNumberOfImages}
                min={GENERATION_LIMITS.MIN_OUTPUTS}
                max={GENERATION_LIMITS.MAX_OUTPUTS_UI}
                disabled={isGenerating}
              />
              <QualitySelector
                value={quality}
                onChange={setQuality}
                disabled={isGenerating}
              />

              {/* Right Side - Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={!isValid || isGenerating}
                className={`
                  flex-1 px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 min-w-[160px]
                  ${
                    !isValid || isGenerating
                      ? 'bg-gray-700 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600 active:scale-[0.98]'
                  }
                `}
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </span>
                ) : (
                  'Generate'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

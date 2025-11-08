import apiClient from '../api';
import type {
  GenerationParams,
  GenerationResponse,
  HintsResponse,
} from '@/types/generation';

/**
 * Generate images from text prompt
 * POST /api/generate/text-to-image
 */
export async function generateTextToImage(
  params: GenerationParams
): Promise<GenerationResponse> {
  return apiClient.post<GenerationResponse>(
    '/api/generate/text-to-image',
    params
  );
}

/**
 * Get hints by type
 * GET /api/hints/type/{type}
 */
export async function getHintsByType(type: string): Promise<HintsResponse> {
  return apiClient.get<HintsResponse>(`/api/hints/type/${type}`);
}

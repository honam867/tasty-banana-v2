import apiClient from '../api';
import type { ImageReferenceParams, GenerationResponse } from '@/types/generation';

interface ImageReferenceRequest extends ImageReferenceParams {
  referenceFile?: File;
}

/**
 * Queue an image reference generation job
 * Handles both JSON payloads and multipart requests with files.
 */
export async function generateImageReference(
  params: ImageReferenceRequest
): Promise<GenerationResponse> {
  const { referenceFile, ...rest } = params;

  if (referenceFile) {
    const formData = new FormData();
    formData.append('image', referenceFile);

    Object.entries(rest).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      formData.append(key, String(value));
    });

    return apiClient.post<GenerationResponse>('/api/generate/image-reference', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  return apiClient.post<GenerationResponse>('/api/generate/image-reference', rest);
}

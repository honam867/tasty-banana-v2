import apiClient from '../api';
import type { AspectRatio } from '@/types/generation';
import type { GenerationResponse } from '@/types/generation';

export interface ImageMultipleReferenceRequest {
  prompt: string;
  aspectRatio?: AspectRatio;
  numberOfImages?: number;
  projectId?: string;
  promptTemplateId?: string;

  // Target selection (choose one)
  targetImageFile?: File;
  targetImageId?: string;

  // References (1-5 via files and/or IDs)
  referenceImageFiles?: File[];
  referenceImageIds?: string[];
}

/**
 * Queue a multiple-reference generation job
 * Automatically chooses multipart when files are provided; otherwise JSON.
 */
export async function generateImageMultipleReference(
  params: ImageMultipleReferenceRequest
): Promise<GenerationResponse> {
  const {
    targetImageFile,
    referenceImageFiles,
    prompt,
    aspectRatio,
    numberOfImages,
    projectId,
    promptTemplateId,
    targetImageId,
    referenceImageIds,
  } = params;

  const hasFiles = !!targetImageFile || (referenceImageFiles && referenceImageFiles.length > 0);

  if (hasFiles) {
    const formData = new FormData();

    formData.append('prompt', prompt);
    if (aspectRatio) formData.append('aspectRatio', String(aspectRatio));
    if (numberOfImages) formData.append('numberOfImages', String(numberOfImages));
    if (projectId) formData.append('projectId', projectId);
    if (promptTemplateId) formData.append('promptTemplateId', promptTemplateId);

    // Target (prefer file if provided)
    if (targetImageFile) {
      formData.append('targetImage', targetImageFile);
    } else if (targetImageId) {
      formData.append('targetImageId', targetImageId);
    }

    // References
    if (referenceImageFiles && referenceImageFiles.length > 0) {
      referenceImageFiles.forEach((file) => {
        formData.append('referenceImages', file);
      });
    }
    if (referenceImageIds && referenceImageIds.length > 0) {
      // Validator accepts JSON array string or array; use JSON string for clarity
      formData.append('referenceImageIds', JSON.stringify(referenceImageIds));
    }

    return apiClient.post<GenerationResponse>(
      '/api/generate/image-multiple-reference',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  }

  // JSON body (IDs only)
  const body: Record<string, unknown> = {
    prompt,
  };
  if (aspectRatio) body.aspectRatio = aspectRatio;
  if (numberOfImages) body.numberOfImages = numberOfImages;
  if (projectId) body.projectId = projectId;
  if (promptTemplateId) body.promptTemplateId = promptTemplateId;
  if (targetImageId) body.targetImageId = targetImageId;
  if (referenceImageIds && referenceImageIds.length > 0) body.referenceImageIds = referenceImageIds;

  return apiClient.post<GenerationResponse>(
    '/api/generate/image-multiple-reference',
    body
  );
}


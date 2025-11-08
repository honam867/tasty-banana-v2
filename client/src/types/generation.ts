/**
 * Type definitions for image generation
 */

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export interface GenerationParams {
  prompt: string;
  aspectRatio?: AspectRatio;
  numberOfImages?: number;
  projectId?: string;
  promptTemplateId?: string;
}

export interface GenerationResponse {
  success: boolean;
  data: {
    jobId: string;
    generationId: string;
    status: string;
    message: string;
    numberOfImages: number;
    metadata: {
      prompt: string;
      aspectRatio: string;
      projectId?: string;
    };
    websocketEvents: {
      progress: string;
      completed: string;
      failed: string;
    };
    statusEndpoint: string;
  };
}

export interface GeneratedImage {
  imageUrl: string;
  imageId: string;
  mimeType: string;
  imageSize: number;
}

export interface GenerationResult {
  generationId: string;
  images: GeneratedImage[];
  numberOfImages: number;
  metadata: {
    prompt: string;
    aspectRatio: string;
  };
  tokens: {
    used: number;
    remaining: number;
  };
  processing: {
    timeMs: number;
    status: string;
  };
  createdAt: string;
}

export interface Hint {
  id: string;
  name: string;
  type: string;
  description?: string;
  promptTemplateIds?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HintsResponse {
  success: boolean;
  data: Hint[];
  message?: string;
}

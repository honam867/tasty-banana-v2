import apiClient from '../api';
import type { ReferenceType } from '@/types/generation';

/**
 * Generation Image Interface
 */
export interface GenerationImage {
  imageId: string;
  imageUrl: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Generation Item Interface
 */
export interface GenerationItem {
  generationId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  completedAt?: string;
  referenceType?: ReferenceType;
  referenceImages?: GenerationImage[];
  metadata: {
    prompt: string;
    numberOfImages: number;
    aspectRatio: string;
    projectId?: string;
    referenceType?: ReferenceType;
    referenceImageId?: string;
    referenceImageUrl?: string;
    operationType?: string;
  };
  tokensUsed?: number;
  processingTimeMs?: number;
  images?: GenerationImage[];
  error?: string;
}

/**
 * Cursor Pagination Response
 */
export interface CursorPagination {
  next: string | null;
  hasMore: boolean;
}

/**
 * Get My Generations Response
 */
export interface GetMyGenerationsResponse {
  success: boolean;
  status: number;
  message: string;
  data: {
    results: GenerationItem[];
    cursor: CursorPagination;
  };
}

/**
 * Get user's generations with cursor-based pagination
 * GET /api/generations/my-generations
 * 
 * @param cursor - Cursor for pagination (optional)
 * @param limit - Number of items to fetch (default: 20, max: 100)
 * @param includeFailed - Include failed generations (default: false)
 */
export async function getMyGenerations(
  cursor?: string,
  limit: number = 20,
  includeFailed: boolean = false
): Promise<GetMyGenerationsResponse> {
  const params = new URLSearchParams();
  
  if (cursor) {
    params.append('cursor', cursor);
  }
  
  params.append('limit', limit.toString());
  params.append('includeFailed', includeFailed.toString());
  
  return apiClient.get<GetMyGenerationsResponse>(
    `/api/generations/my-generations?${params.toString()}`
  );
}

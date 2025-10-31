import lodash from "lodash";
const { get } = lodash;

import { db } from "../db/drizzle.js";
import { imageGenerations, uploads } from "../db/schema.js";
import { eq, and, inArray, desc, sql, lt, or } from "drizzle-orm";
import { HTTP_STATUS, GENERATION_STATUS } from "../utils/constant.js";
import { sendSuccess, throwError } from "../utils/response.js";
import {
  decodeCursor,
  createCursorResponse,
} from "../utils/cursor.helper.js";
import logger from "../config/logger.js";

/**
 * GET /api/generations/queue/:generationId - Get generation status
 * Returns the current status and progress of a generation job
 */
export const getGenerationStatus = async (req, res, next) => {
  try {
    const userId = get(req, "user.id");
    const { generationId } = req.params;

    if (!generationId) {
      throwError("Generation ID is required", HTTP_STATUS.BAD_REQUEST);
    }

    // Fetch generation record from database
    const generation = await db
      .select()
      .from(imageGenerations)
      .where(
        and(
          eq(imageGenerations.id, generationId),
          eq(imageGenerations.userId, userId) // Authorization check
        )
      )
      .limit(1);

    if (!generation.length) {
      throwError(
        "Generation not found or access denied",
        HTTP_STATUS.NOT_FOUND
      );
    }

    const generationData = generation[0];

    // Try to get job status from queue if still processing
    let progress = 0;

    if (
      generationData.status === GENERATION_STATUS.PENDING ||
      generationData.status === GENERATION_STATUS.PROCESSING
    ) {
      progress = generationData.status === GENERATION_STATUS.PENDING ? 0 : 50;
    } else if (generationData.status === GENERATION_STATUS.COMPLETED) {
      progress = 100;
    }

    // Parse metadata and AI metadata
    const metadata = generationData.metadata
      ? JSON.parse(generationData.metadata)
      : {};
    const aiMetadata = generationData.aiMetadata
      ? JSON.parse(generationData.aiMetadata)
      : {};

    // Build response
    const response = {
      generationId: generationData.id,
      status: generationData.status,
      progress,
      createdAt: generationData.createdAt,
      completedAt: generationData.completedAt,
      metadata: {
        prompt: metadata.originalPrompt,
        numberOfImages: metadata.numberOfImages || 1,
        aspectRatio: metadata.aspectRatio || "1:1",
        projectId: metadata.projectId,
      },
      tokensUsed: generationData.tokensUsed,
      processingTimeMs: generationData.processingTimeMs,
    };

    // Add images if completed
    if (
      generationData.status === GENERATION_STATUS.COMPLETED &&
      aiMetadata.imageIds
    ) {
      // Fetch upload records for the images
      const imageIds = aiMetadata.imageIds;
      const images = await db
        .select()
        .from(uploads)
        .where(inArray(uploads.id, imageIds));

      response.images = images.map((img) => ({
        imageId: img.id,
        imageUrl: img.publicUrl,
        mimeType: img.mimeType,
        sizeBytes: img.sizeBytes,
      }));
    }

    // Add error if failed
    if (generationData.status === GENERATION_STATUS.FAILED) {
      response.error = generationData.errorMessage;
    }

    sendSuccess(res, response, "Generation status retrieved successfully");
  } catch (error) {
    logger.error("Get generation status error:", error);
    next(error);
  }
};

/**
 * GET /api/generations/my-queue - Get user's active generation queue
 * Returns all pending and processing generations for the current user
 */
export const getUserQueue = async (req, res, next) => {
  try {
    const userId = get(req, "user.id");
    const limit = Math.min(parseInt(get(req.query, "limit", "20"), 10), 100);
    const offset = parseInt(get(req.query, "offset", "0"), 10);

    // Fetch active generations (pending or processing)
    const activeGenerations = await db
      .select()
      .from(imageGenerations)
      .where(
        and(
          eq(imageGenerations.userId, userId),
          inArray(imageGenerations.status, [
            GENERATION_STATUS.PENDING,
            GENERATION_STATUS.PROCESSING,
          ])
        )
      )
      .orderBy(desc(imageGenerations.createdAt))
      .limit(limit)
      .offset(offset);

    // Format response
    const queue = activeGenerations.map((gen) => {
      const metadata = gen.metadata ? JSON.parse(gen.metadata) : {};

      return {
        generationId: gen.id,
        status: gen.status,
        progress: gen.status === GENERATION_STATUS.PENDING ? 0 : 50,
        createdAt: gen.createdAt,
        metadata: {
          prompt: metadata.originalPrompt || "Image generation",
          numberOfImages: metadata.numberOfImages || 1,
          aspectRatio: metadata.aspectRatio || "1:1",
          projectId: metadata.projectId,
        },
      };
    });

    // Get total count
    const totalCount = await db
      .select({ count: sql`count(*)` })
      .from(imageGenerations)
      .where(
        and(
          eq(imageGenerations.userId, userId),
          inArray(imageGenerations.status, [
            GENERATION_STATUS.PENDING,
            GENERATION_STATUS.PROCESSING,
          ])
        )
      );

    sendSuccess(
      res,
      {
        queue,
        pagination: {
          total: parseInt(totalCount[0].count, 10),
          limit,
          offset,
          hasMore: offset + limit < parseInt(totalCount[0].count, 10),
        },
      },
      "User queue retrieved successfully"
    );
  } catch (error) {
    logger.error("Get user queue error:", error);
    next(error);
  }
};

/**
 * GET /api/generations/my-generations - Get user's queue and generation history (unified endpoint)
 * Returns:
 * - Queue items (pending/processing) - always included
 * - Completed items - paginated with cursor
 * - Failed items - optional (if includeFailed=true)
 * 
 * Query params:
 * - limit: items per page (default: 20, max: 100)
 * - cursor: cursor for pagination (base64 encoded)
 * - includeFailed: include failed generations (default: false)
 */
export const getMyGenerations = async (req, res, next) => {
  try {
    const userId = get(req, "user.id");
    const limit = Math.min(parseInt(get(req.query, "limit", "20"), 10), 100);
    const cursor = get(req.query, "cursor");
    const includeFailed = get(req.query, "includeFailed") === "true";

    // Decode cursor for pagination
    const cursorData = decodeCursor(cursor);

    // 1. Fetch all queue items (pending or processing) - always included, not paginated
    const queueItems = await db
      .select()
      .from(imageGenerations)
      .where(
        and(
          eq(imageGenerations.userId, userId),
          inArray(imageGenerations.status, [
            GENERATION_STATUS.PENDING,
            GENERATION_STATUS.PROCESSING,
          ])
        )
      )
      .orderBy(desc(imageGenerations.createdAt));

    // Format queue items
    const queue = queueItems.map((gen) => {
      const metadata = gen.metadata ? JSON.parse(gen.metadata) : {};

      return {
        generationId: gen.id,
        status: gen.status,
        progress: gen.status === GENERATION_STATUS.PENDING ? 0 : 50,
        createdAt: gen.createdAt,
        metadata: {
          prompt: metadata.originalPrompt || "Image generation",
          numberOfImages: metadata.numberOfImages || 1,
          aspectRatio: metadata.aspectRatio || "1:1",
          projectId: metadata.projectId,
        },
        tokensUsed: gen.tokensUsed,
      };
    });

    // 2. Build completed items query with cursor pagination
    let completedQuery = db
      .select()
      .from(imageGenerations)
      .where(
        and(
          eq(imageGenerations.userId, userId),
          eq(imageGenerations.status, GENERATION_STATUS.COMPLETED)
        )
      );

    // Apply cursor if provided
    if (cursorData) {
      completedQuery = completedQuery.where(
        or(
          lt(imageGenerations.createdAt, new Date(cursorData.createdAt)),
          and(
            eq(imageGenerations.createdAt, new Date(cursorData.createdAt)),
            lt(imageGenerations.id, cursorData.id)
          )
        )
      );
    }

    const completedItems = await completedQuery
      .orderBy(desc(imageGenerations.createdAt), desc(imageGenerations.id))
      .limit(limit);

    // Fetch images for completed items
    const completedWithImages = await Promise.all(
      completedItems.map(async (gen) => {
        const metadata = gen.metadata ? JSON.parse(gen.metadata) : {};
        const aiMetadata = gen.aiMetadata ? JSON.parse(gen.aiMetadata) : {};

        const result = {
          generationId: gen.id,
          status: gen.status,
          progress: 100,
          createdAt: gen.createdAt,
          completedAt: gen.completedAt,
          metadata: {
            prompt: metadata.originalPrompt || "Image generation",
            numberOfImages: metadata.numberOfImages || 1,
            aspectRatio: metadata.aspectRatio || "1:1",
            projectId: metadata.projectId,
          },
          tokensUsed: gen.tokensUsed,
          processingTimeMs: gen.processingTimeMs,
        };

        // Fetch images if available
        if (aiMetadata.imageIds && aiMetadata.imageIds.length > 0) {
          const images = await db
            .select()
            .from(uploads)
            .where(inArray(uploads.id, aiMetadata.imageIds));

          result.images = images.map((img) => ({
            imageId: img.id,
            imageUrl: img.publicUrl,
            mimeType: img.mimeType,
            sizeBytes: img.sizeBytes,
          }));
        } else {
          result.images = [];
        }

        return result;
      })
    );

    // 3. Optionally fetch failed items
    let failed = [];
    if (includeFailed) {
      const failedItems = await db
        .select()
        .from(imageGenerations)
        .where(
          and(
            eq(imageGenerations.userId, userId),
            eq(imageGenerations.status, GENERATION_STATUS.FAILED)
          )
        )
        .orderBy(desc(imageGenerations.createdAt))
        .limit(20); // Limit failed items to last 20

      failed = failedItems.map((gen) => {
        const metadata = gen.metadata ? JSON.parse(gen.metadata) : {};

        return {
          generationId: gen.id,
          status: gen.status,
          createdAt: gen.createdAt,
          metadata: {
            prompt: metadata.originalPrompt || "Image generation",
            numberOfImages: metadata.numberOfImages || 1,
            aspectRatio: metadata.aspectRatio || "1:1",
            projectId: metadata.projectId,
          },
          error: gen.errorMessage,
          tokensUsed: gen.tokensUsed,
        };
      });
    }

    // 4. Create cursor response
    const cursorResponse = createCursorResponse(completedItems, limit);

    // 5. Build final response
    const response = {
      queue,
      completed: completedWithImages,
      cursor: cursorResponse,
    };

    // Add counts to cursor
    response.cursor.queueCount = queue.length;
    response.cursor.completedCount = completedWithImages.length;

    // Add failed if requested
    if (includeFailed) {
      response.failed = failed;
      response.cursor.failedCount = failed.length;
    }

    sendSuccess(res, response, "User generations retrieved successfully");
  } catch (error) {
    logger.error("Get user generations error:", error);
    next(error);
  }
};

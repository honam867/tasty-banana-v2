import { eq, and, inArray, desc, sql } from "drizzle-orm";
import { db } from "../db/drizzle.js";
import { uploads } from "../db/schema.js";
import lodash from "lodash";
const { get } = lodash;

import { deleteFromR2 } from "../config/r2.js";
import logger from "../config/logger.js";

/**
 * Create a new upload record
 * @param {Object} uploadData - Upload data
 * @param {string} uploadData.userId - User ID (UUID)
 * @param {string} [uploadData.threadId] - Optional thread ID (UUID)
 * @param {string} [uploadData.title] - Optional file title
 * @param {string} uploadData.purpose - File purpose (init, mask, reference, attachment)
 * @param {string} uploadData.mimeType - MIME type of the file
 * @param {number} uploadData.sizeBytes - File size in bytes
 * @param {string} uploadData.storageProvider - Storage provider (e.g., 'r2')
 * @param {string} uploadData.storageBucket - Storage bucket name
 * @param {string} uploadData.storageKey - Storage key/path
 * @param {string} uploadData.publicUrl - Public URL of the uploaded file
 * @returns {Promise<Object>} Created upload record
 */
export const createUpload = async (uploadData) => {
  const result = await db.insert(uploads).values(uploadData).returning();
  return get(result, "[0]");
};

/**
 * Find an upload by ID
 * @param {string} id - Upload ID (UUID)
 * @returns {Promise<Object|null>} Upload object or null
 */
export const findUploadById = async (id) => {
  const result = await db.select().from(uploads).where(eq(uploads.id, id)).limit(1);
  return get(result, "[0]", null);
};

/**
 * Find uploads by user ID
 * @param {string} userId - User ID (UUID)
 * @param {number} limit - Maximum number of results (default: 50)
 * @returns {Promise<Array>} Array of upload records
 */
export const findUploadsByUserId = async (userId, limit = 50) => {
  const result = await db
    .select()
    .from(uploads)
    .where(eq(uploads.userId, userId))
    .orderBy(desc(uploads.createdAt))
    .limit(limit);
  return result || [];
};

export const listUserUploads = async ({ userId, limit, offset }) => {
  const totalResult = await db
    .select({ count: sql`count(*)` })
    .from(uploads)
    .where(eq(uploads.userId, userId));

  const items = await db
    .select()
    .from(uploads)
    .where(eq(uploads.userId, userId))
    .orderBy(desc(uploads.createdAt))
    .limit(limit)
    .offset(offset);

  const total = parseInt(get(totalResult, "[0].count", "0"), 10);

  return {
    items,
    total,
  };
};

export const listUploads = async ({ limit, offset, userId = null }) => {
  let totalResult;
  let items;

  if (userId) {
    totalResult = await db
      .select({ count: sql`count(*)` })
      .from(uploads)
      .where(eq(uploads.userId, userId));

    items = await db
      .select()
      .from(uploads)
      .where(eq(uploads.userId, userId))
      .orderBy(desc(uploads.createdAt))
      .limit(limit)
      .offset(offset);
  } else {
    totalResult = await db
      .select({ count: sql`count(*)` })
      .from(uploads);

    items = await db
      .select()
      .from(uploads)
      .orderBy(desc(uploads.createdAt))
      .limit(limit)
      .offset(offset);
  }

  const total = parseInt(get(totalResult, "[0].count", "0"), 10);

  return {
    items,
    total,
  };
};

export const deleteUserUploadsByIds = async ({ userId, ids }) => {
  const uniqueIds = Array.from(new Set(ids));

  const records = await db
    .select()
    .from(uploads)
    .where(and(eq(uploads.userId, userId), inArray(uploads.id, uniqueIds)));

  const foundIds = records.map((record) => record.id);
  const missingIds = uniqueIds.filter((id) => !foundIds.includes(id));

  if (missingIds.length > 0) {
    throw new Error(`Uploads not found or not accessible: ${missingIds.join(", ")}`);
  }

  await Promise.all(
    records.map(async (record) => {
      await deleteFromR2(record.storageKey);
    })
  );

  await db
    .delete(uploads)
    .where(and(eq(uploads.userId, userId), inArray(uploads.id, uniqueIds)));

  logger.info(`Deleted ${foundIds.length} uploads for user ${userId}`);

  return {
    deletedIds: foundIds,
  };
};



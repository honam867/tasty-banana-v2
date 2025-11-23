import lodash from "lodash";
const { get, isEmpty, toNumber, isArray } = lodash;

import { uploadToR2 } from "../config/r2.js";
import { generateStorageKey } from "../utils/storageKey.js";
import { HTTP_STATUS } from "../utils/constant.js";
import { sendSuccess, throwError } from "../utils/response.js";
import {
  createUpload,
  listUserUploads,
  deleteUserUploadsByIds,
  listUploads,
} from "../services/uploads.service.js";
import logger from "../config/logger.js";

/**
 * Upload file to R2 and save metadata to database
 * POST /api/uploads
 */
export const uploadFile = async (req, res, next) => {
  try {
    const file = get(req, "file");
    if (!file) {
      throwError("No file uploaded", HTTP_STATUS.BAD_REQUEST);
    }

    const user = get(req, "user");
    const userId = get(user, "id");
    if (!userId) {
      throwError("User not authenticated", HTTP_STATUS.UNAUTHORIZED);
    }

    const purpose = get(req.body, "purpose", "attachment");
    const title = get(req.body, "title");
    const threadId = get(req.body, "thread_id") || get(req.body, "threadId");

    const validPurposes = ["init", "mask", "reference", "attachment"];
    if (!validPurposes.includes(purpose)) {
      throwError(`Invalid purpose. Must be one of: ${validPurposes.join(", ")}`, HTTP_STATUS.BAD_REQUEST);
    }

    const buffer = get(file, "buffer");
    const originalName = get(file, "originalname", "unnamed");
    const mimeType = get(file, "mimetype");
    const sizeBytes = toNumber(get(file, "size", 0));

    const storageKey = generateStorageKey(userId, originalName);
    const storageBucket = process.env.R2_BUCKET;
    const storageProvider = "r2";

    const uploadResult = await uploadToR2({
      buffer,
      key: storageKey,
      contentType: mimeType,
      metadata: {
        originalName,
        userId,
        purpose,
      },
    });

    const insertData = {
      userId,
      purpose,
      mimeType,
      sizeBytes,
      storageProvider,
      storageBucket,
      storageKey,
      publicUrl: get(uploadResult, "publicUrl"),
    };

    if (!isEmpty(title)) insertData.title = title;
    if (!isEmpty(threadId)) insertData.threadId = threadId;

    const uploadRecord = await createUpload(insertData);

    logger.info(`File uploaded successfully by user ${userId}: ${storageKey}`);

    sendSuccess(res, {
      id: get(uploadRecord, "id"),
      userId: get(uploadRecord, "userId"),
      threadId: get(uploadRecord, "threadId"),
      title: get(uploadRecord, "title"),
      purpose: get(uploadRecord, "purpose"),
      mimeType: get(uploadRecord, "mimeType"),
      sizeBytes: get(uploadRecord, "sizeBytes"),
      storageProvider: get(uploadRecord, "storageProvider"),
      storageBucket: get(uploadRecord, "storageBucket"),
      storageKey: get(uploadRecord, "storageKey"),
      publicUrl: get(uploadRecord, "publicUrl"),
      createdAt: get(uploadRecord, "createdAt"),
    }, "File uploaded successfully");
  } catch (error) {
    logger.error("Upload error:", error);
    next(error);
  }
};

const parsePaginationParams = (query) => {
  const rawLimit = get(query, "limit", "20");
  const rawOffset = get(query, "offset", "0");

  const limit = parseInt(rawLimit, 10);
  const offset = parseInt(rawOffset, 10);

  if (Number.isNaN(limit) || limit < 1 || limit > 100) {
    throwError("limit must be an integer between 1 and 100", HTTP_STATUS.BAD_REQUEST);
  }

  if (Number.isNaN(offset) || offset < 0) {
    throwError("offset must be a non-negative integer", HTTP_STATUS.BAD_REQUEST);
  }

  return { limit, offset };
};

const serializeUpload = (record) => ({
  id: get(record, "id"),
  userId: get(record, "userId"),
  threadId: get(record, "threadId"),
  title: get(record, "title"),
  purpose: get(record, "purpose"),
  mimeType: get(record, "mimeType"),
  sizeBytes: get(record, "sizeBytes"),
  storageProvider: get(record, "storageProvider"),
  storageBucket: get(record, "storageBucket"),
  storageKey: get(record, "storageKey"),
  publicUrl: get(record, "publicUrl"),
  createdAt: get(record, "createdAt"),
});

export const getUserAssets = async (req, res, next) => {
  try {
    const userId = get(req, "user.id");
    if (!userId) {
      throwError("User not authenticated", HTTP_STATUS.UNAUTHORIZED);
    }

    const { limit, offset } = parsePaginationParams(req.query);

    const { items, total } = await listUserUploads({ userId, limit, offset });

    sendSuccess(
      res,
      {
        assets: items.map(serializeUpload),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
      "Assets retrieved successfully"
    );
  } catch (error) {
    logger.error("Get user assets error:", error);
    next(error);
  }
};

export const deleteUserAssets = async (req, res, next) => {
  try {
    const userId = get(req, "user.id");
    if (!userId) {
      throwError("User not authenticated", HTTP_STATUS.UNAUTHORIZED);
    }

    const ids = get(req.body, "ids");

    if (!isArray(ids) || isEmpty(ids)) {
      throwError("ids must be a non-empty array", HTTP_STATUS.BAD_REQUEST);
    }

    const sanitizedIds = ids
      .filter((id) => typeof id === "string")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (sanitizedIds.length !== ids.length) {
      throwError("ids must only contain UUID strings", HTTP_STATUS.BAD_REQUEST);
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const invalidIds = sanitizedIds.filter((id) => !uuidRegex.test(id));
    if (invalidIds.length > 0) {
      throwError(
        `Invalid upload ids: ${invalidIds.join(", ")}`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const { deletedIds } = await deleteUserUploadsByIds({ userId, ids: sanitizedIds });

    sendSuccess(
      res,
      {
        deletedIds,
      },
      "Assets deleted successfully"
    );
  } catch (error) {
    logger.error("Delete user assets error:", error);
    next(error);
  }
};

export const getAdminAssets = async (req, res, next) => {
  try {
    const { limit, offset } = parsePaginationParams(req.query);
    const userIdFilter = get(req.query, "userId");

    let filterUserId = null;
    if (!isEmpty(userIdFilter)) {
      const trimmed = userIdFilter.trim();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(trimmed)) {
        throwError("userId must be a valid UUID", HTTP_STATUS.BAD_REQUEST);
      }
      filterUserId = trimmed;
    }

    const { items, total } = await listUploads({ limit, offset, userId: filterUserId });

    sendSuccess(
      res,
      {
        assets: items.map(serializeUpload),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
        filters: {
          userId: filterUserId,
        },
      },
      "Admin assets retrieved successfully"
    );
  } catch (error) {
    logger.error("Get admin assets error:", error);
    next(error);
  }
};

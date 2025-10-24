import lodash from "lodash";
const { get, isEmpty, toNumber } = lodash;

import { uploadToR2 } from "../config/r2.js";
import { generateStorageKey } from "../utils/storageKey.js";
import { HTTP_STATUS } from "../utils/constant.js";
import { sendSuccess, throwError } from "../utils/response.js";
import { createUpload } from "../services/uploads.service.js";
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

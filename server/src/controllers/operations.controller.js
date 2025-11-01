import lodash from "lodash";
const { get } = lodash;

import { db } from "../db/drizzle.js";
import { operationType } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { sendSuccess, throwError } from "../utils/response.js";
import { getOperationsWithPricing } from "../services/operationType.service.js";
import { HTTP_STATUS } from "../utils/constant.js";
import logger from "../config/logger.js";

/**
 * GET /api/operations - List available operations with pricing from database
 */
export const getOperations = async (req, res, next) => {
  try {
    // Fetch operations with pricing from database
    const operations = await getOperationsWithPricing();

    if (!operations || operations.length === 0) {
      logger.warn("No token pricing found in database");
      return sendSuccess(res, [], "No operations available");
    }

    sendSuccess(res, operations, "Available operations retrieved");
  } catch (error) {
    logger.error("Get operations error:", error);
    next(error);
  }
};

/**
 * GET /api/operations/:id - Get single operation by ID
 */
export const getOperationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [operation] = await db
      .select()
      .from(operationType)
      .where(eq(operationType.id, id))
      .limit(1);

    if (!operation) {
      throwError("Operation not found", HTTP_STATUS.NOT_FOUND);
    }

    sendSuccess(res, operation, "Operation retrieved successfully");
  } catch (error) {
    logger.error("Get operation by ID error:", error);
    next(error);
  }
};

/**
 * POST /api/operations - Create new operation (Admin only)
 */
export const createOperation = async (req, res, next) => {
  try {
    const name = get(req.body, "name");
    const tokensPerOperation = get(req.body, "tokensPerOperation");
    const description = get(req.body, "description");
    const isActive = get(req.body, "isActive", true);

    // Validation
    if (!name) {
      throwError("Operation name is required", HTTP_STATUS.BAD_REQUEST);
    }

    if (!tokensPerOperation || tokensPerOperation < 0) {
      throwError("Valid tokens per operation is required", HTTP_STATUS.BAD_REQUEST);
    }

    // Check if operation with same name already exists
    const [existing] = await db
      .select()
      .from(operationType)
      .where(eq(operationType.name, name))
      .limit(1);

    if (existing) {
      throwError("Operation with this name already exists", HTTP_STATUS.CONFLICT);
    }

    // Create operation
    const [newOperation] = await db
      .insert(operationType)
      .values({
        name,
        tokensPerOperation: parseInt(tokensPerOperation, 10),
        description,
        isActive,
      })
      .returning();

    logger.info(`Operation created: ${name} by user ${get(req, "user.id")}`);
    sendSuccess(res, newOperation, "Operation created successfully", 201);
  } catch (error) {
    logger.error("Create operation error:", error);
    next(error);
  }
};

/**
 * PUT /api/operations/:id - Update operation (Admin only)
 */
export const updateOperation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const name = get(req.body, "name");
    const tokensPerOperation = get(req.body, "tokensPerOperation");
    const description = get(req.body, "description");
    const isActive = get(req.body, "isActive");

    // Check if operation exists
    const [existing] = await db
      .select()
      .from(operationType)
      .where(eq(operationType.id, id))
      .limit(1);

    if (!existing) {
      throwError("Operation not found", HTTP_STATUS.NOT_FOUND);
    }

    // Build update object with only provided fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (tokensPerOperation !== undefined) updateData.tokensPerOperation = parseInt(tokensPerOperation, 10);
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    updateData.updatedAt = new Date();

    // Update operation
    const [updated] = await db
      .update(operationType)
      .set(updateData)
      .where(eq(operationType.id, id))
      .returning();

    logger.info(`Operation updated: ${id} by user ${get(req, "user.id")}`);
    sendSuccess(res, updated, "Operation updated successfully");
  } catch (error) {
    logger.error("Update operation error:", error);
    next(error);
  }
};

/**
 * DELETE /api/operations/:id - Delete operation (Admin only)
 */
export const deleteOperation = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if operation exists
    const [existing] = await db
      .select()
      .from(operationType)
      .where(eq(operationType.id, id))
      .limit(1);

    if (!existing) {
      throwError("Operation not found", HTTP_STATUS.NOT_FOUND);
    }

    // Delete operation
    await db
      .delete(operationType)
      .where(eq(operationType.id, id));

    logger.info(`Operation deleted: ${id} by user ${get(req, "user.id")}`);
    sendSuccess(res, { id }, "Operation deleted successfully");
  } catch (error) {
    logger.error("Delete operation error:", error);
    next(error);
  }
};

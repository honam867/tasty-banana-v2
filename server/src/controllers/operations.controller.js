import lodash from "lodash";
const { get } = lodash;

import { sendSuccess } from "../utils/response.js";
import { getOperationsWithPricing } from "../services/operationType.service.js";
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

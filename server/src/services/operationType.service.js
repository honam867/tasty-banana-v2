/**
 * Operation Type Service
 * Handles fetching operation types from database
 */

import { db } from '../db/drizzle.js';
import { operationType } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import logger from '../config/logger.js';

/**
 * Get all active operation types from database
 */
export const getAllOperationTypes = async () => {
  try {
    logger.debug('Fetching operation types from database');
    const types = await db
      .select()
      .from(operationType)
      .where(eq(operationType.isActive, true))
      .orderBy(operationType.name);

    return types;
  } catch (error) {
    logger.error('Failed to fetch operation types:', error);
    // Return empty array if database fails
    return [];
  }
};

/**
 * Get operation type by name
 * @param {string} name - Operation type name (e.g., 'text_to_image')
 * @returns {Promise<Object|null>} Operation type object or null
 */
export const getOperationTypeByName = async (name) => {
  try {
    const allTypes = await getAllOperationTypes();
    return allTypes.find(t => t.name === name);
  } catch (error) {
    logger.error(`Failed to fetch operation type for ${name}:`, error);
    return null;
  }
};

/**
 * Get operation type by ID
 * @param {string} id - Operation type UUID
 * @returns {Promise<Object|null>} Operation type object or null
 */
export const getOperationTypeById = async (id) => {
  try {
    const [opType] = await db
      .select()
      .from(operationType)
      .where(eq(operationType.id, id))
      .limit(1);
    
    return opType || null;
  } catch (error) {
    logger.error(`Failed to fetch operation type for ID ${id}:`, error);
    return null;
  }
};

/**
 * Get operations with pricing
 * Returns raw database records for active operations
 */
export const getOperationsWithPricing = async () => {
  try {
    const types = await getAllOperationTypes();
    return types;
  } catch (error) {
    logger.error('Failed to get operations with pricing:', error);
    return [];
  }
};

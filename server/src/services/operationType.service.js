/**
 * Operation Type Service
 * Handles fetching and caching operation types from database
 */

import { db } from '../db/drizzle.js';
import { operationType } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import logger from '../config/logger.js';

// In-memory cache for operation types (cache for 5 minutes)
let operationTypeCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get all active operation types from database
 * Uses in-memory caching to reduce DB queries
 */
export const getAllOperationTypes = async () => {
  try {
    // Check cache
    const now = Date.now();
    if (operationTypeCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
      logger.debug('Returning cached operation types');
      return operationTypeCache;
    }

    // Fetch from database
    logger.debug('Fetching operation types from database');
    const types = await db
      .select()
      .from(operationType)
      .where(eq(operationType.isActive, true))
      .orderBy(operationType.name);

    // Update cache
    operationTypeCache = types;
    cacheTimestamp = now;

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
 * Get operations with pricing for API response
 * Returns formatted data suitable for /api/generate/operations endpoint
 */
export const getOperationsWithPricing = async () => {
  try {
    const types = await getAllOperationTypes();
    
    // Map database records to API response format
    const operations = types.map(t => ({
      id: t.id,
      type: t.name,
      name: formatOperationName(t.name),
      description: t.description || '',
      tokens: t.tokensPerOperation,
      endpoint: getEndpointPath(t.name),
      isActive: t.isActive
    }));

    return operations;
  } catch (error) {
    logger.error('Failed to get operations with pricing:', error);
    return [];
  }
};

/**
 * Clear operation type cache (useful for testing or after updates)
 */
export const clearOperationTypeCache = () => {
  operationTypeCache = null;
  cacheTimestamp = null;
  logger.info('Operation type cache cleared');
};

/**
 * Helper: Format operation type name to readable name
 */
const formatOperationName = (name) => {
  const nameMap = {
    'text_to_image': 'Text to Image',
    'image_reference': 'Image Reference',
  };
  
  return nameMap[name] || name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Helper: Get endpoint path for operation type
 */
const getEndpointPath = (name) => {
  const endpointMap = {
    'text_to_image': '/api/generate/text-to-image',
    'image_reference': '/api/generate/image-reference',
  };
  
  return endpointMap[name] || `/api/generate/${name.replace(/_/g, '-')}`;
};

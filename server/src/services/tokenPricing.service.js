/**
 * Token Pricing Service
 * Handles fetching and caching token pricing from database
 */

import { db } from '../db/drizzle.js';
import { tokenPricing } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import logger from '../config/logger.js';

// In-memory cache for token pricing (cache for 5 minutes)
let pricingCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get all active token pricing from database
 * Uses in-memory caching to reduce DB queries
 */
export const getAllTokenPricing = async () => {
  try {
    // Check cache
    const now = Date.now();
    if (pricingCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
      logger.debug('Returning cached token pricing');
      return pricingCache;
    }

    // Fetch from database
    logger.debug('Fetching token pricing from database');
    const pricing = await db
      .select()
      .from(tokenPricing)
      .where(eq(tokenPricing.isActive, true))
      .orderBy(tokenPricing.operationType);

    // Update cache
    pricingCache = pricing;
    cacheTimestamp = now;

    return pricing;
  } catch (error) {
    logger.error('Failed to fetch token pricing:', error);
    // Return empty array if database fails
    return [];
  }
};

/**
 * Get token pricing for specific operation type
 */
export const getTokenPricingByType = async (operationType) => {
  try {
    const allPricing = await getAllTokenPricing();
    return allPricing.find(p => p.operationType === operationType);
  } catch (error) {
    logger.error(`Failed to fetch pricing for ${operationType}:`, error);
    return null;
  }
};

/**
 * Get operations with pricing for API response
 * Returns formatted data suitable for /api/generate/operations endpoint
 */
export const getOperationsWithPricing = async () => {
  try {
    const pricing = await getAllTokenPricing();
    
    // Map database records to API response format
    const operations = pricing.map(p => ({
      type: p.operationType,
      name: formatOperationName(p.operationType),
      description: p.description || '',
      tokens: p.tokensPerOperation,
      endpoint: getEndpointPath(p.operationType),
      isActive: p.isActive
    }));

    return operations;
  } catch (error) {
    logger.error('Failed to get operations with pricing:', error);
    return [];
  }
};

/**
 * Clear pricing cache (useful for testing or after updates)
 */
export const clearPricingCache = () => {
  pricingCache = null;
  cacheTimestamp = null;
  logger.info('Token pricing cache cleared');
};

/**
 * Helper: Format operation type to readable name
 */
const formatOperationName = (operationType) => {
  const nameMap = {
    'text_to_image': 'Text to Image',
    'image_edit_simple': 'Simple Image Edit',
    'image_edit_complex': 'Complex Image Edit',
    'multi_image_composition': 'Multi-Image Composition',
    'style_transfer': 'Style Transfer',
    'conversational_edit': 'Conversational Edit',
    'text_rendering': 'Text Rendering',
    'custom_prompt': 'Custom Prompt',
    'video_generation': 'Video Generation'
  };
  
  return nameMap[operationType] || operationType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Helper: Get endpoint path for operation type
 */
const getEndpointPath = (operationType) => {
  const endpointMap = {
    'text_to_image': '/api/generate/text-to-image',
    'image_edit_simple': '/api/generate/edit-simple',
    'image_edit_complex': '/api/generate/edit-complex',
    'multi_image_composition': '/api/generate/compose',
    'style_transfer': '/api/generate/style-transfer',
    'conversational_edit': '/api/generate/conversational-edit',
    'text_rendering': '/api/generate/text-rendering',
    'custom_prompt': '/api/generate/custom'
  };
  
  return endpointMap[operationType] || `/api/generate/${operationType.replace(/_/g, '-')}`;
};

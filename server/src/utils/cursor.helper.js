/**
 * Cursor-based pagination helper for infinite scroll
 * Uses base64 encoded timestamp + id for stable cursors
 */

/**
 * Encode cursor from timestamp and id
 * @param {Date} createdAt - Timestamp
 * @param {string} id - Record ID
 * @returns {string} Base64 encoded cursor
 */
export function encodeCursor(createdAt, id) {
  if (!createdAt || !id) {
    return null;
  }
  
  const cursorData = {
    createdAt: createdAt.toISOString(),
    id: id
  };
  
  return Buffer.from(JSON.stringify(cursorData)).toString('base64');
}

/**
 * Decode cursor to timestamp and id
 * @param {string} cursor - Base64 encoded cursor
 * @returns {{createdAt: string, id: string} | null} Decoded cursor data
 */
export function decodeCursor(cursor) {
  if (!cursor) {
    return null;
  }
  
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const cursorData = JSON.parse(decoded);
    
    if (!cursorData.createdAt || !cursorData.id) {
      return null;
    }
    
    return cursorData;
  } catch (error) {
    return null;
  }
}

/**
 * Create cursor response object
 * @param {Array} items - Array of items
 * @param {number} limit - Items per page
 * @returns {{next: string|null, hasMore: boolean}} Cursor response
 */
export function createCursorResponse(items, limit) {
  const hasMore = items.length === limit;
  
  let next = null;
  if (hasMore && items.length > 0) {
    const lastItem = items[items.length - 1];
    next = encodeCursor(lastItem.createdAt, lastItem.id);
  }
  
  return {
    next,
    hasMore
  };
}

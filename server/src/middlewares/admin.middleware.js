import { ROLE, HTTP_STATUS } from '../utils/constant.js';
import { throwError } from '../utils/response.js';
import logger from '../config/logger.js';

/**
 * Admin Middleware
 * Role-based access control for admin operations
 */

/**
 * Middleware to require admin role
 * Use after verifyToken middleware
 * @throws {Error} If user is not authenticated or not an admin
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    logger.warn('requireAdmin: No user in request');
    throwError('Authentication required', HTTP_STATUS.UNAUTHENTICATED);
  }
  
  if (req.user.role !== ROLE.ADMIN) {
    logger.warn(`requireAdmin: Access denied for user ${req.user.id} with role ${req.user.role}`);
    throwError('Admin access required', HTTP_STATUS.UNAUTHORIZED);
  }
  
  logger.debug(`requireAdmin: Granted access to admin ${req.user.id}`);
  next();
};

/**
 * Middleware to require admin or moderator role
 * Allows admins, owners, and moderators
 * @throws {Error} If user doesn't have sufficient permissions
 */
export const requireAdminOrMod = (req, res, next) => {
  if (!req.user) {
    logger.warn('requireAdminOrMod: No user in request');
    throwError('Authentication required', HTTP_STATUS.UNAUTHENTICATED);
  }
  
  const allowedRoles = [ROLE.ADMIN, ROLE.MOD, ROLE.OWNER];
  if (!allowedRoles.includes(req.user.role)) {
    logger.warn(`requireAdminOrMod: Access denied for user ${req.user.id} with role ${req.user.role}`);
    throwError('Insufficient permissions. Admin or moderator access required', HTTP_STATUS.UNAUTHORIZED);
  }
  
  logger.debug(`requireAdminOrMod: Granted access to user ${req.user.id} with role ${req.user.role}`);
  next();
};

/**
 * Middleware to require owner role (highest privilege)
 * @throws {Error} If user is not an owner
 */
export const requireOwner = (req, res, next) => {
  if (!req.user) {
    logger.warn('requireOwner: No user in request');
    throwError('Authentication required', HTTP_STATUS.UNAUTHENTICATED);
  }
  
  if (req.user.role !== ROLE.OWNER) {
    logger.warn(`requireOwner: Access denied for user ${req.user.id} with role ${req.user.role}`);
    throwError('Owner access required', HTTP_STATUS.UNAUTHORIZED);
  }
  
  logger.debug(`requireOwner: Granted access to owner ${req.user.id}`);
  next();
};

export default {
  requireAdmin,
  requireAdminOrMod,
  requireOwner,
};

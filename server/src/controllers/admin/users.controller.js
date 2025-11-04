import lodash from "lodash";
const { get } = lodash;

import UserManagementService from "../../services/admin/userManagement.service.js";
import TokenService from "../../services/tokens/TokenService.js";
import { sendSuccess, throwError } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constant.js";
import logger from "../../config/logger.js";

/**
 * Admin User Management Controllers
 * Handles all admin operations for user management
 */

/**
 * GET /api/admin/users
 * List all users with pagination, search, and filters
 */
export const listUsers = async (req, res, next) => {
  try {
    const page = parseInt(get(req.query, 'page', '1'));
    const limit = parseInt(get(req.query, 'limit', '20'));
    const search = get(req.query, 'search');
    const role = get(req.query, 'role');
    const status = get(req.query, 'status');
    const sortBy = get(req.query, 'sortBy', 'createdAt');
    const sortOrder = get(req.query, 'sortOrder', 'desc');

    const result = await UserManagementService.listUsers({
      page,
      limit,
      search,
      role,
      status,
      sortBy,
      sortOrder,
    });

    sendSuccess(res, result, 'Users retrieved successfully');
  } catch (error) {
    logger.error('List users error:', error);
    next(error);
  }
};

/**
 * GET /api/admin/users/:userId
 * Get user details with token balance and stats
 */
export const getUserDetails = async (req, res, next) => {
  try {
    const userId = get(req.params, 'userId');

    if (!userId) {
      throwError('User ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    const result = await UserManagementService.getUserDetails(userId);

    sendSuccess(res, result, 'User details retrieved successfully');
  } catch (error) {
    logger.error('Get user details error:', error);
    
    if (error.message === 'User not found') {
      throwError('User not found', HTTP_STATUS.NOT_FOUND);
    }
    
    next(error);
  }
};

/**
 * POST /api/admin/users
 * Create new user with optional initial tokens
 */
export const createUser = async (req, res, next) => {
  try {
    const adminId = get(req, 'user.id');
    const username = get(req.body, 'username');
    const email = get(req.body, 'email');
    const password = get(req.body, 'password');
    const role = get(req.body, 'role', 'user');
    const status = get(req.body, 'status', 'active');
    const initialTokens = parseInt(get(req.body, 'initialTokens', '0'));

    // Validation
    if (!username) {
      throwError('Username is required', HTTP_STATUS.BAD_REQUEST);
    }
    if (!email) {
      throwError('Email is required', HTTP_STATUS.BAD_REQUEST);
    }
    if (!password) {
      throwError('Password is required', HTTP_STATUS.BAD_REQUEST);
    }

    // Validate initial tokens (0-10000)
    if (initialTokens < 0 || initialTokens > 10000) {
      throwError('Initial tokens must be between 0 and 10000', HTTP_STATUS.BAD_REQUEST);
    }

    const result = await UserManagementService.createUser(
      {
        username,
        email,
        password,
        role,
        status,
        initialTokens,
      },
      adminId
    );

    sendSuccess(res, result, 'User created successfully', 201);
  } catch (error) {
    logger.error('Create user error:', error);
    
    if (error.message === 'Username already exists' || error.message === 'Email already exists') {
      throwError(error.message, HTTP_STATUS.CONFLICT);
    }
    
    next(error);
  }
};

/**
 * PUT /api/admin/users/:userId
 * Update user profile
 */
export const updateUser = async (req, res, next) => {
  try {
    const adminId = get(req, 'user.id');
    const userId = get(req.params, 'userId');
    const username = get(req.body, 'username');
    const email = get(req.body, 'email');
    const role = get(req.body, 'role');
    const status = get(req.body, 'status');

    if (!userId) {
      throwError('User ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    const updates = {};
    if (username) updates.username = username;
    if (email) updates.email = email;
    if (role) updates.role = role;
    if (status) updates.status = status;

    const result = await UserManagementService.updateUser(userId, updates, adminId);

    sendSuccess(res, { user: result }, 'User updated successfully');
  } catch (error) {
    logger.error('Update user error:', error);
    
    if (error.message === 'User not found') {
      throwError('User not found', HTTP_STATUS.NOT_FOUND);
    }
    if (error.message === 'Username already exists' || error.message === 'Email already exists') {
      throwError(error.message, HTTP_STATUS.CONFLICT);
    }
    
    next(error);
  }
};

/**
 * PATCH /api/admin/users/:userId/status
 * Update user status (activate/deactivate)
 */
export const updateUserStatus = async (req, res, next) => {
  try {
    const adminId = get(req, 'user.id');
    const userId = get(req.params, 'userId');
    const status = get(req.body, 'status');
    const reason = get(req.body, 'reason', '');

    if (!userId) {
      throwError('User ID is required', HTTP_STATUS.BAD_REQUEST);
    }
    if (!status) {
      throwError('Status is required', HTTP_STATUS.BAD_REQUEST);
    }

    // Validate status
    const validStatuses = ['active', 'inactive'];
    if (!validStatuses.includes(status)) {
      throwError('Status must be "active" or "inactive"', HTTP_STATUS.BAD_REQUEST);
    }

    const result = await UserManagementService.updateUserStatus(userId, status, reason, adminId);

    sendSuccess(res, result, 'User status updated successfully');
  } catch (error) {
    logger.error('Update user status error:', error);
    
    if (error.message === 'User not found') {
      throwError('User not found', HTTP_STATUS.NOT_FOUND);
    }
    
    next(error);
  }
};

/**
 * DELETE /api/admin/users/:userId
 * Delete user (soft delete by default)
 */
export const deleteUser = async (req, res, next) => {
  try {
    const adminId = get(req, 'user.id');
    const userId = get(req.params, 'userId');
    const permanent = get(req.query, 'permanent') === 'true';

    if (!userId) {
      throwError('User ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    const result = await UserManagementService.deleteUser(userId, permanent, adminId);

    sendSuccess(res, result, 'User deleted successfully');
  } catch (error) {
    logger.error('Delete user error:', error);
    
    if (error.message === 'User not found') {
      throwError('User not found', HTTP_STATUS.NOT_FOUND);
    }
    
    next(error);
  }
};

/**
 * GET /api/admin/users/:userId/tokens/balance
 * Get user token balance
 */
export const getUserTokenBalance = async (req, res, next) => {
  try {
    const userId = get(req.params, 'userId');

    if (!userId) {
      throwError('User ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    const balance = await TokenService.getBalance(userId);

    sendSuccess(res, { userId, ...balance }, 'Token balance retrieved successfully');
  } catch (error) {
    logger.error('Get user token balance error:', error);
    next(error);
  }
};

/**
 * GET /api/admin/users/:userId/tokens/history
 * Get user transaction history
 */
export const getUserTokenHistory = async (req, res, next) => {
  try {
    const userId = get(req.params, 'userId');
    const limit = parseInt(get(req.query, 'limit', '20'));
    const cursor = get(req.query, 'cursor');
    const type = get(req.query, 'type');
    const reason = get(req.query, 'reason');

    if (!userId) {
      throwError('User ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    const history = await TokenService.getHistory(userId, {
      limit,
      cursor,
      type,
      reason,
    });

    sendSuccess(
      res,
      {
        userId,
        transactions: history.items,
        pagination: {
          limit,
          cursor: history.nextCursor,
          hasMore: history.hasMore,
        },
      },
      'Transaction history retrieved successfully'
    );
  } catch (error) {
    logger.error('Get user token history error:', error);
    next(error);
  }
};

/**
 * POST /api/admin/users/:userId/tokens/credit
 * Credit tokens to user
 */
export const creditTokens = async (req, res, next) => {
  try {
    const adminId = get(req, 'user.id');
    const userId = get(req.params, 'userId');
    const amount = parseInt(get(req.body, 'amount'));
    const reason = get(req.body, 'reason', 'admin_topup');
    const notes = get(req.body, 'notes', '');
    const idempotencyKey = get(req.body, 'idempotencyKey');

    if (!userId) {
      throwError('User ID is required', HTTP_STATUS.BAD_REQUEST);
    }
    if (!amount || amount <= 0) {
      throwError('Amount must be a positive number', HTTP_STATUS.BAD_REQUEST);
    }
    if (amount > 1000000) {
      throwError('Amount cannot exceed 1,000,000', HTTP_STATUS.BAD_REQUEST);
    }

    const result = await UserManagementService.creditTokens(
      userId,
      amount,
      reason,
      notes,
      adminId,
      idempotencyKey
    );

    sendSuccess(res, result, 'Tokens credited successfully');
  } catch (error) {
    logger.error('Credit tokens error:', error);
    
    if (error.message === 'User not found') {
      throwError('User not found', HTTP_STATUS.NOT_FOUND);
    }
    
    next(error);
  }
};

/**
 * POST /api/admin/users/:userId/tokens/debit
 * Debit tokens from user (admin override)
 */
export const debitTokens = async (req, res, next) => {
  try {
    const adminId = get(req, 'user.id');
    const userId = get(req.params, 'userId');
    const amount = parseInt(get(req.body, 'amount'));
    const reason = get(req.body, 'reason', 'admin_correction');
    const notes = get(req.body, 'notes', '');
    const idempotencyKey = get(req.body, 'idempotencyKey');

    if (!userId) {
      throwError('User ID is required', HTTP_STATUS.BAD_REQUEST);
    }
    if (!amount || amount <= 0) {
      throwError('Amount must be a positive number', HTTP_STATUS.BAD_REQUEST);
    }
    if (amount > 1000000) {
      throwError('Amount cannot exceed 1,000,000', HTTP_STATUS.BAD_REQUEST);
    }

    const result = await UserManagementService.debitTokens(
      userId,
      amount,
      reason,
      notes,
      adminId,
      idempotencyKey
    );

    sendSuccess(res, result, 'Tokens debited successfully');
  } catch (error) {
    logger.error('Debit tokens error:', error);
    
    if (error.message === 'User not found') {
      throwError('User not found', HTTP_STATUS.NOT_FOUND);
    }
    if (error.message.includes('Insufficient')) {
      throwError(error.message, 402); // Payment Required
    }
    
    next(error);
  }
};

export default {
  listUsers,
  getUserDetails,
  createUser,
  updateUser,
  updateUserStatus,
  deleteUser,
  getUserTokenBalance,
  getUserTokenHistory,
  creditTokens,
  debitTokens,
};

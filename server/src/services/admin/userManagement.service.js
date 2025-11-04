import { db } from "../../db/drizzle.js";
import {
  users,
  userTokens,
  imageGenerations,
  uploads,
} from "../../db/schema.js";
import { eq, and, or, desc, sql, ilike, count } from "drizzle-orm";
import TokenService from "../tokens/TokenService.js";
import {
  findUserById,
  findUserByUsername,
  findUserByEmail,
  createUser as createUserBase,
} from "../user.service.js";
import {
  TOKEN_REASON_CODES,
  TOKEN_ACTOR_TYPES,
  STATUS,
} from "../../utils/constant.js";
import logger from "../../config/logger.js";

/**
 * Admin User Management Service
 * Handles all admin operations for user management
 */
class UserManagementService {
  /**
   * List users with pagination, search, and filters
   * @param {Object} options
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.limit - Results per page (default: 20, max: 100)
   * @param {string} options.search - Search by username or email
   * @param {string} options.role - Filter by role
   * @param {string} options.status - Filter by status
   * @param {string} options.sortBy - Sort field (default: createdAt)
   * @param {string} options.sortOrder - Sort order (asc/desc, default: desc)
   * @returns {Promise<{users: Array, pagination: Object}>}
   */
  async listUsers(options = {}) {
    const {
      page = 1,
      limit = 20,
      search = null,
      role = null,
      status = null,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;

    // Validate and cap limit
    const effectiveLimit = Math.min(Math.max(1, limit), 100);
    const offset = (Math.max(1, page) - 1) * effectiveLimit;

    // Build where conditions
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(users.username, `%${search}%`),
          ilike(users.email, `%${search}%`)
        )
      );
    }

    if (role) {
      conditions.push(eq(users.role, role));
    }

    if (status) {
      conditions.push(eq(users.status, status));
    }

    // Build where clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Determine sort column
    const sortColumn =
      {
        createdAt: users.createdAt,
        username: users.username,
        email: users.email,
        updatedAt: users.updatedAt,
      }[sortBy] || users.createdAt;

    // Determine sort direction
    const sortFn =
      sortOrder === "asc" ? sql`${sortColumn} asc` : desc(sortColumn);

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(users)
      .where(whereClause);

    // Get users with token balance
    const usersList = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        tokenBalance: userTokens.balance,
      })
      .from(users)
      .leftJoin(userTokens, eq(users.id, userTokens.userId))
      .where(whereClause)
      .orderBy(sortFn)
      .limit(effectiveLimit)
      .offset(offset);

    const totalPages = Math.ceil(total / effectiveLimit);

    return {
      users: usersList.map((user) => ({
        ...user,
        tokenBalance: user.tokenBalance || 0,
      })),
      pagination: {
        page: Math.max(1, page),
        limit: effectiveLimit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get user details with token balance and stats
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User details with tokens and stats
   */
  async getUserDetails(userId) {
    // Get user
    const user = await findUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get token balance
    const tokens = await TokenService.getBalance(userId);

    // Get generation stats
    const [generationStats] = await db
      .select({ total: count() })
      .from(imageGenerations)
      .where(eq(imageGenerations.userId, userId));

    // Get upload stats
    const [uploadStats] = await db
      .select({ total: count() })
      .from(uploads)
      .where(eq(uploads.userId, userId));

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      tokens: {
        balance: tokens.balance,
        totalEarned: tokens.totalEarned,
        totalSpent: tokens.totalSpent,
      },
      stats: {
        totalGenerations: generationStats?.total || 0,
        totalUploads: uploadStats?.total || 0,
      },
    };
  }

  /**
   * Create new user with optional initial tokens
   * @param {Object} userData
   * @param {string} userData.username
   * @param {string} userData.email
   * @param {string} userData.password - Plain password (will be hashed)
   * @param {string} userData.role
   * @param {string} userData.status
   * @param {number} userData.initialTokens - Initial token balance
   * @param {string} adminId - Admin user ID who created the user
   * @returns {Promise<Object>} Created user and token info
   */
  async createUser(userData, adminId) {
    const {
      username,
      email,
      password,
      role = "user",
      status = STATUS.ACTIVE,
      initialTokens = 0,
    } = userData;

    // Check for duplicates
    const existingUsername = await findUserByUsername(username);
    if (existingUsername) {
      throw new Error("Username already exists");
    }

    const existingEmail = await findUserByEmail(email);
    if (existingEmail) {
      throw new Error("Email already exists");
    }

    // Create user using base service
    const newUser = await createUserBase({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password, // Will be hashed by auth service
      role,
      status,
    });

    logger.info(`Admin ${adminId} created user ${newUser.id}`);

    // Credit initial tokens if specified
    let tokenInfo = null;
    if (initialTokens > 0) {
      const tokenResult = await TokenService.credit(newUser.id, initialTokens, {
        reasonCode: TOKEN_REASON_CODES.ADMIN_TOPUP,
        idempotencyKey: `user-creation:${newUser.id}:${Date.now()}`,
        actor: {
          type: TOKEN_ACTOR_TYPES.ADMIN,
          id: adminId,
        },
        metadata: {
          notes: "Initial tokens on account creation",
        },
      });

      tokenInfo = {
        balance: tokenResult.balance,
        transactionId: tokenResult.transactionId,
      };

      logger.info(
        `Credited ${initialTokens} initial tokens to user ${newUser.id}`
      );
    }

    return {
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        createdAt: newUser.createdAt,
      },
      tokens: tokenInfo,
    };
  }

  /**
   * Update user profile
   * @param {string} userId - User ID to update
   * @param {Object} updates
   * @param {string} updates.username
   * @param {string} updates.email
   * @param {string} updates.role
   * @param {string} updates.status
   * @param {string} adminId - Admin user ID performing the update
   * @returns {Promise<Object>} Updated user
   */
  async updateUser(userId, updates, adminId) {
    const user = await findUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check for duplicate username if changing
    if (updates.username && updates.username !== user.username) {
      const existingUsername = await findUserByUsername(updates.username);
      if (existingUsername) {
        throw new Error("Username already exists");
      }
    }

    // Check for duplicate email if changing
    if (updates.email && updates.email !== user.email) {
      const existingEmail = await findUserByEmail(updates.email);
      if (existingEmail) {
        throw new Error("Email already exists");
      }
    }

    // Build update object
    const updateData = {};
    if (updates.username) updateData.username = updates.username.toLowerCase();
    if (updates.email) updateData.email = updates.email.toLowerCase();
    if (updates.role) updateData.role = updates.role;
    if (updates.status) updateData.status = updates.status;

    updateData.updatedAt = new Date();

    // Update user
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    logger.info(`Admin ${adminId} updated user ${userId}`, { updates });

    return {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.status,
      updatedAt: updatedUser.updatedAt,
    };
  }

  /**
   * Update user status (activate/deactivate)
   * @param {string} userId - User ID
   * @param {string} status - New status ('active' or 'inactive')
   * @param {string} reason - Reason for status change
   * @param {string} adminId - Admin user ID
   * @returns {Promise<Object>} Updated user status
   */
  async updateUserStatus(userId, status, reason, adminId) {
    const user = await findUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    logger.info(`Admin ${adminId} changed user ${userId} status to ${status}`, {
      reason,
    });

    return {
      userId: updatedUser.id,
      status: updatedUser.status,
      updatedAt: updatedUser.updatedAt,
    };
  }

  /**
   * Delete user (soft delete by setting status to inactive)
   * @param {string} userId - User ID to delete
   * @param {boolean} permanent - If true, hard delete (not recommended)
   * @param {string} adminId - Admin user ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteUser(userId, permanent = false, adminId) {
    const user = await findUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (permanent) {
      // Hard delete (use with caution, may break foreign key constraints)
      await db.delete(users).where(eq(users.id, userId));

      logger.warn(`Admin ${adminId} permanently deleted user ${userId}`);

      return {
        userId,
        deleted: true,
        permanent: true,
        deletedAt: new Date(),
      };
    } else {
      // Soft delete: set status to inactive
      const [updatedUser] = await db
        .update(users)
        .set({
          status: STATUS.INACTIVE,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      logger.info(
        `Admin ${adminId} soft deleted user ${userId} (status: inactive)`
      );

      return {
        userId: updatedUser.id,
        deleted: true,
        permanent: false,
        deletedAt: updatedUser.updatedAt,
      };
    }
  }

  /**
   * Credit tokens to user
   * @param {string} userId - User ID
   * @param {number} amount - Amount to credit
   * @param {string} reason - Reason code
   * @param {string} notes - Additional notes
   * @param {string} adminId - Admin user ID
   * @param {string} idempotencyKey - Optional idempotency key
   * @returns {Promise<Object>} Credit result
   */
  async creditTokens(userId, amount, reason, notes, adminId, idempotencyKey) {
    const user = await findUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const result = await TokenService.credit(userId, amount, {
      reasonCode: reason || TOKEN_REASON_CODES.ADMIN_TOPUP,
      idempotencyKey: idempotencyKey || `admin-credit:${userId}:${Date.now()}`,
      actor: {
        type: TOKEN_ACTOR_TYPES.ADMIN,
        id: adminId,
      },
      metadata: {
        notes: notes || "",
      },
    });

    logger.info(`Admin ${adminId} credited ${amount} tokens to user ${userId}`);

    return {
      userId,
      transactionId: result.transactionId,
      amount,
      newBalance: result.balance,
      idempotent: result.idempotent || false,
    };
  }

  /**
   * Debit tokens from user (admin override)
   * @param {string} userId - User ID
   * @param {number} amount - Amount to debit
   * @param {string} reason - Reason code
   * @param {string} notes - Additional notes
   * @param {string} adminId - Admin user ID
   * @param {string} idempotencyKey - Optional idempotency key
   * @returns {Promise<Object>} Debit result
   */
  async debitTokens(userId, amount, reason, notes, adminId, idempotencyKey) {
    const user = await findUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const result = await TokenService.debit(userId, amount, {
      reasonCode: reason || "admin_correction",
      idempotencyKey: idempotencyKey || `admin-debit:${userId}:${Date.now()}`,
      actor: {
        type: TOKEN_ACTOR_TYPES.ADMIN,
        id: adminId,
      },
      metadata: {
        notes: notes || "",
      },
    });

    logger.info(
      `Admin ${adminId} debited ${amount} tokens from user ${userId}`
    );

    return {
      userId,
      transactionId: result.transactionId,
      amount,
      newBalance: result.balance,
      idempotent: result.idempotent || false,
    };
  }
}

export default new UserManagementService();

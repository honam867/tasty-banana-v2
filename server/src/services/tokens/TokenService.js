import { db } from "../../db/drizzle.js";
import { userTokens, tokenTransactions } from "../../db/schema.js";
import { eq, and, desc, lt, sql } from "drizzle-orm";
import {
  InsufficientFundsError,
  AccountNotFoundError,
  InvalidAmountError,
  UserIdRequiredError,
  ReasonCodeRequiredError,
} from "./TokenErrors.js";
import {
  TOKEN_TRANSACTION_TYPES,
  TOKEN_ACTOR_TYPES,
  TOKEN_PAGINATION,
} from "../../utils/constant.js";

/**
 * TokenService - Handles all token operations with ACID guarantees
 * 
 * Provides methods for:
 * - Credit/debit tokens with idempotency
 * - Query balance and transaction history
 * - Maintain ledger consistency
 */
class TokenService {
  /**
   * Credit tokens to a user account
   * 
   * @param {string} userId - User ID
   * @param {number} amount - Amount to credit (must be positive)
   * @param {Object} options
   * @param {string} options.reasonCode - Reason for credit (e.g., 'signup_bonus', 'admin_topup')
   * @param {string} [options.idempotencyKey] - Unique key to prevent duplicate credits
   * @param {Object} [options.actor] - Actor performing the operation {type: 'system'|'user'|'admin', id: string}
   * @param {Object} [options.metadata] - Additional metadata
   * 
   * @returns {Promise<{balance: number, transactionId: string}>}
   * @throws {Error} If amount is invalid or operation fails
   */
  async credit(userId, amount, options = {}) {
    const {
      reasonCode,
      idempotencyKey = null,
      actor = { type: TOKEN_ACTOR_TYPES.SYSTEM },
      metadata = {},
    } = options;

    // Validation
    if (!userId) {
      throw new UserIdRequiredError();
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new InvalidAmountError(amount);
    }
    if (!reasonCode) {
      throw new ReasonCodeRequiredError();
    }

    // Check for duplicate idempotency key
    if (idempotencyKey) {
      const existing = await db
        .select()
        .from(tokenTransactions)
        .where(
          and(
            eq(tokenTransactions.userId, userId),
            sql`${tokenTransactions.notes} @> ${JSON.stringify({ idempotencyKey })}`
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Return existing transaction (idempotent)
        const userToken = await db
          .select()
          .from(userTokens)
          .where(eq(userTokens.userId, userId))
          .limit(1);

        return {
          balance: userToken[0]?.balance || 0,
          transactionId: existing[0].id,
          idempotent: true,
        };
      }
    }

    // Execute credit operation in transaction
    return await db.transaction(async (tx) => {
      // Get or create user tokens record with lock
      let userToken = await tx
        .select()
        .from(userTokens)
        .where(eq(userTokens.userId, userId))
        .for("update") // Row-level lock
        .limit(1);

      let isNew = false;
      if (userToken.length === 0) {
        // Create new token account
        [userToken] = await tx
          .insert(userTokens)
          .values({
            userId,
            balance: 0,
            totalEarned: 0,
            totalSpent: 0,
          })
          .returning();
        isNew = true;
      } else {
        userToken = userToken[0];
      }

      const newBalance = userToken.balance + amount;
      const newTotalEarned = userToken.totalEarned + amount;

      // Update balance
      await tx
        .update(userTokens)
        .set({
          balance: newBalance,
          totalEarned: newTotalEarned,
          updatedAt: new Date(),
        })
        .where(eq(userTokens.userId, userId));

      // Create transaction record
      const [transaction] = await tx
        .insert(tokenTransactions)
        .values({
          userId,
          type: TOKEN_TRANSACTION_TYPES.CREDIT,
          amount,
          balanceAfter: newBalance,
          reason: reasonCode,
          notes: JSON.stringify({
            idempotencyKey,
            actor,
            metadata,
          }),
          adminId: actor.type === TOKEN_ACTOR_TYPES.ADMIN ? actor.id : null,
        })
        .returning();

      return {
        balance: newBalance,
        transactionId: transaction.id,
        isNew,
      };
    });
  }

  /**
   * Debit tokens from a user account
   * 
   * @param {string} userId - User ID
   * @param {number} amount - Amount to debit (must be positive)
   * @param {Object} options
   * @param {string} options.reasonCode - Reason for debit (e.g., 'text_to_image', 'image_edit')
   * @param {string} [options.idempotencyKey] - Unique key to prevent duplicate debits
   * @param {Object} [options.actor] - Actor performing the operation
   * @param {Object} [options.metadata] - Additional metadata
   * 
   * @returns {Promise<{balance: number, transactionId: string}>}
   * @throws {Error} If insufficient balance or invalid amount
   */
  async debit(userId, amount, options = {}) {
    const {
      reasonCode,
      idempotencyKey = null,
      actor = { type: TOKEN_ACTOR_TYPES.SYSTEM },
      metadata = {},
    } = options;

    // Validation
    if (!userId) {
      throw new UserIdRequiredError();
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new InvalidAmountError(amount);
    }
    if (!reasonCode) {
      throw new ReasonCodeRequiredError();
    }

    // Check for duplicate idempotency key
    if (idempotencyKey) {
      const existing = await db
        .select()
        .from(tokenTransactions)
        .where(
          and(
            eq(tokenTransactions.userId, userId),
            sql`${tokenTransactions.notes} @> ${JSON.stringify({ idempotencyKey })}`
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Return existing transaction (idempotent)
        const userToken = await db
          .select()
          .from(userTokens)
          .where(eq(userTokens.userId, userId))
          .limit(1);

        return {
          balance: userToken[0]?.balance || 0,
          transactionId: existing[0].id,
          idempotent: true,
        };
      }
    }

    // Execute debit operation in transaction
    return await db.transaction(async (tx) => {
      // Get user tokens record with lock
      const userToken = await tx
        .select()
        .from(userTokens)
        .where(eq(userTokens.userId, userId))
        .for("update") // Row-level lock
        .limit(1);

      if (userToken.length === 0) {
        throw new AccountNotFoundError(userId);
      }

      const currentBalance = userToken[0].balance;

      // Check sufficient balance
      if (currentBalance < amount) {
        throw new InsufficientFundsError(amount, currentBalance);
      }

      const newBalance = currentBalance - amount;
      const newTotalSpent = userToken[0].totalSpent + amount;

      // Update balance
      await tx
        .update(userTokens)
        .set({
          balance: newBalance,
          totalSpent: newTotalSpent,
          updatedAt: new Date(),
        })
        .where(eq(userTokens.userId, userId));

      // Create transaction record
      const [transaction] = await tx
        .insert(tokenTransactions)
        .values({
          userId,
          type: TOKEN_TRANSACTION_TYPES.DEBIT,
          amount,
          balanceAfter: newBalance,
          reason: reasonCode,
          notes: JSON.stringify({
            idempotencyKey,
            actor,
            metadata,
          }),
          adminId: actor.type === TOKEN_ACTOR_TYPES.ADMIN ? actor.id : null,
        })
        .returning();

      return {
        balance: newBalance,
        transactionId: transaction.id,
      };
    });
  }

  /**
   * Get user's current token balance
   * 
   * @param {string} userId - User ID
   * @returns {Promise<{balance: number, totalEarned: number, totalSpent: number}>}
   */
  async getBalance(userId) {
    if (!userId) {
      throw new Error("USER_ID_REQUIRED");
    }

    const userToken = await db
      .select()
      .from(userTokens)
      .where(eq(userTokens.userId, userId))
      .limit(1);

    if (userToken.length === 0) {
      // User has no token account yet (return 0)
      return {
        balance: 0,
        totalEarned: 0,
        totalSpent: 0,
      };
    }

    return {
      balance: userToken[0].balance,
      totalEarned: userToken[0].totalEarned,
      totalSpent: userToken[0].totalSpent,
    };
  }

  /**
   * Get transaction history for a user with cursor-based pagination
   * 
   * @param {string} userId - User ID
   * @param {Object} options
   * @param {number} [options.limit=20] - Number of results per page (max 100)
   * @param {string} [options.cursor] - Cursor for pagination (transaction ID)
   * @param {string} [options.type] - Filter by type ('credit' or 'debit')
   * @param {string} [options.reason] - Filter by reason code
   * 
   * @returns {Promise<{items: Array, nextCursor: string|null, hasMore: boolean}>}
   */
  async getHistory(userId, options = {}) {
    const { limit = TOKEN_PAGINATION.DEFAULT_LIMIT, cursor = null, type = null, reason = null } = options;

    if (!userId) {
      throw new Error("USER_ID_REQUIRED");
    }

    // Validate and cap limit
    const effectiveLimit = Math.min(Math.max(TOKEN_PAGINATION.MIN_LIMIT, limit), TOKEN_PAGINATION.MAX_LIMIT);

    // Build query conditions
    const conditions = [eq(tokenTransactions.userId, userId)];

    if (cursor) {
      // Cursor pagination: get records before this cursor
      conditions.push(lt(tokenTransactions.createdAt, cursor));
    }

    if (type) {
      conditions.push(eq(tokenTransactions.type, type));
    }

    if (reason) {
      conditions.push(eq(tokenTransactions.reason, reason));
    }

    // Fetch one extra to determine if there are more results
    const results = await db
      .select()
      .from(tokenTransactions)
      .where(and(...conditions))
      .orderBy(desc(tokenTransactions.createdAt), desc(tokenTransactions.id))
      .limit(effectiveLimit + 1);

    const hasMore = results.length > effectiveLimit;
    const items = hasMore ? results.slice(0, effectiveLimit) : results;

    // Parse notes JSON
    const formattedItems = items.map((item) => {
      let parsedNotes = {};
      try {
        parsedNotes = item.notes ? JSON.parse(item.notes) : {};
      } catch (e) {
        // Keep as empty object if parsing fails
      }

      return {
        id: item.id,
        type: item.type,
        amount: item.amount,
        balanceAfter: item.balanceAfter,
        reason: item.reason,
        referenceType: item.referenceType,
        referenceId: item.referenceId,
        actor: parsedNotes.actor || null,
        metadata: parsedNotes.metadata || {},
        createdAt: item.createdAt,
      };
    });

    return {
      items: formattedItems,
      nextCursor: hasMore ? items[items.length - 1].createdAt : null,
      hasMore,
    };
  }

  /**
   * Validate if user has sufficient balance for an operation
   * 
   * @param {string} userId - User ID
   * @param {number} requiredAmount - Amount needed
   * @returns {Promise<boolean>}
   */
  async hassufficientBalance(userId, requiredAmount) {
    const { balance } = await this.getBalance(userId);
    return balance >= requiredAmount;
  }
}

export default new TokenService();

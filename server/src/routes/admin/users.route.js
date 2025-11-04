import express from "express";
import { asyncHandler } from "../../middlewares/errorHandler.js";
import { verifyToken } from "../../middlewares/tokenHandler.js";
import { requireAdmin } from "../../middlewares/admin.middleware.js";
import {
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
} from "../../controllers/admin/users.controller.js";

const router = express.Router();

// Apply authentication and admin middleware to all routes
router.use(verifyToken);
router.use(requireAdmin);

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: List all users (Admin only)
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by username or email
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin, mod, warehouse, owner]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, username, email, updatedAt]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Users list retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get("/", asyncHandler(listUsers));

/**
 * @swagger
 * /admin/users/{userId}:
 *   get:
 *     summary: Get user details with token balance (Admin only)
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *       404:
 *         description: User not found
 */
router.get("/:userId", asyncHandler(getUserDetails));

/**
 * @swagger
 * /admin/users:
 *   post:
 *     summary: Create new user (Admin only)
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 default: user
 *               status:
 *                 type: string
 *                 default: active
 *               initialTokens:
 *                 type: integer
 *                 default: 0
 *                 minimum: 0
 *                 maximum: 10000
 *     responses:
 *       201:
 *         description: User created successfully
 *       409:
 *         description: Username or email already exists
 */
router.post("/", asyncHandler(createUser));

/**
 * @swagger
 * /admin/users/{userId}:
 *   put:
 *     summary: Update user profile (Admin only)
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 *       404:
 *         description: User not found
 */
router.put("/:userId", asyncHandler(updateUser));

/**
 * @swagger
 * /admin/users/{userId}/status:
 *   patch:
 *     summary: Update user status (Admin only)
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       404:
 *         description: User not found
 */
router.patch("/:userId/status", asyncHandler(updateUserStatus));

/**
 * @swagger
 * /admin/users/{userId}:
 *   delete:
 *     summary: Delete user (Admin only)
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: permanent
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 */
router.delete("/:userId", asyncHandler(deleteUser));

/**
 * @swagger
 * /admin/users/{userId}/tokens/balance:
 *   get:
 *     summary: Get user token balance (Admin only)
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Token balance retrieved successfully
 */
router.get("/:userId/tokens/balance", asyncHandler(getUserTokenBalance));

/**
 * @swagger
 * /admin/users/{userId}/tokens/history:
 *   get:
 *     summary: Get user transaction history (Admin only)
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [credit, debit]
 *       - in: query
 *         name: reason
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transaction history retrieved successfully
 */
router.get("/:userId/tokens/history", asyncHandler(getUserTokenHistory));

/**
 * @swagger
 * /admin/users/{userId}/tokens/credit:
 *   post:
 *     summary: Credit tokens to user (Admin only)
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 1000000
 *               reason:
 *                 type: string
 *                 default: admin_topup
 *               notes:
 *                 type: string
 *               idempotencyKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tokens credited successfully
 */
router.post("/:userId/tokens/credit", asyncHandler(creditTokens));

/**
 * @swagger
 * /admin/users/{userId}/tokens/debit:
 *   post:
 *     summary: Debit tokens from user (Admin only)
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 1000000
 *               reason:
 *                 type: string
 *                 default: admin_correction
 *               notes:
 *                 type: string
 *               idempotencyKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tokens debited successfully
 *       402:
 *         description: Insufficient balance
 */
router.post("/:userId/tokens/debit", asyncHandler(debitTokens));

export default router;

import express from 'express';
import {
  getAllHints,
  getHintById,
  getHintsByType,
  createHint,
  updateHint,
  deleteHint,
  addTemplateToHint,
  removeTemplateFromHint,
  toggleHintActive,
} from '../controllers/hint.controller.js';
import { verifyToken } from '../middlewares/tokenHandler.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = express.Router();

/**
 * @swagger
 * /api/hints:
 *   get:
 *     tags: [Hints]
 *     summary: Get all hints
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by hint type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name
 *     responses:
 *       200:
 *         description: List of hints
 */
router.get('/', asyncHandler(getAllHints));

/**
 * @swagger
 * /api/hints/type/{type}:
 *   get:
 *     tags: [Hints]
 *     summary: Get hints by type
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of hints
 */
router.get('/type/:type', asyncHandler(getHintsByType));

/**
 * @swagger
 * /api/hints/{id}:
 *   get:
 *     tags: [Hints]
 *     summary: Get hint by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: includeTemplates
 *         schema:
 *           type: boolean
 *         description: Include prompt templates in response
 *     responses:
 *       200:
 *         description: Hint details
 */
router.get('/:id', asyncHandler(getHintById));

/**
 * @swagger
 * /api/hints:
 *   post:
 *     tags: [Hints]
 *     summary: Create new hint
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *               description:
 *                 type: string
 *               promptTemplateIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Hint created successfully
 */
router.post('/', verifyToken, asyncHandler(createHint));

/**
 * @swagger
 * /api/hints/{id}:
 *   put:
 *     tags: [Hints]
 *     summary: Update hint
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *               description:
 *                 type: string
 *               promptTemplateIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Hint updated successfully
 */
router.put('/:id', verifyToken, asyncHandler(updateHint));

/**
 * @swagger
 * /api/hints/{id}:
 *   delete:
 *     tags: [Hints]
 *     summary: Delete hint
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Hint deleted successfully
 */
router.delete('/:id', verifyToken, asyncHandler(deleteHint));

/**
 * @swagger
 * /api/hints/{id}/templates:
 *   post:
 *     tags: [Hints]
 *     summary: Add template to hint
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - templateId
 *             properties:
 *               templateId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Template added successfully
 */
router.post('/:id/templates', verifyToken, asyncHandler(addTemplateToHint));

/**
 * @swagger
 * /api/hints/{id}/templates/{templateId}:
 *   delete:
 *     tags: [Hints]
 *     summary: Remove template from hint
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template removed successfully
 */
router.delete('/:id/templates/:templateId', verifyToken, asyncHandler(removeTemplateFromHint));

/**
 * @swagger
 * /api/hints/{id}/toggle:
 *   patch:
 *     tags: [Hints]
 *     summary: Toggle hint active status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Status toggled successfully
 */
router.patch('/:id/toggle', verifyToken, asyncHandler(toggleHintActive));

export default router;

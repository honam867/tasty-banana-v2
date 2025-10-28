import express from 'express';
import {
  getAllStyles,
  getStyleById,
  createStyle,
  updateStyle,
  deleteStyle,
  addTemplateToStyle,
  removeTemplateFromStyle,
  toggleStyleActive,
} from '../controllers/styleLibrary.controller.js';
import { verifyToken } from '../middlewares/tokenHandler.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = express.Router();

/**
 * @swagger
 * /api/style-library:
 *   get:
 *     tags: [Style Library]
 *     summary: Get all style libraries
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name
 *     responses:
 *       200:
 *         description: List of style libraries
 */
router.get('/', asyncHandler(getAllStyles));

/**
 * @swagger
 * /api/style-library/{id}:
 *   get:
 *     tags: [Style Library]
 *     summary: Get style library by ID
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
 *         description: Style library details
 */
router.get('/:id', asyncHandler(getStyleById));

/**
 * @swagger
 * /api/style-library:
 *   post:
 *     tags: [Style Library]
 *     summary: Create new style library
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
 *             properties:
 *               name:
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
 *         description: Style library created successfully
 */
router.post('/', verifyToken, asyncHandler(createStyle));

/**
 * @swagger
 * /api/style-library/{id}:
 *   put:
 *     tags: [Style Library]
 *     summary: Update style library
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
 *         description: Style library updated successfully
 */
router.put('/:id', verifyToken, asyncHandler(updateStyle));

/**
 * @swagger
 * /api/style-library/{id}:
 *   delete:
 *     tags: [Style Library]
 *     summary: Delete style library
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
 *         description: Style library deleted successfully
 */
router.delete('/:id', verifyToken, asyncHandler(deleteStyle));

/**
 * @swagger
 * /api/style-library/{id}/templates:
 *   post:
 *     tags: [Style Library]
 *     summary: Add template to style library
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
router.post('/:id/templates', verifyToken, asyncHandler(addTemplateToStyle));

/**
 * @swagger
 * /api/style-library/{id}/templates/{templateId}:
 *   delete:
 *     tags: [Style Library]
 *     summary: Remove template from style library
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
router.delete('/:id/templates/:templateId', verifyToken, asyncHandler(removeTemplateFromStyle));

/**
 * @swagger
 * /api/style-library/{id}/toggle:
 *   patch:
 *     tags: [Style Library]
 *     summary: Toggle style library active status
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
router.patch('/:id/toggle', verifyToken, asyncHandler(toggleStyleActive));

export default router;

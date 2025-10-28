import express from 'express';
import {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  toggleTemplateActive,
} from '../controllers/promptTemplate.controller.js';
import { verifyToken } from '../middlewares/tokenHandler.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = express.Router();

/**
 * @swagger
 * /api/prompt-templates:
 *   get:
 *     tags: [Prompt Templates]
 *     summary: Get all prompt templates
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
 *         description: List of prompt templates
 */
router.get('/', asyncHandler(getAllTemplates));

/**
 * @swagger
 * /api/prompt-templates/{id}:
 *   get:
 *     tags: [Prompt Templates]
 *     summary: Get prompt template by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Prompt template details
 */
router.get('/:id', asyncHandler(getTemplateById));

/**
 * @swagger
 * /api/prompt-templates:
 *   post:
 *     tags: [Prompt Templates]
 *     summary: Create new prompt template
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
 *               - prompt
 *             properties:
 *               name:
 *                 type: string
 *               prompt:
 *                 type: string
 *               previewUrl:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Template created successfully
 */
router.post('/', verifyToken, asyncHandler(createTemplate));

/**
 * @swagger
 * /api/prompt-templates/{id}:
 *   put:
 *     tags: [Prompt Templates]
 *     summary: Update prompt template
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
 *               prompt:
 *                 type: string
 *               previewUrl:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Template updated successfully
 */
router.put('/:id', verifyToken, asyncHandler(updateTemplate));

/**
 * @swagger
 * /api/prompt-templates/{id}:
 *   delete:
 *     tags: [Prompt Templates]
 *     summary: Delete prompt template
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
 *         description: Template deleted successfully
 */
router.delete('/:id', verifyToken, asyncHandler(deleteTemplate));

/**
 * @swagger
 * /api/prompt-templates/{id}/toggle:
 *   patch:
 *     tags: [Prompt Templates]
 *     summary: Toggle template active status
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
router.patch('/:id/toggle', verifyToken, asyncHandler(toggleTemplateActive));

export default router;

import lodash from 'lodash';
const { get } = lodash;

import { HTTP_STATUS } from '../utils/constant.js';
import { sendSuccess, throwError } from '../utils/response.js';
import PromptTemplateService from '../services/promptTemplate.service.js';
import logger from '../config/logger.js';

/**
 * GET /api/prompt-templates - Get all prompt templates
 */
export const getAllTemplates = async (req, res, next) => {
  try {
    const isActive = get(req.query, 'isActive');
    const search = get(req.query, 'search');

    const filters = {};
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }
    if (search) {
      filters.search = search;
    }

    const templates = await PromptTemplateService.getAll(filters);
    
    sendSuccess(res, templates, 'Prompt templates retrieved successfully');
  } catch (error) {
    logger.error('Get all templates error:', error);
    next(error);
  }
};

/**
 * GET /api/prompt-templates/:id - Get prompt template by ID
 */
export const getTemplateById = async (req, res, next) => {
  try {
    const id = get(req.params, 'id');

    if (!id) {
      throwError('Template ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    const template = await PromptTemplateService.getById(id);
    
    sendSuccess(res, template, 'Prompt template retrieved successfully');
  } catch (error) {
    logger.error('Get template by ID error:', error);
    next(error);
  }
};

/**
 * POST /api/prompt-templates - Create new prompt template
 */
export const createTemplate = async (req, res, next) => {
  try {
    const name = get(req.body, 'name');
    const prompt = get(req.body, 'prompt');
    const previewUrl = get(req.body, 'previewUrl');
    const isActive = get(req.body, 'isActive');

    if (!name) {
      throwError('Template name is required', HTTP_STATUS.BAD_REQUEST);
    }

    if (!prompt) {
      throwError('Template prompt is required', HTTP_STATUS.BAD_REQUEST);
    }

    const newTemplate = await PromptTemplateService.create({
      name,
      prompt,
      previewUrl,
      isActive,
    });

    logger.info(`Prompt template created: ${newTemplate.id}`);
    sendSuccess(res, newTemplate, 'Prompt template created successfully', HTTP_STATUS.CREATED);
  } catch (error) {
    logger.error('Create template error:', error);
    next(error);
  }
};

/**
 * PUT /api/prompt-templates/:id - Update prompt template
 */
export const updateTemplate = async (req, res, next) => {
  try {
    const id = get(req.params, 'id');
    const name = get(req.body, 'name');
    const prompt = get(req.body, 'prompt');
    const previewUrl = get(req.body, 'previewUrl');
    const isActive = get(req.body, 'isActive');

    if (!id) {
      throwError('Template ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (prompt !== undefined) updates.prompt = prompt;
    if (previewUrl !== undefined) updates.previewUrl = previewUrl;
    if (isActive !== undefined) updates.isActive = isActive;

    const updated = await PromptTemplateService.update(id, updates);

    logger.info(`Prompt template updated: ${id}`);
    sendSuccess(res, updated, 'Prompt template updated successfully');
  } catch (error) {
    logger.error('Update template error:', error);
    next(error);
  }
};

/**
 * DELETE /api/prompt-templates/:id - Delete prompt template
 */
export const deleteTemplate = async (req, res, next) => {
  try {
    const id = get(req.params, 'id');

    if (!id) {
      throwError('Template ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    await PromptTemplateService.delete(id);

    logger.info(`Prompt template deleted: ${id}`);
    sendSuccess(res, null, 'Prompt template deleted successfully');
  } catch (error) {
    logger.error('Delete template error:', error);
    next(error);
  }
};

/**
 * PATCH /api/prompt-templates/:id/toggle - Toggle template active status
 */
export const toggleTemplateActive = async (req, res, next) => {
  try {
    const id = get(req.params, 'id');

    if (!id) {
      throwError('Template ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    const updated = await PromptTemplateService.toggleActive(id);

    logger.info(`Prompt template active status toggled: ${id}`);
    sendSuccess(res, updated, 'Template status updated successfully');
  } catch (error) {
    logger.error('Toggle template active error:', error);
    next(error);
  }
};

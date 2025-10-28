import lodash from 'lodash';
const { get } = lodash;

import { HTTP_STATUS } from '../utils/constant.js';
import { sendSuccess, throwError } from '../utils/response.js';
import HintService from '../services/hint.service.js';
import logger from '../config/logger.js';

/**
 * GET /api/hints - Get all hints
 */
export const getAllHints = async (req, res, next) => {
  try {
    const isActive = get(req.query, 'isActive');
    const type = get(req.query, 'type');
    const search = get(req.query, 'search');

    const filters = {};
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }
    if (type) {
      filters.type = type;
    }
    if (search) {
      filters.search = search;
    }

    const hints = await HintService.getAll(filters);
    
    sendSuccess(res, hints, 'Hints retrieved successfully');
  } catch (error) {
    logger.error('Get all hints error:', error);
    next(error);
  }
};

/**
 * GET /api/hints/:id - Get hint by ID
 */
export const getHintById = async (req, res, next) => {
  try {
    const id = get(req.params, 'id');
    const includeTemplates = get(req.query, 'includeTemplates') === 'true';

    if (!id) {
      throwError('Hint ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    const hint = await HintService.getById(id, includeTemplates);
    
    sendSuccess(res, hint, 'Hint retrieved successfully');
  } catch (error) {
    logger.error('Get hint by ID error:', error);
    next(error);
  }
};

/**
 * GET /api/hints/type/:type - Get hints by type
 */
export const getHintsByType = async (req, res, next) => {
  try {
    const type = get(req.params, 'type');

    if (!type) {
      throwError('Hint type is required', HTTP_STATUS.BAD_REQUEST);
    }

    const hints = await HintService.getByType(type);
    
    sendSuccess(res, hints, 'Hints retrieved successfully');
  } catch (error) {
    logger.error('Get hints by type error:', error);
    next(error);
  }
};

/**
 * POST /api/hints - Create new hint
 */
export const createHint = async (req, res, next) => {
  try {
    const name = get(req.body, 'name');
    const type = get(req.body, 'type');
    const description = get(req.body, 'description');
    const promptTemplateIds = get(req.body, 'promptTemplateIds');
    const isActive = get(req.body, 'isActive');

    if (!name) {
      throwError('Hint name is required', HTTP_STATUS.BAD_REQUEST);
    }

    if (!type) {
      throwError('Hint type is required', HTTP_STATUS.BAD_REQUEST);
    }

    const newHint = await HintService.create({
      name,
      type,
      description,
      promptTemplateIds,
      isActive,
    });

    logger.info(`Hint created: ${newHint.id}`);
    sendSuccess(res, newHint, 'Hint created successfully', HTTP_STATUS.CREATED);
  } catch (error) {
    logger.error('Create hint error:', error);
    next(error);
  }
};

/**
 * PUT /api/hints/:id - Update hint
 */
export const updateHint = async (req, res, next) => {
  try {
    const id = get(req.params, 'id');
    const name = get(req.body, 'name');
    const type = get(req.body, 'type');
    const description = get(req.body, 'description');
    const promptTemplateIds = get(req.body, 'promptTemplateIds');
    const isActive = get(req.body, 'isActive');

    if (!id) {
      throwError('Hint ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (description !== undefined) updates.description = description;
    if (promptTemplateIds !== undefined) updates.promptTemplateIds = promptTemplateIds;
    if (isActive !== undefined) updates.isActive = isActive;

    const updated = await HintService.update(id, updates);

    logger.info(`Hint updated: ${id}`);
    sendSuccess(res, updated, 'Hint updated successfully');
  } catch (error) {
    logger.error('Update hint error:', error);
    next(error);
  }
};

/**
 * DELETE /api/hints/:id - Delete hint
 */
export const deleteHint = async (req, res, next) => {
  try {
    const id = get(req.params, 'id');

    if (!id) {
      throwError('Hint ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    await HintService.delete(id);

    logger.info(`Hint deleted: ${id}`);
    sendSuccess(res, null, 'Hint deleted successfully');
  } catch (error) {
    logger.error('Delete hint error:', error);
    next(error);
  }
};

/**
 * POST /api/hints/:id/templates - Add template to hint
 */
export const addTemplateToHint = async (req, res, next) => {
  try {
    const id = get(req.params, 'id');
    const templateId = get(req.body, 'templateId');

    if (!id) {
      throwError('Hint ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    if (!templateId) {
      throwError('Template ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    const updated = await HintService.addTemplate(id, templateId);

    logger.info(`Template ${templateId} added to hint ${id}`);
    sendSuccess(res, updated, 'Template added to hint successfully');
  } catch (error) {
    logger.error('Add template to hint error:', error);
    next(error);
  }
};

/**
 * DELETE /api/hints/:id/templates/:templateId - Remove template from hint
 */
export const removeTemplateFromHint = async (req, res, next) => {
  try {
    const id = get(req.params, 'id');
    const templateId = get(req.params, 'templateId');

    if (!id) {
      throwError('Hint ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    if (!templateId) {
      throwError('Template ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    const updated = await HintService.removeTemplate(id, templateId);

    logger.info(`Template ${templateId} removed from hint ${id}`);
    sendSuccess(res, updated, 'Template removed from hint successfully');
  } catch (error) {
    logger.error('Remove template from hint error:', error);
    next(error);
  }
};

/**
 * PATCH /api/hints/:id/toggle - Toggle hint active status
 */
export const toggleHintActive = async (req, res, next) => {
  try {
    const id = get(req.params, 'id');

    if (!id) {
      throwError('Hint ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    const updated = await HintService.toggleActive(id);

    logger.info(`Hint active status toggled: ${id}`);
    sendSuccess(res, updated, 'Hint status updated successfully');
  } catch (error) {
    logger.error('Toggle hint active error:', error);
    next(error);
  }
};

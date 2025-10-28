import lodash from 'lodash';
const { get } = lodash;

import { HTTP_STATUS } from '../utils/constant.js';
import { sendSuccess, throwError } from '../utils/response.js';
import StyleLibraryService from '../services/styleLibrary.service.js';
import logger from '../config/logger.js';

/**
 * GET /api/style-library - Get all style libraries
 */
export const getAllStyles = async (req, res, next) => {
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

    const styles = await StyleLibraryService.getAll(filters);
    
    sendSuccess(res, styles, 'Style libraries retrieved successfully');
  } catch (error) {
    logger.error('Get all styles error:', error);
    next(error);
  }
};

/**
 * GET /api/style-library/:id - Get style library by ID
 */
export const getStyleById = async (req, res, next) => {
  try {
    const id = get(req.params, 'id');
    const includeTemplates = get(req.query, 'includeTemplates') === 'true';

    if (!id) {
      throwError('Style ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    const style = await StyleLibraryService.getById(id, includeTemplates);
    
    sendSuccess(res, style, 'Style library retrieved successfully');
  } catch (error) {
    logger.error('Get style by ID error:', error);
    next(error);
  }
};

/**
 * POST /api/style-library - Create new style library
 */
export const createStyle = async (req, res, next) => {
  try {
    const name = get(req.body, 'name');
    const description = get(req.body, 'description');
    const promptTemplateIds = get(req.body, 'promptTemplateIds');
    const isActive = get(req.body, 'isActive');

    if (!name) {
      throwError('Style name is required', HTTP_STATUS.BAD_REQUEST);
    }

    const newStyle = await StyleLibraryService.create({
      name,
      description,
      promptTemplateIds,
      isActive,
    });

    logger.info(`Style library created: ${newStyle.id}`);
    sendSuccess(res, newStyle, 'Style library created successfully', HTTP_STATUS.CREATED);
  } catch (error) {
    logger.error('Create style error:', error);
    next(error);
  }
};

/**
 * PUT /api/style-library/:id - Update style library
 */
export const updateStyle = async (req, res, next) => {
  try {
    const id = get(req.params, 'id');
    const name = get(req.body, 'name');
    const description = get(req.body, 'description');
    const promptTemplateIds = get(req.body, 'promptTemplateIds');
    const isActive = get(req.body, 'isActive');

    if (!id) {
      throwError('Style ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (promptTemplateIds !== undefined) updates.promptTemplateIds = promptTemplateIds;
    if (isActive !== undefined) updates.isActive = isActive;

    const updated = await StyleLibraryService.update(id, updates);

    logger.info(`Style library updated: ${id}`);
    sendSuccess(res, updated, 'Style library updated successfully');
  } catch (error) {
    logger.error('Update style error:', error);
    next(error);
  }
};

/**
 * DELETE /api/style-library/:id - Delete style library
 */
export const deleteStyle = async (req, res, next) => {
  try {
    const id = get(req.params, 'id');

    if (!id) {
      throwError('Style ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    await StyleLibraryService.delete(id);

    logger.info(`Style library deleted: ${id}`);
    sendSuccess(res, null, 'Style library deleted successfully');
  } catch (error) {
    logger.error('Delete style error:', error);
    next(error);
  }
};

/**
 * POST /api/style-library/:id/templates - Add template to style library
 */
export const addTemplateToStyle = async (req, res, next) => {
  try {
    const id = get(req.params, 'id');
    const templateId = get(req.body, 'templateId');

    if (!id) {
      throwError('Style ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    if (!templateId) {
      throwError('Template ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    const updated = await StyleLibraryService.addTemplate(id, templateId);

    logger.info(`Template ${templateId} added to style ${id}`);
    sendSuccess(res, updated, 'Template added to style successfully');
  } catch (error) {
    logger.error('Add template to style error:', error);
    next(error);
  }
};

/**
 * DELETE /api/style-library/:id/templates/:templateId - Remove template from style
 */
export const removeTemplateFromStyle = async (req, res, next) => {
  try {
    const id = get(req.params, 'id');
    const templateId = get(req.params, 'templateId');

    if (!id) {
      throwError('Style ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    if (!templateId) {
      throwError('Template ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    const updated = await StyleLibraryService.removeTemplate(id, templateId);

    logger.info(`Template ${templateId} removed from style ${id}`);
    sendSuccess(res, updated, 'Template removed from style successfully');
  } catch (error) {
    logger.error('Remove template from style error:', error);
    next(error);
  }
};

/**
 * PATCH /api/style-library/:id/toggle - Toggle style active status
 */
export const toggleStyleActive = async (req, res, next) => {
  try {
    const id = get(req.params, 'id');

    if (!id) {
      throwError('Style ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    const updated = await StyleLibraryService.toggleActive(id);

    logger.info(`Style library active status toggled: ${id}`);
    sendSuccess(res, updated, 'Style status updated successfully');
  } catch (error) {
    logger.error('Toggle style active error:', error);
    next(error);
  }
};

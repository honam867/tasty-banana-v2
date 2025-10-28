import { db } from '../db/drizzle.js';
import { styleLibrary, promptTemplates } from '../db/schema.js';
import { eq, desc, ilike, and, inArray } from 'drizzle-orm';
import logger from '../config/logger.js';

class StyleLibraryService {
  /**
   * Get all style libraries with optional filters
   */
  async getAll(filters = {}) {
    const { isActive, search } = filters;

    let conditions = [];
    if (isActive !== undefined) {
      conditions.push(eq(styleLibrary.isActive, isActive));
    }
    if (search) {
      conditions.push(ilike(styleLibrary.name, `%${search}%`));
    }

    const query = db
      .select()
      .from(styleLibrary)
      .orderBy(desc(styleLibrary.createdAt));

    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }

    return await query;
  }

  /**
   * Get style library by ID with populated prompt templates
   */
  async getById(id, includeTemplates = false) {
    const [style] = await db
      .select()
      .from(styleLibrary)
      .where(eq(styleLibrary.id, id))
      .limit(1);

    if (!style) {
      throw new Error('Style library not found');
    }

    if (includeTemplates && style.promptTemplateIds?.length > 0) {
      const templates = await db
        .select()
        .from(promptTemplates)
        .where(inArray(promptTemplates.id, style.promptTemplateIds));

      return {
        ...style,
        templates,
      };
    }

    return style;
  }

  /**
   * Create new style library
   */
  async create(data) {
    const [newStyle] = await db
      .insert(styleLibrary)
      .values({
        name: data.name,
        description: data.description || null,
        promptTemplateIds: data.promptTemplateIds || [],
        isActive: data.isActive !== undefined ? data.isActive : true,
      })
      .returning();

    logger.info(`Style library created: ${newStyle.id}`);
    return newStyle;
  }

  /**
   * Update style library
   */
  async update(id, data) {
    const [updated] = await db
      .update(styleLibrary)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(styleLibrary.id, id))
      .returning();

    if (!updated) {
      throw new Error('Style library not found');
    }

    logger.info(`Style library updated: ${id}`);
    return updated;
  }

  /**
   * Delete style library
   */
  async delete(id) {
    const [deleted] = await db
      .delete(styleLibrary)
      .where(eq(styleLibrary.id, id))
      .returning();

    if (!deleted) {
      throw new Error('Style library not found');
    }

    logger.info(`Style library deleted: ${id}`);
    return deleted;
  }

  /**
   * Add prompt template to style library
   */
  async addTemplate(styleId, templateId) {
    const style = await this.getById(styleId);
    const templateIds = style.promptTemplateIds || [];

    if (templateIds.includes(templateId)) {
      throw new Error('Template already exists in this style library');
    }

    return await this.update(styleId, {
      promptTemplateIds: [...templateIds, templateId],
    });
  }

  /**
   * Remove prompt template from style library
   */
  async removeTemplate(styleId, templateId) {
    const style = await this.getById(styleId);
    const templateIds = style.promptTemplateIds || [];

    return await this.update(styleId, {
      promptTemplateIds: templateIds.filter((id) => id !== templateId),
    });
  }

  /**
   * Toggle active status
   */
  async toggleActive(id) {
    const style = await this.getById(id);
    return await this.update(id, { isActive: !style.isActive });
  }
}

export default new StyleLibraryService();

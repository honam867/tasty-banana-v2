import { db } from '../db/drizzle.js';
import { promptTemplates } from '../db/schema.js';
import { eq, desc, ilike, and } from 'drizzle-orm';
import logger from '../config/logger.js';

class PromptTemplateService {
  /**
   * Get all prompt templates with optional filters
   */
  async getAll(filters = {}) {
    const { isActive, search } = filters;

    let conditions = [];
    if (isActive !== undefined) {
      conditions.push(eq(promptTemplates.isActive, isActive));
    }
    if (search) {
      conditions.push(ilike(promptTemplates.name, `%${search}%`));
    }

    const query = db
      .select()
      .from(promptTemplates)
      .orderBy(desc(promptTemplates.createdAt));

    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }

    return await query;
  }

  /**
   * Get prompt template by ID
   */
  async getById(id) {
    const [template] = await db
      .select()
      .from(promptTemplates)
      .where(eq(promptTemplates.id, id))
      .limit(1);

    if (!template) {
      throw new Error('Prompt template not found');
    }

    return template;
  }

  /**
   * Create new prompt template
   */
  async create(data) {
    const [newTemplate] = await db
      .insert(promptTemplates)
      .values({
        name: data.name,
        prompt: data.prompt,
        previewUrl: data.previewUrl || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      })
      .returning();

    logger.info(`Prompt template created: ${newTemplate.id}`);
    return newTemplate;
  }

  /**
   * Update prompt template
   */
  async update(id, data) {
    const [updated] = await db
      .update(promptTemplates)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(promptTemplates.id, id))
      .returning();

    if (!updated) {
      throw new Error('Prompt template not found');
    }

    logger.info(`Prompt template updated: ${id}`);
    return updated;
  }

  /**
   * Delete prompt template
   */
  async delete(id) {
    const [deleted] = await db
      .delete(promptTemplates)
      .where(eq(promptTemplates.id, id))
      .returning();

    if (!deleted) {
      throw new Error('Prompt template not found');
    }

    logger.info(`Prompt template deleted: ${id}`);
    return deleted;
  }

  /**
   * Toggle active status
   */
  async toggleActive(id) {
    const template = await this.getById(id);
    return await this.update(id, { isActive: !template.isActive });
  }
}

export default new PromptTemplateService();

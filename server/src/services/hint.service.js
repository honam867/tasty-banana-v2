import { db } from '../db/drizzle.js';
import { hints, promptTemplates } from '../db/schema.js';
import { eq, desc, ilike, and, inArray } from 'drizzle-orm';
import logger from '../config/logger.js';

class HintService {
  /**
   * Get all hints with optional filters
   */
  async getAll(filters = {}) {
    const { isActive, type, search } = filters;

    let conditions = [];
    if (isActive !== undefined) {
      conditions.push(eq(hints.isActive, isActive));
    }
    if (type) {
      conditions.push(eq(hints.type, type));
    }
    if (search) {
      conditions.push(ilike(hints.name, `%${search}%`));
    }

    const query = db.select().from(hints).orderBy(desc(hints.createdAt));

    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }

    return await query;
  }

  /**
   * Get hint by ID with populated prompt templates
   */
  async getById(id, includeTemplates = false) {
    const [hint] = await db
      .select()
      .from(hints)
      .where(eq(hints.id, id))
      .limit(1);

    if (!hint) {
      throw new Error('Hint not found');
    }

    if (includeTemplates && hint.promptTemplateIds?.length > 0) {
      const templates = await db
        .select()
        .from(promptTemplates)
        .where(inArray(promptTemplates.id, hint.promptTemplateIds));

      return {
        ...hint,
        templates,
      };
    }

    return hint;
  }

  /**
   * Get hints by type
   */
  async getByType(type) {
    return await db
      .select()
      .from(hints)
      .where(and(eq(hints.type, type), eq(hints.isActive, true)))
      .orderBy(desc(hints.createdAt));
  }

  /**
   * Create new hint
   */
  async create(data) {
    const [newHint] = await db
      .insert(hints)
      .values({
        name: data.name,
        type: data.type,
        description: data.description || null,
        promptTemplateIds: data.promptTemplateIds || [],
        isActive: data.isActive !== undefined ? data.isActive : true,
      })
      .returning();

    logger.info(`Hint created: ${newHint.id}`);
    return newHint;
  }

  /**
   * Update hint
   */
  async update(id, data) {
    const [updated] = await db
      .update(hints)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(hints.id, id))
      .returning();

    if (!updated) {
      throw new Error('Hint not found');
    }

    logger.info(`Hint updated: ${id}`);
    return updated;
  }

  /**
   * Delete hint
   */
  async delete(id) {
    const [deleted] = await db
      .delete(hints)
      .where(eq(hints.id, id))
      .returning();

    if (!deleted) {
      throw new Error('Hint not found');
    }

    logger.info(`Hint deleted: ${id}`);
    return deleted;
  }

  /**
   * Add prompt template to hint
   */
  async addTemplate(hintId, templateId) {
    const hint = await this.getById(hintId);
    const templateIds = hint.promptTemplateIds || [];

    if (templateIds.includes(templateId)) {
      throw new Error('Template already exists in this hint');
    }

    return await this.update(hintId, {
      promptTemplateIds: [...templateIds, templateId],
    });
  }

  /**
   * Remove prompt template from hint
   */
  async removeTemplate(hintId, templateId) {
    const hint = await this.getById(hintId);
    const templateIds = hint.promptTemplateIds || [];

    return await this.update(hintId, {
      promptTemplateIds: templateIds.filter((id) => id !== templateId),
    });
  }

  /**
   * Toggle active status
   */
  async toggleActive(id) {
    const hint = await this.getById(id);
    return await this.update(id, { isActive: !hint.isActive });
  }
}

export default new HintService();

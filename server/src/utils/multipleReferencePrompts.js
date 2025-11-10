/**
 * Multiple Reference Image Generation - Prompt Builder
 * Builds enhanced prompts for target + multiple reference image scenarios
 */

import PromptTemplateService from '../services/promptTemplate.service.js';
import logger from '../config/logger.js';

/**
 * Build enhanced prompt for multiple reference generation
 * Combines optional template + user prompt for optimal results
 * 
 * @param {string} userPrompt - User's custom prompt/instructions
 * @param {string} promptTemplateId - Optional: UUID of prompt template to use
 * @param {Object} options - Additional context (referenceCount, metadata)
 * @returns {Promise<string>} Enhanced prompt combining template + user input
 */
export const buildMultipleReferencePrompt = async (userPrompt, promptTemplateId, options = {}) => {
  try {
    const { referenceCount = 0 } = options;

    // If template ID provided, fetch and merge with user prompt
    if (promptTemplateId) {
      try {
        const template = await PromptTemplateService.getById(promptTemplateId);
        
        if (!template.isActive) {
          logger.warn(`Prompt template ${promptTemplateId} is inactive, using user prompt only`);
          return buildDefaultPrompt(userPrompt, referenceCount);
        }

        // Compose: System Template + User Prompt
        return `${template.prompt}\n\nUser Request: ${userPrompt}`;
      } catch (error) {
        logger.error(`Failed to fetch template ${promptTemplateId}:`, error.message);
        // Fallback to default prompt if template not found
        return buildDefaultPrompt(userPrompt, referenceCount);
      }
    }

    // No template provided, use default prompt structure
    return buildDefaultPrompt(userPrompt, referenceCount);
  } catch (error) {
    logger.error('Error building multiple reference prompt:', error);
    return userPrompt; // Ultimate fallback
  }
};

/**
 * Build default prompt structure for multiple reference generation
 * Used when no template is specified
 * 
 * @param {string} userPrompt - User's instructions
 * @param {number} referenceCount - Number of reference images
 * @returns {string} Structured prompt
 */
const buildDefaultPrompt = (userPrompt, referenceCount) => {
  const baseInstructions = `Transform the target subject by integrating elements from the ${referenceCount} reference image${referenceCount > 1 ? 's' : ''}.

Instructions:
- Keep the target's identity and main features intact
- Apply styling, accessories, clothing, or elements from reference images
- Maintain realistic proportions and lighting
- Ensure seamless integration of all elements
- Professional quality result with natural appearance
- Blend references harmoniously with the target

User Request: ${userPrompt}`;

  return baseInstructions;
};

/**
 * Get default templates for multiple reference scenarios
 * Returns pre-defined system prompts for common use cases
 * 
 * @param {string} scenario - Use case scenario name
 * @returns {string} Template prompt for scenario
 */
export const getDefaultTemplate = (scenario) => {
  const templates = {
    fashion_styling: `Transform the target model by applying fashion elements from the reference images.

Instructions:
- Preserve the model's identity, facial features, and body proportions
- Change clothing, accessories, or styling based on reference images
- Maintain realistic fit and proportions
- Professional fashion photography quality
- Natural lighting and realistic textures
- Seamless integration of all clothing and accessories`,

    product_customization: `Enhance the target product by adding features or elements from the reference images.

Instructions:
- Keep the main product structure and identity intact
- Add accessories, features, or design elements from references
- Maintain product quality and commercial appearance
- Professional product photography standards
- Realistic integration of all elements
- E-commerce ready quality`,

    scene_composition: `Combine the target subject with elements from reference images into a cohesive scene.

Instructions:
- Keep target subject as the main focus
- Integrate background, props, or elements from references
- Create natural, realistic composition
- Professional photography quality
- Consistent lighting and atmosphere across all elements
- Believable and attractive final result`,

    style_transfer: `Apply the aesthetic style from reference images to the target image.

Instructions:
- Maintain the target's structure and key features
- Transfer color palette, mood, and visual style from references
- Professional artistic quality
- Harmonious blend of styles
- Maintain clarity and recognition of target
- Commercial-quality result`,

    accessory_addition: `Add accessories or complementary items from reference images to the target.

Instructions:
- Preserve the target subject completely
- Add accessories, items, or elements from references naturally
- Realistic placement and proportions
- Professional quality integration
- Natural lighting and shadows
- Commercially appealing result`
  };

  return templates[scenario] || templates.scene_composition;
};

/**
 * Validate and sanitize user prompt
 * 
 * @param {string} prompt - Raw user prompt
 * @returns {string} Sanitized prompt
 */
export const sanitizePrompt = (prompt) => {
  if (!prompt || typeof prompt !== 'string') {
    return '';
  }

  // Remove script tags and dangerous content (XSS protection)
  let sanitized = prompt
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .trim();

  return sanitized;
};

export default {
  buildMultipleReferencePrompt,
  getDefaultTemplate,
  sanitizePrompt
};

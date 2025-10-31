/**
 * Image Reference Prompt Generation Utility
 * Generates enhanced prompts based on reference type
 */

/**
 * Generate prompt for image reference based on type
 * @param {string} userPrompt - User's base prompt
 * @param {string} referenceType - 'subject', 'face', or 'full_image'
 * @returns {string} Enhanced AI prompt
 */
export const generateReferencePrompt = (userPrompt, referenceType) => {
  const prompts = {
    subject: `${userPrompt}

Focus only on the main subject/object from the reference image.
Extract and replicate:
- Subject's key characteristics and features
- Form, shape, and proportions
- Colors and textures
- Important details and attributes

Create a new image maintaining the subject's identity while following the prompt.
Professional quality, clear focus on the subject.`,

    face: `${userPrompt}

Focus specifically on the face from the reference image.
Preserve and replicate:
- Facial structure and features
- Eyes, nose, mouth proportions
- Skin tone and complexion
- Hair style and color
- Facial expression characteristics

Generate a new image maintaining facial identity while following the prompt.
High-quality portrait, clear facial details.`,

    full_image: `${userPrompt}

Analyze the entire reference image comprehensively.
Consider and replicate:
- Overall composition and layout
- Color palette and harmony
- Lighting and mood
- Style and aesthetic
- Background elements and context
- Spatial relationships

Create a new image that captures the complete essence while following the prompt.
Professional quality, cohesive composition.`
  };

  return prompts[referenceType] || prompts.full_image;
};

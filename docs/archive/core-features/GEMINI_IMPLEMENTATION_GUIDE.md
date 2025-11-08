# Gemini Flash 2.5 Image - Implementation Guide for E-commerce MVP

## Overview
This guide shows how to implement AI image generation and editing for e-commerce using **Gemini Flash 2.5 Image (Nano Banana)** - the REAL way it works based on official API documentation.

---

## Key Concept: Everything is Prompt-Based

**Critical Understanding:**
- Gemini doesn't have separate functions for "remove background", "flip", or "upscale"
- It's a **conversational AI model** that understands natural language
- You give it an image + text prompt, and it generates a new image
- The magic is in **prompt engineering**

---

## Core Implementation

### 1. Text-to-Image Generation (100 tokens)

```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });

async function generateProductImage(userPrompt) {
  // Enhance user prompt for product photography
  const enhancedPrompt = `
    ${userPrompt}
    
    Professional product photography, high quality, sharp focus,
    clean composition, well-lit, commercial-grade image.
    White or neutral background. Show product clearly.
  `.trim();

  const result = await model.generateContent({
    contents: [{ parts: [{ text: enhancedPrompt }] }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
    }
  });

  // Extract image from response
  for (const part of result.response.candidates[0].content.parts) {
    if (part.inlineData) {
      return {
        imageData: part.inlineData.data, // base64
        mimeType: part.inlineData.mimeType
      };
    }
  }
}

// Usage
const result = await generateProductImage(
  'A sleek wireless headphone in matte black on a modern desk setup'
);
```

---

### 2. Simple Image Editing (100 tokens)

**Examples:** Remove background, change colors, flip, rotate

```javascript
import fs from 'fs';

async function editImage(imagePath, editInstruction) {
  // Read image file
  const imageData = fs.readFileSync(imagePath);
  const base64Image = imageData.toString('base64');

  const result = await model.generateContent({
    contents: [{
      parts: [
        { text: editInstruction },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image
          }
        }
      ]
    }]
  });

  // Extract edited image
  for (const part of result.response.candidates[0].content.parts) {
    if (part.inlineData) {
      return {
        imageData: part.inlineData.data,
        mimeType: part.inlineData.mimeType
      };
    }
  }
}

// Usage Examples:

// Remove background
await editImage(
  './product.jpg',
  'Remove the background from this product image. Make it pure white or transparent. Keep the product sharp with clean edges.'
);

// Flip horizontally
await editImage(
  './ring-left-hand.jpg',
  'Flip this image horizontally. The ring is on the left hand, move it to the right hand. Mirror the image perfectly.'
);

// Change color
await editImage(
  './shirt.jpg',
  'Change the color of this shirt from blue to red. Keep everything else the same. Maintain the texture and lighting.'
);

// Rotate product
await editImage(
  './product-front.jpg',
  'Show this product from a 45-degree angle instead of straight on. Rotate it to show more depth and dimension.'
);
```

---

### 3. Complex Image Editing (150 tokens)

**Examples:** Multiple edits at once

```javascript
async function complexEdit(imagePath, complexInstruction) {
  const imageData = fs.readFileSync(imagePath);
  const base64Image = imageData.toString('base64');

  const result = await model.generateContent({
    contents: [{
      parts: [
        { text: complexInstruction },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image
          }
        }
      ]
    }],
    generationConfig: {
      temperature: 0.6, // Slightly lower for more control
      topK: 35,
      topP: 0.92,
    }
  });

  return extractImage(result);
}

// Usage Examples:

// Background + Flip
await complexEdit(
  './product.jpg',
  `Remove the current background and replace it with a modern white studio setting with soft shadows. 
   Also flip the product horizontally so it faces the other direction.
   Keep the product sharp and well-lit.`
);

// Complete transformation
await complexEdit(
  './product-messy.jpg',
  `Clean up this product image:
   1. Remove the cluttered background and use pure white
   2. Adjust the lighting to be brighter and more even
   3. Center the product in the frame
   4. Add a subtle shadow underneath for depth
   Professional product photography quality.`
);
```

---

### 4. Multi-Image Composition (200 tokens)

**Combine multiple products in one scene**

```javascript
async function composeImages(imagePaths, compositionPrompt) {
  // Read multiple images
  const imageParts = imagePaths.map(path => {
    const imageData = fs.readFileSync(path);
    return {
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageData.toString('base64')
      }
    };
  });

  const result = await model.generateContent({
    contents: [{
      parts: [
        { text: compositionPrompt },
        ...imageParts
      ]
    }]
  });

  return extractImage(result);
}

// Usage:
await composeImages(
  ['./product1.jpg', './product2.jpg'],
  `Combine these two products into a single lifestyle scene.
   Place them on a modern wooden desk with natural lighting.
   Show them as if they're being used together.
   Professional product photography, clean composition.`
);
```

---

### 5. Style Transfer (150 tokens)

**Apply style from one image to another**

```javascript
async function transferStyle(contentImagePath, styleImagePath) {
  const contentImage = fs.readFileSync(contentImagePath).toString('base64');
  const styleImage = fs.readFileSync(styleImagePath).toString('base64');

  const result = await model.generateContent({
    contents: [{
      parts: [
        {
          text: `Apply the artistic style and aesthetic from the second image to the first image.
                 Keep the subject and composition of the first image, but adopt the visual style,
                 color palette, lighting, and mood of the second image.
                 Maintain the product clearly visible and recognizable.`
        },
        { inlineData: { mimeType: 'image/jpeg', data: contentImage } },
        { inlineData: { mimeType: 'image/jpeg', data: styleImage } }
      ]
    }]
  });

  return extractImage(result);
}
```

---

### 6. Conversational Editing (100 tokens per iteration)

**Multi-turn editing conversation**

```javascript
class ConversationalImageEditor {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });
    this.currentImage = null;
    this.editHistory = [];
  }

  async startEditing(imagePath, initialPrompt) {
    const imageData = fs.readFileSync(imagePath);
    this.currentImage = imageData.toString('base64');

    const result = await this.model.generateContent({
      contents: [{
        parts: [
          { text: initialPrompt },
          { inlineData: { mimeType: 'image/jpeg', data: this.currentImage } }
        ]
      }]
    });

    const newImage = extractImage(result);
    this.currentImage = newImage.imageData;
    this.editHistory.push({ prompt: initialPrompt, result: newImage });

    return newImage;
  }

  async continueEditing(followUpPrompt) {
    const result = await this.model.generateContent({
      contents: [{
        parts: [
          { 
            text: `Based on the current image, please: ${followUpPrompt}
                   Keep all other aspects the same unless specifically mentioned.` 
          },
          { inlineData: { mimeType: 'image/jpeg', data: this.currentImage } }
        ]
      }]
    });

    const newImage = extractImage(result);
    this.currentImage = newImage.imageData;
    this.editHistory.push({ prompt: followUpPrompt, result: newImage });

    return newImage;
  }

  getHistory() {
    return this.editHistory;
  }
}

// Usage:
const editor = new ConversationalImageEditor();

// Turn 1: Initial edit
await editor.startEditing(
  './product.jpg',
  'Remove the background and make it white'
);

// Turn 2: Refine
await editor.continueEditing('Actually, make the background a light gray instead');

// Turn 3: Add more
await editor.continueEditing('Add a subtle shadow under the product');

// Turn 4: Final touch
await editor.continueEditing('Make the overall image a bit brighter');
```

---

### 7. High-Fidelity Text Rendering (100 tokens)

**Generate images with accurate text**

```javascript
async function generateWithText(textContent, designPrompt) {
  const fullPrompt = `
    Create ${designPrompt} with the text "${textContent}".
    
    IMPORTANT: The text must be spelled exactly as written above.
    Make the text clear, legible, and professionally rendered.
    High quality typography, proper spacing, clean design.
  `;

  const result = await model.generateContent({
    contents: [{ parts: [{ text: fullPrompt }] }]
  });

  return extractImage(result);
}

// Usage:
await generateWithText(
  'Fresh Daily Coffee',
  'a modern minimalist logo for a coffee shop. Clean sans-serif font, black and white, with a simple coffee bean icon'
);

await generateWithText(
  '50% OFF Summer Sale',
  'a vibrant promotional banner for an e-commerce store. Bold text, summer colors, eye-catching design'
);
```

---

## Production Service with Token Management

```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import { db } from './database.js';

class GeminiImageService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });
  }

  async executeWithTokens(userId, operationType, operationFn) {
    // Get token cost for operation type
    const pricing = await db.getTokenPricing(operationType);
    const tokenCost = pricing.tokensPerOperation;

    // Check user balance
    const balance = await db.getUserTokenBalance(userId);
    if (balance < tokenCost) {
      throw new Error(`Insufficient tokens. Need ${tokenCost}, have ${balance}`);
    }

    // Create generation record
    const generationId = await db.createImageGeneration({
      userId,
      operationType,
      status: 'processing',
      tokensUsed: tokenCost,
      model: 'gemini-2.5-flash-image'
    });

    try {
      const startTime = Date.now();

      // Execute the operation
      const result = await operationFn();

      const processingTime = Date.now() - startTime;

      // Success - update record
      await db.updateImageGeneration(generationId, {
        status: 'completed',
        processingTimeMs: processingTime,
        completedAt: new Date()
      });

      // Deduct tokens
      const newBalance = await db.deductTokens(userId, tokenCost, operationType, generationId);

      return {
        success: true,
        result,
        tokensUsed: tokenCost,
        remainingBalance: newBalance,
        generationId
      };

    } catch (error) {
      // Failure - update record but don't charge tokens
      await db.updateImageGeneration(generationId, {
        status: 'failed',
        errorMessage: error.message
      });
      throw error;
    }
  }

  // Public API Methods

  async textToImage(userId, prompt, aspectRatio = '1:1') {
    return this.executeWithTokens(userId, 'text_to_image', async () => {
      const enhancedPrompt = this.enhancePromptForProduct(prompt);

      const result = await this.model.generateContent({
        contents: [{ parts: [{ text: enhancedPrompt }] }],
        config: {
          imageConfig: { aspectRatio }
        }
      });

      return this.extractImage(result);
    });
  }

  async editImageSimple(userId, imagePath, editPrompt) {
    return this.executeWithTokens(userId, 'image_edit_simple', async () => {
      const imageData = fs.readFileSync(imagePath);
      const base64Image = imageData.toString('base64');

      const result = await this.model.generateContent({
        contents: [{
          parts: [
            { text: editPrompt },
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
          ]
        }]
      });

      return this.extractImage(result);
    });
  }

  async editImageComplex(userId, imagePath, complexPrompt) {
    return this.executeWithTokens(userId, 'image_edit_complex', async () => {
      const imageData = fs.readFileSync(imagePath);
      const base64Image = imageData.toString('base64');

      const result = await this.model.generateContent({
        contents: [{
          parts: [
            { text: complexPrompt },
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
          ]
        }],
        generationConfig: {
          temperature: 0.6,
          topK: 35,
          topP: 0.92
        }
      });

      return this.extractImage(result);
    });
  }

  async composeMultipleImages(userId, imagePaths, compositionPrompt) {
    return this.executeWithTokens(userId, 'multi_image_composition', async () => {
      const imageParts = imagePaths.map(path => ({
        inlineData: {
          mimeType: 'image/jpeg',
          data: fs.readFileSync(path).toString('base64')
        }
      }));

      const result = await this.model.generateContent({
        contents: [{
          parts: [
            { text: compositionPrompt },
            ...imageParts
          ]
        }]
      });

      return this.extractImage(result);
    });
  }

  async styleTransfer(userId, contentImagePath, styleImagePath) {
    return this.executeWithTokens(userId, 'style_transfer', async () => {
      const contentImage = fs.readFileSync(contentImagePath).toString('base64');
      const styleImage = fs.readFileSync(styleImagePath).toString('base64');

      const result = await this.model.generateContent({
        contents: [{
          parts: [
            {
              text: `Apply the style from the second image to the first image.
                     Keep the subject of the first image, adopt the visual style of the second.`
            },
            { inlineData: { mimeType: 'image/jpeg', data: contentImage } },
            { inlineData: { mimeType: 'image/jpeg', data: styleImage } }
          ]
        }]
      });

      return this.extractImage(result);
    });
  }

  // Helper methods

  enhancePromptForProduct(userPrompt) {
    return `${userPrompt}
    
    Professional product photography, high quality, sharp focus, clean composition,
    well-lit, commercial-grade image. Show product clearly and attractively.`.trim();
  }

  extractImage(result) {
    for (const part of result.response.candidates[0].content.parts) {
      if (part.inlineData) {
        return {
          imageData: part.inlineData.data,
          mimeType: part.inlineData.mimeType
        };
      }
    }
    throw new Error('No image found in response');
  }
}

export default GeminiImageService;
```

---

## Express API Routes

```javascript
import express from 'express';
import multer from 'multer';
import GeminiImageService from './GeminiImageService.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });
const imageService = new GeminiImageService();

// POST /api/generate/text-to-image
router.post('/text-to-image', async (req, res) => {
  try {
    const { prompt, aspectRatio = '1:1' } = req.body;
    const userId = req.user.id;

    const result = await imageService.textToImage(userId, prompt, aspectRatio);

    res.json({
      success: true,
      data: result,
      message: 'Image generated successfully'
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/generate/edit-simple
router.post('/edit-simple', upload.single('image'), async (req, res) => {
  try {
    const { prompt } = req.body;
    const userId = req.user.id;
    const imagePath = req.file.path;

    const result = await imageService.editImageSimple(userId, imagePath, prompt);

    res.json({
      success: true,
      data: result,
      message: 'Image edited successfully'
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/generate/edit-complex
router.post('/edit-complex', upload.single('image'), async (req, res) => {
  try {
    const { prompt } = req.body;
    const userId = req.user.id;
    const imagePath = req.file.path;

    const result = await imageService.editImageComplex(userId, imagePath, prompt);

    res.json({
      success: true,
      data: result,
      message: 'Complex edit completed successfully'
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/generate/compose
router.post('/compose', upload.array('images', 3), async (req, res) => {
  try {
    const { prompt } = req.body;
    const userId = req.user.id;
    const imagePaths = req.files.map(f => f.path);

    const result = await imageService.composeMultipleImages(userId, imagePaths, prompt);

    res.json({
      success: true,
      data: result,
      message: 'Images composed successfully'
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
```

---

## Prompt Engineering Best Practices

### 1. Be Descriptive, Not Just Keywords
❌ **Bad**: "product white background"
✅ **Good**: "A professional product photo with the item centered on a pure white background, well-lit with soft studio lighting"

### 2. Use Photography Terms
- "shot from a 45-degree angle"
- "macro shot focusing on details"
- "wide-angle view showing context"
- "bokeh effect in background"
- "soft studio lighting"

### 3. Specify What to Keep
When editing, tell it what NOT to change:
"Change the background to blue, but keep the product exactly as it is"

### 4. Use Step-by-Step for Complex Edits
"First, remove the background. Then, add a light gray gradient. Finally, add a soft shadow underneath the product."

---

## Cost Optimization

### 1. Cache Common Prompts
```javascript
import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 3600 });

function getCacheKey(prompt, imageHash) {
  return crypto.createHash('md5').update(`${prompt}-${imageHash}`).digest('hex');
}
```

### 2. Prompt Templates
Create reusable templates:
```javascript
const TEMPLATES = {
  removeBackground: (detail = 'high') => 
    `Remove the background from this product. Make it pure white. 
     ${detail === 'high' ? 'Keep edges extremely sharp and clean' : ''}`,
  
  flip: () => 'Flip this image horizontally. Mirror it perfectly.',
  
  enhanceLighting: (intensity = 'medium') =>
    `Improve the lighting in this image. Make it ${intensity === 'high' ? 'significantly' : 'slightly'} brighter 
     while maintaining natural appearance.`
};
```

### 3. Batch Similar Operations
Group similar requests to optimize API calls.

---

## Next Steps

1. ✅ Understand that everything is prompt-based
2. ✅ Test with real product images
3. ✅ Build prompt templates for common operations
4. ✅ Implement token management
5. ✅ Create simple UI for prompt input
6. ✅ Launch MVP and collect user prompts
7. ✅ Improve prompt templates based on usage

**Remember:** The power is in the prompts, not in fake "features". Gemini understands natural language - use it!

# Nano Banana (Gemini Flash 2.5 Image) Setup Guide

## Overview

Nano Banana, officially known as **Gemini Flash 2.5 Image**, is Google's advanced AI image generation and editing model. It offers rapid image creation, high character consistency, and intuitive editing capabilities through natural language prompts.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [API Setup & Authentication](#api-setup--authentication)
3. [Node.js Integration](#nodejs-integration)
4. [Basic Implementation](#basic-implementation)
5. [Advanced Features](#advanced-features)
6. [Error Handling](#error-handling)
7. [Rate Limits & Pricing](#rate-limits--pricing)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 16+ installed
- Google Cloud account or Google AI Studio access
- Basic understanding of JavaScript/Node.js
- npm or yarn package manager

## API Setup & Authentication

### Method 1: Google AI Studio (Recommended for Development)

1. **Visit Google AI Studio**
   - Navigate to [Google AI Studio](https://aistudio.google.com)
   - Sign in with your Google account

2. **Create API Key**
   - Click on "Get API Key" in the left sidebar
   - Click "Create API Key"
   - Copy the generated API key (starts with `AIza...`)

3. **Set Environment Variables**
   ```bash
   # Add to your .env file
   GOOGLE_AI_API_KEY=your_api_key_here
   ```

### Method 2: Google Cloud Console (For Production)

1. **Enable APIs**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Enable the "Generative Language API"
   - Enable "Vertex AI API" (for advanced features)

2. **Create Service Account**
   - Navigate to IAM & Admin > Service Accounts
   - Create a new service account
   - Download the JSON key file

3. **Set Authentication**
   ```bash
   # Option A: Environment variable
   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
   
   # Option B: In your application
   process.env.GOOGLE_APPLICATION_CREDENTIALS = 'path/to/service-account-key.json';
   ```

## Node.js Integration

### Installation

```bash
npm install @google/generative-ai
# or
yarn add @google/generative-ai
```

### Basic Setup

```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize the AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

// Get the model
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash-image" 
});
```

## Basic Implementation

### 1. Text-to-Image Generation

```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');

class NanoBananaService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash-image" 
    });
  }

  async generateImage(prompt, options = {}) {
    try {
      const result = await this.model.generateContent({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: options.temperature || 0.7,
          topK: options.topK || 40,
          topP: options.topP || 0.95,
          maxOutputTokens: options.maxOutputTokens || 1024,
        }
      });

      return result.response;
    } catch (error) {
      console.error('Error generating image:', error);
      throw error;
    }
  }
}

// Usage
const nanoBanana = new NanoBananaService();

async function createImage() {
  try {
    const result = await nanoBanana.generateImage(
      "A serene sunset over a mountain range with a lake in the foreground"
    );
    console.log('Generated image:', result);
  } catch (error) {
    console.error('Failed to generate image:', error);
  }
}
```

### 2. Image Editing

```javascript
const fs = require('fs');

class ImageEditor {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash-image" 
    });
  }

  async editImage(imagePath, editPrompt) {
    try {
      // Read and encode the image
      const imageData = fs.readFileSync(imagePath);
      const base64Image = imageData.toString('base64');

      const result = await this.model.generateContent({
        contents: [{
          parts: [
            {
              text: editPrompt
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }]
      });

      return result.response;
    } catch (error) {
      console.error('Error editing image:', error);
      throw error;
    }
  }
}

// Usage
const editor = new ImageEditor();

async function editExistingImage() {
  try {
    const result = await editor.editImage(
      './path/to/image.jpg',
      "Replace the background with a sunny beach scene"
    );
    console.log('Edited image:', result);
  } catch (error) {
    console.error('Failed to edit image:', error);
  }
}
```

### 3. Multi-Modal Generation

```javascript
class MultiModalGenerator {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash-image" 
    });
  }

  async generateWithReference(referenceImagePath, prompt) {
    try {
      const imageData = fs.readFileSync(referenceImagePath);
      const base64Image = imageData.toString('base64');

      const result = await this.model.generateContent({
        contents: [{
          parts: [
            {
              text: `Create an image similar to this reference but with the following changes: ${prompt}`
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }]
      });

      return result.response;
    } catch (error) {
      console.error('Error in multi-modal generation:', error);
      throw error;
    }
  }
}
```

## Advanced Features

### 1. Batch Processing

```javascript
class BatchProcessor {
  constructor() {
    this.nanoBanana = new NanoBananaService();
  }

  async processBatch(prompts, options = {}) {
    const results = [];
    const batchSize = options.batchSize || 5;
    
    for (let i = 0; i < prompts.length; i += batchSize) {
      const batch = prompts.slice(i, i + batchSize);
      
      const batchPromises = batch.map(prompt => 
        this.nanoBanana.generateImage(prompt, options)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < prompts.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
}
```

### 2. Image Style Transfer

```javascript
class StyleTransfer {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash-image" 
    });
  }

  async transferStyle(contentImagePath, styleDescription) {
    try {
      const imageData = fs.readFileSync(contentImagePath);
      const base64Image = imageData.toString('base64');

      const prompt = `Apply the following artistic style to this image: ${styleDescription}. 
                     Maintain the original composition and subject matter while transforming the visual style.`;

      const result = await this.model.generateContent({
        contents: [{
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }]
      });

      return result.response;
    } catch (error) {
      console.error('Error in style transfer:', error);
      throw error;
    }
  }
}
```

### 3. Conversational Editing

```javascript
class ConversationalEditor {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash-image" 
    });
    this.conversationHistory = [];
  }

  async editConversationally(imagePath, editPrompt) {
    try {
      const imageData = fs.readFileSync(imagePath);
      const base64Image = imageData.toString('base64');

      // Add to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: editPrompt
      });

      const result = await this.model.generateContent({
        contents: [{
          parts: [
            {
              text: `Based on our previous conversation, please make this edit: ${editPrompt}`
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }]
      });

      this.conversationHistory.push({
        role: 'assistant',
        content: result.response.text()
      });

      return result.response;
    } catch (error) {
      console.error('Error in conversational editing:', error);
      throw error;
    }
  }

  clearHistory() {
    this.conversationHistory = [];
  }
}
```

## Error Handling

### Comprehensive Error Handler

```javascript
class NanoBananaErrorHandler {
  static handleError(error) {
    if (error.code) {
      switch (error.code) {
        case 400:
          return {
            message: 'Invalid request parameters',
            suggestion: 'Check your prompt and image format'
          };
        case 401:
          return {
            message: 'Authentication failed',
            suggestion: 'Verify your API key is correct'
          };
        case 403:
          return {
            message: 'Access forbidden',
            suggestion: 'Check your API permissions and quotas'
          };
        case 429:
          return {
            message: 'Rate limit exceeded',
            suggestion: 'Wait before making more requests'
          };
        case 500:
          return {
            message: 'Internal server error',
            suggestion: 'Try again later or contact support'
          };
        default:
          return {
            message: 'Unknown error occurred',
            suggestion: 'Check the error details and try again'
          };
      }
    }
    
    return {
      message: error.message || 'An unexpected error occurred',
      suggestion: 'Please try again or contact support'
    };
  }
}

// Usage in your service
class RobustNanoBananaService extends NanoBananaService {
  async generateImage(prompt, options = {}) {
    try {
      return await super.generateImage(prompt, options);
    } catch (error) {
      const errorInfo = NanoBananaErrorHandler.handleError(error);
      console.error('Generation failed:', errorInfo.message);
      console.log('Suggestion:', errorInfo.suggestion);
      throw new Error(`${errorInfo.message}. ${errorInfo.suggestion}`);
    }
  }
}
```

### Retry Logic

```javascript
class RetryableNanoBananaService extends NanoBananaService {
  async generateImageWithRetry(prompt, options = {}, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.generateImage(prompt, options);
      } catch (error) {
        lastError = error;
        
        if (error.code === 429) {
          // Rate limit - wait longer
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`Rate limited. Waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else if (error.code >= 500) {
          // Server error - retry with shorter delay
          const waitTime = attempt * 1000;
          console.log(`Server error. Waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          // Client error - don't retry
          throw error;
        }
      }
    }
    
    throw lastError;
  }
}
```

## Rate Limits & Pricing

### Rate Limits
- **Free Tier**: 15 requests per minute
- **Paid Tier**: Up to 1,000 requests per minute
- **Burst Capacity**: Limited burst allowance

### Pricing (as of 2024)
- **Text Generation**: $0.000125 per 1K characters
- **Image Generation**: $0.02 per image
- **Image Editing**: $0.02 per edit operation

### Rate Limit Management

```javascript
class RateLimitManager {
  constructor() {
    this.requestCount = 0;
    this.windowStart = Date.now();
    this.maxRequests = 15; // Free tier limit
    this.windowSize = 60000; // 1 minute in milliseconds
  }

  async checkRateLimit() {
    const now = Date.now();
    
    // Reset counter if window has passed
    if (now - this.windowStart >= this.windowSize) {
      this.requestCount = 0;
      this.windowStart = now;
    }
    
    if (this.requestCount >= this.maxRequests) {
      const waitTime = this.windowSize - (now - this.windowStart);
      console.log(`Rate limit reached. Waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.windowStart = Date.now();
    }
    
    this.requestCount++;
  }
}

// Usage
class RateLimitedNanoBananaService extends NanoBananaService {
  constructor() {
    super();
    this.rateLimitManager = new RateLimitManager();
  }

  async generateImage(prompt, options = {}) {
    await this.rateLimitManager.checkRateLimit();
    return await super.generateImage(prompt, options);
  }
}
```

## Best Practices

### 1. Prompt Engineering

```javascript
class PromptOptimizer {
  static optimizePrompt(userPrompt) {
    // Add style and quality keywords
    const optimizedPrompt = `${userPrompt}, high quality, detailed, professional photography`;
    
    // Add technical specifications
    const technicalSpecs = [
      'sharp focus',
      'good lighting',
      'vibrant colors',
      'high resolution'
    ];
    
    return `${optimizedPrompt}, ${technicalSpecs.join(', ')}`;
  }

  static createStylePrompt(basePrompt, style) {
    const styleMap = {
      'photorealistic': 'photorealistic, detailed, sharp focus',
      'artistic': 'artistic, painterly, creative interpretation',
      'minimalist': 'minimalist, clean, simple composition',
      'vintage': 'vintage, retro, aged appearance',
      'futuristic': 'futuristic, sci-fi, high-tech aesthetic'
    };
    
    const styleKeywords = styleMap[style] || '';
    return `${basePrompt}, ${styleKeywords}`;
  }
}
```

### 2. Image Quality Optimization

```javascript
class ImageQualityOptimizer {
  static async optimizeImageSettings(prompt, targetQuality = 'high') {
    const qualitySettings = {
      'low': {
        temperature: 0.3,
        topK: 20,
        topP: 0.8
      },
      'medium': {
        temperature: 0.5,
        topK: 30,
        topP: 0.9
      },
      'high': {
        temperature: 0.7,
        topK: 40,
        topP: 0.95
      },
      'creative': {
        temperature: 0.9,
        topK: 50,
        topP: 0.98
      }
    };
    
    return qualitySettings[targetQuality] || qualitySettings['high'];
  }
}
```

### 3. Caching Strategy

```javascript
const NodeCache = require('node-cache');
const crypto = require('crypto');

class CachedNanoBananaService extends NanoBananaService {
  constructor(cacheTTL = 3600) { // 1 hour default
    super();
    this.cache = new NodeCache({ stdTTL: cacheTTL });
  }

  generateCacheKey(prompt, options) {
    const keyData = JSON.stringify({ prompt, options });
    return crypto.createHash('md5').update(keyData).digest('hex');
  }

  async generateImage(prompt, options = {}) {
    const cacheKey = this.generateCacheKey(prompt, options);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('Returning cached result');
      return cached;
    }
    
    // Generate new image
    const result = await super.generateImage(prompt, options);
    
    // Cache the result
    this.cache.set(cacheKey, result);
    
    return result;
  }
}
```

## Troubleshooting

### Common Issues

1. **"API key not found" error**
   ```bash
   # Solution: Check your environment variables
   echo $GOOGLE_AI_API_KEY
   ```

2. **"Rate limit exceeded" error**
   ```javascript
   // Solution: Implement exponential backoff
   const delay = Math.pow(2, retryCount) * 1000;
   await new Promise(resolve => setTimeout(resolve, delay));
   ```

3. **"Invalid image format" error**
   ```javascript
   // Solution: Ensure proper image encoding
   const imageData = fs.readFileSync(imagePath);
   const base64Image = imageData.toString('base64');
   ```

4. **"Model not found" error**
   ```javascript
   // Solution: Use correct model name
   const model = genAI.getGenerativeModel({ 
     model: "gemini-2.5-flash-image" // Not "nano-banana"
   });
   ```

### Debug Mode

```javascript
class DebugNanoBananaService extends NanoBananaService {
  constructor(debugMode = false) {
    super();
    this.debugMode = debugMode;
  }

  async generateImage(prompt, options = {}) {
    if (this.debugMode) {
      console.log('Debug Info:');
      console.log('- Prompt:', prompt);
      console.log('- Options:', options);
      console.log('- API Key present:', !!process.env.GOOGLE_AI_API_KEY);
    }
    
    const startTime = Date.now();
    const result = await super.generateImage(prompt, options);
    
    if (this.debugMode) {
      console.log('- Generation time:', Date.now() - startTime, 'ms');
      console.log('- Result type:', typeof result);
    }
    
    return result;
  }
}
```

## Complete Example Implementation

Here's a complete, production-ready implementation:

```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const crypto = require('crypto');
const NodeCache = require('node-cache');

class ProductionNanoBananaService {
  constructor(options = {}) {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash-image" 
    });
    
    this.cache = new NodeCache({ stdTTL: options.cacheTTL || 3600 });
    this.debugMode = options.debugMode || false;
    this.requestCount = 0;
    this.windowStart = Date.now();
    this.maxRequests = options.maxRequests || 15;
    this.windowSize = 60000; // 1 minute
  }

  async generateImage(prompt, options = {}) {
    try {
      // Rate limiting
      await this.checkRateLimit();
      
      // Cache check
      const cacheKey = this.generateCacheKey(prompt, options);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.log('Cache hit');
        return cached;
      }
      
      // Optimize prompt
      const optimizedPrompt = this.optimizePrompt(prompt);
      
      // Generate image
      this.log('Generating image with prompt:', optimizedPrompt);
      const result = await this.model.generateContent({
        contents: [{
          parts: [{ text: optimizedPrompt }]
        }],
        generationConfig: {
          temperature: options.temperature || 0.7,
          topK: options.topK || 40,
          topP: options.topP || 0.95,
          maxOutputTokens: options.maxOutputTokens || 1024,
        }
      });
      
      // Cache result
      this.cache.set(cacheKey, result);
      
      return result;
      
    } catch (error) {
      this.log('Error:', error.message);
      throw this.handleError(error);
    }
  }

  async editImage(imagePath, editPrompt, options = {}) {
    try {
      await this.checkRateLimit();
      
      const imageData = fs.readFileSync(imagePath);
      const base64Image = imageData.toString('base64');
      
      const result = await this.model.generateContent({
        contents: [{
          parts: [
            { text: editPrompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }]
      });
      
      return result;
      
    } catch (error) {
      this.log('Error:', error.message);
      throw this.handleError(error);
    }
  }

  generateCacheKey(prompt, options) {
    const keyData = JSON.stringify({ prompt, options });
    return crypto.createHash('md5').update(keyData).digest('hex');
  }

  optimizePrompt(prompt) {
    return `${prompt}, high quality, detailed, professional photography, sharp focus, good lighting, vibrant colors`;
  }

  async checkRateLimit() {
    const now = Date.now();
    
    if (now - this.windowStart >= this.windowSize) {
      this.requestCount = 0;
      this.windowStart = now;
    }
    
    if (this.requestCount >= this.maxRequests) {
      const waitTime = this.windowSize - (now - this.windowStart);
      this.log(`Rate limit reached. Waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.windowStart = Date.now();
    }
    
    this.requestCount++;
  }

  handleError(error) {
    const errorMap = {
      400: 'Invalid request parameters',
      401: 'Authentication failed',
      403: 'Access forbidden',
      429: 'Rate limit exceeded',
      500: 'Internal server error'
    };
    
    const message = errorMap[error.code] || 'Unknown error occurred';
    return new Error(`${message}: ${error.message}`);
  }

  log(...args) {
    if (this.debugMode) {
      console.log('[NanoBanana]', ...args);
    }
  }
}

module.exports = ProductionNanoBananaService;
```

## Usage Example

```javascript
const ProductionNanoBananaService = require('./ProductionNanoBananaService');

// Initialize with options
const nanoBanana = new ProductionNanoBananaService({
  debugMode: true,
  cacheTTL: 7200, // 2 hours
  maxRequests: 10 // Conservative rate limit
});

// Generate an image
async function main() {
  try {
    const result = await nanoBanana.generateImage(
      "A futuristic cityscape at sunset with flying cars",
      { temperature: 0.8 }
    );
    
    console.log('Generated successfully:', result);
    
    // Edit an existing image
    const editResult = await nanoBanana.editImage(
      './path/to/image.jpg',
      "Add a rainbow in the sky"
    );
    
    console.log('Edited successfully:', editResult);
    
  } catch (error) {
    console.error('Operation failed:', error.message);
  }
}

main();
```

## Conclusion

This guide provides everything you need to set up and use Nano Banana (Gemini Flash 2.5 Image) in your Node.js applications. The service offers powerful image generation and editing capabilities with proper error handling, rate limiting, and caching for production use.

Remember to:
- Keep your API keys secure
- Monitor your usage and costs
- Implement proper error handling
- Use caching to optimize performance
- Respect rate limits
- Test thoroughly before production deployment

For the latest updates and features, always refer to the [official Google AI documentation](https://ai.google.dev/gemini-api/docs).

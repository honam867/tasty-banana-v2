import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import TokenService from "../tokens/TokenService.js";
import { GEMINI_CONFIG, TOKEN_COSTS, IMAGE_OPERATION_TYPES } from "../../utils/constant.js";

/**
 * Gemini Flash 2.5 Image Service
 * Handles all AI image generation and editing operations with token management
 */
class GeminiService {
  constructor() {
    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY environment variable is required");
    }

    const modelName = process.env.GEMINI_MODEL || GEMINI_CONFIG.DEFAULT_MODEL;
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: modelName });

    // Operation token costs (loaded from constants)
    this.TOKEN_COSTS = TOKEN_COSTS;

    // Rate limiting: 15 requests per minute for free tier
    this.rateLimitWindow = GEMINI_CONFIG.RATE_LIMIT_WINDOW_MS;
    this.maxRequestsPerWindow = GEMINI_CONFIG.MAX_REQUESTS_PER_WINDOW;
    this.requestHistory = [];
  }

  /**
   * Execute an operation with token management and retry logic
   */
  async executeWithTokens(userId, operationType, operationFn, options = {}) {
    const tokenCost = this.TOKEN_COSTS[operationType];
    if (!tokenCost) {
      throw new Error(`Unknown operation type: ${operationType}`);
    }

    // Check rate limit
    this.checkRateLimit(userId);

    // Check user balance
    const userBalance = await TokenService.getBalance(userId);
    if (userBalance.balance < tokenCost) {
      throw new Error(
        `Insufficient tokens. Need ${tokenCost}, have ${userBalance.balance}`
      );
    }

    try {
      const startTime = Date.now();

      // Execute the operation with retry logic
      const result = await this.executeWithRetry(operationFn, operationType);

      const processingTime = Date.now() - startTime;

      // Deduct tokens (generation record is managed by controller)
      const newBalance = await TokenService.debit(userId, tokenCost, {
        reasonCode: "spend_generation",
        metadata: {
          operationType,
          generationId: options.metadata?.generationId,
          processingTimeMs: processingTime,
          ...options.metadata,
        },
        actor: { type: "user", id: userId },
      });

      return {
        success: true,
        result,
        tokensUsed: tokenCost,
        remainingBalance: newBalance.balance,
        generationId: options.metadata?.generationId,
        processingTimeMs: processingTime,
      };
    } catch (error) {
      throw new Error(`AI operation failed: ${error.message}`);
    }
  }

  /**
   * Execute operation with exponential backoff retry logic
   */
  async executeWithRetry(operationFn, operationType, maxAttempts = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operationFn();
      } catch (error) {
        lastError = error;

        // Don't retry on permanent errors
        if (this.isPermanentError(error)) {
          throw error;
        }

        // Retry on transient errors
        if (attempt < maxAttempts && this.isTransientError(error)) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await this.sleep(delay);
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }

  /**
   * Generate image from text prompt (100 tokens)
   */
  async textToImage(userId, prompt, options = {}) {
    return this.executeWithTokens(
      userId,
      IMAGE_OPERATION_TYPES.TEXT_TO_IMAGE,
      async () => {
        const generationConfig = this.buildGenerationConfig(options);

        const result = await this.model.generateContent({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig,
        });

        return this.extractImage(result);
      },
      { metadata: { prompt, ...options } }
    );
  }

  /**
   * Simple image editing (100 tokens)
   */
  async editImageSimple(userId, imagePath, editPrompt, options = {}) {
    return this.executeWithTokens(
      userId,
      IMAGE_OPERATION_TYPES.IMAGE_EDIT_SIMPLE,
      async () => {
        const base64Image = await this.imageToBase64(imagePath);

        const result = await this.model.generateContent({
          contents: [
            {
              parts: [
                { text: editPrompt },
                {
                  inlineData: {
                    mimeType: this.getMimeType(imagePath),
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: this.buildGenerationConfig(options),
        });

        return this.extractImage(result);
      },
      { metadata: { imagePath, editPrompt, ...options } }
    );
  }

  /**
   * Complex image editing (150 tokens)
   */
  async editImageComplex(userId, imagePath, complexPrompt, options = {}) {
    return this.executeWithTokens(
      userId,
      IMAGE_OPERATION_TYPES.IMAGE_EDIT_COMPLEX,
      async () => {
        const base64Image = await this.imageToBase64(imagePath);

        const generationConfig = this.buildGenerationConfig({
          temperature: GEMINI_CONFIG.COMPLEX_EDIT_TEMPERATURE, // Lower for more control
          topK: GEMINI_CONFIG.COMPLEX_EDIT_TOP_K,
          topP: GEMINI_CONFIG.COMPLEX_EDIT_TOP_P,
          ...options,
        });

        const result = await this.model.generateContent({
          contents: [
            {
              parts: [
                { text: complexPrompt },
                {
                  inlineData: {
                    mimeType: this.getMimeType(imagePath),
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig,
        });

        return this.extractImage(result);
      },
      { metadata: { imagePath, complexPrompt, ...options } }
    );
  }

  /**
   * Compose multiple images (200 tokens)
   */
  async composeMultipleImages(
    userId,
    imagePaths,
    compositionPrompt,
    options = {}
  ) {
    return this.executeWithTokens(
      userId,
      IMAGE_OPERATION_TYPES.MULTI_IMAGE_COMPOSITION,
      async () => {
        const imageParts = await Promise.all(
          imagePaths.map(async (path) => ({
            inlineData: {
              mimeType: this.getMimeType(path),
              data: await this.imageToBase64(path),
            },
          }))
        );

        const result = await this.model.generateContent({
          contents: [
            {
              parts: [{ text: compositionPrompt }, ...imageParts],
            },
          ],
          generationConfig: this.buildGenerationConfig(options),
        });

        return this.extractImage(result);
      },
      { metadata: { imagePaths, compositionPrompt, ...options } }
    );
  }

  /**
   * Style transfer between images (150 tokens)
   */
  async styleTransfer(userId, contentImagePath, styleImagePath, options = {}) {
    return this.executeWithTokens(
      userId,
      IMAGE_OPERATION_TYPES.STYLE_TRANSFER,
      async () => {
        const contentImage = await this.imageToBase64(contentImagePath);
        const styleImage = await this.imageToBase64(styleImagePath);

        const transferPrompt =
          options.customPrompt ||
          `Apply the artistic style and aesthetic from the style image to the content image.
         Keep the subject and composition of the content image, but adopt the visual style,
         color palette, lighting, and mood of the style image.
         Maintain the product clearly visible and recognizable.
         Professional result suitable for commercial use.`;

        const result = await this.model.generateContent({
          contents: [
            {
              parts: [
                { text: transferPrompt },
                {
                  inlineData: {
                    mimeType: this.getMimeType(contentImagePath),
                    data: contentImage,
                  },
                },
                {
                  inlineData: {
                    mimeType: this.getMimeType(styleImagePath),
                    data: styleImage,
                  },
                },
              ],
            },
          ],
          generationConfig: this.buildGenerationConfig(options),
        });

        return this.extractImage(result);
      },
      { metadata: { contentImagePath, styleImagePath, ...options } }
    );
  }

  /**
   * Quick action shortcuts (100 tokens)
   */
  async quickAction(userId, imagePath, actionType, options = {}) {
    const templates = this.getActionTemplates();
    const prompt = templates[actionType];

    if (!prompt) {
      throw new Error(`Unknown quick action: ${actionType}`);
    }

    return this.editImageSimple(userId, imagePath, prompt, {
      ...options,
      metadata: { actionType, quickAction: true },
    });
  }

  /**
   * High-fidelity text rendering (100 tokens)
   */
  async generateWithText(userId, textContent, designPrompt, options = {}) {
    return this.executeWithTokens(
      userId,
      IMAGE_OPERATION_TYPES.TEXT_RENDERING,
      async () => {
        const fullPrompt = `
        Create ${designPrompt} with the text "${textContent}".
        
        IMPORTANT REQUIREMENTS:
        - The text must be spelled exactly as written above: "${textContent}"
        - Make the text clear, legible, and professionally rendered
        - High quality typography, proper spacing, clean design
        - Ensure text is perfectly readable and accurate
        - Professional commercial-grade result
      `.trim();

        const result = await this.model.generateContent({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: this.buildGenerationConfig(options),
        });

        return this.extractImage(result);
      },
      { metadata: { textContent, designPrompt, ...options } }
    );
  }

  // --- Helper Methods ---

  extractImage(result) {
    if (!result.response?.candidates?.[0]?.content?.parts) {
      throw new Error("No valid response from Gemini API");
    }

    for (const part of result.response.candidates[0].content.parts) {
      if (part.inlineData) {
        return {
          imageData: part.inlineData.data,
          mimeType: part.inlineData.mimeType,
          size: Buffer.byteLength(part.inlineData.data, "base64"),
        };
      }
    }

    throw new Error("No image found in Gemini response");
  }

  async imageToBase64(imagePath) {
    try {
      const imageData = await fs.promises.readFile(imagePath);
      return imageData.toString("base64");
    } catch (error) {
      throw new Error(`Failed to read image: ${imagePath} - ${error.message}`);
    }
  }

  getMimeType(filePath) {
    const ext = filePath.toLowerCase().split(".").pop();
    const mimeTypes = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      bmp: "image/bmp",
    };
    return mimeTypes[ext] || "image/jpeg";
  }

  enhancePromptForProduct(userPrompt) {
    return `${userPrompt}
    
    Professional product photography, high quality, sharp focus, clean composition,
    well-lit, commercial-grade image. Show product clearly and attractively.
    Suitable for e-commerce listings and marketing materials.
    Clean, professional result with excellent lighting and composition.
    `.trim();
  }

  buildGenerationConfig(options = {}) {
    // Extract non-API fields that shouldn't be passed to Gemini
    const { aspectRatio, metadata, ...otherOptions } = options;

    const config = {
      temperature: GEMINI_CONFIG.DEFAULT_TEMPERATURE,
      topK: GEMINI_CONFIG.DEFAULT_TOP_K,
      topP: GEMINI_CONFIG.DEFAULT_TOP_P,
      ...otherOptions,
    };

    // Add imageConfig if aspectRatio is specified
    if (aspectRatio) {
      config.imageConfig = {
        aspectRatio,
      };
    }

    return config;
  }

  getActionTemplates() {
    return {
      remove_background:
        "Remove the background from this product image. Make it pure white or transparent. Keep the product sharp with clean edges and professional appearance.",
      flip_horizontal:
        "Flip this image horizontally. Mirror it perfectly while maintaining the same quality and appearance.",
      flip_vertical:
        "Flip this image vertically. Mirror it perfectly while maintaining the same quality and appearance.",
      enhance_lighting:
        "Enhance the lighting in this product image. Make it brighter and more evenly lit while maintaining a natural, professional appearance. Soft studio lighting.",
      add_shadows:
        "Add subtle professional shadows underneath the product to create depth and dimension. Keep shadows soft and natural, not harsh.",
      center_product:
        "Center this product in the frame. Position it properly with good composition while keeping everything else the same.",
      pure_white_background:
        "Make the background completely pure white (RGB 255,255,255). Keep the product exactly as it is, just change the background.",
      sharpen_details:
        "Sharpen the details and make the image more crisp and clear. Enhance the overall sharpness while maintaining a natural look.",
      brighten_colors:
        "Make the colors in this image more vibrant and bright. Enhance color saturation while keeping it professional and realistic.",
    };
  }

  checkRateLimit(userId) {
    const now = Date.now();
    const userRequests = this.requestHistory.filter(
      (req) =>
        req.userId === userId && req.timestamp > now - this.rateLimitWindow
    );

    if (userRequests.length >= this.maxRequestsPerWindow) {
      throw new Error(
        "Rate limit exceeded. Please wait before making more requests."
      );
    }

    // Clean old requests and add new one
    this.requestHistory = this.requestHistory.filter(
      (req) => req.timestamp > now - this.rateLimitWindow
    );
    this.requestHistory.push({ userId, timestamp: now });
  }

  isTransientError(error) {
    const transientErrors = [
      "rate limit",
      "timeout",
      "network",
      "connection",
      "temporary",
      "service unavailable",
      "quota exceeded",
    ];

    return transientErrors.some((keyword) =>
      error.message.toLowerCase().includes(keyword)
    );
  }

  isPermanentError(error) {
    const permanentErrors = [
      "invalid api key",
      "permission denied",
      "not found",
      "invalid request",
      "bad request",
      "unsupported",
    ];

    return permanentErrors.some((keyword) =>
      error.message.toLowerCase().includes(keyword)
    );
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default new GeminiService();

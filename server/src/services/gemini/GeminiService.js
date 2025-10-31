import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import TokenService from "../tokens/TokenService.js";
import { GEMINI_CONFIG, IMAGE_OPERATION_TYPES } from "../../utils/constant.js";

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

    // Rate limiting: 15 requests per minute for free tier
    this.rateLimitWindow = GEMINI_CONFIG.RATE_LIMIT_WINDOW_MS;
    this.maxRequestsPerWindow = GEMINI_CONFIG.MAX_REQUESTS_PER_WINDOW;
    this.requestHistory = [];
  }

  /**
   * Execute an operation with token management and retry logic
   */
  async executeWithTokens(userId, tokenCost, operationTypeName, operationFn, options = {}) {
    if (!tokenCost || tokenCost <= 0) {
      throw new Error(`Invalid token cost for operation: ${operationTypeName}`);
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
      const result = await this.executeWithRetry(operationFn, operationTypeName);

      const processingTime = Date.now() - startTime;

      // Deduct tokens (generation record is managed by controller)
      const newBalance = await TokenService.debit(userId, tokenCost, {
        reasonCode: "spend_generation",
        metadata: {
          operationType: operationTypeName,
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
   * Generate image from text prompt
   */
  async textToImage(userId, tokenCost, prompt, options = {}) {
    return this.executeWithTokens(
      userId,
      tokenCost,
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

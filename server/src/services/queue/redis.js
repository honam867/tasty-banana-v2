import Redis from "ioredis";
import { config } from "../../config/env.js";
import logger from "../../config/logger.js";

/**
 * Redis Connection Manager
 * Singleton pattern to manage Redis connections for BullMQ
 * Ensures connection reuse across the application
 */
class RedisManager {
  constructor() {
    this.connections = {
      client: null,
      subscriber: null,
    };
    this.isConnected = false;
  }

  /**
   * Get Redis configuration
   */
  getRedisConfig() {
    return {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      db: config.redis.db || 0,
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn(`Redis connection retry attempt ${times}, waiting ${delay}ms`);
        return delay;
      },
    };
  }

  /**
   * Initialize Redis connections
   * Creates separate connections for client and subscriber (required by BullMQ)
   */
  async connect() {
    if (this.isConnected) {
      logger.debug("Redis already connected");
      return this.connections;
    }

    try {
      const redisConfig = this.getRedisConfig();

      // Main client connection
      this.connections.client = new Redis(redisConfig);
      
      // Subscriber connection (BullMQ requires separate connection for pub/sub)
      this.connections.subscriber = new Redis(redisConfig);

      // Event handlers for client
      this.connections.client.on("connect", () => {
        logger.info("Redis client connected successfully");
        this.isConnected = true;
      });

      this.connections.client.on("error", (error) => {
        logger.error("Redis client error:", error);
      });

      this.connections.client.on("close", () => {
        logger.warn("Redis client connection closed");
        this.isConnected = false;
      });

      // Event handlers for subscriber
      this.connections.subscriber.on("connect", () => {
        logger.info("Redis subscriber connected successfully");
      });

      this.connections.subscriber.on("error", (error) => {
        logger.error("Redis subscriber error:", error);
      });

      await Promise.all([
        this.connections.client.ping(),
        this.connections.subscriber.ping(),
      ]);

      logger.info("Redis connections established and verified");
      return this.connections;
    } catch (error) {
      logger.error("Failed to connect to Redis:", error);
      throw error;
    }
  }

  /**
   * Get existing connections
   */
  getConnections() {
    if (!this.isConnected) {
      throw new Error("Redis not connected. Call connect() first.");
    }
    return this.connections;
  }

  /**
   * Create a new Redis connection with custom config
   * Useful for specific queue configurations
   */
  createConnection(customConfig = {}) {
    const config = { ...this.getRedisConfig(), ...customConfig };
    return new Redis(config);
  }

  /**
   * Close all connections
   */
  async disconnect() {
    try {
      if (this.connections.client) {
        await this.connections.client.quit();
      }
      if (this.connections.subscriber) {
        await this.connections.subscriber.quit();
      }
      this.isConnected = false;
      logger.info("Redis connections closed successfully");
    } catch (error) {
      logger.error("Error closing Redis connections:", error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: "disconnected", healthy: false };
      }

      const [clientPing, subscriberPing] = await Promise.all([
        this.connections.client.ping(),
        this.connections.subscriber.ping(),
      ]);

      return {
        status: "connected",
        healthy: clientPing === "PONG" && subscriberPing === "PONG",
        client: clientPing === "PONG",
        subscriber: subscriberPing === "PONG",
      };
    } catch (error) {
      logger.error("Redis health check failed:", error);
      return { status: "error", healthy: false, error: error.message };
    }
  }
}

// Export singleton instance
const redisManager = new RedisManager();
export default redisManager;

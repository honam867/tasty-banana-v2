import { testConnection } from "../../db/drizzle.js";
import logger from "../logger.js";
import { config } from "../env.js";

async function connect() {
  try {
    await testConnection();
    logger.info(`Connected to PostgreSQL: ${config.database.url.split("@")[1]}`);
  } catch (error) {
    logger.error("Failed to connect to PostgreSQL:", error);
    throw error;
  }
}

export default { connect };


import dotenv from "dotenv";
import logger from "./logger.js";

dotenv.config();

const requiredEnvVars = [
  "PORT",
  "BASE_URL",
  "POSTGRES_URL",
  "TOKEN_SECRET_KEY",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
];

const validateEnv = () => {
  const missing = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }

  logger.info("Environment variables validated successfully");
};

const config = {
  port: process.env.PORT || 3000,
  baseUrl: process.env.BASE_URL,
  nodeEnv: process.env.NODE_ENV || "development",
  database: {
    url: process.env.POSTGRES_URL,
  },
  jwt: {
    secret: process.env.TOKEN_SECRET_KEY,
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  r2: {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET,
    publicDomain: process.env.R2_PUBLIC_DOMAIN,
  },
  logLevel: process.env.LOG_LEVEL || "info",
};

export { config, validateEnv };

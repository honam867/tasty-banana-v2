import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let log = `[${level}] ${timestamp}: ${stack || message}`;
  
  if (Object.keys(metadata).length > 0) {
    log += ` ${JSON.stringify(metadata)}`;
  }
  
  return log;
});

const consoleFormat = combine(
  colorize({
    all: true,
    colors: {
      error: "red",
      warn: "yellow",
      info: "green",
      http: "cyan",
      debug: "blue",
    },
  }),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  errors({ stack: true }),
  logFormat
);

const fileFormat = combine(
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  errors({ stack: true }),
  logFormat
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    new DailyRotateFile({
      filename: path.join(__dirname, "../../logs/error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      level: "error",
      format: fileFormat,
      maxSize: "20m",
      maxFiles: "14d",
    }),
    new DailyRotateFile({
      filename: path.join(__dirname, "../../logs/combined-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      format: fileFormat,
      maxSize: "20m",
      maxFiles: "14d",
    }),
  ],
  exceptionHandlers: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    new DailyRotateFile({
      filename: path.join(__dirname, "../../logs/exceptions-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      format: fileFormat,
      maxSize: "20m",
      maxFiles: "14d",
    }),
  ],
  rejectionHandlers: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    new DailyRotateFile({
      filename: path.join(__dirname, "../../logs/rejections-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      format: fileFormat,
      maxSize: "20m",
      maxFiles: "14d",
    }),
  ],
});

winston.addColors({
  error: "red",
  warn: "yellow",
  info: "green",
  http: "cyan",
  debug: "blue",
});

export default logger;

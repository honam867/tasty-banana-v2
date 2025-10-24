import logger from "../config/logger.js";

export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;
    
    const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "http";
    
    logger.log(level, `${method} ${originalUrl} ${statusCode} - ${duration}ms - ${ip}`);
  });
  
  next();
};

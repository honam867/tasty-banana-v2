import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

import { config, validateEnv } from "./config/env.js";
import logger from "./config/logger.js";
import db from "./config/db/index.js";
import route from "./routes/index.js";
import { requestLogger } from "./middlewares/requestLogger.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

validateEnv();

const app = express();

db.connect();

app.use(express.static(path.join(__dirname, "public")));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(requestLogger);

route(app);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.port, () => {
  logger.info(`Server listening at ${config.baseUrl}:${config.port}`);
  logger.info(`Environment: ${config.nodeEnv}`);
});
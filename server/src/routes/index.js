import swaggerUi from 'swagger-ui-express';
import swaggerSpec from '../config/swagger.config.js';
import auth from "./auth.route.js";
import uploads from "./uploads.route.js";
import queue from "./queue.route.js";
import tokens from "./tokens.route.js";
import gemini from "./gemini.route.js";
import { ROUTES } from "../utils/routes.js";

function router(app) {
  // Swagger Documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
  }));
  
  // API Routes
  app.use(`/api${ROUTES.AUTH}`, auth);
  app.use(`/api${ROUTES.UPLOADS}`, uploads);
  app.use(`/api${ROUTES.TOKENS}`, tokens);
  app.use("/api/generate", gemini);
  app.use("/api/queue", queue);
}

export default router;

import auth from "./auth.route.js";
import uploads from "./uploads.route.js";
import queue from "./queue.route.js";
import { ROUTES } from "../utils/routes.js";

function router(app) {
  app.use(`/api${ROUTES.AUTH}`, auth);
  app.use(`/api${ROUTES.UPLOADS}`, uploads);
  app.use("/api/queue", queue);
}

export default router;

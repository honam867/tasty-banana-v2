import express from "express";
import { uploadFile } from "../controllers/uploads.controller.js";
import { verifyToken } from "../middlewares/tokenHandler.js";
import upload, { requireFile, handleMulterError } from "../config/multer.js";

const router = express.Router();

/**
 * @swagger
 * /uploads:
 *   post:
 *     summary: Upload a file to R2 storage
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload (max 10MB)
 *               purpose:
 *                 type: string
 *                 example: profile_picture
 *                 description: Purpose of the file upload
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     fileId:
 *                       type: string
 *                     url:
 *                       type: string
 *                     size:
 *                       type: integer
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/",
  verifyToken,
  upload.single("file"),
  handleMulterError,
  requireFile("file"),
  uploadFile
);

export default router;



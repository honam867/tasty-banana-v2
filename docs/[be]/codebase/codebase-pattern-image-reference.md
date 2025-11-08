# Image Reference Generation API - Codebase Pattern

## Metadata

- **Title:** Image Reference Generation API
- **Version:** 1.0
- **Status:** ✅ Implemented
- **Last Updated:** 2025-11-08

### Dependencies

- `@google/generative-ai` - Gemini 2.5 Flash Image
- `BullMQ` - Job Queue System
- `Socket.io` - WebSocket Real-time Communication
- `Cloudflare R2` - Object Storage
- `Drizzle ORM` - PostgreSQL Database
- `Multer` - File Upload Middleware
- `Sharp` - Image Validation

### Related Files

- `AGENTS.md` - Coding Guidelines
- `codebase-pattern-text-to-image.md` - Related text-to-image pattern
- `.taskmaster/templates/codebase_pattern_template.txt` - Template

### Tags

`#image-generation` `#reference-image` `#ai` `#gemini` `#async-processing` `#websocket` `#queue` `#token-management` `#file-upload` `#optimization`

---

## Pattern Name

**Reference-Based Image Generation with Temp File Optimization**

---

## Context

This pattern implements AI-powered image generation using reference images as style/subject guides. It extends the text-to-image pattern with reference image handling, dual input methods (upload or existing image), and temp file optimization.

### Problems Solved

1. ✅ **Reference image processing blocking HTTP requests** → Solved with async queue
2. ✅ **Re-downloading recently uploaded files from R2** → Solved with temp file caching
3. ✅ **Flexible reference input methods** → Support both file upload AND existing image UUID
4. ✅ **Different reference focus modes** → Subject, face, and full-image modes
5. ✅ **File cleanup and resource management** → Automatic temp file expiration (5 min)
6. ✅ **Token-based billing for reference operations** → Higher cost (150 tokens vs 100)

### Use Cases

- **Subject Reference:** Extract and replicate main subject/object from reference image
- **Face Reference:** Preserve facial features and identity in new contexts
- **Full Image Reference:** Capture complete style, composition, and aesthetic
- **Style Transfer:** Apply visual style from reference to new prompt-based generation
- **Consistent Character Generation:** Maintain character appearance across multiple generations

---

## Core Logic

### High-Level Flow

#### 1. **Initiation**
- HTTP POST request to `/api/generate/image-reference`
- Authenticated via JWT token (`verifyToken` middleware)
- **Dual input method:**
  - **Option A:** Upload new image file (multipart/form-data)
  - **Option B:** Provide existing `referenceImageId` (UUID)
- Must specify `referenceType`: `subject`, `face`, or `full_image`

#### 2. **Controller Layer (Immediate Response)**
- Validate input (prompt, referenceType, file OR referenceImageId)
- **If file uploaded:**
  - Save to R2 storage permanently
  - Store in temp cache for immediate processing (optimization)
  - Get `referenceImageId` from upload record
- **If referenceImageId provided:**
  - Validate ownership (user can only use their own images)
  - No temp storage (will fetch from R2 during processing)
- Create generation record in database with `PENDING` status
- Queue job in BullMQ with reference metadata
- Return **HTTP 202 Accepted** with WebSocket event names

#### 3. **Background Processing (Queue Worker)**
- Job dequeued by worker process
- Update status to `PROCESSING`
- **Load reference image (optimization path):**
  - Check temp file cache first (if file was uploaded)
  - If temp exists: use local path (fast)
  - If temp expired/missing: download from R2 via public URL
- Generate enhanced prompt using `generateReferencePrompt()` utility
- Generate images with reference using Gemini API
- Upload results to R2 concurrently
- Update database and emit WebSocket completion event

#### 4. **Decision Points**
- ❓ **Input method:** File upload OR existing referenceImageId
- ❓ **File validation:** Type (JPEG/PNG/WebP), size (<10MB), dimensions
- ❓ **Token balance check:** Fail if insufficient (150 tokens per image)
- ❓ **Reference image ownership:** Validate user has access to referenceImageId
- ❓ **Temp file availability:** Use temp cache or download from R2
- ❓ **Rate limit check:** Queue/reject if exceeded

#### 5. **Expected Outcomes**

**✅ SUCCESS:**
- Generation record marked `COMPLETED`
- Images uploaded to R2
- Tokens debited (150 per image)
- Temp files cleaned up automatically
- WebSocket completion event emitted

**❌ FAILURE:**
- Generation record marked `FAILED` with error message
- Uploaded files cleaned up
- Temp files cleaned up
- WebSocket failure event emitted
- No token debit

---

## Architecture

### Layered Architecture Pattern

```
Client (HTTP + WebSocket)
    ↓
Routes Layer (gemini.route.js)
    ↓ (middlewares: auth, upload, validation)
Controller Layer (gemini.controller.js::imageReference)
    ↓
File Upload Branch (if file provided)
    ├─ saveToStorage() → R2 + uploads table
    ├─ tempFileManager.storeTempFile() → temp cache (5 min TTL)
    └─ Cleanup original upload file
    ↓
Existing Image Branch (if referenceImageId provided)
    └─ Validate ownership (skip temp storage)
    ↓
Queue Layer (BullMQ)
    ↓ (async processing)
Processor Layer (processImageReference)
    ↓
Reference Image Loading
    ├─ Option A: tempFileManager.getTempFilePath() → Local temp file (fast)
    └─ Option B: db.select(uploads) → R2 public URL (download)
    ↓
Prompt Enhancement
    └─ generateReferencePrompt(prompt, referenceType) → Enhanced prompt
    ↓
Service Layer
    ├─ GeminiService.generateWithReference() → AI generation with reference
    ├─ TokenService (balance check, debit operations)
    └─ saveMultipleToStorage() → Concurrent R2 uploads
    ↓
External APIs
    ├─ Google Gemini AI (reference-based generation)
    └─ Cloudflare R2 (storage)
    ↓
Database (PostgreSQL via Drizzle ORM)
    ├─ imageGenerations table (with referenceImageId, referenceType)
    ├─ uploads table (reference + output images)
    ├─ userTokens table
    └─ tokenTransactions table

WebSocket (parallel notification channel)
    └─ Socket.io rooms (user-specific events)

Cleanup System (automatic)
    ├─ Temp file cleanup after processing (finally block)
    ├─ Temp file expiration (5 min TTL)
    └─ Upload file cleanup on error
```

### Data Flow Summary

- **Synchronous Path:** HTTP Request → File Upload (optional) → Temp Storage (optional) → Queue Job → HTTP 202 Response
- **Asynchronous Path:** Queue → Processor → Load Reference → Enhance Prompt → AI Service → Storage → Database → WebSocket Event
- **Optimization Path:** Temp Cache → Local File Access (avoids R2 download)

---

## Components

### 1. Routes Layer

**File:** `server/src/routes/gemini.route.js`

**Role:** API endpoint definition for image reference generation with file upload support

**Key Endpoint:**
- `POST /image-reference` - Queue reference-based generation job (file OR referenceImageId)

**Interactions:**
- Uses `verifyToken` middleware for authentication
- Uses `uploadSingle` middleware for file uploads (multer)
- Uses `validateImageReference` for input validation
- Uses `validateRequestWithCleanup` for validation error handling with file cleanup
- Calls `imageReference` controller
- Handles multer upload errors (file size, count limits)

**Request Body:**
- Multipart/form-data (if uploading file)
- JSON fields: `prompt`, `referenceType`, `aspectRatio`, `numberOfImages`, `projectId`
- File field: `image` (optional if `referenceImageId` provided)
- Alternative: `referenceImageId` (UUID, optional if `image` provided)

---

### 2. Controllers

**File:** `server/src/controllers/gemini.controller.js`

**Role:** Request/response handling for reference-based generation with dual input support

**Key Function:**

#### `imageReference(req, res)`
Handle reference-based image generation requests

**Flow:**
1. Extract user ID from JWT token
2. Extract request data: `prompt`, `referenceType`, `referenceImageId`, file
3. **Validate dual input:** Must provide EITHER file OR referenceImageId
4. **If file uploaded:**
   - Save to R2 storage via `saveToStorage()`
   - Create database upload record
   - Store in temp cache via `tempFileManager.storeTempFile()`
   - Cleanup original multer upload file
   - Get `referenceImageId` from upload record
5. **If referenceImageId provided:**
   - No temp storage (will be fetched from database during processing)
6. Get operation type from database (`image_reference` → 150 tokens)
7. Sanitize prompt (XSS protection)
8. Create generation record with `PENDING` status
9. Queue job with `IMAGE_REFERENCE` type
10. Return HTTP 202 Accepted with job/generation IDs and WebSocket events

**Interactions:**
- Calls `getOperationTypeByName('image_reference')` to fetch pricing
- Calls `saveToStorage()` to upload reference image to R2 (if file provided)
- Calls `tempFileManager.storeTempFile()` for optimization (if file provided)
- Calls `createGenerationRecord()` to create database record
- Calls `queueService.addJob()` to queue background job
- Returns `sendSuccess()` with 202 status
- On error: updates generation record, cleans up files, calls `handleGeminiError()`

**Error Handling:**
- Cleanup uploaded file on error (multer path)
- Cleanup temp file on error (if created)
- Update generation record to `FAILED`
- Return error response

---

### 3. Queue Processors

**File:** `server/src/services/queue/processors/imageGeneration.processor.js`

**Role:** Background job processor for reference-based image generation with temp file optimization

**Key Function:**

#### `processImageReference(job)`
Process reference-based generation jobs

**Job Data:**
- `userId`, `generationId`, `prompt`, `referenceImageId`, `referenceType`
- `numberOfImages`, `aspectRatio`, `projectId`, `operationTypeTokenCost`
- `tempFileId` (optional, if file was uploaded - enables optimization)

**Flow:**
1. Update status to `PROCESSING` (10% progress)
2. Emit WebSocket progress: "Loading reference image..."
3. **Load reference image (optimization path):**
   - If `tempFileId` provided:
     - Call `tempFileManager.getTempFilePath(tempFileId)`
     - If temp exists: use local path (optimization - fast)
     - If temp expired: fall back to R2 download
   - If no `tempFileId` or temp expired:
     - Query database: `db.select().from(uploads).where(id=referenceImageId, userId=userId)`
     - Validate ownership
     - Use `publicUrl` from upload record (R2 URL)
4. Generate enhanced prompt (20% progress)
   - Call `generateReferencePrompt(prompt, referenceType)`
   - Returns prompt with reference type instructions
5. **Generate images loop** (30-80% progress)
   - For each image (i = 0 to numberOfImages - 1):
     - Call `GeminiService.generateWithReference(userId, tokenCost, referenceImagePath, enhancedPrompt, options)`
     - Store result in `generationResults` array
     - Update progress and emit WebSocket event
6. Upload images to R2 concurrently (80-90% progress)
   - Call `saveMultipleToStorage()` with all generation results
   - Parallel upload via Promise.all
7. Update generation record (90-100% progress)
   - Status: `COMPLETED`
   - Store: `outputImageId`, `tokensUsed`, `processingTimeMs`, `aiMetadata`
8. Emit WebSocket completion event (100% progress)
9. **Cleanup (finally block):**
   - Call `tempFileManager.cleanup(tempFileId)` if temp file was used
   - Automatic cleanup regardless of success/failure

**Interactions:**
- Calls `updateGenerationRecord()` to update status and metadata
- Calls `emitGenerationProgress/Completed/Failed()` for WebSocket updates
- Calls `generateReferencePrompt()` for prompt enhancement
- Calls `tempFileManager.getTempFilePath()` for optimization path
- Calls `db.select().from(uploads)` to fetch reference image metadata
- Calls `GeminiService.generateWithReference()` for AI generation
- Calls `saveMultipleToStorage()` for concurrent uploads
- Calls `handleGeminiError()` on failure
- Calls `tempFileManager.cleanup()` in finally block

**Optimization Logic:**
- Temp file path (if available): No download needed, direct file access
- R2 public URL (fallback): GeminiService downloads via HTTP
- Automatic cleanup after use (success or failure)

---

### 4. Gemini Service

**File:** `server/src/services/gemini/GeminiService.js`

**Role:** Core AI integration service with reference image generation support

**Key Function:**

#### `generateWithReference(userId, tokenCost, referenceImagePath, prompt, options)`
Generate images using reference image as guide

**Parameters:**
- `userId` - User ID for token management
- `tokenCost` - Token cost (150 per image for image_reference)
- `referenceImagePath` - Local file path OR R2 public URL
- `prompt` - Enhanced prompt with reference instructions
- `options` - Generation options (aspectRatio, metadata)

**Flow:**
1. Wrapped in `executeWithTokens()` for token management
2. Check rate limit (15 req/min per user)
3. Check token balance (throw if insufficient)
4. **Load reference image:**
   - Call `imageToBase64(referenceImagePath)`
   - Handles both local file paths AND HTTP/HTTPS URLs
   - Local path: Read file directly via `fs.promises.readFile()`
   - URL: Fetch via HTTP, convert ArrayBuffer to base64
5. Determine MIME type from file path/URL
6. Build generation config (aspectRatio → imageConfig)
7. **Call Gemini API with retry logic:**
   - Pattern: `model.generateContent({ contents: [{ parts: [{ text: prompt }, { inlineData: { data: base64, mimeType } }] }], generationConfig })`
   - Text prompt + reference image as inlineData
   - Wrapped in `executeWithRetry()` for transient error handling
8. Extract image data from response
9. Debit tokens via `TokenService.debit()`
10. Return result with `imageData` (base64), `mimeType`, `size`

**Interactions:**
- Uses `GoogleGenerativeAI` SDK from `@google/generative-ai`
- Calls `TokenService.getBalance()` before operation
- Calls `TokenService.debit()` after successful generation
- Calls `imageToBase64()` to load reference (local or URL)
- Calls `executeWithRetry()` for API calls with backoff
- Throws errors on insufficient balance, rate limit, or AI failures

**Image Loading Logic:**
```javascript
async imageToBase64(imagePathOrUrl) {
  // Check if URL (http:// or https://)
  if (imagePathOrUrl.startsWith('http://') || imagePathOrUrl.startsWith('https://')) {
    // Fetch from R2 URL
    const response = await fetch(imagePathOrUrl);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  }
  
  // Local file path
  const imageData = await fs.promises.readFile(imagePathOrUrl);
  return imageData.toString('base64');
}
```

---

### 5. Temp File Manager

**File:** `server/src/utils/tempFileManager.js`

**Role:** Temporary file storage optimization with automatic cleanup

**Purpose:**
- Avoid re-downloading recently uploaded files from R2
- Store uploaded reference images temporarily during processing
- Automatic expiration and cleanup (5 min TTL)

**Key Functions:**

| Function | Description |
|----------|-------------|
| `storeTempFile(sourcePath, metadata, expiration)` | Store uploaded file in temp cache |
| `getTempFilePath(tempId)` | Get temp file path if exists and not expired |
| `getMetadata(tempId)` | Get temp file metadata |
| `exists(tempId)` | Check if temp file exists and is valid |
| `cleanup(tempId)` | Delete temp file after use |
| `cleanupExpired()` | Remove all expired temp files (cron job) |
| `cleanupAll()` | Remove all temp files (shutdown/testing) |
| `getStats()` | Get statistics (total, active, expired) |

**Storage Pattern:**
- Temp directory: `server/uploads/temp/`
- File naming: `{tempId}.{ext}` (UUID + original extension)
- In-memory registry: `Map<tempId, { path, metadata, createdAt, expiresAt }>`

**Usage in Image Reference Flow:**

```javascript
// 1. Store temp file after upload (controller)
const tempFileId = await tempFileManager.storeTempFile(
  uploadedFile.path,
  {
    userId,
    uploadId: referenceImageId,
    purpose: 'reference_image',
    referenceType
  }
);
// tempFileId passed to queue job

// 2. Retrieve temp file during processing (processor)
const tempPath = tempFileManager.getTempFilePath(tempFileId);
if (tempPath) {
  // Use local temp file (optimization - no R2 download)
  referenceImagePath = tempPath;
} else {
  // Temp expired, fetch from R2 (fallback)
  referenceImagePath = uploadRecord.publicUrl;
}

// 3. Cleanup after processing (processor finally block)
tempFileManager.cleanup(tempFileId);
```

**Interactions:**
- Called by `gemini.controller.js` to store uploaded files
- Called by `imageGeneration.processor.js` to retrieve/cleanup files
- Uses `file.helper.js::cleanupFile()` for disk cleanup
- Maintains in-memory registry (no database overhead)

**Expiration Logic:**
- Default TTL: 5 minutes (300,000 ms)
- Auto-cleanup on expired access attempts
- Scheduled cleanup via cron job (optional)

---

### 6. Image Reference Prompts

**File:** `server/src/utils/imageReferencePrompts.js`

**Role:** Generate enhanced prompts based on reference type

**Key Function:**

#### `generateReferencePrompt(userPrompt, referenceType)`
Generate AI-optimized prompt with reference instructions

**Reference Types:**

##### 1. **Subject Mode** (`subject`)
Focus on main subject/object from reference image

**Enhanced Prompt:**
```
{userPrompt}

Focus only on the main subject/object from the reference image.
Extract and replicate:
- Subject's key characteristics and features
- Form, shape, and proportions
- Colors and textures
- Important details and attributes

Create a new image maintaining the subject's identity while following the prompt.
Professional quality, clear focus on the subject.
```

##### 2. **Face Mode** (`face`)
Preserve facial features and identity

**Enhanced Prompt:**
```
{userPrompt}

Focus specifically on the face from the reference image.
Preserve and replicate:
- Facial structure and features
- Eyes, nose, mouth proportions
- Skin tone and complexion
- Hair style and color
- Facial expression characteristics

Generate a new image maintaining facial identity while following the prompt.
High-quality portrait, clear facial details.
```

##### 3. **Full Image Mode** (`full_image`)
Capture complete composition and style

**Enhanced Prompt:**
```
{userPrompt}

Analyze the entire reference image comprehensively.
Consider and replicate:
- Overall composition and layout
- Color palette and harmony
- Lighting and mood
- Style and aesthetic
- Background elements and context
- Spatial relationships

Create a new image that captures the complete essence while following the prompt.
Professional quality, cohesive composition.
```

**Default:** Falls back to `full_image` if invalid type provided

**Usage:**
```javascript
const enhancedPrompt = generateReferencePrompt(
  "Professional portrait in a modern office",
  "face"
);
// Result: User prompt + face-specific instructions
```

---

### 7. Upload Middleware

**File:** `server/src/middlewares/upload.js`

**Role:** Multer configuration for image file uploads with validation

**Key Middleware:**

#### `uploadSingle`
Handle single image file upload for reference images

**Configuration:**
- Destination: `uploads/` (temporary multer storage)
- File size limit: 10MB (GEMINI_LIMITS.FILE_SIZE_MAX)
- File count limit: 5 files max (GEMINI_LIMITS.FILE_COUNT_MAX)

**Validation:**
1. **MIME type validation:**
   - Allowed: `image/jpeg`, `image/png`, `image/webp`
   - Rejects: All other types

2. **File extension validation:**
   - Allowed: `.jpg`, `.jpeg`, `.png`, `.webp`
   - Case-insensitive check

3. **Image dimension validation (Sharp):**
   - Max dimensions: 4096x4096 pixels
   - Min dimensions: 64x64 pixels
   - Non-blocking (allows upload if Sharp validation fails)

**Error Handling:**
- Returns descriptive error messages
- Prevents upload of invalid files
- Integrated with `validateRequestWithCleanup` for file cleanup on validation errors

**Usage in Route:**
```javascript
router.post(
  "/image-reference",
  verifyToken,
  uploadSingle,  // Handles file upload
  validateImageReference,
  validateRequestWithCleanup,
  asyncHandler(imageReference)
);
```

---

### 8. Validators

**File:** `server/src/middlewares/validators.js`

**Role:** Input validation for image reference requests

**Key Validator:**

#### `validateImageReference`
Express-validator middleware chain for reference generation

**Validation Rules:**

```javascript
[
  body('prompt')
    .notEmpty()
    .isLength({ min: 5, max: 2000 }),
  
  body('referenceType')
    .notEmpty()
    .isIn(['subject', 'face', 'full_image']),
  
  body('referenceImageId')
    .optional({ values: 'falsy' })
    .isUUID(),
  
  body('aspectRatio')
    .optional({ values: 'falsy' })
    .isIn(['1:1', '16:9', '9:16', '4:3', '3:4']),
  
  body('numberOfImages')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: 4 }),
  
  body('projectId')
    .optional({ values: 'falsy' })
    .isUUID()
]
```

**Note:** Does NOT validate file upload (handled by multer middleware)

#### `validateRequestWithCleanup`
Validation error handler with file cleanup

**Behavior:**
- Checks `validationResult(req)` for errors
- If errors exist:
  - Cleanup uploaded files (`req.file`, `req.files`)
  - Delete files from disk (multer temporary storage)
  - Return 400 Bad Request with first error message
- If no errors: proceed to next middleware

**Cleanup Logic:**
```javascript
// Single file
if (req.file && fs.existsSync(req.file.path)) {
  fs.unlinkSync(req.file.path);
}

// Multiple files (array)
if (req.files && Array.isArray(req.files)) {
  req.files.forEach(file => {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
  });
}
```

---

### 9. Database Schema

**File:** `server/src/db/schema.js`

**Key Tables:**

#### `imageGenerations`
Tracks all generation requests (including reference-based)

**Additional Fields for Image Reference:**
- `referenceImageId` (UUID, foreign key to `uploads.id`) - Reference image used
- `referenceType` (enum: subject, face, full_image) - Reference mode

**Complete Schema:**
```javascript
{
  id: UUID (primary key),
  userId: UUID (foreign key),
  operationTypeId: UUID (foreign key to operationType),
  prompt: TEXT,
  status: ENUM (pending, processing, completed, failed, cancelled),
  model: VARCHAR (gemini-2.5-flash-image),
  tokensUsed: INTEGER,
  outputImageId: UUID (foreign key to uploads),
  referenceImageId: UUID (foreign key to uploads), // For image reference
  referenceType: VARCHAR, // subject | face | full_image
  aiMetadata: JSONB,
  processingTimeMs: INTEGER,
  errorMessage: TEXT,
  createdAt: TIMESTAMP,
  completedAt: TIMESTAMP
}
```

#### `uploads`
Stores file metadata for reference and output images

**Purpose Values:**
- `generation_input` - Reference images uploaded by user
- `generation_output` - AI-generated images

**Schema:**
```javascript
{
  id: UUID (primary key),
  userId: UUID (foreign key),
  title: VARCHAR,
  purpose: VARCHAR,
  storageProvider: VARCHAR (r2),
  storageBucket: VARCHAR,
  storageKey: VARCHAR (g/{userId}/{filename}),
  publicUrl: VARCHAR,
  mimeType: VARCHAR,
  sizeBytes: INTEGER,
  createdAt: TIMESTAMP
}
```

---

### 10. WebSocket Emitters

**File:** `server/src/services/websocket/emitters/imageGeneration.emitter.js`

**Role:** WebSocket event emission for real-time client updates

**Events:** Same as text-to-image (shared emitter functions)

| Function | Event | Description |
|----------|-------|-------------|
| `emitGenerationProgress()` | `generation_progress` | Send progress updates (0-100%) |
| `emitGenerationCompleted()` | `generation_completed` | Send completion event with image URLs |
| `emitGenerationFailed()` | `generation_failed` | Send failure event with error message |

**Usage in Image Reference Flow:**
```javascript
// Progress updates
emitGenerationProgress(userId, generationId, 10, "Loading reference image...");
emitGenerationProgress(userId, generationId, 30, "Generating with reference...");

// Completion
emitGenerationCompleted(userId, generationId, {
  generationId,
  images: [...],
  referenceType: "face",
  tokens: { used: 150, remaining: 9850 }
});

// Failure
emitGenerationFailed(userId, generationId, "Reference image not found");
```

---

### 11. Storage Helpers

**File:** `server/src/utils/gemini.helper.js`

**Role:** Storage operations for reference and output images

**Key Functions:**

#### `saveToStorage({ source, filePath, userId, purpose, title, metadata })`
Save single image to R2 and create database record

**Used for:**
- Uploading reference images (purpose: `GENERATION_INPUT`)
- Uploading generated images (purpose: `GENERATION_OUTPUT`)

**Input Sources:**
- `filePath` - Local file path (multer uploads)
- `source.imageData` - Base64 image data (AI generation results)
- `source` (Buffer) - Direct buffer data

**Flow:**
1. Convert input to buffer (read file or decode base64)
2. Determine MIME type and extension
3. Generate unique filename: `{prefix}-{generationId}-{timestamp}.{ext}`
4. Generate storage key: `g/{userId}/{filename}`
5. Upload to R2 via `uploadToR2()`
6. Create database record via `createUpload()`
7. Return upload record with `publicUrl`, `id`, etc.

#### `saveMultipleToStorage(images)`
Save multiple images concurrently to R2

**Used for:**
- Batch upload of generated images (1-4 images)

**Flow:**
1. Prepare upload configurations for all images
2. Upload all files concurrently to R2 via `uploadMultipleToR2()` (Promise.all)
3. Create database records concurrently via `createUpload()` (Promise.all)
4. Return array of upload records

---

### 12. Constants

**File:** `server/src/utils/constant.js`

**Key Constants for Image Reference:**

```javascript
// Operation Types
IMAGE_OPERATION_TYPES = {
  TEXT_TO_IMAGE: "text_to_image",
  IMAGE_REFERENCE: "image_reference"  // 150 tokens per image
};

// Reference Types
IMAGE_REFERENCE_TYPES = {
  SUBJECT: "subject",
  FACE: "face",
  FULL_IMAGE: "full_image"
};

IMAGE_REFERENCE_TYPES_ARRAY = ['subject', 'face', 'full_image'];

// Limits
GEMINI_LIMITS = {
  FILE_SIZE_MAX: 10 * 1024 * 1024,  // 10MB
  FILE_COUNT_MAX: 5,
  IMAGE_WIDTH_MAX: 4096,
  IMAGE_HEIGHT_MAX: 4096,
  IMAGE_WIDTH_MIN: 64,
  IMAGE_HEIGHT_MIN: 64,
  PROMPT_MIN_LENGTH: 5,
  PROMPT_MAX_LENGTH: 2000,
  NUMBER_OF_IMAGES_MIN: 1,
  NUMBER_OF_IMAGES_MAX: 4
};

// Allowed File Types
GEMINI_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
GEMINI_ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Temp File Config
TEMP_FILE_CONFIG = {
  PURPOSE: {
    REFERENCE_IMAGE: 'reference_image'
  },
  EXPIRATION_MS: 5 * 60 * 1000  // 5 minutes
};

// Upload Purpose
UPLOAD_PURPOSE = {
  GENERATION_INPUT: 'generation_input',
  GENERATION_OUTPUT: 'generation_output'
};
```

---

## Data Flow

### Trigger

#### Image Reference Trigger (File Upload Method)

```http
POST /api/generate/image-reference
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

{
  "prompt": "Professional portrait in a modern office",
  "referenceType": "face",
  "image": [FILE],              // Reference image file (JPG/PNG/WebP, max 10MB)
  "aspectRatio": "1:1",         // Optional: default "1:1"
  "numberOfImages": 1,          // Optional: 1-4, default 1
  "projectId": "uuid"           // Optional
}
```

#### Image Reference Trigger (Existing Image Method)

```http
POST /api/generate/image-reference
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

{
  "prompt": "Professional portrait in a modern office",
  "referenceType": "face",
  "referenceImageId": "550e8400-e29b-41d4-a716-446655440000",  // UUID of existing image
  "aspectRatio": "1:1",
  "numberOfImages": 1,
  "projectId": "uuid"
}
```

**Note:** Must provide EITHER `image` file OR `referenceImageId` UUID (not both)

---

### Sequence

#### **Phase 1: Request Handling (Controller - Synchronous)**

##### Step 1: Route middleware chain executes
- `verifyToken`: Authenticate user, attach `req.user`
- `uploadSingle`: Handle file upload via multer (creates `req.file`)
- `validateImageReference`: Validate prompt, referenceType, aspectRatio, etc.
- `validateRequestWithCleanup`: Check validation errors, cleanup files if needed

##### Step 2: Controller extracts data
- `userId` from `req.user.id` (lodash.get)
- `prompt`, `referenceType`, `aspectRatio`, `numberOfImages` from `req.body`
- `referenceImageId` from `req.body` (if provided)
- `uploadedFile` from `req.file` (if uploaded)

##### Step 3: Validate dual input requirement
```javascript
if (!uploadedFile && !referenceImageId) {
  throwError('Either upload an image file or provide referenceImageId');
}
```

##### Step 4: Upload flow (if file provided)

**a. Save to R2 storage:**
```javascript
const uploadRecord = await saveToStorage({
  filePath: uploadedFile.path,
  userId,
  purpose: UPLOAD_PURPOSE.GENERATION_INPUT,
  title: `Reference image for: ${prompt.substring(0, 50)}`,
  metadata: {
    originalName: uploadedFile.originalname,
    referenceType
  }
});
referenceImageId = uploadRecord.id;  // Get UUID from upload
```

**b. Store in temp cache (optimization):**
```javascript
const tempFileId = await tempFileManager.storeTempFile(
  uploadedFile.path,
  {
    userId,
    uploadId: referenceImageId,
    purpose: TEMP_FILE_CONFIG.PURPOSE.REFERENCE_IMAGE,
    referenceType
  }
);
// tempFileId will be passed to queue job
```

**c. Cleanup original multer upload:**
```javascript
if (fs.existsSync(uploadedFile.path)) {
  fs.unlinkSync(uploadedFile.path);
}
```

##### Step 5: Existing image flow (if referenceImageId provided)
- No file upload, no temp storage
- `tempFileId` will be `null` in queue job
- Processor will fetch from database during processing

##### Step 6: Sanitize prompt
- Trim whitespace
- Remove script tags (XSS protection)

##### Step 7: Fetch operation type from database
- Call `getOperationTypeByName('image_reference')`
- Get `tokensPerOperation` = 150

##### Step 8: Create generation record in database
- Call `createGenerationRecord()`
- Status: `PENDING`
- Store: `userId`, `operationTypeId`, `prompt`, `referenceImageId`, `referenceType`, metadata
- Returns `generationId` (UUID)

##### Step 9: Queue job in BullMQ
- Ensure `IMAGE_GENERATION` queue exists
- Call `queueService.addJob()`
- Job type: `IMAGE_REFERENCE`
- Job data:
  ```javascript
  {
    userId,
    generationId,
    prompt: sanitizedPrompt,
    referenceImageId,
    referenceType,
    numberOfImages,
    aspectRatio,
    projectId,
    operationTypeTokenCost: 150,
    tempFileId  // null if referenceImageId flow, UUID if upload flow
  }
  ```
- Priority: `NORMAL`
- Retry: 3 attempts with exponential backoff

##### Step 10: Return HTTP 202 Accepted
```json
{
  "success": true,
  "data": {
    "jobId": "12345",
    "generationId": "uuid",
    "referenceImageId": "ref-uuid",
    "status": "pending",
    "message": "Image reference generation queued successfully",
    "numberOfImages": 1,
    "metadata": {
      "prompt": "Professional portrait in a modern office",
      "referenceType": "face",
      "aspectRatio": "1:1",
      "projectId": "uuid",
      "uploadedNewImage": true  // true if file uploaded, false if existing
    },
    "websocketEvents": {
      "progress": "generation_progress",
      "completed": "generation_completed",
      "failed": "generation_failed"
    },
    "statusEndpoint": "/api/generate/queue/{generationId}"
  }
}
```

---

#### **Phase 2: Background Processing (Processor - Asynchronous)**

##### Step 11: Job dequeued by worker
- Worker picks up job from `IMAGE_GENERATION` queue
- Calls `processImageReference()`

##### Step 12: Update status to PROCESSING (10% progress)
```javascript
updateGenerationRecord(generationId, { 
  status: PROCESSING,
  referenceImageId,
  referenceType
})
job.updateProgress(10)
emitGenerationProgress(userId, generationId, 10, "Loading reference image...")
```

##### Step 13: Load reference image (optimization path)

**Option A: Temp file exists (upload flow):**
```javascript
if (tempFileId) {
  referenceImagePath = tempFileManager.getTempFilePath(tempFileId);
  
  if (referenceImagePath) {
    // SUCCESS: Use local temp file (optimization - no download)
    usedTempFile = true;
    logger.info(`Using temp file for processing: ${tempFileId}`);
  } else {
    // EXPIRED: Temp file expired, fall back to R2 download
    logger.warn(`Temp file expired: ${tempFileId}, falling back to R2`);
  }
}
```

**Option B: No temp file or expired (existing image flow or fallback):**
```javascript
if (!referenceImagePath) {
  // Fetch from database
  const referenceImage = await db
    .select()
    .from(uploads)
    .where(
      and(
        eq(uploads.id, referenceImageId),
        eq(uploads.userId, userId)  // Authorization check
      )
    )
    .limit(1);
  
  if (!referenceImage.length) {
    throw new Error('Reference image not found or access denied');
  }
  
  // Use publicUrl (R2 URL - will be downloaded by GeminiService)
  referenceImagePath = referenceImage[0].publicUrl;
  logger.info(`Using R2 public URL: ${referenceImagePath}`);
}
```

##### Step 14: Enhance prompt (20-30% progress)
```javascript
const enhancedPrompt = generateReferencePrompt(prompt, referenceType);
// Returns: user prompt + reference type instructions

job.updateProgress(30)
emitGenerationProgress(userId, generationId, 30, "Generating with reference...")
```

##### Step 15: Generate images loop (30-80% progress)

For each image (i = 0 to numberOfImages - 1):

**a. Call GeminiService with reference:**
```javascript
const result = await GeminiService.generateWithReference(
  userId,
  operationTypeTokenCost,  // 150 tokens
  referenceImagePath,      // Local temp path OR R2 public URL
  enhancedPrompt,
  {
    aspectRatio,
    metadata: {
      originalPrompt: prompt,
      referenceType,
      projectId,
      generationId,
      imageNumber: i + 1,
      totalImages: numberOfImages,
      usedTempFile  // Track optimization usage
    }
  }
);
```

**b. Internal GeminiService Flow:**
- Check token balance (throw if insufficient)
- Check rate limit (throw if exceeded)
- Load reference image:
  - If local path: `fs.promises.readFile(referenceImagePath)`
  - If URL: `fetch(referenceImagePath)` → convert to base64
- Call Gemini API: `model.generateContent({ contents: [{ parts: [{ text: enhancedPrompt }, { inlineData: { data: base64, mimeType } }] }] })`
- Retry logic: max 3 attempts with exponential backoff
- Extract `imageData` (base64), `mimeType`, `size` from response
- Debit tokens via `TokenService.debit()`
- Store result in `generationResults` array

**c. Update progress:**
```javascript
const progressPerImage = 50 / numberOfImages;
const currentProgress = 30 + (i + 1) * progressPerImage;
job.updateProgress(currentProgress);
emitGenerationProgress(userId, generationId, currentProgress, `Generated image ${i+1}/${numberOfImages}`);
```

##### Step 16: Upload images to R2 concurrently (80-90% progress)

```javascript
// Prepare upload array
const imagesToUpload = generationResults.map((genResult) => ({
  source: genResult.result,
  userId,
  purpose: UPLOAD_PURPOSE.GENERATION_OUTPUT,
  title: `Ref-${referenceType}: ${prompt.substring(0, 50)}... (${genResult.imageNumber}/${numberOfImages})`,
  metadata: {
    generationId,
    aspectRatio,
    referenceType,
    imageNumber: genResult.imageNumber
  }
}));

// Concurrent upload (Promise.all)
const uploadRecords = await saveMultipleToStorage(imagesToUpload);

job.updateProgress(90);
emitGenerationProgress(userId, generationId, 90, "Finalizing...");
```

##### Step 17: Update generation record (90-100% progress)

```javascript
const generatedImages = uploadRecords.map((uploadRecord, index) => ({
  imageUrl: uploadRecord.publicUrl,
  imageId: uploadRecord.id,
  mimeType: generationResults[index].result.mimeType,
  imageSize: generationResults[index].result.size
}));

updateGenerationRecord(generationId, {
  status: COMPLETED,
  outputImageId: generatedImages[0].imageId,  // First image as primary
  tokensUsed: totalTokensUsed,
  processingTimeMs: totalProcessingTime,
  aiMetadata: JSON.stringify({
    aspectRatio,
    numberOfImages,
    prompt,
    enhancedPrompt,
    referenceType,
    referenceImageId,
    imageIds: generatedImages.map(img => img.imageId)
  })
});
```

##### Step 18: Emit completion event (100% progress)

```javascript
job.updateProgress(100);

const result = {
  generationId,
  images: generatedImages,
  numberOfImages,
  referenceType,
  metadata: {
    prompt,
    referenceType,
    aspectRatio
  },
  tokens: {
    used: totalTokensUsed,
    remaining: remainingBalance
  },
  processing: {
    timeMs: totalProcessingTime,
    status: COMPLETED
  },
  createdAt: new Date().toISOString()
};

emitGenerationCompleted(userId, generationId, result);
```

##### Step 19: Cleanup (finally block)

```javascript
finally {
  // Cleanup temp file after processing (success or failure)
  if (tempFileId) {
    tempFileManager.cleanup(tempFileId);
    logger.debug(`Cleaned up temp file: ${tempFileId}`);
  }
}
```

---

#### **Phase 3: Error Handling (if any step fails)**

##### Step 20: Catch error in processor

```javascript
catch (error) {
  logger.error(`Image reference generation failed: ${job.id}`, error);
  
  // Update database
  await updateGenerationRecord(generationId, {
    status: FAILED,
    errorMessage: error.message
  });
  
  // Map error
  const geminiError = handleGeminiError(error);
  
  // Notify client
  emitGenerationFailed(userId, generationId, geminiError.message);
  
  // Re-throw for BullMQ retry
  throw error;
} finally {
  // Cleanup temp file (always runs)
  if (tempFileId) {
    tempFileManager.cleanup(tempFileId);
  }
}
```

##### Step 21: Controller error handling (synchronous errors)

```javascript
catch (error) {
  // Cleanup uploaded file
  if (uploadedFile?.path && fs.existsSync(uploadedFile.path)) {
    fs.unlinkSync(uploadedFile.path);
  }
  
  // Cleanup temp file
  if (tempFileId) {
    tempFileManager.cleanup(tempFileId);
  }
  
  // Update generation record
  if (generationId) {
    await updateGenerationRecord(generationId, {
      status: FAILED,
      errorMessage: error.message
    });
  }
  
  // Return error
  const geminiError = handleGeminiError(error);
  throwError(geminiError.message, geminiError.status);
}
```

**BullMQ Retry Logic:**
- Transient errors: Retry up to 3 times with exponential backoff
- Permanent errors: Immediate failure, no retry

---

### Completion

#### ✅ Success Completion

**Database:**
- `imageGenerations` record:
  ```javascript
  {
    status: 'completed',
    referenceImageId: 'ref-uuid',
    referenceType: 'face',
    outputImageId: 'output-uuid',
    tokensUsed: 150,
    processingTimeMs: 18500
  }
  ```

**Storage:**
- Reference image uploaded to R2: `g/{userId}/input-{genId}-{timestamp}.jpg`
- Generated images uploaded to R2: `g/{userId}/gen-{genId}-{n}-{timestamp}.png`

**Token Ledger:**
- `tokenTransactions` record: `DEBIT`, amount: 150, reason: `spend_generation`
- `userTokens.balance` decreased by 150

**Temp Files:**
- Temp file cleaned up automatically (if used)

**WebSocket:**
- Client receives `generation_completed` event with image URLs and referenceType

**Client:**
- Display generated images
- Show reference type used
- Update token balance

---

#### ❌ Failure Completion

**Database:**
- `imageGenerations` record: `status='failed'`, `errorMessage` set

**Storage:**
- Reference image may be in R2 (if uploaded before error)
- No generated images uploaded

**Token Ledger:**
- No transaction created (no token debit on failure)

**Temp Files:**
- Temp file cleaned up automatically (finally block)

**Uploaded Files:**
- Multer upload file deleted (controller catch block)

**WebSocket:**
- Client receives `generation_failed` event with error message

**Client:**
- Show error to user
- Prompt retry with same or different reference

---

## API Documentation

### Endpoint: Image Reference

```http
POST /api/generate/image-reference
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data
```

#### Request Body (File Upload Method)

```
prompt: "Professional portrait in a modern office"
referenceType: "face"             # Required: "subject" | "face" | "full_image"
image: [FILE]                     # Reference image file (JPG/PNG/WebP, max 10MB)
aspectRatio: "1:1"                # Optional: "1:1" | "16:9" | "9:16" | "4:3" | "3:4"
numberOfImages: 1                 # Optional: 1-4, default 1
projectId: "uuid"                 # Optional
```

#### Request Body (Existing Image Method)

```
prompt: "Professional portrait in a modern office"
referenceType: "face"
referenceImageId: "550e8400-e29b-41d4-a716-446655440000"  # UUID of existing image
aspectRatio: "1:1"
numberOfImages: 1
projectId: "uuid"
```

**Note:** Must provide EITHER `image` file OR `referenceImageId` UUID

#### Reference Types

| Type | Description | Use Case |
|------|-------------|----------|
| `subject` | Extract main subject/object characteristics | Product design, object replication |
| `face` | Preserve facial features and identity | Portrait generation, character consistency |
| `full_image` | Capture complete composition and style | Style transfer, aesthetic matching |

#### File Validation

- **Allowed types:** JPEG, PNG, WebP
- **Max size:** 10MB
- **Max dimensions:** 4096x4096 pixels
- **Min dimensions:** 64x64 pixels

#### Response (HTTP 202 Accepted)

```json
{
  "success": true,
  "data": {
    "jobId": "12345",
    "generationId": "550e8400-e29b-41d4-a716-446655440000",
    "referenceImageId": "ref-550e8400-e29b-41d4-a716-446655440000",
    "status": "pending",
    "message": "Image reference generation queued successfully",
    "numberOfImages": 1,
    "metadata": {
      "prompt": "Professional portrait in a modern office",
      "referenceType": "face",
      "aspectRatio": "1:1",
      "projectId": "uuid",
      "uploadedNewImage": true
    },
    "websocketEvents": {
      "progress": "generation_progress",
      "completed": "generation_completed",
      "failed": "generation_failed"
    },
    "statusEndpoint": "/api/generate/queue/550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

### WebSocket Events

#### Event: `generation_progress`

```json
{
  "generationId": "550e8400-e29b-41d4-a716-446655440000",
  "progress": 30,
  "message": "Generating with reference...",
  "timestamp": "2025-11-08T10:30:00.000Z"
}
```

**Progress Messages:**
- 10%: "Loading reference image..."
- 30%: "Generating with reference..."
- 30-80%: "Generated image {n}/{total}"
- 80%: "Uploading images..."
- 90%: "Finalizing..."

#### Event: `generation_completed`

```json
{
  "generationId": "550e8400-e29b-41d4-a716-446655440000",
  "result": {
    "generationId": "550e8400-e29b-41d4-a716-446655440000",
    "images": [
      {
        "imageUrl": "https://r2.example.com/g/userId/gen-genId-1-timestamp.png",
        "imageId": "image-uuid-1",
        "mimeType": "image/png",
        "imageSize": 524288
      }
    ],
    "numberOfImages": 1,
    "referenceType": "face",
    "metadata": {
      "prompt": "Professional portrait in a modern office",
      "referenceType": "face",
      "aspectRatio": "1:1"
    },
    "tokens": {
      "used": 150,
      "remaining": 9850
    },
    "processing": {
      "timeMs": 18500,
      "status": "completed"
    },
    "createdAt": "2025-11-08T10:30:18.500Z"
  },
  "timestamp": "2025-11-08T10:30:18.500Z"
}
```

#### Event: `generation_failed`

```json
{
  "generationId": "550e8400-e29b-41d4-a716-446655440000",
  "error": "Reference image not found or access denied",
  "timestamp": "2025-11-08T10:30:05.123Z"
}
```

---

## Interaction Map

### Synchronous Request Flow (File Upload)

```
Client HTTP POST (multipart/form-data)
    ↓
Express Route (gemini.route.js)
    ↓ (middleware chain)
verifyToken → uploadSingle (multer) → validateImageReference → validateRequestWithCleanup
    ↓
Controller (gemini.controller.js::imageReference)
    ├─ getOperationTypeByName('image_reference') → operationType table (150 tokens)
    ├─ saveToStorage() → R2 + uploads table (reference image)
    ├─ tempFileManager.storeTempFile() → temp cache (5 min TTL)
    ├─ fs.unlinkSync() → cleanup multer upload
    ├─ createGenerationRecord() → imageGenerations table (PENDING)
    └─ queueService.addJob() → BullMQ Redis queue (with tempFileId)
    ↓
HTTP 202 Response to Client
```

### Synchronous Request Flow (Existing Image)

```
Client HTTP POST (with referenceImageId)
    ↓
Express Route (gemini.route.js)
    ↓ (middleware chain)
verifyToken → uploadSingle (no file) → validateImageReference → validateRequestWithCleanup
    ↓
Controller (gemini.controller.js::imageReference)
    ├─ getOperationTypeByName('image_reference') → operationType table
    ├─ createGenerationRecord() → imageGenerations table (PENDING)
    └─ queueService.addJob() → BullMQ Redis queue (tempFileId = null)
    ↓
HTTP 202 Response to Client
```

### Asynchronous Processing Flow (with Temp File Optimization)

```
BullMQ Worker
    ↓
Processor (imageGeneration.processor.js::processImageReference)
    ├─ updateGenerationRecord() → imageGenerations (PROCESSING)
    ├─ emitGenerationProgress() → WebSocket → Client (10%)
    │
    ├─ Load Reference Image (Optimization Path):
    │   ├─ tempFileManager.getTempFilePath(tempFileId)
    │   ├─ IF temp exists:
    │   │   └─ Use local path (fast - no download)
    │   └─ IF temp expired/missing:
    │       └─ db.select() → uploads table → publicUrl (R2)
    │
    ├─ generateReferencePrompt(prompt, referenceType) → enhanced prompt
    ├─ emitGenerationProgress() → WebSocket → Client (30%)
    ↓
Loop (numberOfImages times):
    ├─ GeminiService.generateWithReference()
    │   ├─ checkRateLimit() → in-memory rate limiter
    │   ├─ TokenService.getBalance() → userTokens table
    │   ├─ imageToBase64(referenceImagePath) → base64 encoding
    │   │   ├─ IF local path: fs.promises.readFile()
    │   │   └─ IF URL: fetch() → ArrayBuffer → base64
    │   ├─ executeWithRetry() → Google Gemini API
    │   │   └─ model.generateContent({ text + inlineData })
    │   ├─ extractImage() → base64 image data
    │   └─ TokenService.debit() → userTokens + tokenTransactions tables
    └─ emitGenerationProgress() → WebSocket → Client (30-80%)
    ↓
saveMultipleToStorage() (concurrent)
    ├─ uploadMultipleToR2() → Cloudflare R2 (parallel uploads)
    └─ createUpload() (loop) → uploads table
    ↓
updateGenerationRecord() → imageGenerations (COMPLETED)
    ↓
emitGenerationCompleted() → WebSocket → Client (100%)
    ↓
tempFileManager.cleanup(tempFileId) → remove temp file
```

### Error Flow with Cleanup

```
Error thrown at any step
    ↓
Processor catch block
    ├─ updateGenerationRecord() → imageGenerations (FAILED)
    ├─ handleGeminiError() → map to HTTP status
    ├─ emitGenerationFailed() → WebSocket → Client
    └─ Cleanup (finally block):
        └─ tempFileManager.cleanup(tempFileId)
    ↓
Controller catch block (if synchronous error)
    ├─ fs.unlinkSync(uploadedFile.path) → cleanup multer upload
    ├─ tempFileManager.cleanup(tempFileId) → cleanup temp file
    ├─ updateGenerationRecord() → imageGenerations (FAILED)
    └─ throwError() → HTTP error response
    ↓
BullMQ retry logic (if transient error)
    └─ Re-queue job with exponential backoff (2s, 4s, 8s)
```

---

## Error Handling

### Controller-Level Errors (Synchronous)

| Error Type | Status | Handling |
|------------|--------|----------|
| Missing image AND referenceImageId | 400 Bad Request | Return error immediately |
| Validation errors | 400 Bad Request | Cleanup uploaded files, return error |
| Authentication errors | 401 Unauthorized | Via verifyToken middleware |
| File upload errors (multer) | 400 Bad Request | File too large, invalid type |
| Storage upload errors | 500 Internal Server Error | Log and return error |
| Database errors | 500 Internal Server Error | Log and return error |

**Cleanup on Controller Error:**
- ✅ Cleanup multer uploaded file: `fs.unlinkSync(uploadedFile.path)`
- ✅ Cleanup temp file: `tempFileManager.cleanup(tempFileId)`
- ✅ Update generation record to `FAILED`
- ✅ Return error response

---

### Processor-Level Errors (Asynchronous)

#### 1. Reference Image Not Found

- **Detected by:** `db.select().from(uploads)` returns empty
- **Error:** "Reference image not found or access denied"
- **Status:** 404 Not Found (mapped to 500 for client)
- **Handling:** Update generation to FAILED, emit `generation_failed`, no retry

#### 2. Insufficient Tokens

- **Detected by:** `TokenService.getBalance()` in `GeminiService.executeWithTokens()`
- **Error:** "Insufficient tokens. Need 150, have {balance}"
- **Status:** 402 Payment Required
- **Handling:** Update generation to FAILED, emit error, no retry

#### 3. Rate Limit Exceeded

- **Detected by:** `GeminiService.checkRateLimit()`
- **Error:** "Rate limit exceeded. Please wait before making more requests."
- **Status:** 429 Too Many Requests
- **Handling:** Retry with exponential backoff (transient error)

#### 4. Temp File Expired

- **Detected by:** `tempFileManager.getTempFilePath()` returns null
- **Behavior:** Silent fallback to R2 download (not an error)
- **Handling:** Continue processing with R2 public URL

#### 5. Reference Image Download Failed

- **Detected by:** `imageToBase64()` fetch fails
- **Error:** "Failed to fetch image: {statusText}"
- **Status:** 500 Internal Server Error
- **Handling:** Mark FAILED, emit error, no retry

#### 6. Gemini API Errors

**Transient errors** (timeout, network, service unavailable):
- Retry up to 3 times with exponential backoff (2s, 4s, 8s)
- If all retries fail: Mark FAILED, emit error

**Permanent errors** (invalid API key, bad request, unsupported format):
- No retry, immediate failure
- Update generation to FAILED, emit error

#### 7. Storage Upload Errors

- **Detected in:** `saveMultipleToStorage()`
- **Error:** "Batch upload failed: {reason}"
- **Status:** 500 Internal Server Error
- **Handling:** Mark FAILED, emit error, no retry

---

### Cleanup Strategy

#### Always Cleanup (finally block)
```javascript
finally {
  if (tempFileId) {
    tempFileManager.cleanup(tempFileId);
  }
}
```

#### Controller Cleanup (catch block)
```javascript
catch (error) {
  // Cleanup uploaded file
  if (uploadedFile?.path && fs.existsSync(uploadedFile.path)) {
    fs.unlinkSync(uploadedFile.path);
  }
  
  // Cleanup temp file
  if (tempFileId) {
    tempFileManager.cleanup(tempFileId);
  }
}
```

#### Automatic Expiration
- Temp files expire after 5 minutes (TTL)
- `tempFileManager.cleanupExpired()` removes expired files (cron job)

---

### Error Response Format

```json
{
  "success": false,
  "status": 400,
  "message": "Descriptive error message",
  "code": "GEMINI_ERROR_CODE"
}
```

### WebSocket Error Event

```json
{
  "generationId": "uuid",
  "error": "Reference image not found or access denied",
  "timestamp": "ISO-8601"
}
```

---

## Performance Notes

### Optimization Techniques

#### 1. ⚡ Temp File Caching (Key Optimization)
**Problem:** Re-downloading recently uploaded files from R2 adds latency
**Solution:** Store uploaded reference images temporarily (5 min TTL)
**Benefit:**
- **Upload flow:** Local file access (0 download time)
- **Existing image flow:** Standard R2 download
- **Expired temp:** Graceful fallback to R2
- **Processing time reduction:** ~1-2 seconds saved per generation

**Implementation:**
```javascript
// Controller: Store temp file after upload
const tempFileId = await tempFileManager.storeTempFile(uploadedFile.path, metadata);

// Processor: Use temp file if available
const tempPath = tempFileManager.getTempFilePath(tempFileId);
if (tempPath) {
  // Fast path: Local file access
  referenceImagePath = tempPath;
} else {
  // Fallback: Download from R2
  referenceImagePath = uploadRecord.publicUrl;
}

// Cleanup: Always remove temp file
tempFileManager.cleanup(tempFileId);
```

#### 2. ⚡ Async Queue Processing
- HTTP request returns immediately (202 Accepted)
- Long-running AI operations execute in background
- Non-blocking user experience

#### 3. ⚡ Concurrent Image Uploads
- `saveMultipleToStorage()` uses `Promise.all`
- All generated images uploaded to R2 in parallel
- Reduces total processing time for multi-image generations

#### 4. ⚡ Base64 Encoding Optimization
- Reference images converted to base64 once
- Reused for all images in batch generation
- Avoids repeated file reads/downloads

#### 5. ⚡ Database Indexing
- Indexes on `userId`, `referenceImageId`, `status`, `createdAt`
- Composite indexes for common query patterns
- Fast reference image ownership validation

#### 6. ⚡ Token Balance Caching
- Token balance checked once before batch generation
- Single debit per image (not per retry)
- Transaction-based atomic updates

#### 7. ⚡ Rate Limiting
- In-memory rate limiter (15 req/min per user)
- Prevents excessive API calls to Gemini
- Sliding window implementation

#### 8. ⚡ Retry with Exponential Backoff
- Transient errors retried automatically
- Exponential delay: 2s, 4s, 8s (max 3 attempts)
- Reduces load on external APIs during outages

#### 9. ⚡ WebSocket for Real-Time Updates
- Efficient push-based communication
- Client receives progress without polling
- User-specific rooms for targeted events

---

### Scalability Considerations

| Aspect | Solution |
|--------|----------|
| **Horizontal Scaling** | Multiple worker processes can process jobs in parallel |
| **Redis Queue** | BullMQ supports distributed job processing |
| **Temp File Storage** | In-memory registry, no database overhead |
| **R2 CDN** | Cloudflare R2 provides global CDN for fast image delivery |
| **Database Connection Pooling** | Drizzle ORM manages connection pool |
| **Memory Management** | Sequential image generation prevents memory spikes |
| **Monitoring** | BullMQ monitor service tracks queue health, job metrics |
| **Temp File Cleanup** | Automatic expiration prevents disk space issues |

---

### Performance Metrics

| Metric | Average Time | Notes |
|--------|--------------|-------|
| **Reference Image Upload** | 1-3 seconds | Upload to R2 + temp storage |
| **Temp File Storage** | < 100ms | Local file copy + registry update |
| **Temp File Retrieval** | < 10ms | In-memory lookup + file existence check |
| **R2 Download (fallback)** | 500ms - 2s | Depends on file size and network |
| **Generation Time (with reference)** | 5-10 seconds per image | Depends on Gemini API |
| **Queue Latency** | < 1 second | Job pickup by worker |
| **Upload Time** | 1-3 seconds for 4 images | Concurrent upload |
| **Total Processing (1 image)** | ~18-25 seconds | With temp file optimization |
| **Total Processing (4 images)** | ~40-55 seconds | With concurrent uploads |

**Optimization Impact:**
- **With temp file:** ~18-20 seconds (1 image)
- **Without temp file:** ~20-23 seconds (1 image)
- **Savings:** 1-3 seconds per generation (5-15% improvement)

---

## Security Considerations

### Authentication & Authorization

#### 1. JWT Token Authentication
- All endpoints require valid JWT token
- `verifyToken` middleware validates and decodes token
- `req.user.id` extracted for user identification

#### 2. User Isolation
- All database queries filtered by `userId`
- Reference image ownership validated:
  ```javascript
  db.select()
    .from(uploads)
    .where(and(
      eq(uploads.id, referenceImageId),
      eq(uploads.userId, userId)  // Authorization check
    ))
  ```
- Users can only use their own reference images

#### 3. Role-Based Access
- Token operations may have admin-only endpoints
- Queue monitoring restricted to admins

---

### Input Validation & Sanitization

#### 1. Prompt Sanitization
- XSS protection: Remove `<script>` tags
- Length limits: 5-2000 characters
- Trim whitespace

#### 2. File Upload Validation
- **Type whitelist:** JPEG, PNG, WebP only
- **Size limit:** 10MB max
- **Dimension limits:** 64x64 to 4096x4096 pixels
- **Count limit:** 1 file max for single upload
- **MIME type validation:** Server-side check
- **Extension validation:** Case-insensitive check
- **Sharp validation:** Image integrity check (non-blocking)

#### 3. Parameter Validation
- `referenceType`: Must be in allowed list
- `aspectRatio`: Must be in allowed list
- `numberOfImages`: Clamped to 1-4
- UUID validation for IDs

#### 4. Dual Input Validation
- Must provide EITHER `image` file OR `referenceImageId`
- Cannot provide both or neither

#### 5. Rate Limiting
- Per-user rate limit: 15 requests per minute
- Prevents abuse of AI API
- Additional queue-level rate limiting possible

---

### Data Protection

#### 1. API Key Security
- Google AI API key stored in environment variable
- Never exposed in responses or logs
- Validated on service initialization

#### 2. Storage Access Control
- R2 bucket configured for public URL access (generated images)
- Private uploads possible with signed URLs
- Reference images accessible only to owner

#### 3. Database Security
- Prepared statements (Drizzle ORM) prevent SQL injection
- Connection string in environment variable
- User passwords hashed (separate auth system)
- Authorization checks on all reference image queries

#### 4. Token Transaction Security
- Idempotency key support (future)
- Atomic database transactions
- Transaction ledger for audit trail

#### 5. File Path Security
- No user-controlled paths (directory traversal prevention)
- Temp files stored with UUIDs
- Storage keys generated server-side

---

### Temporary File Security

#### 1. Unique Identifiers
- Temp files named with UUIDs (crypto.randomUUID())
- No predictable file names

#### 2. Access Control
- Temp files stored outside web root
- No direct HTTP access to temp directory

#### 3. Automatic Cleanup
- 5-minute TTL prevents accumulation
- Cleanup in finally block (always runs)
- Expired file auto-removal

#### 4. Metadata Tracking
- In-memory registry tracks ownership
- User ID associated with temp files
- Purpose tracking for audit

---

### WebSocket Security

- User-specific rooms (userId-based)
- Authentication required for WebSocket connection
- Events only sent to authorized users
- No sensitive data in WebSocket payloads

---

### Logging & Monitoring

- Sensitive data excluded from logs (API keys, tokens, image data)
- User actions logged for audit
- Error tracking for security events
- Queue monitoring for anomalies
- Temp file statistics tracking

---

### Error Information Disclosure

- ❌ Generic error messages to client
- ✅ Detailed errors logged server-side only
- ❌ No stack traces in production responses
- ✅ Error codes instead of technical details

---

## Extensibility

### Adding New Reference Types

#### Step 1: Add to constants

```javascript
// server/src/utils/constant.js
export const IMAGE_REFERENCE_TYPES = {
  SUBJECT: 'subject',
  FACE: 'face',
  FULL_IMAGE: 'full_image',
  POSE: 'pose',        // NEW
  COLOR: 'color'       // NEW
};

export const IMAGE_REFERENCE_TYPES_ARRAY = [
  'subject', 'face', 'full_image', 'pose', 'color'
];
```

#### Step 2: Add prompt template

```javascript
// server/src/utils/imageReferencePrompts.js
export const generateReferencePrompt = (userPrompt, referenceType) => {
  const prompts = {
    // ... existing
    pose: `${userPrompt}\n\nFocus on replicating the pose and body position...`,
    color: `${userPrompt}\n\nExtract and apply the color palette...`
  };
  return prompts[referenceType] || prompts.full_image;
};
```

#### Step 3: Update validators

```javascript
// server/src/middlewares/validators.js
// Already uses IMAGE_REFERENCE_TYPES_ARRAY constant, no change needed
```

#### Step 4: Update Swagger documentation

```javascript
// server/src/routes/gemini.route.js
// Update enum in Swagger schema
referenceType:
  type: string
  enum: [subject, face, full_image, pose, color]
```

---

### Adding Custom Prompt Enhancement

#### Option 1: Database-driven templates (recommended)
- Store templates in `promptTemplates` table
- Associate templates with reference types
- Fetch during processing

#### Option 2: Hardcoded templates
- Extend `generateReferencePrompt()` utility
- Add type-specific instructions
- Version control in codebase

---

### Adding New Storage Providers

#### Step 1: Implement provider
```javascript
// server/src/config/aws-s3.js
export const uploadToS3 = async ({ buffer, key, contentType }) => {
  // S3 upload logic
};
```

#### Step 2: Update constants
```javascript
export const STORAGE_PROVIDER = {
  R2: 'r2',
  S3: 's3'
};
```

#### Step 3: Modify storage helper
```javascript
// server/src/utils/gemini.helper.js
const uploadResult = process.env.STORAGE_PROVIDER === 'r2'
  ? await uploadToR2({ buffer, key, contentType })
  : await uploadToS3({ buffer, key, contentType });
```

---

### Adding Webhook Support (Future Extension)

#### Step 1: Add webhook URL to request
```javascript
body('webhookUrl')
  .optional()
  .isURL()
```

#### Step 2: Store in generation metadata
```javascript
metadata: JSON.stringify({
  webhookUrl,
  ...otherMetadata
})
```

#### Step 3: Call webhook in processor
```javascript
if (webhookUrl) {
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ generationId, images, status: 'completed' })
  });
}
```

---

### Temp File Optimization for Other Features

**Reusable Pattern:**
```javascript
// 1. Store temp file after upload
const tempFileId = await tempFileManager.storeTempFile(filePath, metadata);

// 2. Retrieve during processing
const tempPath = tempFileManager.getTempFilePath(tempFileId);

// 3. Cleanup after use
tempFileManager.cleanup(tempFileId);
```

**Applicable to:**
- Image editing features
- Video processing
- Audio processing
- Document conversion
- Any feature with upload → process → storage flow

---

## Example Use Case

### Scenario: User generates portrait with face reference

#### **Step 1: Client Request (File Upload)**

```javascript
// Frontend code
const formData = new FormData();
formData.append('prompt', 'Professional portrait in a modern office');
formData.append('referenceType', 'face');
formData.append('image', selectedFile);  // User's face photo
formData.append('aspectRatio', '1:1');
formData.append('numberOfImages', '1');

const response = await fetch('/api/generate/image-reference', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`
  },
  body: formData
});

const data = await response.json();
// {
//   jobId: "12345",
//   generationId: "gen-uuid",
//   referenceImageId: "ref-uuid",
//   status: "pending",
//   metadata: { uploadedNewImage: true }
// }
```

---

#### **Step 2: Server Processing (Synchronous)**

```
1. verifyToken: Authenticate user (userId: "user-abc-123")
2. uploadSingle: Multer saves file to uploads/abc123.jpg
3. validateImageReference: Validate input (pass)
4. getOperationTypeByName('image_reference'): tokensPerOperation = 150

5. File Upload Flow:
   a. saveToStorage():
      - Read file: uploads/abc123.jpg
      - Upload to R2: g/user-abc-123/input-gen-uuid-1731062400000.jpg
      - Create upload record:
        {
          id: "ref-uuid",
          userId: "user-abc-123",
          purpose: "generation_input",
          publicUrl: "https://r2.example.com/g/user-abc-123/input-..."
        }
      - referenceImageId: "ref-uuid"
   
   b. tempFileManager.storeTempFile():
      - Copy file: uploads/abc123.jpg → uploads/temp/temp-uuid.jpg
      - Store in registry:
        {
          tempId: "temp-uuid",
          path: "uploads/temp/temp-uuid.jpg",
          metadata: { userId, uploadId: "ref-uuid", purpose: "reference_image" },
          expiresAt: now + 5 minutes
        }
      - Return tempFileId: "temp-uuid"
   
   c. fs.unlinkSync(uploads/abc123.jpg) - Cleanup multer upload

6. createGenerationRecord():
   {
     id: "gen-uuid",
     userId: "user-abc-123",
     operationTypeId: "op-uuid",
     prompt: "Professional portrait in a modern office",
     status: "pending",
     referenceImageId: "ref-uuid",
     referenceType: "face",
     metadata: { aspectRatio: "1:1", numberOfImages: 1 }
   }

7. queueService.addJob():
   {
     type: "IMAGE_REFERENCE",
     data: {
       userId: "user-abc-123",
       generationId: "gen-uuid",
       prompt: "Professional portrait in a modern office",
       referenceImageId: "ref-uuid",
       referenceType: "face",
       aspectRatio: "1:1",
       numberOfImages: 1,
       operationTypeTokenCost: 150,
       tempFileId: "temp-uuid"  // Optimization key
     }
   }

8. Return HTTP 202 Accepted
```

---

#### **Step 3: Client Listens to WebSocket**

```javascript
socket.on('generation_progress', (data) => {
  console.log(`Progress: ${data.progress}% - ${data.message}`);
  updateProgressBar(data.progress);
});

socket.on('generation_completed', (data) => {
  console.log('Image ready:', data.result.images[0].imageUrl);
  displayGeneratedImage(data.result.images[0]);
  updateTokenBalance(data.result.tokens.remaining);
});

socket.on('generation_failed', (data) => {
  console.error('Generation failed:', data.error);
  showErrorMessage(data.error);
});
```

---

#### **Step 4: Background Worker Processing**

```
Worker picks up job...

Progress 10%: Update status to PROCESSING
WebSocket: "Loading reference image..."

Load Reference Image (Optimization Path):
- tempFileId: "temp-uuid" (present)
- Call tempFileManager.getTempFilePath("temp-uuid")
- Temp file exists: uploads/temp/temp-uuid.jpg
- referenceImagePath = uploads/temp/temp-uuid.jpg (LOCAL PATH)
- usedTempFile = true
- No R2 download needed! (Optimization success)

Progress 20-30%: Enhance prompt
- Call generateReferencePrompt("Professional portrait in a modern office", "face")
- enhancedPrompt:
  """
  Professional portrait in a modern office
  
  Focus specifically on the face from the reference image.
  Preserve and replicate:
  - Facial structure and features
  - Eyes, nose, mouth proportions
  - Skin tone and complexion
  - Hair style and color
  - Facial expression characteristics
  
  Generate a new image maintaining facial identity while following the prompt.
  High-quality portrait, clear facial details.
  """
WebSocket: "Generating with reference..."

Progress 30-80%: Generate image
- Check token balance: 10,000 tokens available
- Call GeminiService.generateWithReference():
  - Load reference: imageToBase64(uploads/temp/temp-uuid.jpg)
    - Local file read (FAST): fs.promises.readFile()
    - Convert to base64
  - Determine MIME type: image/jpeg
  - Call Gemini API:
    model.generateContent({
      contents: [{
        parts: [
          { text: enhancedPrompt },
          { inlineData: { data: base64, mimeType: "image/jpeg" } }
        ]
      }],
      generationConfig: { imageConfig: { aspectRatio: "1:1" } }
    })
  - Receive image data: base64, mimeType: "image/png", size: 524288
  - Debit 150 tokens (new balance: 9,850)
WebSocket: "Generated image 1 of 1..."

Progress 80-90%: Upload to R2
WebSocket: "Uploading images..."
- Generate filename: gen-gen-uuid-1-1731062400000.png
- Storage key: g/user-abc-123/gen-gen-uuid-1-1731062400000.png
- Upload to R2 concurrently (1 image, fast)
- Create upload record:
  {
    id: "output-uuid",
    userId: "user-abc-123",
    purpose: "generation_output",
    publicUrl: "https://r2.example.com/g/user-abc-123/gen-..."
  }

Progress 90-100%: Update database
WebSocket: "Finalizing..."
- Update imageGenerations:
  {
    status: "completed",
    outputImageId: "output-uuid",
    tokensUsed: 150,
    processingTimeMs: 18500,
    aiMetadata: JSON.stringify({
      aspectRatio: "1:1",
      numberOfImages: 1,
      prompt: "Professional portrait in a modern office",
      enhancedPrompt: "...",
      referenceType: "face",
      referenceImageId: "ref-uuid",
      usedTempFile: true
    })
  }

Progress 100%: Complete
WebSocket "generation_completed" event:
{
  "generationId": "gen-uuid",
  "result": {
    "images": [{
      "imageUrl": "https://r2.example.com/g/user-abc-123/gen-gen-uuid-1-1731062400000.png",
      "imageId": "output-uuid",
      "mimeType": "image/png",
      "imageSize": 524288
    }],
    "referenceType": "face",
    "tokens": { "used": 150, "remaining": 9850 },
    "processing": { "timeMs": 18500, "status": "completed" }
  }
}

Cleanup (finally block):
- tempFileManager.cleanup("temp-uuid")
- Delete: uploads/temp/temp-uuid.jpg
- Remove from registry
- Log: "Cleaned up temp file: temp-uuid"
```

---

#### **Step 5: Client Displays Results**

```javascript
// Frontend updates UI
const imageUrl = data.result.images[0].imageUrl;
const generatedImage = document.createElement('img');
generatedImage.src = imageUrl;
gallery.appendChild(generatedImage);

// Show reference type used
referenceTypeLabel.textContent = `Generated with ${data.result.referenceType} reference`;

// Update token balance
tokenBalanceElement.textContent = `${data.result.tokens.remaining} tokens`;

// Show processing time
processingTimeElement.textContent = `Generated in ${data.result.processing.timeMs / 1000}s`;
```

---

### Database State After Completion

#### `imageGenerations` table:

```json
{
  "id": "gen-uuid",
  "userId": "user-abc-123",
  "operationTypeId": "op-uuid",
  "prompt": "Professional portrait in a modern office",
  "status": "completed",
  "model": "gemini-2.5-flash-image",
  "tokensUsed": 150,
  "outputImageId": "output-uuid",
  "referenceImageId": "ref-uuid",
  "referenceType": "face",
  "aiMetadata": {
    "aspectRatio": "1:1",
    "numberOfImages": 1,
    "prompt": "Professional portrait in a modern office",
    "enhancedPrompt": "... (full enhanced prompt)",
    "referenceType": "face",
    "referenceImageId": "ref-uuid",
    "usedTempFile": true
  },
  "processingTimeMs": 18500,
  "completedAt": "2025-11-08T10:30:18.500Z"
}
```

#### `uploads` table (2 records):

**Reference Image:**
```json
{
  "id": "ref-uuid",
  "userId": "user-abc-123",
  "title": "Reference image for: Professional portrait in a modern office",
  "purpose": "generation_input",
  "storageProvider": "r2",
  "storageKey": "g/user-abc-123/input-gen-uuid-1731062400000.jpg",
  "publicUrl": "https://r2.example.com/g/user-abc-123/input-...",
  "mimeType": "image/jpeg",
  "sizeBytes": 245760
}
```

**Generated Image:**
```json
{
  "id": "output-uuid",
  "userId": "user-abc-123",
  "title": "Ref-face: Professional portrait in a modern office... (1/1)",
  "purpose": "generation_output",
  "storageProvider": "r2",
  "storageKey": "g/user-abc-123/gen-gen-uuid-1-1731062400000.png",
  "publicUrl": "https://r2.example.com/g/user-abc-123/gen-...",
  "mimeType": "image/png",
  "sizeBytes": 524288
}
```

#### `userTokens` table:

```json
{
  "userId": "user-abc-123",
  "balance": 9850,
  "totalSpent": 150,
  "totalEarned": 10000
}
```

#### `tokenTransactions` table (1 record):

```json
{
  "userId": "user-abc-123",
  "type": "debit",
  "amount": 150,
  "balanceAfter": 9850,
  "reasonCode": "spend_generation",
  "metadata": {
    "operationType": "image_reference",
    "generationId": "gen-uuid",
    "processingTimeMs": 18500,
    "referenceType": "face"
  },
  "referenceId": "gen-uuid"
}
```

#### Temp files (all cleaned up):
- `uploads/temp/temp-uuid.jpg` → **DELETED**
- Registry entry for `temp-uuid` → **REMOVED**

---

## Summary

This comprehensive pattern documentation covers the complete image reference generation system including:

✅ **Architecture** - Layered pattern with async queue processing and temp file optimization  
✅ **Components** - 12 major components with detailed interactions  
✅ **Data Flow** - 21-step sequence from request to completion  
✅ **Optimization** - Temp file caching system (5 min TTL)  
✅ **Dual Input** - Support for file upload AND existing image UUID  
✅ **Reference Types** - Subject, face, and full-image modes  
✅ **API Documentation** - Complete request/response examples  
✅ **Error Handling** - Comprehensive error scenarios and cleanup  
✅ **Performance** - Optimization techniques and metrics  
✅ **Security** - Authentication, validation, and data protection  
✅ **Extensibility** - Guide for adding new features  
✅ **Example Use Case** - Complete end-to-end scenario with database state

**Key Differences from Text-to-Image:**
- Token cost: 150 vs 100
- Reference image handling (upload or existing)
- Temp file optimization system
- Reference type selection (subject/face/full_image)
- Enhanced prompt generation
- Dual input validation

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-08  
**Maintained By:** Backend Team

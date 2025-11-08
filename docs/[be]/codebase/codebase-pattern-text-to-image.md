# Text-to-Image Generation API - Codebase Pattern

## Metadata

- **Title:** Text-to-Image Generation API
- **Version:** 1.0
- **Status:** ✅ Implemented
- **Last Updated:** 2025-11-08

### Dependencies

- `@google/generative-ai` - Gemini 2.5 Flash Image
- `BullMQ` - Job Queue System
- `Socket.io` - WebSocket Real-time Communication
- `Cloudflare R2` - Object Storage
- `Drizzle ORM` - PostgreSQL Database

### Related Files

- `AGENTS.md` - Coding Guidelines
- `.taskmaster/templates/codebase_pattern_template.txt` - Template

### Tags

`#image-generation` `#ai` `#gemini` `#async-processing` `#websocket` `#queue` `#token-management`

---

## Pattern Name

**Text-to-Image Generation with Async Queue Processing**

---

## Context

This pattern implements AI-powered image generation using Google's Gemini 2.5 Flash Image model.

### Problems Solved

1. ✅ **Long-running AI operations blocking HTTP requests** → Solved with async queue
2. ✅ **Real-time progress feedback for users** → Solved with WebSocket
3. ✅ **Token-based billing for AI operations** → Integrated token management
4. ✅ **Multiple image generation in single request** → Batch processing (1-4 images)
5. ✅ **Reference image-based generation** → Subject/Face/Full-image modes
6. ✅ **Reliable retry logic for transient API failures** → Exponential backoff

### Use Cases

- **Text-to-Image:** User provides text prompt → AI generates 1-4 images
- **Image Reference:** User provides text + reference image → AI generates images matching reference style/subject/face

---

## Core Logic

### High-Level Flow

#### 1. **Initiation**
- HTTP POST request to `/api/generate/text-to-image` or `/api/generate/image-reference`
- Authenticated via JWT token (`verifyToken` middleware)
- Validated via `express-validator` middleware

#### 2. **Controller Layer (Immediate Response)**
- Extract and sanitize user input
- Fetch operation type from database (with token cost)
- Create generation record in database with `PENDING` status
- Queue job in BullMQ with retry configuration
- Return **HTTP 202 Accepted** with `jobId` and `generationId`
- Client receives WebSocket event names to listen for

#### 3. **Background Processing (Queue Worker)**
- Job dequeued by worker process
- Update status to `PROCESSING` (10% progress)
- Apply prompt template enhancement (database-driven or hardcoded fallback)
- Generate images sequentially (20-80% progress)
  - For each image:
    - Check token balance
    - Call Gemini API with retry logic
    - Debit tokens on success
    - Store result in memory
- Upload all images to R2 concurrently (80-90% progress)
- Update database with output URLs and metadata
- Emit WebSocket completion event (100% progress)

#### 4. **Decision Points**
- ❓ **Token balance check:** Fail if insufficient
- ❓ **Rate limit check:** Queue/reject if exceeded
- ❓ **API retry logic:** Retry on transient errors, fail on permanent errors
- ❓ **File upload validation:** Type, size, format checks

#### 5. **Expected Outcomes**

**✅ SUCCESS:**
- Generation record marked `COMPLETED`
- Images uploaded to R2
- Tokens debited
- WebSocket event emitted

**❌ FAILURE:**
- Generation record marked `FAILED` with error message
- WebSocket failure event emitted
- No token debit

---

## Architecture

### Layered Architecture Pattern

```
Client (HTTP + WebSocket)
    ↓
Routes Layer (gemini.route.js)
    ↓ (middlewares: auth, validation, upload)
Controller Layer (gemini.controller.js)
    ↓ (creates job, returns 202)
Queue Layer (BullMQ)
    ↓ (async processing)
Processor Layer (imageGeneration.processor.js)
    ↓ (orchestrates workflow)
Service Layer
    ├─ GeminiService (AI API calls + token management)
    ├─ TokenService (balance, debit operations)
    ├─ PromptTemplateService (database templates)
    └─ OperationTypeService (pricing from DB)
    ↓
External APIs
    ├─ Google Gemini AI (image generation)
    └─ Cloudflare R2 (storage)
    ↓
Database (PostgreSQL via Drizzle ORM)
    ├─ imageGenerations table
    ├─ uploads table
    ├─ userTokens table
    ├─ tokenTransactions table
    └─ operationType table

WebSocket (parallel notification channel)
    └─ Socket.io rooms (user-specific events)
```

### Data Flow Summary

- **Synchronous Path:** HTTP Request → Validation → Queue Job → HTTP 202 Response
- **Asynchronous Path:** Queue → Processor → AI Service → Storage → Database → WebSocket Event

---

## Components

### 1. Routes Layer

**File:** `server/src/routes/gemini.route.js`

**Role:** API endpoint definitions and middleware chaining for image generation operations

**Key Endpoints:**
- `POST /text-to-image` - Queue text-to-image generation job
- `POST /image-reference` - Queue reference-based generation job

**Interactions:**
- Uses `verifyToken` middleware for authentication
- Uses `validateTextToImage`/`validateImageReference` for input validation
- Uses `uploadSingle` middleware for file uploads (image-reference only)
- Calls `textToImage`/`imageReference` controllers
- Handles multer upload errors (file size, count limits)

---

### 2. Controllers

**File:** `server/src/controllers/gemini.controller.js`

**Role:** Request/response handling and job queueing orchestration

**Key Functions:**

#### `textToImage(req, res)`
Handle text-to-image requests, create generation record, queue job

#### `imageReference(req, res)`
Handle reference-based requests, upload reference image, queue job

**Interactions:**
- Calls `getOperationTypeByName()` to fetch operation pricing
- Calls `createGenerationRecord()` to create database record
- Calls `queueService.addJob()` to queue background job
- Calls `saveToStorage()` for reference image uploads
- Calls `tempFileManager.storeTempFile()` for optimization
- Returns `sendSuccess()` with 202 status and WebSocket event info
- On error: updates generation record, calls `handleGeminiError()`

---

### 3. Queue Processors

**File:** `server/src/services/queue/processors/imageGeneration.processor.js`

**Role:** Background job processor for AI image generation with progress tracking

**Key Functions:**

#### `processTextToImage(job)`
Process text-to-image generation jobs (1-4 images)

#### `processImageReference(job)`
Process reference-based generation jobs

**Interactions:**
- Calls `updateGenerationRecord()` to update status (`PROCESSING` → `COMPLETED`/`FAILED`)
- Calls `job.updateProgress()` for BullMQ progress tracking
- Calls `emitGenerationProgress`/`Completed`/`Failed()` for WebSocket updates
- Calls `PromptTemplateService.getById()` for template enhancement
- Calls `GeminiService.textToImage()` or `generateWithReference()` for AI generation
- Calls `saveMultipleToStorage()` for concurrent R2 uploads
- Calls `tempFileManager.cleanup()` in finally block

---

### 4. Gemini Service

**File:** `server/src/services/gemini/GeminiService.js`

**Role:** Core AI integration service with token management and retry logic

**Key Functions:**

| Function | Description |
|----------|-------------|
| `textToImage(userId, tokenCost, prompt, options)` | Generate image from text with token debit |
| `generateWithReference(userId, tokenCost, referenceImagePath, prompt, options)` | Generate with reference image |
| `executeWithTokens(userId, tokenCost, operationType, operationFn)` | Wrapper for token-managed operations |
| `executeWithRetry(operationFn, operationType, maxAttempts)` | Exponential backoff retry logic |
| `checkRateLimit(userId)` | Rate limiting (15 req/min) |
| `imageToBase64(imagePathOrUrl)` | Convert local file or R2 URL to base64 |
| `extractImage(result)` | Extract image data from Gemini response |

**Interactions:**
- Uses `@google/generative-ai` SDK (`GoogleGenerativeAI`, `model.generateContent`)
- Calls `TokenService.getBalance()` before operation
- Calls `TokenService.debit()` after successful generation
- Throws errors on insufficient balance, rate limit, or AI failures
- Retries on transient errors (rate limit, timeout, network)
- Fails immediately on permanent errors (invalid API key, bad request)

---

### 5. Token Service

**File:** `server/src/services/tokens/TokenService.js`

**Role:** Token balance management and transaction recording

**Key Functions:**

| Function | Description |
|----------|-------------|
| `getBalance(userId)` | Fetch current token balance |
| `debit(userId, amount, metadata)` | Deduct tokens and record transaction |
| `credit(userId, amount, metadata)` | Add tokens and record transaction |

**Interactions:**
- Updates `userTokens` table (balance, totalSpent, totalEarned)
- Creates `tokenTransactions` records with `referenceId` (generationId)
- Uses database transactions for atomic operations

---

### 6. Operation Type Service

**File:** `server/src/services/operationType.service.js`

**Role:** Fetch operation types and pricing from database

**Key Functions:**
- `getOperationTypeByName(name)` - Get operation by name (e.g., 'text_to_image')
- `getOperationTypeById(id)` - Get operation by UUID
- `getAllOperationTypes()` - List all active operations

**Pricing:**
- `text_to_image`: **100 tokens per image**
- `image_reference`: **150 tokens per image**

---

### 7. WebSocket Emitters

**File:** `server/src/services/websocket/emitters/imageGeneration.emitter.js`

**Role:** WebSocket event emission for real-time client updates

**Key Functions:**

| Function | Event | Description |
|----------|-------|-------------|
| `emitGenerationProgress()` | `generation_progress` | Send progress updates (0-100%) |
| `emitGenerationCompleted()` | `generation_completed` | Send completion event with image URLs |
| `emitGenerationFailed()` | `generation_failed` | Send failure event with error message |

**Interactions:**
- Uses `websocketService.getIO()` to access Socket.io instance
- Uses `wsUtils.emitToUser()` to send events to specific user rooms

---

### 8. Utility Helpers

#### Gemini Helper
**File:** `server/src/utils/gemini.helper.js`

**Functions:**
- `createGenerationRecord()` - Create DB record with PENDING status
- `updateGenerationRecord()` - Update generation status and metadata
- `saveToStorage()` - Upload single image to R2 + create upload record
- `saveMultipleToStorage()` - Concurrent upload of multiple images to R2
- `handleGeminiError()` - Map service errors to HTTP status codes
- `generateStorageKey()` - Generate R2 key pattern: `g/{userId}/{fileName}`

#### Image Reference Prompts
**File:** `server/src/utils/imageReferencePrompts.js`

**Function:** `generateReferencePrompt(userPrompt, referenceType)`

**Reference Types:**
- `subject` - Extract and replicate main subject/object characteristics
- `face` - Preserve facial structure and identity
- `full_image` - Capture complete composition and aesthetic

---

### 9. Validators

**File:** `server/src/middlewares/validators.js`

**Functions:**
- `validateTextToImage` - Validate prompt, aspectRatio, numberOfImages (1-4)
- `validateImageReference` - Validate prompt, referenceType, file upload OR referenceImageId
- `validateRequestWithCleanup` - Check validation errors and cleanup uploaded files on failure

**Validation Rules:**
- Prompt: 5-2000 characters
- Aspect ratios: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`
- Number of images: 1-4
- File size: Max 10MB
- File types: JPEG, PNG, WebP

---

### 10. Database Schema

**File:** `server/src/db/schema.js`

**Key Tables:**

#### `imageGenerations`
Tracks all generation requests
- `id`, `userId`, `operationTypeId`, `prompt`, `status`, `tokensUsed`, `outputImageId`, `referenceImageId`, `referenceType`, `aiMetadata`, `processingTimeMs`, `completedAt`

#### `uploads`
Stores file metadata
- `id`, `userId`, `purpose`, `storageKey`, `publicUrl`, `mimeType`, `sizeBytes`

#### `userTokens`
User token balances
- `id`, `userId`, `balance`, `totalEarned`, `totalSpent`

#### `tokenTransactions`
Transaction ledger
- `id`, `userId`, `type`, `amount`, `balanceAfter`, `reason`, `referenceId`

#### `operationType`
Operation pricing config
- `id`, `name`, `tokensPerOperation`, `description`, `isActive`

---

### 11. Constants

**File:** `server/src/utils/constant.js`

**Key Constants:**

```javascript
GENERATION_STATUS = { PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED }
IMAGE_OPERATION_TYPES = { TEXT_TO_IMAGE, IMAGE_REFERENCE }
IMAGE_REFERENCE_TYPES = { SUBJECT, FACE, FULL_IMAGE }
GEMINI_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4']
GEMINI_LIMITS = {
  PROMPT_MAX_LENGTH: 2000,
  NUMBER_OF_IMAGES_MAX: 4,
  FILE_SIZE_MAX: 10MB
}
GEMINI_CONFIG = {
  DEFAULT_MODEL: 'gemini-2.5-flash-image',
  RATE_LIMIT: 15 req/min,
  MAX_RETRY_ATTEMPTS: 3
}
```

---

### 12. Temp File Manager

**File:** `server/src/utils/tempFileManager.js`

**Role:** Temporary file storage optimization for uploaded reference images

**Functions:**
- `storeTempFile(filePath, metadata)` - Store uploaded file temporarily (5 min TTL)
- `getTempFilePath(tempFileId)` - Retrieve temp file path for processing
- `cleanup(tempFileId)` - Delete temp file after use
- `cleanupExpired()` - Cron job to remove expired temp files

**Optimization:** Avoids re-downloading from R2 for recently uploaded files

---

## Data Flow

### Trigger

#### Text-to-Image Trigger

```http
POST /api/generate/text-to-image
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "prompt": "A serene mountain landscape at sunset",
  "aspectRatio": "16:9",
  "numberOfImages": 2,
  "projectId": "uuid",             // Optional
  "promptTemplateId": "uuid"       // Optional
}
```

#### Image Reference Trigger

```http
POST /api/generate/image-reference
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

{
  "prompt": "Professional portrait in a modern office",
  "referenceType": "face",         // Required: "subject" | "face" | "full_image"
  "image": [FILE],                 // Optional: if referenceImageId not provided
  "referenceImageId": "uuid",      // Optional: if image not provided
  "aspectRatio": "1:1",
  "numberOfImages": 1
}
```

**Note:** Must provide EITHER `image` file OR `referenceImageId` UUID

---

### Sequence

#### **Phase 1: Request Handling (Controller - Synchronous)**

##### Step 1: Route middleware chain executes
- `verifyToken`: Authenticate user, attach `req.user`
- `uploadSingle`: Handle file upload (image-reference only)
- `validateTextToImage`/`validateImageReference`: Validate input
- `validateRequestWithCleanup`: Check validation errors

##### Step 2: Controller extracts data
- `userId` from `req.user.id` (lodash.get)
- `prompt`, `aspectRatio`, `numberOfImages` from `req.body`
- For image-reference: `referenceImageId` OR uploaded file

##### Step 3: Controller sanitizes prompt
- Trim whitespace
- Remove script tags (XSS protection)

##### Step 4: Fetch operation type from database
- Call `getOperationTypeByName('text_to_image' or 'image_reference')`
- Get `tokensPerOperation` (100 or 150)

##### Step 5: Upload reference image to R2 (image-reference only)
- Save to R2 with `saveToStorage()`
- Get `referenceImageId` (UUID)
- Store temp copy with `tempFileManager.storeTempFile()`
- Cleanup original upload file

##### Step 6: Create generation record in database
- Call `createGenerationRecord()`
- Status: `PENDING`
- Store: `userId`, `operationTypeId`, `prompt`, metadata
- Returns `generationId` (UUID)

##### Step 7: Queue job in BullMQ
- Ensure `IMAGE_GENERATION` queue exists
- Call `queueService.addJob()`
- Job type: `TEXT_TO_IMAGE` or `IMAGE_REFERENCE`
- Priority: `NORMAL`
- Retry: 3 attempts with exponential backoff (2s base)

##### Step 8: Return HTTP 202 Accepted
```json
{
  "jobId": "12345",
  "generationId": "uuid",
  "status": "pending",
  "message": "Image generation job queued successfully...",
  "websocketEvents": {
    "progress": "generation_progress",
    "completed": "generation_completed",
    "failed": "generation_failed"
  },
  "statusEndpoint": "/api/generate/queue/{generationId}"
}
```

---

#### **Phase 2: Background Processing (Processor - Asynchronous)**

##### Step 9: Job dequeued by worker
- Worker picks up job from `IMAGE_GENERATION` queue
- Calls `processTextToImage()` or `processImageReference()`

##### Step 10: Update status to PROCESSING (10% progress)
```javascript
updateGenerationRecord(generationId, { status: PROCESSING })
job.updateProgress(10)
emitGenerationProgress(userId, generationId, 10, "Starting image generation...")
```

##### Step 11: Enhance prompt (20% progress)
- **Text-to-image:** Apply `PromptTemplateService.getById()` if `promptTemplateId` provided
- **Image-reference:** Use `generateReferencePrompt(prompt, referenceType)`
```javascript
emitGenerationProgress(userId, generationId, 20, "Prompt prepared...")
```

##### Step 12: Load reference image (image-reference only)
- Check `tempFileId` first (optimization path)
- If temp file exists: use local path
- Else: fetch from `uploads` table, use `publicUrl` (R2)

##### Step 13: Generate images loop (20-80% progress)

For each image (i = 0 to numberOfImages - 1):

**a. Call GeminiService**
```javascript
const result = await GeminiService.textToImage(
  userId, tokenCost, enhancedPrompt, { aspectRatio, metadata }
)
// OR
const result = await GeminiService.generateWithReference(
  userId, tokenCost, referenceImagePath, enhancedPrompt, { aspectRatio }
)
```

**b. Internal GeminiService Flow:**
- Check token balance (throw if insufficient)
- Check rate limit (throw if exceeded)
- Call Gemini API with retry logic (max 3 attempts)
- Extract `imageData` (base64), `mimeType`, `size` from response
- Debit tokens via `TokenService.debit()`
- Store result in `generationResults` array

**c. Update progress:**
```javascript
progress = 20 + (i+1) * (60/numberOfImages)
emitGenerationProgress(userId, generationId, progress, `Generated image ${i+1}/${numberOfImages}`)
```

##### Step 14: Upload images to R2 concurrently (80-90% progress)

```javascript
// Prepare upload array
const imagesToUpload = generationResults.map(result => ({
  source: result.result,
  userId,
  purpose: UPLOAD_PURPOSE.GENERATION_OUTPUT,
  title: `Generated: ${prompt}...`,
  metadata: { generationId, aspectRatio, imageNumber }
}))

// Concurrent upload (Promise.all)
const uploadRecords = await saveMultipleToStorage(imagesToUpload)

emitGenerationProgress(userId, generationId, 90, "Finalizing...")
```

##### Step 15: Update generation record (90-100% progress)

```javascript
updateGenerationRecord(generationId, {
  status: COMPLETED,
  outputImageId: generatedImages[0].imageId,
  tokensUsed: totalTokensUsed,
  processingTimeMs: totalProcessingTime,
  aiMetadata: JSON.stringify({ /* all details */ })
})
```

##### Step 16: Emit completion event (100% progress)

```javascript
job.updateProgress(100)
emitGenerationCompleted(userId, generationId, {
  generationId,
  images: [{ imageUrl, imageId, mimeType, imageSize }, ...],
  metadata: { prompt, aspectRatio },
  tokens: { used, remaining },
  processing: { timeMs, status },
  createdAt
})
```

##### Step 17: Cleanup (finally block)

```javascript
if (tempFileId) {
  tempFileManager.cleanup(tempFileId)
}
```

---

#### **Phase 3: Error Handling (if any step fails)**

##### Step 18: Catch error in processor

```javascript
try {
  // ... processing ...
} catch (error) {
  // Update database
  await updateGenerationRecord(generationId, {
    status: FAILED,
    errorMessage: error.message
  })
  
  // Map error
  const geminiError = handleGeminiError(error)
  
  // Notify client
  emitGenerationFailed(userId, generationId, geminiError.message)
  
  // Cleanup
  if (tempFileId) tempFileManager.cleanup(tempFileId)
  if (uploadedFile?.path) fs.unlinkSync(uploadedFile.path)
  
  // Re-throw for BullMQ retry
  throw error
}
```

**BullMQ Retry Logic:**
- Transient errors: Retry up to 3 times with exponential backoff
- Permanent errors: Immediate failure, no retry

---

### Completion

#### ✅ Success Completion

**Database:**
- `imageGenerations` record: `status=COMPLETED`, `outputImageId` set, `tokensUsed` recorded

**Storage:**
- Images uploaded to R2 at `g/{userId}/{fileName}` paths

**Token Ledger:**
- `tokenTransactions` record created with `SPEND_GENERATION` reason
- `userTokens.balance` decreased, `totalSpent` increased

**WebSocket:**
- Client receives `generation_completed` event with image URLs

**Client:**
- Display images using `publicUrl` from result

---

#### ❌ Failure Completion

**Database:**
- `imageGenerations` record: `status=FAILED`, `errorMessage` set

**Token Ledger:**
- No transaction created (no token debit on failure)

**WebSocket:**
- Client receives `generation_failed` event with error message

**Cleanup:**
- Temporary files cleaned up automatically

**Client:**
- Show error to user and prompt retry

---

## API Documentation

### Endpoint: Text-to-Image

```http
POST /api/generate/text-to-image
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

#### Request Body

```json
{
  "prompt": "A serene mountain landscape at sunset",
  "aspectRatio": "16:9",          // Optional: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" (default: "1:1")
  "numberOfImages": 2,            // Optional: 1-4 (default: 1)
  "projectId": "uuid",            // Optional: Associate with project
  "promptTemplateId": "uuid"      // Optional: Apply database style template
}
```

#### Response (HTTP 202 Accepted)

```json
{
  "success": true,
  "data": {
    "jobId": "12345",
    "generationId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "pending",
    "message": "Image generation job queued successfully. Listen to WebSocket for progress updates.",
    "numberOfImages": 2,
    "metadata": {
      "prompt": "A serene mountain landscape at sunset",
      "aspectRatio": "16:9",
      "projectId": "uuid"
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
  "progress": 50,                 // 0-100
  "message": "Generated image 1 of 2...",
  "timestamp": "2025-11-08T10:30:00.000Z"
}
```

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
      },
      {
        "imageUrl": "https://r2.example.com/g/userId/gen-genId-2-timestamp.png",
        "imageId": "image-uuid-2",
        "mimeType": "image/png",
        "imageSize": 531456
      }
    ],
    "numberOfImages": 2,
    "metadata": {
      "prompt": "A serene mountain landscape at sunset",
      "aspectRatio": "16:9"
    },
    "tokens": {
      "used": 200,                // 100 per image
      "remaining": 9800
    },
    "processing": {
      "timeMs": 15432,
      "status": "completed"
    },
    "createdAt": "2025-11-08T10:30:15.432Z"
  },
  "timestamp": "2025-11-08T10:30:15.432Z"
}
```

#### Event: `generation_failed`

```json
{
  "generationId": "550e8400-e29b-41d4-a716-446655440000",
  "error": "Insufficient tokens. Need 100, have 50",
  "timestamp": "2025-11-08T10:30:05.123Z"
}
```

---

### Endpoint: Image Reference

```http
POST /api/generate/image-reference
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data
```

#### Request Body

```
prompt: "Professional portrait in a modern office"
referenceType: "face"             // Required: "subject" | "face" | "full_image"
image: [FILE]                     // Optional: Reference image file
referenceImageId: "uuid"          // Optional: Existing upload ID
aspectRatio: "1:1"                // Optional: default "1:1"
numberOfImages: 1                 // Optional: 1-4, default 1
projectId: "uuid"                 // Optional
```

**Note:** Must provide EITHER `image` file OR `referenceImageId` UUID

#### Response

Same structure as text-to-image with additional fields:

```json
{
  "data": {
    "referenceImageId": "ref-uuid",
    "metadata": {
      "referenceType": "face",
      "uploadedNewImage": true    // true if file uploaded, false if used existing
    }
  }
}
```

WebSocket events identical to text-to-image.

---

## Interaction Map

### Synchronous Request Flow (HTTP)

```
Client HTTP POST
    ↓
Express Route (gemini.route.js)
    ↓ (middleware chain)
verifyToken → uploadSingle (if image-reference) → validateInput → validateRequestWithCleanup
    ↓
Controller (gemini.controller.js)
    ├─ getOperationTypeByName() → operationType table
    ├─ saveToStorage() → R2 + uploads table (if image upload)
    ├─ tempFileManager.storeTempFile() → temp storage
    ├─ createGenerationRecord() → imageGenerations table (PENDING)
    └─ queueService.addJob() → BullMQ Redis queue
    ↓
HTTP 202 Response to Client
```

### Asynchronous Processing Flow (Background)

```
BullMQ Worker
    ↓
Processor (imageGeneration.processor.js)
    ├─ updateGenerationRecord() → imageGenerations (PROCESSING)
    ├─ emitGenerationProgress() → WebSocket → Client
    ├─ PromptTemplateService.getById() → promptTemplates table
    ├─ generateReferencePrompt() → enhanced prompt
    ├─ tempFileManager.getTempFilePath() → temp file (if exists)
    │   OR db.select() → uploads table → R2 publicUrl
    ↓
Loop (numberOfImages times):
    ├─ GeminiService.textToImage() or generateWithReference()
    │   ├─ checkRateLimit() → in-memory rate limiter
    │   ├─ TokenService.getBalance() → userTokens table
    │   ├─ executeWithRetry() → Google Gemini API (with retry logic)
    │   ├─ extractImage() → base64 image data
    │   └─ TokenService.debit() → userTokens + tokenTransactions tables
    └─ emitGenerationProgress() → WebSocket → Client
    ↓
saveMultipleToStorage() (concurrent)
    ├─ uploadMultipleToR2() → Cloudflare R2 (parallel uploads)
    └─ createUpload() (loop) → uploads table
    ↓
updateGenerationRecord() → imageGenerations (COMPLETED)
    ↓
emitGenerationCompleted() → WebSocket → Client
    ↓
tempFileManager.cleanup() → remove temp file
```

### Error Flow

```
Error thrown at any step
    ↓
Processor catch block
    ├─ updateGenerationRecord() → imageGenerations (FAILED)
    ├─ handleGeminiError() → map to HTTP status
    ├─ emitGenerationFailed() → WebSocket → Client
    └─ tempFileManager.cleanup() + file cleanup
    ↓
BullMQ retry logic (if transient error)
    └─ Re-queue job with exponential backoff (2s, 4s, 8s)
```

---

## Error Handling

### Controller-Level Errors (Synchronous)

| Error Type | Status | Handling |
|------------|--------|----------|
| Validation errors | 400 Bad Request | Cleanup uploaded files |
| Authentication errors | 401 Unauthorized | Via verifyToken middleware |
| Database errors | 500 Internal Server Error | Log and return error |
| File upload errors (multer) | 400 Bad Request | File too large, invalid type |

On any controller error:
- Update generation record to `FAILED`
- Log error
- Return error response

---

### Processor-Level Errors (Asynchronous)

#### 1. Insufficient Tokens

- **Detected by:** `TokenService.getBalance()` in `GeminiService.executeWithTokens()`
- **Error:** "Insufficient tokens. Need {amount}, have {balance}"
- **Status:** 402 Payment Required
- **Handling:** Update generation to FAILED, emit `generation_failed` event, no retry

#### 2. Rate Limit Exceeded

- **Detected by:** `GeminiService.checkRateLimit()`
- **Error:** "Rate limit exceeded. Please wait before making more requests."
- **Status:** 429 Too Many Requests
- **Handling:** Retry with exponential backoff (transient error)

#### 3. Gemini API Errors

**Transient errors** (timeout, network, service unavailable):
- Retry up to 3 times with exponential backoff (2s, 4s, 8s)
- If all retries fail: Mark FAILED, emit error

**Permanent errors** (invalid API key, bad request):
- No retry, immediate failure
- Update generation to FAILED, emit error

#### 4. Storage Upload Errors

- **Detected in:** `saveMultipleToStorage()`
- **Error:** "Upload failed: {reason}"
- **Status:** 500 Internal Server Error
- **Handling:** Mark FAILED, emit error, no retry

#### 5. Database Errors

- Connection errors, query failures
- Logged but gracefully handled
- Generation record updates wrapped in try-catch

#### 6. File Processing Errors

- Invalid file format, corrupt file
- **Error:** "Invalid file type" or "Failed to read image"
- **Status:** 400 Bad Request
- **Handling:** Mark FAILED, cleanup files, emit error

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
  "error": "Error message",
  "timestamp": "ISO-8601"
}
```

---

### Cleanup on Error

- ✅ **Uploaded files:** Deleted via `fs.unlinkSync()` in controller catch block
- ✅ **Temp files:** Deleted via `tempFileManager.cleanup()` in processor finally block
- ✅ **Generation records:** Updated to FAILED status with errorMessage
- ✅ **No token debit on failure** (only successful generations consume tokens)

---

### Retry Strategy

| Component | Retry Config |
|-----------|--------------|
| BullMQ job | 3 attempts with exponential backoff |
| GeminiService | 3 attempts for API calls |
| Transient errors | Trigger retry (rate limit, timeout, network) |
| Permanent errors | Fail immediately (invalid input, auth errors) |

---

## Performance Notes

### Optimization Techniques

#### 1. ⚡ Async Queue Processing
- HTTP request returns immediately (202 Accepted)
- Long-running AI operations execute in background
- Non-blocking user experience

#### 2. ⚡ Concurrent Image Uploads
- `saveMultipleToStorage()` uses `Promise.all`
- All images uploaded to R2 in parallel
- Reduces total processing time for multi-image generations

#### 3. ⚡ Temp File Caching
- Uploaded reference images stored temporarily (5 min TTL)
- Avoids re-downloading from R2 for immediate processing
- `tempFileManager` handles automatic cleanup

#### 4. ⚡ Database Indexing
- Indexes on `userId`, `status`, `createdAt` for fast queries
- Composite indexes for common query patterns

#### 5. ⚡ Token Balance Caching
- Token balance checked before operation
- Single debit operation after successful generation
- Transaction-based atomic updates

#### 6. ⚡ Rate Limiting
- In-memory rate limiter (15 req/min per user)
- Prevents excessive API calls to Gemini
- Sliding window implementation

#### 7. ⚡ Retry with Exponential Backoff
- Transient errors retried automatically
- Exponential delay: 2s, 4s, 8s (max 3 attempts)
- Reduces load on external APIs during outages

#### 8. ⚡ WebSocket for Real-Time Updates
- Efficient push-based communication
- Client receives progress without polling
- User-specific rooms for targeted events

#### 9. ⚡ Batch Processing
- Single job can generate 1-4 images
- Sequential generation to manage memory
- Progress tracking for each image

---

### Scalability Considerations

| Aspect | Solution |
|--------|----------|
| **Horizontal Scaling** | Multiple worker processes can process jobs in parallel |
| **Redis Queue** | BullMQ supports distributed job processing |
| **Database Connection Pooling** | Drizzle ORM manages connection pool |
| **R2 CDN** | Cloudflare R2 provides global CDN for fast image delivery |
| **Memory Management** | Sequential image generation prevents memory spikes |
| **Monitoring** | BullMQ monitor service tracks queue health, job metrics |

---

### Performance Metrics

| Metric | Average Time |
|--------|--------------|
| **Generation Time** | 3-8 seconds per image (depends on Gemini API) |
| **Queue Latency** | < 1 second (job pickup by worker) |
| **Upload Time** | 1-3 seconds for 4 images (concurrent upload) |
| **Total Processing** | ~15-35 seconds for 4 images (recorded in `processingTimeMs`) |

---

## Extensibility

### Adding New Operation Types

#### Step 1: Add operation to database seed

```javascript
// server/src/db/seedData/operations.js
{
  name: "style_transfer",
  tokensPerOperation: 120,
  description: "Transfer artistic style to image",
  isActive: true
}
```

#### Step 2: Add constant

```javascript
// server/src/utils/constant.js
export const IMAGE_OPERATION_TYPES = {
  TEXT_TO_IMAGE: "text_to_image",
  IMAGE_REFERENCE: "image_reference",
  STYLE_TRANSFER: "style_transfer"  // New
};
```

#### Step 3: Create processor function

```javascript
// server/src/services/queue/processors/imageGeneration.processor.js
export async function processStyleTransfer(job) {
  // Implementation
}
```

#### Step 4: Add route and controller

```javascript
// server/src/routes/gemini.route.js
router.post('/style-transfer', verifyToken, validateStyleTransfer, asyncHandler(styleTransfer));

// server/src/controllers/gemini.controller.js
export const styleTransfer = async (req, res) => {
  // Queue job with STYLE_TRANSFER type
};
```

#### Step 5: Register job type

```javascript
// server/src/services/queue/jobs/index.js
export const JOB_TYPES = {
  IMAGE_GENERATION: {
    TEXT_TO_IMAGE: 'text-to-image',
    IMAGE_REFERENCE: 'image-reference',
    STYLE_TRANSFER: 'style-transfer'  // New
  }
};
```

---

### Adding New Prompt Templates

- Insert into `promptTemplates` database table
- Use `promptTemplateId` in request
- Processor automatically applies template via `PromptTemplateService`

---

### Adding New Reference Types

#### Step 1: Add to constants

```javascript
export const IMAGE_REFERENCE_TYPES = {
  SUBJECT: 'subject',
  FACE: 'face',
  FULL_IMAGE: 'full_image',
  POSE: 'pose'  // New
};
```

#### Step 2: Add prompt template

```javascript
// server/src/utils/imageReferencePrompts.js
export const generateReferencePrompt = (userPrompt, referenceType) => {
  const prompts = {
    // ... existing
    pose: `${userPrompt}\n\nFocus on replicating the pose and body position...`
  };
  return prompts[referenceType] || prompts.full_image;
};
```

---

### Adding New Storage Providers

- Implement new provider in config (e.g., `aws-s3.js`)
- Update `STORAGE_PROVIDER` constant
- Modify `saveToStorage()` to route based on provider

---

### Webhook Support (Future Extension)

- Add webhook URL to generation request
- In processor completion: Send HTTP POST to webhook URL
- Include generation result in webhook payload
- Alternative to WebSocket for server-to-server communication

---

## Security Considerations

### Authentication & Authorization

#### 1. JWT Token Authentication
- All endpoints require valid JWT token
- `verifyToken` middleware validates and decodes token
- `req.user.id` extracted for user identification

#### 2. User Isolation
- All database queries filtered by `userId`
- Users can only access their own generations
- Reference images validated for ownership

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
- Type whitelist: `image/jpeg`, `image/png`, `image/webp`
- Size limit: 10MB max
- Count limit: 5 files max
- MIME type validation

#### 3. Parameter Validation
- `aspectRatio`: Must be in allowed list
- `numberOfImages`: Clamped to 1-4
- UUID validation for IDs

#### 4. Rate Limiting
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
- R2 bucket configured for private/public access
- Generated images: public URLs (user-shareable)
- Signed URLs possible for private content

#### 3. Database Security
- Prepared statements (Drizzle ORM) prevent SQL injection
- Connection string in environment variable
- User passwords hashed (separate auth system)

#### 4. Token Transaction Security
- Idempotency key support (future)
- Atomic database transactions
- Transaction ledger for audit trail

---

### Error Information Disclosure

- ❌ Generic error messages to client
- ✅ Detailed errors logged server-side only
- ❌ No stack traces in production responses
- ✅ Error codes instead of technical details

---

### Temporary File Security

- Temp files stored with unique UUIDs
- Auto-cleanup after 5 minutes
- No user-controlled paths (directory traversal prevention)

---

### WebSocket Security

- User-specific rooms (userId-based)
- Authentication required for WebSocket connection
- Events only sent to authorized users

---

### Logging & Monitoring

- Sensitive data excluded from logs (API keys, tokens)
- User actions logged for audit
- Error tracking for security events
- Queue monitoring for anomalies

---

## Example Use Case

### Scenario: User generates 2 landscape images with custom style

#### **Step 1: Client Request**

```javascript
// Frontend code
const response = await fetch('/api/generate/text-to-image', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: "A mystical forest with glowing mushrooms",
    aspectRatio: "16:9",
    numberOfImages: 2,
    promptTemplateId: "style-cinematic-uuid"  // Database template for cinematic look
  })
});

const data = await response.json();
// { jobId: "12345", generationId: "gen-uuid", status: "pending", ... }
```

---

#### **Step 2: Server Processing (Synchronous)**

```
1. verifyToken: Authenticate user (userId: "user-abc-123")
2. validateTextToImage: Validate input (pass)
3. getOperationTypeByName('text_to_image'): Fetch from DB (tokensPerOperation: 100)
4. createGenerationRecord():
   - id: "gen-uuid"
   - userId: "user-abc-123"
   - operationTypeId: "op-uuid"
   - prompt: "A mystical forest with glowing mushrooms"
   - status: "pending"
   - metadata: { aspectRatio: "16:9", numberOfImages: 2, promptTemplateId: "style-cinematic-uuid" }
5. queueService.addJob():
   - Queue: IMAGE_GENERATION
   - Type: TEXT_TO_IMAGE
   - Data: { userId, generationId, prompt, numberOfImages: 2, aspectRatio, operationTypeTokenCost: 100, promptTemplateId }
6. Return HTTP 202 Accepted
```

---

#### **Step 3: Client Listens to WebSocket**

```javascript
socket.on('generation_progress', (data) => {
  console.log(`Progress: ${data.progress}% - ${data.message}`);
  // Update UI progress bar
});

socket.on('generation_completed', (data) => {
  console.log('Images ready:', data.result.images);
  // Display images in gallery
});

socket.on('generation_failed', (data) => {
  console.error('Generation failed:', data.error);
  // Show error to user
});
```

---

#### **Step 4: Background Worker Processing**

```
Worker picks up job from queue...

Progress 10%: Update status to PROCESSING
WebSocket: "Starting image generation..."

Progress 20%: Enhance prompt
- Fetch template from DB: "Cinematic lighting, dramatic composition, 4K quality"
- Enhanced prompt: "A mystical forest with glowing mushrooms Cinematic lighting, dramatic composition, 4K quality"
WebSocket: "Prompt prepared, generating images..."

Progress 20-50%: Generate image 1
- Check token balance: user has 10,000 tokens
- Call Gemini API with enhanced prompt
- Receive image data: base64, mimeType: "image/png", size: 524288 bytes
- Debit 100 tokens (new balance: 9,900)
WebSocket: "Generated image 1 of 2..."

Progress 50-80%: Generate image 2
- Check token balance: 9,900 tokens
- Call Gemini API
- Receive image data
- Debit 100 tokens (new balance: 9,800)
WebSocket: "Generated image 2 of 2..."

Progress 80%: Upload images to R2 (concurrent)
WebSocket: "Uploading images to storage..."
- Image 1: Upload to g/user-abc-123/gen-gen-uuid-1-1731062400000.png
- Image 2: Upload to g/user-abc-123/gen-gen-uuid-2-1731062400100.png
- Create upload records in database
- Public URLs: https://r2.example.com/g/user-abc-123/gen-...

Progress 90%: Update generation record
WebSocket: "Finalizing generation..."
- status: "completed"
- outputImageId: "upload-uuid-1"
- tokensUsed: 200
- processingTimeMs: 15432
- aiMetadata: JSON with all details

Progress 100%: Complete
WebSocket "generation_completed" event:
{
  "generationId": "gen-uuid",
  "result": {
    "images": [
      {
        "imageUrl": "https://r2.example.com/g/user-abc-123/gen-gen-uuid-1-1731062400000.png",
        "imageId": "upload-uuid-1",
        "mimeType": "image/png",
        "imageSize": 524288
      },
      {
        "imageUrl": "https://r2.example.com/g/user-abc-123/gen-gen-uuid-2-1731062400100.png",
        "imageId": "upload-uuid-2",
        "mimeType": "image/png",
        "imageSize": 531456
      }
    ],
    "tokens": { "used": 200, "remaining": 9800 },
    "processing": { "timeMs": 15432, "status": "completed" }
  }
}
```

---

#### **Step 5: Client Displays Results**

```javascript
// Frontend updates UI
data.result.images.forEach(img => {
  const imgElement = document.createElement('img');
  imgElement.src = img.imageUrl;
  gallery.appendChild(imgElement);
});

// Update token balance display
tokenBalanceElement.textContent = `${data.result.tokens.remaining} tokens`;
```

---

### Database State After Completion

#### `imageGenerations` table:

```
id: "gen-uuid"
userId: "user-abc-123"
operationTypeId: "op-uuid"
prompt: "A mystical forest with glowing mushrooms"
status: "completed"
outputImageId: "upload-uuid-1"
tokensUsed: 200
processingTimeMs: 15432
aiMetadata: { aspectRatio, numberOfImages, imageIds: [...], enhancedPrompt, ... }
completedAt: 2025-11-08 10:30:15
```

#### `uploads` table (2 records):

```
id: "upload-uuid-1", userId: "user-abc-123", purpose: "generation_output", publicUrl: "https://...", ...
id: "upload-uuid-2", userId: "user-abc-123", purpose: "generation_output", publicUrl: "https://...", ...
```

#### `userTokens` table:

```
userId: "user-abc-123"
balance: 9800
totalSpent: 200
```

#### `tokenTransactions` table (2 records):

```
userId: "user-abc-123", type: "debit", amount: 100, balanceAfter: 9900, reason: "spend_generation", referenceId: "gen-uuid"
userId: "user-abc-123", type: "debit", amount: 100, balanceAfter: 9800, reason: "spend_generation", referenceId: "gen-uuid"
```

---

## Summary

This comprehensive pattern documentation covers the complete text-to-image generation system including:

✅ **Architecture** - Layered pattern with async queue processing  
✅ **Components** - 12 major components with detailed interactions  
✅ **Data Flow** - 18-step sequence from request to completion  
✅ **API Documentation** - Complete request/response examples  
✅ **Error Handling** - Comprehensive error scenarios and retry logic  
✅ **Performance** - Optimization techniques and scalability  
✅ **Security** - Authentication, validation, and data protection  
✅ **Extensibility** - Guide for adding new features  
✅ **Example Use Case** - Complete end-to-end scenario with database state

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-08  
**Maintained By:** Backend Team

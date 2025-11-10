# Multiple Reference Image Generation API - Codebase Pattern

## Metadata

- **Title:** Multiple Reference Image Generation API
- **Version:** 1.0
- **Status:** ✅ Implemented
- **Last Updated:** 2025-11-10

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
- `codebase-pattern-image-reference.md` - Single reference pattern
- `codebase-pattern-text-to-image.md` - Base text-to-image pattern
- `.taskmaster/templates/codebase_pattern_template.txt` - Template

### Tags

`#image-generation` `#multiple-reference` `#target-image` `#ai` `#gemini` `#async-processing` `#websocket` `#queue` `#token-management` `#file-upload` `#prompt-templates` `#optimization`

---

## Pattern Name

**Multiple Reference Image Generation with Target + References Pattern**

---

## Context

This pattern implements AI-powered image generation using a **target image** as the main subject combined with **1-5 reference images** for styling, accessories, or composition elements. It extends the single reference pattern with multiple reference support and a flexible prompt template system.

### Problems Solved

1. ✅ **Complex multi-image composition** → Combine target + multiple references in single generation
2. ✅ **Flexible input methods** → Support file upload, UUID reference, or mixed approach
3. ✅ **Dynamic prompt enhancement** → Database-driven template system for easy updates
4. ✅ **Scalable reference handling** → 1-5 reference images with efficient processing
5. ✅ **Temp file optimization** → Cache uploaded files to avoid R2 re-downloads
6. ✅ **Complex validation** → Validate target + references with proper error messages
7. ✅ **Token-based billing** → Higher cost (200 tokens) reflecting complexity
8. ✅ **Resource cleanup** → Automatic cleanup of multiple temp files

### Use Cases

- **Fashion Styling:** Try different accessories/outfits on a person (target = person, references = clothing/accessories)
- **Product Customization:** Add elements to a product (target = product, references = customization options)
- **Interior Design:** Apply multiple design elements to a room (target = room, references = furniture/decor)
- **Character Design:** Combine character features (target = base character, references = features/styles)
- **Outfit Changes:** Virtual try-on with multiple items (target = person, references = clothes/accessories)
- **Composition Studies:** Blend artistic styles and elements (target = subject, references = style guides)

---

## Core Logic

### High-Level Flow

#### 1. **Initiation**
- HTTP POST request to `/api/generate/image-multiple-reference`
- Authenticated via JWT token (`verifyToken` middleware)
- **Three input methods:**
  - **Method A:** Upload target + upload references (multipart/form-data)
  - **Method B:** Provide target UUID + reference UUIDs (JSON body)
  - **Method C:** Mixed (upload some, reference others)
- Must provide exactly **1 target** and **1-5 references**
- Optional: `promptTemplateId` for enhanced prompt generation

#### 2. **Controller Layer (Immediate Response)**
- Validate input (prompt, target image, reference images)
- **Process target image:**
  - If uploaded: Save to R2, store in temp cache
  - If UUID: Validate ownership
- **Process reference images:**
  - If uploaded: Save each to R2, store in temp cache
  - If UUIDs: Validate ownership for each
- Merge uploaded and referenced image IDs
- Fetch operation type from database (200 tokens per image)
- Create generation record with target + reference metadata
- Queue job with all image paths and temp file IDs
- Return **HTTP 202 Accepted** with WebSocket event names

#### 3. **Background Processing (Queue Worker)**
- Job dequeued by worker process
- Update status to `PROCESSING`
- **Load target image:**
  - Check temp cache first (if uploaded)
  - Fallback to R2 public URL
- **Load reference images (loop):**
  - Check temp cache for each
  - Fallback to R2 for missing/expired
- **Build enhanced prompt:**
  - Fetch template from database if `promptTemplateId` provided
  - Compose: `{template} + {user_prompt}`
  - Fallback to default prompt if template not found
- **Generate images loop:**
  - Call Gemini with target + all references
  - Track tokens and balance
- Upload results to R2 concurrently
- Update database with complete metadata
- Emit WebSocket completion event
- **Cleanup:** Remove all temp files (finally block)

#### 4. **Decision Points**
- ❓ **Input validation:** Exactly 1 target + 1-5 references?
- ❓ **File vs UUID:** Upload new OR reference existing for each image?
- ❓ **Template selection:** Use database template OR default prompt?
- ❓ **Token balance:** Sufficient for 200 tokens per image?
- ❓ **Temp file availability:** Use cache OR download from R2?
- ❓ **Rate limit:** Within user's rate limit (15 req/min)?

#### 5. **Expected Outcomes**

**✅ SUCCESS:**
- Generation record marked `COMPLETED`
- Output images uploaded to R2
- Tokens debited (200 per image)
- All temp files cleaned up
- WebSocket completion event emitted
- Metadata stored: target + reference IDs, template ID, prompt

**❌ FAILURE:**
- Generation record marked `FAILED` with error message
- Uploaded files cleaned up
- All temp files cleaned up
- WebSocket failure event emitted
- No token debit (failure before generation)

---

## Architecture

### Layered Architecture Pattern

```
Client (HTTP + WebSocket)
    ↓
Routes Layer (gemini.route.js)
    ↓ (middlewares: auth, upload, validation)
Controller Layer (gemini.controller.js::imageMultipleReference)
    ↓
Upload Processing Branch (if files uploaded)
    ├─ Target Image:
    │   ├─ saveToStorage() → R2 + uploads table
    │   ├─ tempFileManager.storeTempFile() → temp cache (5 min TTL)
    │   └─ Cleanup original multer upload
    ├─ Reference Images (loop 1-5):
    │   ├─ saveToStorage() → R2 + uploads table
    │   ├─ tempFileManager.storeTempFile() → temp cache
    │   └─ Cleanup original multer upload
    └─ Build temp file metadata array
    ↓
UUID Reference Branch (if IDs provided)
    ├─ Validate target UUID ownership
    ├─ Validate each reference UUID ownership
    └─ No temp storage (fetch from R2 during processing)
    ↓
Queue Layer (BullMQ)
    ↓ (async processing)
Processor Layer (processImageMultipleReference)
    ↓
Target Image Loading
    ├─ Option A: tempFileManager.getTempFilePath() → Local temp file (fast)
    └─ Option B: db.select(uploads) → R2 public URL (download)
    ↓
Reference Images Loading (loop)
    ├─ For each reference:
    │   ├─ Option A: tempFileManager.getTempFilePath() → Local temp file
    │   └─ Option B: db.select(uploads) → R2 public URL
    └─ Build referenceImagePaths array
    ↓
Prompt Enhancement
    ├─ Fetch template from database (if promptTemplateId)
    ├─ buildMultipleReferencePrompt() → Enhanced prompt
    └─ Fallback to default if template not found
    ↓
Service Layer
    ├─ GeminiService.generateWithMultipleReferences() → AI generation
    │   └─ Loads target + all references, calls Gemini API
    ├─ TokenService (balance check, debit operations)
    └─ saveMultipleToStorage() → Concurrent R2 uploads
    ↓
External APIs
    ├─ Google Gemini AI (multiple reference generation)
    └─ Cloudflare R2 (storage)
    ↓
Database (PostgreSQL via Drizzle ORM)
    ├─ imageGenerations table (targetImageId, referenceImageIds, promptTemplateId)
    ├─ uploads table (target + references + outputs)
    ├─ promptTemplates table (template library)
    ├─ userTokens table
    ├─ tokenTransactions table
    └─ operationType table

WebSocket (parallel notification channel)
    └─ Socket.io rooms (user-specific events)

Cleanup System (automatic)
    ├─ Target temp file cleanup (finally block)
    ├─ Reference temp files cleanup (loop in finally)
    ├─ Temp file expiration (5 min TTL)
    └─ Upload file cleanup on error
```

### Data Flow Summary

- **Synchronous Path:** HTTP Request → Multi-File Upload (optional) → Temp Storage (optional) → Queue Job → HTTP 202 Response
- **Asynchronous Path:** Queue → Processor → Load Target → Load References → Fetch Template → Enhance Prompt → AI Service → Storage → Database → WebSocket Event
- **Optimization Path:** Temp Cache → Local File Access (avoids R2 downloads for recently uploaded files)

---

## Components

### 1. Routes Layer

**File:** `server/src/routes/gemini.route.js`

**Role:** API endpoint definition for multiple reference generation with complex file upload support

**Key Endpoint:**
- `POST /image-multiple-reference` - Queue multiple reference generation job

**Middleware Chain:**
```javascript
router.post(
  "/image-multiple-reference",
  verifyToken,                        // Authentication
  uploadMultipleReference,            // Multi-field file upload
  validateImageMultipleReference,     // Input validation
  validateRequestWithCleanup,         // Cleanup on validation error
  asyncHandler(imageMultipleReference) // Controller
);
```

**Request Body Structure:**

**Method A: File Upload**
```
Content-Type: multipart/form-data

targetImage: [FILE]                     // Single target image
referenceImages: [FILE, FILE, ...]     // 1-5 reference images
prompt: "Professional portrait..."
promptTemplateId: "uuid"               // Optional
aspectRatio: "1:1"                     // Optional
numberOfImages: 1                      // Optional
projectId: "uuid"                      // Optional
```

**Method B: UUID Reference**
```
Content-Type: application/json

{
  "prompt": "Professional portrait...",
  "targetImageId": "uuid",
  "referenceImageIds": ["uuid1", "uuid2"],
  "promptTemplateId": "uuid",          // Optional
  "aspectRatio": "1:1",
  "numberOfImages": 1,
  "projectId": "uuid"
}
```

**Method C: Mixed**
```
Content-Type: multipart/form-data

targetImage: [FILE]                    // Upload target
referenceImageIds: ["uuid1", "uuid2"]  // Reference existing
prompt: "Professional portrait..."
```

**Swagger Documentation:**
```yaml
/generate/image-multiple-reference:
  post:
    summary: Generate image(s) using target + multiple reference images (200 tokens per image)
    tags: [Gemini AI]
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        multipart/form-data:
          schema:
            type: object
            required:
              - prompt
            properties:
              prompt:
                type: string
                minLength: 5
                maxLength: 2000
              targetImage:
                type: string
                format: binary
              targetImageId:
                type: string
                format: uuid
              referenceImages:
                type: array
                items:
                  type: string
                  format: binary
                minItems: 1
                maxItems: 5
              referenceImageIds:
                type: array
                items:
                  type: string
                  format: uuid
                minItems: 1
                maxItems: 5
              promptTemplateId:
                type: string
                format: uuid
              aspectRatio:
                type: string
                enum: ["1:1", "16:9", "9:16", "4:3", "3:4"]
              numberOfImages:
                type: integer
                minimum: 1
                maximum: 4
              projectId:
                type: string
                format: uuid
```

---

### 2. Controllers

**File:** `server/src/controllers/gemini.controller.js`

**Role:** Request/response handling for multiple reference generation

**Key Function:**

#### `imageMultipleReference(req, res, next)`
Handle multiple reference generation requests with flexible input

**Flow:**

**Step 1: Extract user and input data**
```javascript
const user = get(req, 'user');
const userId = get(user, 'id');
const prompt = get(req.body, 'prompt');
const promptTemplateId = get(req.body, 'promptTemplateId');
const targetImageId = get(req.body, 'targetImageId');
const referenceImageIds = get(req.body, 'referenceImageIds', []);

// Files from multer
const targetFile = get(req.files, 'targetImage[0]');
const referenceFiles = get(req.files, 'referenceImages', []);
```

**Step 2: Validate dual input requirement**
```javascript
const hasTargetFile = !!targetFile;
const hasTargetId = !!targetImageId;
const hasReferenceFiles = referenceFiles.length > 0;
const hasReferenceIds = referenceImageIds.length > 0;

// Must provide target via EITHER file OR UUID
if (!hasTargetFile && !hasTargetId) {
  throwError('Must provide either targetImage file or targetImageId');
}

// Must provide at least one reference
if (!hasReferenceFiles && !hasReferenceIds) {
  throwError('Must provide at least one reference image');
}
```

**Step 3: Process target image (upload flow)**
```javascript
let finalTargetImageId = targetImageId;
let targetTempFileId = null;

if (targetFile) {
  // Upload to R2
  const targetUpload = await saveToStorage({
    filePath: targetFile.path,
    userId,
    purpose: UPLOAD_PURPOSE.GENERATION_INPUT,
    title: `Target: ${prompt.substring(0, 50)}...`,
    metadata: { purpose: 'multiple_reference_target' }
  });
  
  finalTargetImageId = targetUpload.id;
  
  // Store in temp cache
  targetTempFileId = await tempFileManager.storeTempFile(
    targetFile.path,
    { userId, uploadId: finalTargetImageId, purpose: 'target', type: 'target' }
  );
  
  // Cleanup multer upload
  fs.unlinkSync(targetFile.path);
}
```

**Step 4: Process reference images (loop)**
```javascript
const finalReferenceImageIds = [...referenceImageIds];
const tempFileIds = [];

// Add target temp file to tracking
if (targetTempFileId) {
  tempFileIds.push({ id: targetTempFileId, type: 'target', uploadId: finalTargetImageId });
}

// Process each uploaded reference
for (const refFile of referenceFiles) {
  // Upload to R2
  const refUpload = await saveToStorage({
    filePath: refFile.path,
    userId,
    purpose: UPLOAD_PURPOSE.GENERATION_INPUT,
    title: `Reference: ${prompt.substring(0, 50)}...`,
    metadata: { purpose: 'multiple_reference' }
  });
  
  finalReferenceImageIds.push(refUpload.id);
  
  // Store in temp cache
  const refTempFileId = await tempFileManager.storeTempFile(
    refFile.path,
    { userId, uploadId: refUpload.id, purpose: 'reference' }
  );
  
  tempFileIds.push({ id: refTempFileId, type: 'reference', uploadId: refUpload.id });
  
  // Cleanup multer upload
  fs.unlinkSync(refFile.path);
}
```

**Step 5: Validate reference count**
```javascript
if (finalReferenceImageIds.length < 1 || finalReferenceImageIds.length > 5) {
  throwError('Must provide 1-5 reference images');
}
```

**Step 6: Fetch operation type and sanitize**
```javascript
const operationType = await getOperationTypeByName('image_multiple_reference');
const sanitizedPrompt = prompt.trim().replace(/<script[^>]*>.*?<\/script>/gi, '');
```

**Step 7: Create generation record**
```javascript
const generationId = await createGenerationRecord({
  userId,
  operationTypeId: operationType.id,
  prompt: sanitizedPrompt,
  targetImageId: finalTargetImageId,
  referenceImageIds: finalReferenceImageIds,
  promptTemplateId,
  status: GENERATION_STATUS.PENDING,
  metadata: JSON.stringify({
    aspectRatio,
    numberOfImages,
    projectId,
    uploadedNewTarget: hasTargetFile,
    uploadedNewReferences: hasReferenceFiles,
    referencedExisting: hasReferenceIds,
    referenceCount: finalReferenceImageIds.length
  })
});
```

**Step 8: Queue job**
```javascript
const job = await queueService.addJob(
  QUEUE_NAMES.IMAGE_GENERATION,
  JOB_TYPES.IMAGE_GENERATION.IMAGE_MULTIPLE_REFERENCE,
  {
    userId,
    generationId,
    prompt: sanitizedPrompt,
    targetImageId: finalTargetImageId,
    referenceImageIds: finalReferenceImageIds,
    promptTemplateId,
    numberOfImages,
    aspectRatio,
    projectId,
    model,
    operationTypeTokenCost: operationType.tokensPerOperation,
    tempFileIds // Array of {id, type, uploadId}
  },
  { priority: JOB_PRIORITY.NORMAL }
);
```

**Step 9: Return HTTP 202 Accepted**
```javascript
return sendSuccess(res, {
  jobId: job.id,
  generationId,
  targetImageId: finalTargetImageId,
  referenceImageIds: finalReferenceImageIds,
  status: GENERATION_STATUS.PENDING,
  message: 'Multiple reference generation queued successfully',
  numberOfImages,
  metadata: {
    prompt: sanitizedPrompt,
    aspectRatio,
    projectId,
    promptTemplateId,
    referenceCount: finalReferenceImageIds.length
  },
  websocketEvents: {
    progress: 'generation_progress',
    completed: 'generation_completed',
    failed: 'generation_failed'
  },
  statusEndpoint: `/api/generate/queue/${generationId}`
}, 'Generation queued', HTTP_STATUS.ACCEPTED);
```

**Error Handling:**
```javascript
catch (error) {
  // Cleanup uploaded target file
  if (targetFile?.path && fs.existsSync(targetFile.path)) {
    fs.unlinkSync(targetFile.path);
  }
  
  // Cleanup uploaded reference files
  for (const refFile of referenceFiles) {
    if (refFile?.path && fs.existsSync(refFile.path)) {
      fs.unlinkSync(refFile.path);
    }
  }
  
  // Cleanup temp files
  for (const tempInfo of tempFileIds) {
    tempFileManager.cleanup(tempInfo.id);
  }
  
  // Update generation record if created
  if (generationId) {
    await updateGenerationRecord(generationId, {
      status: GENERATION_STATUS.FAILED,
      errorMessage: error.message
    });
  }
  
  const geminiError = handleGeminiError(error);
  throwError(geminiError.message, geminiError.status);
}
```

**Interactions:**
- Calls `getOperationTypeByName('image_multiple_reference')` for pricing
- Calls `saveToStorage()` for each uploaded image (1 target + 1-5 references)
- Calls `tempFileManager.storeTempFile()` for each uploaded image
- Calls `createGenerationRecord()` with complete metadata
- Calls `queueService.addJob()` with all image IDs and temp file tracking
- Returns `sendSuccess()` with HTTP 202 status

---

### 3. Upload Middleware

**File:** `server/src/middlewares/upload.js`

**Role:** Multi-field file upload handling for target + reference images

**Key Middleware:**

#### `uploadMultipleReference`
Handle target image (1 file) + reference images (1-5 files) upload

**Configuration:**
```javascript
export const uploadMultipleReference = createImageUpload().fields([
  { name: 'targetImage', maxCount: 1 },
  { name: 'referenceImages', maxCount: 5 }
]);
```

**Resulting Request Structure:**
```javascript
req.files = {
  targetImage: [
    {
      fieldname: 'targetImage',
      originalname: 'target.jpg',
      mimetype: 'image/jpeg',
      path: 'uploads/xxx.jpg',
      size: 2048000
    }
  ],
  referenceImages: [
    {
      fieldname: 'referenceImages',
      originalname: 'ref1.jpg',
      mimetype: 'image/jpeg',
      path: 'uploads/yyy.jpg',
      size: 1024000
    },
    {
      fieldname: 'referenceImages',
      originalname: 'ref2.png',
      mimetype: 'image/png',
      path: 'uploads/zzz.png',
      size: 1536000
    }
  ]
}
```

**Validation (from createImageUpload):**
- **MIME type:** `image/jpeg`, `image/png`, `image/webp`
- **File size:** Max 10MB per file
- **Total files:** Max 6 files (1 target + 5 references)
- **Dimensions:** 64x64 to 4096x4096 pixels (Sharp validation)
- **Extensions:** `.jpg`, `.jpeg`, `.png`, `.webp`

**Error Handling:**
Integrated with `validateRequestWithCleanup` middleware to cleanup files on validation errors

---

### 4. Validators

**File:** `server/src/middlewares/validators.js`

**Role:** Input validation for multiple reference requests

**Key Validator:**

#### `validateImageMultipleReference`
Express-validator middleware chain for multiple reference generation

**Validation Rules:**

```javascript
export const validateImageMultipleReference = [
  body('prompt')
    .notEmpty()
    .withMessage('Prompt is required')
    .isLength({ min: 5, max: 2000 })
    .withMessage('Prompt must be between 5 and 2000 characters'),
  
  body('targetImageId')
    .optional({ values: 'falsy' })
    .isUUID()
    .withMessage('Target image ID must be a valid UUID'),
  
  body('referenceImageIds')
    .optional({ values: 'falsy' })
    .isArray({ min: 1, max: 5 })
    .withMessage('Reference image IDs must be an array of 1-5 UUIDs'),
  
  body('referenceImageIds.*')
    .optional({ values: 'falsy' })
    .isUUID()
    .withMessage('Each reference image ID must be a valid UUID'),
  
  body('promptTemplateId')
    .optional({ values: 'falsy' })
    .isUUID()
    .withMessage('Prompt template ID must be a valid UUID'),
  
  body('aspectRatio')
    .optional({ values: 'falsy' })
    .isIn(['1:1', '16:9', '9:16', '4:3', '3:4'])
    .withMessage('Aspect ratio must be one of: 1:1, 16:9, 9:16, 4:3, 3:4'),
  
  body('numberOfImages')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: 4 })
    .withMessage('Number of images must be between 1 and 4'),
  
  body('projectId')
    .optional({ values: 'falsy' })
    .isUUID()
    .withMessage('Project ID must be a valid UUID')
];
```

**Note:** File uploads are validated by multer middleware, not express-validator

**Usage with Cleanup:**
```javascript
router.post(
  "/image-multiple-reference",
  verifyToken,
  uploadMultipleReference,
  validateImageMultipleReference,
  validateRequestWithCleanup,  // Cleans up files if validation fails
  asyncHandler(imageMultipleReference)
);
```

---

### 5. Queue Processors

**File:** `server/src/services/queue/processors/imageGeneration.processor.js`

**Role:** Background job processor for multiple reference generation

**Key Function:**

#### `processImageMultipleReference(job)`
Process multiple reference generation jobs

**Job Data:**
```javascript
{
  userId,
  generationId,
  prompt,
  targetImageId,
  referenceImageIds,        // Array of 1-5 UUIDs
  promptTemplateId,         // Optional
  numberOfImages,
  aspectRatio,
  projectId,
  model,
  operationTypeTokenCost,   // 200 tokens per image
  tempFileIds               // Array of {id, type, uploadId}
}
```

**Flow:**

**Phase 1: Load Target Image (10-20% progress)**
```javascript
// Update status
await updateGenerationRecord(generationId, {
  status: GENERATION_STATUS.PROCESSING
});
emitGenerationProgress(userId, generationId, 10, "Loading target and reference images...");

// Check temp cache first
let targetImagePath = null;
const targetTempInfo = tempFileIds.find(t => t.type === 'target');

if (targetTempInfo) {
  targetImagePath = tempFileManager.getTempFilePath(targetTempInfo.id);
  if (targetImagePath) {
    usedTempFiles.push(targetTempInfo.id);
    logger.info(`Using temp file for target image: ${targetTempInfo.id}`);
  } else {
    logger.warn(`Temp file expired for target: ${targetTempInfo.id}`);
  }
}

// Fallback: Load from database
if (!targetImagePath) {
  const [targetImage] = await db
    .select()
    .from(uploads)
    .where(and(eq(uploads.id, targetImageId), eq(uploads.userId, userId)))
    .limit(1);

  if (!targetImage) {
    throw new Error("Target image not found or access denied");
  }

  targetImagePath = targetImage.publicUrl;
  logger.info(`Using R2 public URL for target: ${targetImagePath}`);
}
```

**Phase 2: Load Reference Images (20-30% progress)**
```javascript
const referenceImagePaths = [];

for (const refId of referenceImageIds) {
  let refPath = null;

  // Try temp file first
  const refTempInfo = tempFileIds.find(t => t.uploadId === refId);
  if (refTempInfo) {
    refPath = tempFileManager.getTempFilePath(refTempInfo.id);
    if (refPath) {
      usedTempFiles.push(refTempInfo.id);
      logger.info(`Using temp file for reference ${refId}: ${refTempInfo.id}`);
    }
  }

  // Fallback: Load from database
  if (!refPath) {
    const [refImage] = await db
      .select()
      .from(uploads)
      .where(and(eq(uploads.id, refId), eq(uploads.userId, userId)))
      .limit(1);

    if (!refImage) {
      throw new Error(`Reference image ${refId} not found or access denied`);
    }

    refPath = refImage.publicUrl;
    logger.info(`Using R2 public URL for reference ${refId}`);
  }

  referenceImagePaths.push(refPath);
}
```

**Phase 3: Build Enhanced Prompt (30-40% progress)**
```javascript
emitGenerationProgress(userId, generationId, 30, "Building enhanced prompt...");

// Import prompt builder utility
const { buildMultipleReferencePrompt } = await import('../../../utils/multipleReferencePrompts.js');

// Fetch template from database and build enhanced prompt
const enhancedPrompt = await buildMultipleReferencePrompt(
  prompt,
  promptTemplateId,
  { referenceCount: referenceImageIds.length }
);

logger.info(`Enhanced prompt built for generation ${generationId}`);
```

**Phase 4: Generate Images Loop (40-80% progress)**
```javascript
const generationResults = [];
const progressPerImage = 40 / numberOfImages;

for (let i = 0; i < numberOfImages; i++) {
  const currentProgress = 40 + (i + 1) * progressPerImage;

  emitGenerationProgress(
    userId,
    generationId,
    Math.round(currentProgress),
    `Generating image ${i + 1}/${numberOfImages} with multiple references...`
  );

  // Call Gemini service with target + multiple references
  const result = await GeminiService.generateWithMultipleReferences(
    userId,
    operationTypeTokenCost,
    targetImagePath,
    referenceImagePaths,
    enhancedPrompt,
    {
      aspectRatio,
      modelName: model,
      metadata: {
        originalPrompt: prompt,
        enhancedPrompt,
        targetImageId,
        referenceImageIds,
        promptTemplateId,
        projectId,
        generationId,
        imageNumber: i + 1,
        totalImages: numberOfImages
      }
    }
  );

  generationResults.push({
    result: result.result,
    imageNumber: i + 1,
    tokensUsed: result.tokensUsed,
    processingTimeMs: result.processingTimeMs,
    remainingBalance: result.remainingBalance
  });

  await job.updateProgress(Math.round(currentProgress));
}
```

**Phase 5: Upload Images (80-90% progress)**
```javascript
emitGenerationProgress(userId, generationId, 80, "Uploading generated images...");

// Calculate totals
const totalTokensUsed = generationResults.reduce((sum, r) => sum + r.tokensUsed, 0);
const totalProcessingTime = generationResults.reduce((sum, r) => sum + r.processingTimeMs, 0);
const remainingBalance = generationResults[generationResults.length - 1]?.remainingBalance || 0;

// Prepare upload array
const imagesToUpload = generationResults.map((genResult) => ({
  source: genResult.result,
  userId,
  purpose: UPLOAD_PURPOSE.GENERATION_OUTPUT,
  title: `Multi-ref: ${prompt.substring(0, 50)}... (${genResult.imageNumber}/${numberOfImages})`,
  metadata: {
    generationId,
    aspectRatio,
    imageNumber: genResult.imageNumber,
    targetImageId,
    referenceCount: referenceImageIds.length
  }
}));

// Concurrent upload
const uploadRecords = await saveMultipleToStorage(imagesToUpload);
```

**Phase 6: Update Database (90-100% progress)**
```javascript
const generatedImages = uploadRecords.map((uploadRecord, index) => ({
  imageUrl: uploadRecord.publicUrl,
  imageId: uploadRecord.id,
  mimeType: generationResults[index].result.mimeType,
  imageSize: generationResults[index].result.size
}));

await updateGenerationRecord(generationId, {
  status: GENERATION_STATUS.COMPLETED,
  outputImageId: generatedImages[0].imageId,
  tokensUsed: totalTokensUsed,
  processingTimeMs: totalProcessingTime,
  aiMetadata: JSON.stringify({
    aspectRatio,
    numberOfImages,
    prompt,
    enhancedPrompt,
    targetImageId,
    referenceImageIds,
    promptTemplateId,
    imageIds: generatedImages.map((img) => img.imageId),
    model: model || process.env.GEMINI_MODEL || "gemini-2.5-flash-image"
  })
});
```

**Phase 7: Emit Completion (100% progress)**
```javascript
await job.updateProgress(100);

const result = {
  generationId,
  images: generatedImages,
  numberOfImages,
  targetImageId,
  referenceImageIds,
  promptTemplateId,
  metadata: {
    prompt,
    enhancedPrompt,
    aspectRatio,
    targetImageId,
    referenceCount: referenceImageIds.length
  },
  tokens: {
    used: totalTokensUsed,
    remaining: remainingBalance
  },
  processing: {
    timeMs: totalProcessingTime,
    status: GENERATION_STATUS.COMPLETED
  },
  createdAt: new Date().toISOString()
};

emitGenerationCompleted(userId, generationId, result);
```

**Phase 8: Cleanup (Finally Block)**
```javascript
finally {
  // Cleanup ALL temp files after processing (success or failure)
  for (const tempId of usedTempFiles) {
    tempFileManager.cleanup(tempId);
    logger.debug(`Cleaned up temp file after processing: ${tempId}`);
  }
}
```

**Error Handling:**
```javascript
catch (error) {
  logger.error(`Multiple reference generation failed: ${generationId}`, error);
  
  await updateGenerationRecord(generationId, {
    status: GENERATION_STATUS.FAILED,
    errorMessage: error.message
  });
  
  const geminiError = handleGeminiError(error);
  emitGenerationFailed(userId, generationId, geminiError.message);
  
  throw error; // Re-throw for BullMQ retry logic
}
```

**Interactions:**
- Calls `updateGenerationRecord()` to update status and metadata
- Calls `emitGenerationProgress/Completed/Failed()` for WebSocket updates
- Calls `tempFileManager.getTempFilePath()` for optimization path
- Calls `db.select().from(uploads)` to fetch image metadata
- Calls `buildMultipleReferencePrompt()` for prompt enhancement
- Calls `GeminiService.generateWithMultipleReferences()` for AI generation
- Calls `saveMultipleToStorage()` for concurrent uploads
- Calls `tempFileManager.cleanup()` for each temp file in finally block

---

### 6. Gemini Service

**File:** `server/src/services/gemini/GeminiService.js`

**Role:** Core AI integration service with multiple reference support

**Key Function:**

#### `generateWithMultipleReferences(userId, tokenCost, targetImagePath, referenceImagePaths, prompt, options)`
Generate images using target + multiple reference images

**Parameters:**
```javascript
{
  userId,                    // User ID for token management
  tokenCost,                 // 200 tokens per image
  targetImagePath,           // Local file path OR R2 public URL
  referenceImagePaths,       // Array of 1-5 paths (local OR URLs)
  prompt,                    // Enhanced prompt with template
  options: {
    aspectRatio,
    modelName,
    metadata                 // Includes targetImageId, referenceImageIds, templateId
  }
}
```

**Flow:**

**Step 1: Wrap in token management**
```javascript
return await this.executeWithTokens(async () => {
  // ... generation logic
}, userId, tokenCost, options.metadata);
```

**Step 2: Check rate limit and balance**
```javascript
const rateLimit = this.checkRateLimit(userId);
if (!rateLimit.allowed) {
  throw new Error('Rate limit exceeded. Please wait before making more requests.');
}

const balance = await TokenService.getBalance(userId);
if (balance.balance < tokenCost) {
  throw new Error(`Insufficient tokens. Need ${tokenCost}, have ${balance.balance}`);
}
```

**Step 3: Load target image**
```javascript
const targetBase64 = await this.imageToBase64(targetImagePath);
const targetMimeType = this.getMimeTypeFromPath(targetImagePath);
```

**Step 4: Load all reference images (concurrent)**
```javascript
const referenceImages = await Promise.all(
  referenceImagePaths.map(async (path) => ({
    data: await this.imageToBase64(path),
    mimeType: this.getMimeTypeFromPath(path)
  }))
);
```

**Step 5: Build generation config**
```javascript
const imageConfig = this.getImageConfigFromAspectRatio(aspectRatio);
const generationConfig = {
  ...imageConfig,
  responseModalities: ["image"],
  outputFormat: "image/png"
};
```

**Step 6: Call Gemini API with retry logic**
```javascript
const contents = [
  {
    parts: [
      { text: prompt },
      { inlineData: { data: targetBase64, mimeType: targetMimeType } },
      ...referenceImages.map(ref => ({
        inlineData: { data: ref.data, mimeType: ref.mimeType }
      }))
    ]
  }
];

const apiResult = await this.executeWithRetry(async () => {
  return await model.generateContent({
    contents,
    generationConfig
  });
}, 3);
```

**Step 7: Extract image data**
```javascript
const candidate = apiResult.response.candidates[0];
const imagePart = candidate.content.parts.find(part => part.inlineData);
const imageData = imagePart.inlineData.data;
const mimeType = imagePart.inlineData.mimeType;
const size = Buffer.from(imageData, 'base64').length;
```

**Step 8: Debit tokens**
```javascript
const newBalance = await TokenService.debit(
  userId,
  tokenCost,
  'spend_generation',
  { ...metadata, operationType: 'image_multiple_reference' }
);
```

**Step 9: Return result**
```javascript
return {
  success: true,
  result: { imageData, mimeType, size },
  tokensUsed: tokenCost,
  remainingBalance: newBalance.balance,
  generationId: options.metadata?.generationId,
  processingTimeMs
};
```

**Image Loading Method:**
```javascript
async imageToBase64(imagePathOrUrl) {
  // Check if URL
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

**Interactions:**
- Uses `GoogleGenerativeAI` SDK from `@google/generative-ai`
- Calls `TokenService.getBalance()` before operation
- Calls `TokenService.debit()` after successful generation
- Calls `imageToBase64()` to load target + all references (local or URL)
- Calls `executeWithRetry()` for API calls with backoff
- Throws errors on insufficient balance, rate limit, or AI failures

---

### 7. Prompt Template System

**File:** `server/src/utils/multipleReferencePrompts.js`

**Role:** Database-driven prompt template system with composition

**Key Functions:**

#### `buildMultipleReferencePrompt(userPrompt, templateId, context)`
Fetch template from database and compose with user prompt

**Flow:**
```javascript
export async function buildMultipleReferencePrompt(
  userPrompt,
  templateId = null,
  context = {}
) {
  // Sanitize user input
  const sanitized = sanitizePrompt(userPrompt);
  
  // If no template ID, use default
  if (!templateId) {
    return getDefaultTemplate(sanitized, context);
  }
  
  try {
    // Fetch template from database
    const template = await PromptTemplateService.getById(templateId);
    
    // Check if active
    if (!template || !template.isActive) {
      logger.warn(`Template ${templateId} not found or inactive, using default`);
      return getDefaultTemplate(sanitized, context);
    }
    
    // Compose: system template + user prompt
    return composePrompt(template.prompt, sanitized, context);
  } catch (error) {
    logger.error(`Error fetching template ${templateId}:`, error.message);
    return getDefaultTemplate(sanitized, context);
  }
}
```

#### `getDefaultTemplate(userPrompt, context)`
Fallback template when no database template is available

```javascript
export function getDefaultTemplate(userPrompt, context = {}) {
  const { referenceCount = 1 } = context;
  
  return `${userPrompt}

Use the target image as the main subject and apply styling, composition elements, or accessories from the ${referenceCount} reference image${referenceCount > 1 ? 's' : ''}.

Focus on:
- Preserving the target's main characteristics
- Integrating reference elements naturally
- Maintaining visual coherence
- Professional quality output

Create a cohesive image that blends the target with reference elements.`;
}
```

#### `composePrompt(systemTemplate, userPrompt, context)`
Combine system template with user prompt

```javascript
export function composePrompt(systemTemplate, userPrompt, context = {}) {
  // Replace placeholders in template
  let composed = systemTemplate
    .replace(/\{referenceCount\}/g, context.referenceCount || 1)
    .replace(/\{aspectRatio\}/g, context.aspectRatio || '1:1');
  
  // Compose: system + user
  return `${composed}\n\n${userPrompt}`;
}
```

#### `sanitizePrompt(prompt)`
XSS protection for user input

```javascript
export function sanitizePrompt(prompt) {
  return prompt
    .trim()
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '');
}
```

**Database Template Structure:**
```javascript
{
  id: 'uuid',
  name: 'Fashion Styling',
  prompt: 'Apply fashion and styling elements...',
  category: 'multiple_reference',
  isActive: true,
  createdAt: '2025-11-10'
}
```

**Template Categories:**
- `GENERAL` - Generic templates
- `TEXT_TO_IMAGE` - Text-to-image specific
- `SINGLE_REFERENCE` - Single reference specific
- `MULTIPLE_REFERENCE` - Multiple reference specific

**Interactions:**
- Calls `PromptTemplateService.getById()` to fetch template
- Falls back to default if template not found/inactive
- Composes system template + user prompt
- Sanitizes user input for security

---

### 8. Database Schema

**File:** `server/src/db/schema.js`

**Key Tables:**

#### `imageGenerations`
Tracks all generation requests including multiple reference

**New Fields for Multiple Reference:**
```javascript
// Multiple reference fields
targetImageId: uuid("target_image_id").references(() => uploads.id),
referenceImageIds: jsonb("reference_image_ids"),  // Array of UUID strings
promptTemplateId: uuid("prompt_template_id").references(() => promptTemplates.id),
```

**Complete Schema:**
```javascript
export const imageGenerations = pgTable("image_generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  projectId: uuid("project_id").references(() => imageProjects.id),
  operationTypeId: uuid("operation_type_id").references(() => operationType.id).notNull(),
  
  // Input data
  prompt: text("prompt").notNull(),
  inputImageId: uuid("input_image_id").references(() => uploads.id),
  
  // Single reference fields
  referenceImageId: uuid("reference_image_id").references(() => uploads.id),
  referenceType: varchar("reference_type", { length: 50 }),
  
  // Multiple reference fields (NEW)
  targetImageId: uuid("target_image_id").references(() => uploads.id),
  referenceImageIds: jsonb("reference_image_ids"),
  promptTemplateId: uuid("prompt_template_id").references(() => promptTemplates.id),
  
  // Output data
  outputImageId: uuid("output_image_id").references(() => uploads.id),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  tokensUsed: integer("tokens_used").notNull().default(0),
  
  // AI metadata
  aiMetadata: text("ai_metadata"),
  metadata: text("metadata"),
  
  // Timing
  processingTimeMs: integer("processing_time_ms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at")
});
```

#### `promptTemplates`
Stores prompt templates for enhancement

**Schema:**
```javascript
export const promptTemplates = pgTable("prompt_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  prompt: text("prompt").notNull(),
  category: varchar("category", { length: 50 }).notNull().default("general"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
```

#### `operationType`
Pricing configuration for operations

**Multiple Reference Entry:**
```javascript
{
  id: 'uuid',
  name: 'image_multiple_reference',
  displayName: 'Image Generation - Multiple Reference',
  tokensPerOperation: 200,
  description: 'Generate images using target + multiple reference images',
  isActive: true
}
```

**Seed Data:**
```javascript
// Operation type
await db.insert(operationType).values({
  name: 'image_multiple_reference',
  displayName: 'Image Generation - Multiple Reference',
  tokensPerOperation: 200,
  description: 'Generate images using target + multiple reference images',
  isActive: true
});

// Prompt templates
await db.insert(promptTemplates).values([
  {
    name: 'Fashion Styling',
    prompt: 'Apply fashion and styling elements from reference images...',
    category: 'multiple_reference',
    isActive: true
  },
  {
    name: 'Product Customization',
    prompt: 'Integrate product customization elements...',
    category: 'multiple_reference',
    isActive: true
  },
  {
    name: 'Interior Design',
    prompt: 'Apply interior design elements and furniture...',
    category: 'multiple_reference',
    isActive: true
  }
]);
```

---

### 9. WebSocket Emitters

**File:** `server/src/services/websocket/emitters/imageGeneration.emitter.js`

**Role:** WebSocket event emission for real-time client updates

**Events:** Same as other generation types (shared emitter functions)

| Function | Event | Description |
|----------|-------|-------------|
| `emitGenerationProgress()` | `generation_progress` | Send progress updates (0-100%) |
| `emitGenerationCompleted()` | `generation_completed` | Send completion event with image URLs |
| `emitGenerationFailed()` | `generation_failed` | Send failure event with error message |

**Usage in Multiple Reference Flow:**
```javascript
// Progress updates
emitGenerationProgress(userId, generationId, 10, "Loading target and reference images...");
emitGenerationProgress(userId, generationId, 30, "Building enhanced prompt...");
emitGenerationProgress(userId, generationId, 50, "Generating image 1/1 with multiple references...");
emitGenerationProgress(userId, generationId, 80, "Uploading generated images...");

// Completion
emitGenerationCompleted(userId, generationId, {
  generationId,
  images: [...],
  targetImageId: "uuid",
  referenceImageIds: ["uuid1", "uuid2"],
  promptTemplateId: "uuid",
  tokens: { used: 200, remaining: 9800 }
});

// Failure
emitGenerationFailed(userId, generationId, "Target image not found or access denied");
```

---

### 10. Storage Helpers

**File:** `server/src/utils/gemini.helper.js`

**Role:** Storage operations for target, reference, and output images

**Key Functions:**

#### `saveToStorage({ source, filePath, userId, purpose, title, metadata })`
Save single image to R2 and create database record

**Used for:**
- Uploading target image (purpose: `GENERATION_INPUT`)
- Uploading each reference image (purpose: `GENERATION_INPUT`)
- Uploading generated images (purpose: `GENERATION_OUTPUT`)

#### `saveMultipleToStorage(images)`
Save multiple images concurrently to R2

**Used for:**
- Batch upload of generated images (1-4 images)

**Flow:**
1. Upload all files concurrently to R2 via `uploadMultipleToR2()` (Promise.all)
2. Create database records concurrently via `createUpload()` (Promise.all)
3. Return array of upload records with `publicUrl`, `id`, etc.

---

### 11. Constants

**File:** `server/src/utils/constant.js`

**Key Constants for Multiple Reference:**

```javascript
// Operation Types
export const IMAGE_OPERATION_TYPES = {
  TEXT_TO_IMAGE: "text_to_image",              // 100 tokens
  IMAGE_REFERENCE: "image_reference",          // 150 tokens
  IMAGE_MULTIPLE_REFERENCE: "image_multiple_reference"  // 200 tokens
};

// Prompt Template Categories
export const PROMPT_TEMPLATE_CATEGORIES = {
  GENERAL: 'general',
  TEXT_TO_IMAGE: 'text_to_image',
  SINGLE_REFERENCE: 'single_reference',
  MULTIPLE_REFERENCE: 'multiple_reference'
};

// Limits
export const GEMINI_LIMITS = {
  FILE_SIZE_MAX: 10 * 1024 * 1024,      // 10MB per file
  FILE_COUNT_MAX: 5,                     // Max files in single upload
  REFERENCE_IMAGES_MIN: 1,               // Min reference images
  REFERENCE_IMAGES_MAX: 5,               // Max reference images
  TOTAL_IMAGES_MAX: 6,                   // 1 target + 5 references
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
export const GEMINI_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const GEMINI_ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Upload Purpose
export const UPLOAD_PURPOSE = {
  GENERATION_INPUT: 'generation_input',   // Target + references
  GENERATION_OUTPUT: 'generation_output'  // Generated images
};

// Temp File Config
export const TEMP_FILE_CONFIG = {
  DEFAULT_EXPIRATION_MS: 5 * 60 * 1000,  // 5 minutes
  PURPOSE: {
    REFERENCE_IMAGE: 'reference_image',
    TARGET_IMAGE: 'target_image'
  }
};
```

---

## Data Flow

### Trigger

#### Multiple Reference Trigger (Upload Method)

```http
POST /api/generate/image-multiple-reference
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

{
  "prompt": "Professional fashion portrait with elegant accessories",
  "targetImage": [FILE],                 // Target image (person)
  "referenceImages": [FILE, FILE],       // Reference images (accessories)
  "promptTemplateId": "uuid",            // Optional: fashion styling template
  "aspectRatio": "1:1",                  // Optional: default "1:1"
  "numberOfImages": 1,                   // Optional: 1-4, default 1
  "projectId": "uuid"                    // Optional
}
```

#### Multiple Reference Trigger (UUID Reference Method)

```http
POST /api/generate/image-multiple-reference
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "prompt": "Professional fashion portrait with elegant accessories",
  "targetImageId": "550e8400-e29b-41d4-a716-446655440000",
  "referenceImageIds": [
    "660e8400-e29b-41d4-a716-446655440001",
    "770e8400-e29b-41d4-a716-446655440002"
  ],
  "promptTemplateId": "880e8400-e29b-41d4-a716-446655440003",
  "aspectRatio": "1:1",
  "numberOfImages": 1,
  "projectId": "uuid"
}
```

#### Multiple Reference Trigger (Mixed Method)

```http
POST /api/generate/image-multiple-reference
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

{
  "prompt": "Professional fashion portrait with elegant accessories",
  "targetImage": [FILE],                            // Upload target
  "referenceImageIds": ["uuid1", "uuid2"],         // Reference existing
  "promptTemplateId": "uuid",
  "aspectRatio": "1:1",
  "numberOfImages": 1
}
```

---

### Sequence

#### **Phase 1: Request Handling (Controller - Synchronous)**

**Step 1: Route middleware chain executes**
- `verifyToken`: Authenticate user, attach `req.user`
- `uploadMultipleReference`: Handle multi-field file upload (target + references)
- `validateImageMultipleReference`: Validate prompt, IDs, template, etc.
- `validateRequestWithCleanup`: Check validation errors, cleanup files if needed

**Step 2: Controller extracts data**
```javascript
const userId = get(req, 'user.id');
const prompt = get(req.body, 'prompt');
const promptTemplateId = get(req.body, 'promptTemplateId');
const targetImageId = get(req.body, 'targetImageId');
const referenceImageIds = get(req.body, 'referenceImageIds', []);

// Files from multer
const targetFile = get(req.files, 'targetImage[0]');
const referenceFiles = get(req.files, 'referenceImages', []);
```

**Step 3: Validate input requirements**
```javascript
// Must provide target via EITHER file OR UUID
if (!targetFile && !targetImageId) {
  throwError('Must provide either targetImage file or targetImageId');
}

// Must provide at least one reference
if (referenceFiles.length === 0 && referenceImageIds.length === 0) {
  throwError('Must provide at least one reference image');
}
```

**Step 4: Process target image (upload flow)**
```javascript
let finalTargetImageId = targetImageId;
let targetTempFileId = null;

if (targetFile) {
  // Upload to R2
  const targetUpload = await saveToStorage({
    filePath: targetFile.path,
    userId,
    purpose: UPLOAD_PURPOSE.GENERATION_INPUT,
    title: `Target: ${prompt.substring(0, 50)}...`,
    metadata: { purpose: 'multiple_reference_target' }
  });
  
  finalTargetImageId = targetUpload.id;
  
  // Store in temp cache (5 min TTL)
  targetTempFileId = await tempFileManager.storeTempFile(
    targetFile.path,
    {
      userId,
      uploadId: finalTargetImageId,
      purpose: TEMP_FILE_CONFIG.PURPOSE.TARGET_IMAGE,
      type: 'target'
    }
  );
  
  // Cleanup multer upload
  fs.unlinkSync(targetFile.path);
}
```

**Step 5: Process reference images (loop)**
```javascript
const finalReferenceImageIds = [...referenceImageIds]; // Start with UUIDs
const tempFileIds = [];

// Track target temp file
if (targetTempFileId) {
  tempFileIds.push({
    id: targetTempFileId,
    type: 'target',
    uploadId: finalTargetImageId
  });
}

// Process each uploaded reference file
for (let i = 0; i < referenceFiles.length; i++) {
  const refFile = referenceFiles[i];
  
  // Upload to R2
  const refUpload = await saveToStorage({
    filePath: refFile.path,
    userId,
    purpose: UPLOAD_PURPOSE.GENERATION_INPUT,
    title: `Reference ${i+1}: ${prompt.substring(0, 50)}...`,
    metadata: { purpose: 'multiple_reference', index: i }
  });
  
  finalReferenceImageIds.push(refUpload.id);
  
  // Store in temp cache
  const refTempFileId = await tempFileManager.storeTempFile(
    refFile.path,
    {
      userId,
      uploadId: refUpload.id,
      purpose: TEMP_FILE_CONFIG.PURPOSE.REFERENCE_IMAGE
    }
  );
  
  tempFileIds.push({
    id: refTempFileId,
    type: 'reference',
    uploadId: refUpload.id
  });
  
  // Cleanup multer upload
  fs.unlinkSync(refFile.path);
}
```

**Step 6: Validate final reference count**
```javascript
if (finalReferenceImageIds.length < 1) {
  throwError('Must provide at least 1 reference image');
}

if (finalReferenceImageIds.length > 5) {
  throwError('Cannot provide more than 5 reference images');
}
```

**Step 7: Fetch operation type and sanitize**
```javascript
const operationType = await getOperationTypeByName('image_multiple_reference');
// Returns: { id: 'uuid', tokensPerOperation: 200, ... }

const sanitizedPrompt = prompt.trim().replace(/<script[^>]*>.*?<\/script>/gi, '');
```

**Step 8: Create generation record**
```javascript
const generationId = await createGenerationRecord({
  userId,
  operationTypeId: operationType.id,
  prompt: sanitizedPrompt,
  targetImageId: finalTargetImageId,
  referenceImageIds: finalReferenceImageIds,  // JSONB array
  promptTemplateId: promptTemplateId || null,
  status: GENERATION_STATUS.PENDING,
  metadata: JSON.stringify({
    aspectRatio,
    numberOfImages,
    projectId,
    uploadedNewTarget: !!targetFile,
    uploadedNewReferences: referenceFiles.length,
    referencedExisting: referenceImageIds.length,
    referenceCount: finalReferenceImageIds.length
  })
});
```

**Step 9: Queue job**
```javascript
const job = await queueService.addJob(
  QUEUE_NAMES.IMAGE_GENERATION,
  JOB_TYPES.IMAGE_GENERATION.IMAGE_MULTIPLE_REFERENCE,
  {
    userId,
    generationId,
    prompt: sanitizedPrompt,
    targetImageId: finalTargetImageId,
    referenceImageIds: finalReferenceImageIds,
    promptTemplateId,
    numberOfImages,
    aspectRatio,
    projectId,
    model,
    operationTypeTokenCost: 200,
    tempFileIds  // Array of {id, type, uploadId}
  },
  {
    priority: JOB_PRIORITY.NORMAL,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  }
);

logger.info(`Multiple reference job queued: job ${job.id}, generation ${generationId}, references: ${finalReferenceImageIds.length}`);
```

**Step 10: Return HTTP 202 Accepted**
```javascript
return sendSuccess(res, {
  jobId: job.id,
  generationId,
  targetImageId: finalTargetImageId,
  referenceImageIds: finalReferenceImageIds,
  status: GENERATION_STATUS.PENDING,
  message: 'Multiple reference generation queued successfully',
  numberOfImages,
  metadata: {
    prompt: sanitizedPrompt,
    aspectRatio,
    projectId,
    promptTemplateId,
    referenceCount: finalReferenceImageIds.length,
    uploadedNewImages: targetFile ? 1 + referenceFiles.length : 0,
    referencedExistingImages: referenceImageIds.length
  },
  websocketEvents: {
    progress: 'generation_progress',
    completed: 'generation_completed',
    failed: 'generation_failed'
  },
  statusEndpoint: `/api/generate/queue/${generationId}`
}, 'Generation queued', HTTP_STATUS.ACCEPTED);
```

---

#### **Phase 2: Background Processing (Processor - Asynchronous)**

**Step 11: Job dequeued by worker**
```javascript
// Worker picks up job from IMAGE_GENERATION queue
// Calls processImageMultipleReference(job)
```

**Step 12: Update status to PROCESSING (10% progress)**
```javascript
await updateGenerationRecord(generationId, {
  status: GENERATION_STATUS.PROCESSING
});

await job.updateProgress(10);
emitGenerationProgress(
  userId,
  generationId,
  10,
  "Loading target and reference images..."
);
```

**Step 13: Load target image (optimization path)**
```javascript
let targetImagePath = null;
const usedTempFiles = [];

// Option A: Check temp cache
const targetTempInfo = tempFileIds.find(t => t.type === 'target');
if (targetTempInfo) {
  targetImagePath = tempFileManager.getTempFilePath(targetTempInfo.id);
  
  if (targetImagePath) {
    usedTempFiles.push(targetTempInfo.id);
    logger.info(`Using temp file for target: ${targetTempInfo.id}`);
  } else {
    logger.warn(`Temp file expired for target: ${targetTempInfo.id}`);
  }
}

// Option B: Fetch from database (fallback)
if (!targetImagePath) {
  const [targetImage] = await db
    .select()
    .from(uploads)
    .where(and(
      eq(uploads.id, targetImageId),
      eq(uploads.userId, userId)  // Authorization check
    ))
    .limit(1);
  
  if (!targetImage) {
    throw new Error("Target image not found or access denied");
  }
  
  targetImagePath = targetImage.publicUrl;  // R2 URL
  logger.info(`Using R2 URL for target: ${targetImagePath}`);
}

await job.updateProgress(20);
```

**Step 14: Load reference images (loop, 20-30% progress)**
```javascript
const referenceImagePaths = [];

for (const refId of referenceImageIds) {
  let refPath = null;
  
  // Option A: Check temp cache
  const refTempInfo = tempFileIds.find(t => t.uploadId === refId);
  if (refTempInfo) {
    refPath = tempFileManager.getTempFilePath(refTempInfo.id);
    
    if (refPath) {
      usedTempFiles.push(refTempInfo.id);
      logger.info(`Using temp file for reference ${refId}: ${refTempInfo.id}`);
    } else {
      logger.warn(`Temp file expired for reference: ${refTempInfo.id}`);
    }
  }
  
  // Option B: Fetch from database (fallback)
  if (!refPath) {
    const [refImage] = await db
      .select()
      .from(uploads)
      .where(and(
        eq(uploads.id, refId),
        eq(uploads.userId, userId)  // Authorization check
      ))
      .limit(1);
    
    if (!refImage) {
      throw new Error(`Reference image ${refId} not found or access denied`);
    }
    
    refPath = refImage.publicUrl;  // R2 URL
    logger.info(`Using R2 URL for reference ${refId}`);
  }
  
  referenceImagePaths.push(refPath);
}

await job.updateProgress(30);
```

**Step 15: Build enhanced prompt (30-40% progress)**
```javascript
emitGenerationProgress(
  userId,
  generationId,
  30,
  "Building enhanced prompt..."
);

// Import prompt builder utility
const { buildMultipleReferencePrompt } = await import(
  '../../../utils/multipleReferencePrompts.js'
);

// Fetch template from database and compose
const enhancedPrompt = await buildMultipleReferencePrompt(
  prompt,
  promptTemplateId,
  {
    referenceCount: referenceImageIds.length,
    aspectRatio
  }
);

logger.info(`Enhanced prompt built for generation ${generationId}`);
await job.updateProgress(40);
```

**Step 16: Generate images loop (40-80% progress)**
```javascript
const generationResults = [];
const progressPerImage = 40 / numberOfImages;  // 40-80% range

for (let i = 0; i < numberOfImages; i++) {
  const currentProgress = 40 + (i + 1) * progressPerImage;
  
  emitGenerationProgress(
    userId,
    generationId,
    Math.round(currentProgress),
    `Generating image ${i + 1}/${numberOfImages} with multiple references...`
  );
  
  // Call Gemini service with target + all references
  const result = await GeminiService.generateWithMultipleReferences(
    userId,
    operationTypeTokenCost,  // 200 tokens
    targetImagePath,         // Local temp path OR R2 URL
    referenceImagePaths,     // Array of local paths OR R2 URLs
    enhancedPrompt,
    {
      aspectRatio,
      modelName: model,
      metadata: {
        originalPrompt: prompt,
        enhancedPrompt,
        targetImageId,
        referenceImageIds,
        promptTemplateId,
        projectId,
        generationId,
        imageNumber: i + 1,
        totalImages: numberOfImages
      }
    }
  );
  
  generationResults.push({
    result: result.result,
    imageNumber: i + 1,
    tokensUsed: result.tokensUsed,
    processingTimeMs: result.processingTimeMs,
    remainingBalance: result.remainingBalance
  });
  
  await job.updateProgress(Math.round(currentProgress));
}
```

**Step 17: Upload images to R2 concurrently (80-90% progress)**
```javascript
await job.updateProgress(80);
emitGenerationProgress(
  userId,
  generationId,
  80,
  "Uploading generated images..."
);

// Calculate totals
const totalTokensUsed = generationResults.reduce((sum, r) => sum + r.tokensUsed, 0);
const totalProcessingTime = generationResults.reduce((sum, r) => sum + r.processingTimeMs, 0);
const remainingBalance = generationResults[generationResults.length - 1]?.remainingBalance || 0;

// Prepare upload array
const imagesToUpload = generationResults.map((genResult) => ({
  source: genResult.result,
  userId,
  purpose: UPLOAD_PURPOSE.GENERATION_OUTPUT,
  title: `Multi-ref: ${prompt.substring(0, 50)}... (${genResult.imageNumber}/${numberOfImages})`,
  metadata: {
    generationId,
    aspectRatio,
    imageNumber: genResult.imageNumber,
    targetImageId,
    referenceCount: referenceImageIds.length
  }
}));

// Concurrent upload (Promise.all)
const uploadRecords = await saveMultipleToStorage(imagesToUpload);

await job.updateProgress(90);
emitGenerationProgress(userId, generationId, 90, "Finalizing...");
```

**Step 18: Update generation record (90-100% progress)**
```javascript
const generatedImages = uploadRecords.map((uploadRecord, index) => ({
  imageUrl: uploadRecord.publicUrl,
  imageId: uploadRecord.id,
  mimeType: generationResults[index].result.mimeType,
  imageSize: generationResults[index].result.size
}));

await updateGenerationRecord(generationId, {
  status: GENERATION_STATUS.COMPLETED,
  outputImageId: generatedImages[0].imageId,  // First image as primary
  tokensUsed: totalTokensUsed,
  processingTimeMs: totalProcessingTime,
  aiMetadata: JSON.stringify({
    aspectRatio,
    numberOfImages,
    prompt,
    enhancedPrompt,
    targetImageId,
    referenceImageIds,
    promptTemplateId,
    imageIds: generatedImages.map((img) => img.imageId),
    model: model || process.env.GEMINI_MODEL || "gemini-2.5-flash-image"
  })
});
```

**Step 19: Emit completion event (100% progress)**
```javascript
await job.updateProgress(100);

const result = {
  generationId,
  images: generatedImages,
  numberOfImages,
  targetImageId,
  referenceImageIds,
  promptTemplateId,
  metadata: {
    prompt,
    enhancedPrompt,
    aspectRatio,
    targetImageId,
    referenceCount: referenceImageIds.length
  },
  tokens: {
    used: totalTokensUsed,
    remaining: remainingBalance
  },
  processing: {
    timeMs: totalProcessingTime,
    status: GENERATION_STATUS.COMPLETED
  },
  createdAt: new Date().toISOString()
};

emitGenerationCompleted(userId, generationId, result);

logger.info(
  `Multiple reference generation completed: ${generationId} ` +
  `(${numberOfImages} images, ${totalTokensUsed} tokens, ${totalProcessingTime}ms)`
);
```

**Step 20: Cleanup (finally block)**
```javascript
finally {
  // Cleanup ALL temp files after processing (success or failure)
  for (const tempId of usedTempFiles) {
    tempFileManager.cleanup(tempId);
    logger.debug(`Cleaned up temp file after processing: ${tempId}`);
  }
}
```

---

#### **Phase 3: Error Handling (if any step fails)**

**Step 21: Catch error in processor**
```javascript
catch (error) {
  logger.error(`Multiple reference generation failed: ${job.id}`, error);
  
  // Update database
  await updateGenerationRecord(generationId, {
    status: GENERATION_STATUS.FAILED,
    errorMessage: error.message
  });
  
  // Map error
  const geminiError = handleGeminiError(error);
  
  // Notify client
  emitGenerationFailed(userId, generationId, geminiError.message);
  
  // Re-throw for BullMQ retry
  throw error;
}
finally {
  // Cleanup temp files (always runs)
  for (const tempId of usedTempFiles) {
    tempFileManager.cleanup(tempId);
  }
}
```

**Step 22: Controller error handling (synchronous errors)**
```javascript
catch (error) {
  // Cleanup uploaded target file
  if (targetFile?.path && fs.existsSync(targetFile.path)) {
    fs.unlinkSync(targetFile.path);
  }
  
  // Cleanup uploaded reference files
  for (const refFile of referenceFiles) {
    if (refFile?.path && fs.existsSync(refFile.path)) {
      fs.unlinkSync(refFile.path);
    }
  }
  
  // Cleanup temp files
  for (const tempInfo of tempFileIds) {
    tempFileManager.cleanup(tempInfo.id);
  }
  
  // Update generation record
  if (generationId) {
    await updateGenerationRecord(generationId, {
      status: GENERATION_STATUS.FAILED,
      errorMessage: error.message
    });
  }
  
  // Return error
  const geminiError = handleGeminiError(error);
  throwError(geminiError.message, geminiError.status);
}
```

**BullMQ Retry Logic:**
- Transient errors: Retry up to 3 times with exponential backoff (2s, 4s, 8s)
- Permanent errors: Immediate failure, no retry

---

### Completion

#### ✅ Success Completion

**Database:**
```javascript
// imageGenerations record
{
  status: 'completed',
  targetImageId: 'target-uuid',
  referenceImageIds: ['ref-uuid-1', 'ref-uuid-2'],
  promptTemplateId: 'template-uuid',
  outputImageId: 'output-uuid',
  tokensUsed: 200,
  processingTimeMs: 22500,
  aiMetadata: JSON.stringify({
    aspectRatio: '1:1',
    numberOfImages: 1,
    prompt: 'original',
    enhancedPrompt: 'template + original',
    imageIds: ['output-uuid']
  })
}
```

**Storage:**
- Target image: `g/{userId}/target-{genId}-{timestamp}.jpg`
- Reference images: `g/{userId}/ref-{i}-{genId}-{timestamp}.jpg`
- Generated images: `g/{userId}/gen-{genId}-{n}-{timestamp}.png`

**Token Ledger:**
```javascript
// tokenTransactions record
{
  type: 'DEBIT',
  amount: 200,
  reason: 'spend_generation',
  metadata: { operationType: 'image_multiple_reference', ... }
}

// userTokens.balance decreased by 200
```

**Temp Files:**
- All temp files cleaned up automatically (target + references)

**WebSocket:**
- Client receives `generation_completed` event with:
  - Generated image URLs
  - Target and reference IDs
  - Template ID
  - Token usage and remaining balance

---

#### ❌ Failure Completion

**Database:**
```javascript
// imageGenerations record
{
  status: 'failed',
  errorMessage: 'Target image not found or access denied',
  targetImageId: 'target-uuid',
  referenceImageIds: ['ref-uuid-1', 'ref-uuid-2']
}
```

**Storage:**
- Target/reference images may be in R2 (if uploaded before error)
- No generated images uploaded

**Token Ledger:**
- No transaction created (no token debit on failure)

**Temp Files:**
- All temp files cleaned up automatically (finally block)

**Uploaded Files:**
- Multer upload files deleted (controller catch block)

**WebSocket:**
- Client receives `generation_failed` event with error message

**Client:**
- Show error to user
- Prompt retry with same or different images/template

---

## API Documentation

### Endpoint: Multiple Reference Generation

```http
POST /api/generate/image-multiple-reference
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data OR application/json
```

#### Request Body (File Upload Method)

```
targetImage: [FILE]                      # JPEG/PNG/WebP, max 10MB
referenceImages: [FILE, FILE, ...]       # 1-5 files, JPEG/PNG/WebP, max 10MB each
prompt: "text"                           # Required: 5-2000 characters
promptTemplateId: "uuid"                 # Optional: template for enhancement
aspectRatio: "1:1"                       # Optional: 1:1|16:9|9:16|4:3|3:4
numberOfImages: 1                        # Optional: 1-4, default 1
projectId: "uuid"                        # Optional
```

#### Request Body (UUID Reference Method)

```json
{
  "prompt": "Professional fashion portrait with elegant accessories",
  "targetImageId": "550e8400-e29b-41d4-a716-446655440000",
  "referenceImageIds": [
    "660e8400-e29b-41d4-a716-446655440001",
    "770e8400-e29b-41d4-a716-446655440002"
  ],
  "promptTemplateId": "880e8400-e29b-41d4-a716-446655440003",
  "aspectRatio": "1:1",
  "numberOfImages": 1,
  "projectId": "uuid"
}
```

#### Request Body (Mixed Method)

```
targetImage: [FILE]                      # Upload target
referenceImageIds: ["uuid1", "uuid2"]    # Reference existing
prompt: "text"
promptTemplateId: "uuid"
aspectRatio: "1:1"
numberOfImages: 1
```

#### Input Requirements

**Target Image:**
- Exactly **1 target** required
- Provide EITHER file OR UUID (not both)

**Reference Images:**
- **1-5 references** required
- Provide files, UUIDs, or mix
- Total references must be 1-5 after merging uploaded + referenced

**File Validation:**
- **Allowed types:** JPEG, PNG, WebP
- **Max size:** 10MB per file
- **Max dimensions:** 4096x4096 pixels
- **Min dimensions:** 64x64 pixels
- **Total files:** Max 6 (1 target + 5 references)

#### Response (HTTP 202 Accepted)

```json
{
  "success": true,
  "data": {
    "jobId": "12345",
    "generationId": "550e8400-e29b-41d4-a716-446655440000",
    "targetImageId": "target-uuid",
    "referenceImageIds": ["ref-uuid-1", "ref-uuid-2"],
    "status": "pending",
    "message": "Multiple reference generation queued successfully",
    "numberOfImages": 1,
    "metadata": {
      "prompt": "Professional fashion portrait with elegant accessories",
      "aspectRatio": "1:1",
      "projectId": "uuid",
      "promptTemplateId": "template-uuid",
      "referenceCount": 2,
      "uploadedNewImages": 3,
      "referencedExistingImages": 0
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
  "message": "Building enhanced prompt...",
  "timestamp": "2025-11-10T10:30:00.000Z"
}
```

**Progress Messages:**
- 10%: "Loading target and reference images..."
- 30%: "Building enhanced prompt..."
- 40-80%: "Generating image {n}/{total} with multiple references..."
- 80%: "Uploading generated images..."
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
    "targetImageId": "target-uuid",
    "referenceImageIds": ["ref-uuid-1", "ref-uuid-2"],
    "promptTemplateId": "template-uuid",
    "metadata": {
      "prompt": "Professional fashion portrait with elegant accessories",
      "enhancedPrompt": "{template text}\n\nProfessional fashion portrait with elegant accessories",
      "aspectRatio": "1:1",
      "targetImageId": "target-uuid",
      "referenceCount": 2
    },
    "tokens": {
      "used": 200,
      "remaining": 9800
    },
    "processing": {
      "timeMs": 22500,
      "status": "completed"
    },
    "createdAt": "2025-11-10T10:30:22.500Z"
  },
  "timestamp": "2025-11-10T10:30:22.500Z"
}
```

#### Event: `generation_failed`

```json
{
  "generationId": "550e8400-e29b-41d4-a716-446655440000",
  "error": "Target image not found or access denied",
  "timestamp": "2025-11-10T10:30:05.123Z"
}
```

---

## Interaction Map

### Synchronous Request Flow (File Upload)

```
Client HTTP POST (multipart/form-data: targetImage + referenceImages[])
    ↓
Express Route (gemini.route.js)
    ↓ (middleware chain)
verifyToken → uploadMultipleReference → validateImageMultipleReference → validateRequestWithCleanup
    ↓
Controller (gemini.controller.js::imageMultipleReference)
    ├─ Process target file:
    │   ├─ saveToStorage() → R2 + uploads table
    │   ├─ tempFileManager.storeTempFile() → temp cache
    │   └─ fs.unlinkSync() → cleanup multer upload
    ├─ Process reference files (loop):
    │   ├─ saveToStorage() → R2 + uploads table
    │   ├─ tempFileManager.storeTempFile() → temp cache
    │   └─ fs.unlinkSync() → cleanup multer upload
    ├─ getOperationTypeByName('image_multiple_reference') → 200 tokens
    ├─ createGenerationRecord() → imageGenerations table (PENDING)
    └─ queueService.addJob() → BullMQ Redis queue (with tempFileIds array)
    ↓
HTTP 202 Response to Client
```

### Synchronous Request Flow (UUID Reference)

```
Client HTTP POST (JSON: targetImageId + referenceImageIds[])
    ↓
Express Route (gemini.route.js)
    ↓ (middleware chain)
verifyToken → uploadMultipleReference (no files) → validateImageMultipleReference → validateRequestWithCleanup
    ↓
Controller (gemini.controller.js::imageMultipleReference)
    ├─ Validate target UUID ownership
    ├─ Validate each reference UUID ownership
    ├─ getOperationTypeByName('image_multiple_reference')
    ├─ createGenerationRecord() → imageGenerations table (PENDING)
    └─ queueService.addJob() → BullMQ Redis queue (tempFileIds = [])
    ↓
HTTP 202 Response to Client
```

### Asynchronous Processing Flow (with Temp File Optimization)

```
BullMQ Worker
    ↓
Processor (imageGeneration.processor.js::processImageMultipleReference)
    ├─ updateGenerationRecord() → imageGenerations (PROCESSING)
    ├─ emitGenerationProgress() → WebSocket → Client (10%)
    │
    ├─ Load Target Image:
    │   ├─ tempFileManager.getTempFilePath(targetTempId)
    │   ├─ IF temp exists: Use local path (fast - no download)
    │   └─ IF temp expired: db.select() → publicUrl (R2)
    │
    ├─ Load Reference Images (loop):
    │   ├─ For each reference:
    │   │   ├─ tempFileManager.getTempFilePath(refTempId)
    │   │   ├─ IF temp exists: Use local path
    │   │   └─ IF temp expired: db.select() → publicUrl (R2)
    │   └─ Build referenceImagePaths array
    │
    ├─ emitGenerationProgress() → WebSocket → Client (30%)
    │
    ├─ Build Enhanced Prompt:
    │   ├─ buildMultipleReferencePrompt(prompt, templateId)
    │   │   ├─ IF templateId: PromptTemplateService.getById()
    │   │   ├─ IF found + active: composePrompt(template, userPrompt)
    │   │   └─ IF not found: getDefaultTemplate()
    │   └─ Return enhanced prompt
    │
    ├─ emitGenerationProgress() → WebSocket → Client (40%)
    ↓
Loop (numberOfImages times):
    ├─ GeminiService.generateWithMultipleReferences()
    │   ├─ checkRateLimit() → in-memory rate limiter
    │   ├─ TokenService.getBalance() → userTokens table
    │   ├─ Load target: imageToBase64(targetImagePath)
    │   │   ├─ IF local path: fs.promises.readFile()
    │   │   └─ IF URL: fetch() → ArrayBuffer → base64
    │   ├─ Load references: Promise.all(refs.map(imageToBase64))
    │   ├─ executeWithRetry() → Google Gemini API
    │   │   └─ contents: [{ parts: [text, target, ...refs] }]
    │   ├─ extractImage() → base64 image data
    │   └─ TokenService.debit() → userTokens + tokenTransactions tables
    └─ emitGenerationProgress() → WebSocket → Client (40-80%)
    ↓
saveMultipleToStorage() (concurrent)
    ├─ uploadMultipleToR2() → Cloudflare R2 (parallel uploads)
    └─ createUpload() (loop) → uploads table
    ↓
updateGenerationRecord() → imageGenerations (COMPLETED)
    ↓
emitGenerationCompleted() → WebSocket → Client (100%)
    ↓
Cleanup (finally block):
    └─ tempFileManager.cleanup() for each temp file (target + references)
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
        └─ tempFileManager.cleanup() for all temp files
    ↓
Controller catch block (if synchronous error)
    ├─ fs.unlinkSync(targetFile.path) → cleanup multer upload
    ├─ fs.unlinkSync() for each reference file → cleanup multer uploads
    ├─ tempFileManager.cleanup() for all temp files
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
| No target provided | 400 Bad Request | Check targetFile AND targetImageId both missing |
| No references provided | 400 Bad Request | Check referenceFiles AND referenceImageIds both empty |
| Reference count out of range | 400 Bad Request | After merging, check 1-5 range |
| Validation errors | 400 Bad Request | Cleanup all uploaded files, return error |
| Authentication errors | 401 Unauthorized | Via verifyToken middleware |
| File upload errors (multer) | 400 Bad Request | File too large, invalid type, too many files |
| Storage upload errors | 500 Internal Server Error | Log and return error |
| Database errors | 500 Internal Server Error | Log and return error |

**Cleanup on Controller Error:**
- ✅ Cleanup target multer upload: `fs.unlinkSync(targetFile.path)`
- ✅ Cleanup reference multer uploads: Loop through and unlink each
- ✅ Cleanup all temp files: Loop through tempFileIds and cleanup each
- ✅ Update generation record to `FAILED`
- ✅ Return error response

---

### Processor-Level Errors (Asynchronous)

#### 1. Target Image Not Found

- **Detected by:** `db.select().from(uploads)` returns empty for target
- **Error:** "Target image not found or access denied"
- **Status:** 404 Not Found (mapped to 500 for client)
- **Handling:** Update generation to FAILED, emit `generation_failed`, no retry

#### 2. Reference Image Not Found

- **Detected by:** `db.select().from(uploads)` returns empty for reference
- **Error:** "Reference image {id} not found or access denied"
- **Status:** 404 Not Found
- **Handling:** Update generation to FAILED, emit error, no retry

#### 3. Insufficient Tokens

- **Detected by:** `TokenService.getBalance()` in `GeminiService.executeWithTokens()`
- **Error:** "Insufficient tokens. Need 200, have {balance}"
- **Status:** 402 Payment Required
- **Handling:** Update generation to FAILED, emit error, no retry

#### 4. Rate Limit Exceeded

- **Detected by:** `GeminiService.checkRateLimit()`
- **Error:** "Rate limit exceeded. Please wait before making more requests."
- **Status:** 429 Too Many Requests
- **Handling:** Retry with exponential backoff (transient error)

#### 5. Temp Files Expired

- **Detected by:** `tempFileManager.getTempFilePath()` returns null
- **Behavior:** Silent fallback to R2 download (not an error)
- **Handling:** Continue processing with R2 public URLs

#### 6. Image Download Failed

- **Detected by:** `imageToBase64()` fetch fails for R2 URL
- **Error:** "Failed to fetch image: {statusText}"
- **Status:** 500 Internal Server Error
- **Handling:** Mark FAILED, emit error, no retry

#### 7. Template Not Found

- **Detected by:** `PromptTemplateService.getById()` returns null or inactive
- **Behavior:** Fall back to default prompt (not an error)
- **Handling:** Log warning, continue with default template

#### 8. Gemini API Errors

**Transient errors** (timeout, network, service unavailable):
- Retry up to 3 times with exponential backoff (2s, 4s, 8s)
- If all retries fail: Mark FAILED, emit error

**Permanent errors** (invalid API key, bad request, unsupported format):
- No retry, immediate failure
- Update generation to FAILED, emit error

#### 9. Storage Upload Errors

- **Detected in:** `saveMultipleToStorage()`
- **Error:** "Batch upload failed: {reason}"
- **Status:** 500 Internal Server Error
- **Handling:** Mark FAILED, emit error, no retry

---

### Cleanup Strategy

#### Always Cleanup (finally block)
```javascript
finally {
  // Target temp file
  if (targetTempId) {
    tempFileManager.cleanup(targetTempId);
  }
  
  // Reference temp files (loop)
  for (const tempId of usedTempFiles) {
    tempFileManager.cleanup(tempId);
  }
}
```

#### Controller Cleanup (catch block)
```javascript
catch (error) {
  // Cleanup uploaded target file
  if (targetFile?.path && fs.existsSync(targetFile.path)) {
    fs.unlinkSync(targetFile.path);
  }
  
  // Cleanup uploaded reference files
  for (const refFile of referenceFiles) {
    if (refFile?.path && fs.existsSync(refFile.path)) {
      fs.unlinkSync(refFile.path);
    }
  }
  
  // Cleanup temp files
  for (const tempInfo of tempFileIds) {
    tempFileManager.cleanup(tempInfo.id);
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
  "message": "Must provide at least 1 reference image",
  "code": "GEMINI_ERROR_CODE"
}
```

### WebSocket Error Event

```json
{
  "generationId": "uuid",
  "error": "Target image not found or access denied",
  "timestamp": "ISO-8601"
}
```

---

## Performance Notes

### Optimization Techniques

#### 1. ⚡ Temp File Caching (Key Optimization)
**Problem:** Re-downloading recently uploaded files from R2 adds latency
**Solution:** Store uploaded images temporarily (5 min TTL)
**Benefit:**
- **Upload flow:** Local file access (0 download time) for ALL images
- **Existing image flow:** Standard R2 download
- **Expired temp:** Graceful fallback to R2
- **Processing time reduction:** ~2-3 seconds saved per generation

**Implementation for Multiple Files:**
```javascript
// Controller: Store all temp files
const tempFileIds = [];

// Target
const targetTempId = await tempFileManager.storeTempFile(targetFile.path, metadata);
tempFileIds.push({ id: targetTempId, type: 'target', uploadId: targetImageId });

// References (loop)
for (const refFile of referenceFiles) {
  const refTempId = await tempFileManager.storeTempFile(refFile.path, metadata);
  tempFileIds.push({ id: refTempId, type: 'reference', uploadId: refUpload.id });
}

// Processor: Use all temp files if available
for (const tempInfo of tempFileIds) {
  const path = tempFileManager.getTempFilePath(tempInfo.id);
  if (path) {
    // Fast path: Local file access
    usedTempFiles.push(tempInfo.id);
  } else {
    // Fallback: Download from R2
  }
}

// Cleanup: Remove all temp files
for (const tempId of usedTempFiles) {
  tempFileManager.cleanup(tempId);
}
```

#### 2. ⚡ Concurrent Image Loading
- Target + all references loaded concurrently via `Promise.all`
- Reduces load time from sequential to parallel
- Example: 2 references = 1x time vs 3x time

#### 3. ⚡ Async Queue Processing
- HTTP request returns immediately (202 Accepted)
- Long-running AI operations execute in background
- Non-blocking user experience

#### 4. ⚡ Concurrent Image Uploads
- `saveMultipleToStorage()` uses `Promise.all`
- All generated images uploaded to R2 in parallel
- Reduces total processing time for multi-image generations

#### 5. ⚡ Database-Driven Templates
- Templates stored in database (no code deployment needed)
- Easy updates without server restart
- Cacheable for future optimization

#### 6. ⚡ Base64 Encoding Optimization
- Images converted to base64 once per generation
- Reused for all images in batch generation
- Avoids repeated file reads/downloads

#### 7. ⚡ Database Indexing
- Indexes on `userId`, `targetImageId`, `status`, `createdAt`
- Composite indexes for common query patterns
- Fast image ownership validation

#### 8. ⚡ Token Balance Caching
- Token balance checked once before batch generation
- Single debit per image (not per retry)
- Transaction-based atomic updates

#### 9. ⚡ Rate Limiting
- In-memory rate limiter (15 req/min per user)
- Prevents excessive API calls to Gemini
- Sliding window implementation

#### 10. ⚡ Retry with Exponential Backoff
- Transient errors retried automatically
- Exponential delay: 2s, 4s, 8s (max 3 attempts)
- Reduces load on external APIs during outages

---

### Scalability Considerations

| Aspect | Solution |
|--------|----------|
| **Horizontal Scaling** | Multiple worker processes can process jobs in parallel |
| **Redis Queue** | BullMQ supports distributed job processing |
| **Temp File Storage** | In-memory registry per server, no shared state needed |
| **R2 CDN** | Cloudflare R2 provides global CDN for fast image delivery |
| **Database Connection Pooling** | Drizzle ORM manages connection pool |
| **Memory Management** | Sequential image generation prevents memory spikes |
| **Monitoring** | BullMQ monitor service tracks queue health, job metrics |
| **Temp File Cleanup** | Automatic expiration prevents disk space issues |
| **Template Caching** | Future optimization: cache frequently used templates |

---

### Performance Metrics

| Metric | Average Time | Notes |
|--------|--------------|-------|
| **File Uploads (1 target + 2 refs)** | 3-5 seconds | Upload to R2 + temp storage |
| **Temp File Storage (3 files)** | < 300ms | Local file copy + registry update |
| **Temp File Retrieval (3 files)** | < 30ms | In-memory lookup + file existence check |
| **R2 Download (3 files, fallback)** | 1.5-4s | Depends on file size and network |
| **Template Fetch** | < 50ms | Database query with index |
| **Prompt Composition** | < 10ms | String concatenation |
| **Generation Time (1 image, 3 refs)** | 8-15 seconds | Depends on Gemini API |
| **Queue Latency** | < 1 second | Job pickup by worker |
| **Upload Time (1 image)** | 1-2 seconds | Single image to R2 |
| **Upload Time (4 images)** | 2-4 seconds | Concurrent upload |
| **Total Processing (1 image, 3 refs)** | ~25-35 seconds | With temp file optimization |
| **Total Processing (4 images, 3 refs)** | ~60-80 seconds | With concurrent uploads |

**Optimization Impact:**
- **With temp files (3 files):** ~25-30 seconds (1 image)
- **Without temp files (3 R2 downloads):** ~28-34 seconds (1 image)
- **Savings:** 2-4 seconds per generation (7-13% improvement)

**Breakdown (1 image with 3 temp files):**
- Upload + temp storage: 3-5s
- Queue latency: <1s
- Load images (temp): <30ms
- Build prompt: <50ms
- Generate image: 8-15s
- Upload result: 1-2s
- Update database: <100ms
- Cleanup: <50ms
- **Total:** ~13-23s processing time

---

## Security Considerations

### Authentication & Authorization

#### 1. JWT Token Authentication
- All endpoints require valid JWT token
- `verifyToken` middleware validates and decodes token
- `req.user.id` extracted for user identification

#### 2. User Isolation
- All database queries filtered by `userId`
- Target image ownership validated:
  ```javascript
  db.select().from(uploads).where(and(
    eq(uploads.id, targetImageId),
    eq(uploads.userId, userId)  // Authorization check
  ))
  ```
- Reference image ownership validated (loop for each):
  ```javascript
  db.select().from(uploads).where(and(
    eq(uploads.id, refId),
    eq(uploads.userId, userId)  // Authorization check
  ))
  ```
- Users can only use their own images (target + references)

#### 3. Role-Based Access
- Token operations may have admin-only endpoints
- Queue monitoring restricted to admins
- Template management restricted to admins

---

### Input Validation & Sanitization

#### 1. Prompt Sanitization
- XSS protection: Remove `<script>` tags
- Length limits: 5-2000 characters
- Trim whitespace
- Applied in `sanitizePrompt()` utility

#### 2. File Upload Validation
- **Type whitelist:** JPEG, PNG, WebP only
- **Size limit:** 10MB max per file
- **Dimension limits:** 64x64 to 4096x4096 pixels
- **Count limits:** 
  - Target: exactly 1
  - References: 1-5
  - Total: max 6 files
- **MIME type validation:** Server-side check
- **Extension validation:** Case-insensitive check
- **Sharp validation:** Image integrity check (non-blocking)

#### 3. Parameter Validation
- `targetImageId`: Must be valid UUID
- `referenceImageIds`: Array of 1-5 valid UUIDs
- `promptTemplateId`: Must be valid UUID
- `aspectRatio`: Must be in allowed list
- `numberOfImages`: Clamped to 1-4
- All validations via express-validator

#### 4. Reference Count Validation
- After merging uploaded + referenced:
  - Min 1 reference
  - Max 5 references
- Prevents abuse of multiple references

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
- Target/reference images accessible only to owner

#### 3. Database Security
- Prepared statements (Drizzle ORM) prevent SQL injection
- Connection string in environment variable
- User passwords hashed (separate auth system)
- Authorization checks on all image queries (target + references)

#### 4. Token Transaction Security
- Idempotency key support (future)
- Atomic database transactions
- Transaction ledger for audit trail

#### 5. File Path Security
- No user-controlled paths (directory traversal prevention)
- Temp files stored with UUIDs
- Storage keys generated server-side

#### 6. Template Security
- Templates stored in database (trusted source)
- User cannot inject arbitrary system templates
- Admin-only template management

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
- Multiple temp files cleaned up together

#### 4. Metadata Tracking
- In-memory registry tracks ownership
- User ID associated with each temp file
- Purpose tracking for audit
- Type tracking (target vs reference)

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
- Reference count tracking for abuse detection

---

### Error Information Disclosure

- ❌ Generic error messages to client
- ✅ Detailed errors logged server-side only
- ❌ No stack traces in production responses
- ✅ Error codes instead of technical details

---

## Extensibility

### Adding New Prompt Templates

#### Step 1: Create template in database

```sql
INSERT INTO prompt_templates (name, prompt, category, is_active)
VALUES (
  'Product Photography',
  'Create professional product photography with studio lighting and clean background...',
  'multiple_reference',
  true
);
```

#### Step 2: Use template in request

```http
POST /api/generate/image-multiple-reference

{
  "prompt": "Modern watch on elegant display",
  "targetImageId": "watch-uuid",
  "referenceImageIds": ["lighting-uuid", "background-uuid"],
  "promptTemplateId": "new-template-uuid"  // Use new template
}
```

No code changes needed! Template system is fully dynamic.

---

### Modifying Reference Limits

#### Increase max references to 10

**File:** `server/src/utils/constant.js`
```javascript
export const GEMINI_LIMITS = {
  REFERENCE_IMAGES_MIN: 1,
  REFERENCE_IMAGES_MAX: 10,  // Change from 5 to 10
  TOTAL_IMAGES_MAX: 11,      // 1 target + 10 references
  // ... other limits
};
```

**File:** `server/src/middlewares/upload.js`
```javascript
export const uploadMultipleReference = createImageUpload().fields([
  { name: 'targetImage', maxCount: 1 },
  { name: 'referenceImages', maxCount: 10 }  // Change from 5 to 10
]);
```

**File:** `server/src/middlewares/validators.js`
```javascript
body('referenceImageIds')
  .optional({ values: 'falsy' })
  .isArray({ min: 1, max: 10 })  // Change from 5 to 10
  .withMessage('Reference image IDs must be an array of 1-10 UUIDs'),
```

---

### Adding Template Categories

**File:** `server/src/utils/constant.js`
```javascript
export const PROMPT_TEMPLATE_CATEGORIES = {
  GENERAL: 'general',
  TEXT_TO_IMAGE: 'text_to_image',
  SINGLE_REFERENCE: 'single_reference',
  MULTIPLE_REFERENCE: 'multiple_reference',
  FASHION: 'fashion',              // NEW
  PRODUCT: 'product',             // NEW
  INTERIOR_DESIGN: 'interior'     // NEW
};
```

---

### Adding Reference Type Support (like single reference)

While multiple reference doesn't have "types" like single reference (subject/face/full_image), you could add categorization:

**File:** `server/src/utils/constant.js`
```javascript
export const MULTIPLE_REFERENCE_MODES = {
  STYLING: 'styling',          // Fashion/styling focus
  COMPOSITION: 'composition',  // Layout/composition focus
  ELEMENTS: 'elements',        // Individual elements
  BLEND: 'blend'              // Full blend mode
};
```

Then use in prompt template to customize behavior.

---

## Summary

The **Multiple Reference Image Generation API** implements a powerful pattern for combining a target image with 1-5 reference images for complex AI-powered image generation. Key highlights:

### Core Features
- ✅ **Target + Multiple References:** 1 target + 1-5 references in single generation
- ✅ **Flexible Input:** Upload files, reference UUIDs, or mix both approaches
- ✅ **Prompt Templates:** Database-driven enhancement system for easy customization
- ✅ **Temp File Optimization:** Cache uploaded images to avoid R2 re-downloads
- ✅ **200 Tokens:** Higher cost reflecting generation complexity

### Architecture Strengths
- ✅ **Async Processing:** Non-blocking queue-based workflow
- ✅ **Real-time Updates:** WebSocket progress and completion events
- ✅ **Robust Cleanup:** Automatic temp file cleanup (target + all references)
- ✅ **Error Recovery:** Graceful fallbacks and retry logic
- ✅ **Scalable:** Horizontal scaling with distributed queue

### Security & Reliability
- ✅ **Authorization:** Ownership validation for all images (target + references)
- ✅ **Input Validation:** Comprehensive file and parameter validation
- ✅ **Rate Limiting:** Per-user request throttling
- ✅ **Token Management:** Atomic debit with transaction ledger

### Performance
- ✅ **Temp File Caching:** 7-13% faster processing
- ✅ **Concurrent Loading:** Parallel load of target + references
- ✅ **Concurrent Uploads:** Parallel upload of generated images
- ✅ **~25-35s Processing:** 1 image with 3 references (optimized)

This pattern provides a solid foundation for complex multi-image AI generation workflows with excellent user experience, security, and performance.

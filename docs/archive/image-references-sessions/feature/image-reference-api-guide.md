# Image Reference Feature - API Guide

## Overview

The **Image Reference** feature allows users to generate new images based on a reference image. Users can either upload a new image or select from their previous generations. The AI will analyze the reference based on the chosen focus mode and create new images following the user's prompt.

---

## 🎯 Feature Capabilities

### Reference Types (Focus Modes)

1. **subject** - Focus on extracting and replicating the main subject/object
   - Best for: Product photos, character consistency, object recreation
   - Preserves: Form, shape, proportions, colors, textures

2. **face** - Focus specifically on facial features and characteristics  
   - Best for: Portrait photography, character faces, facial consistency
   - Preserves: Facial structure, eyes/nose/mouth proportions, skin tone, hair

3. **full_image** - Analyze the entire image comprehensively
   - Best for: Style transfer, composition matching, mood recreation
   - Preserves: Overall composition, color palette, lighting, aesthetic

---

## 📡 API Endpoint

```
POST /api/generate/image-reference
```

**Authentication:** Required (Bearer token)

---

## 📥 Request Format

### Option 1: Upload New Image

```javascript
const formData = new FormData();
formData.append('image', fileBlob); // Upload new reference image
formData.append('prompt', 'Professional headshot in business attire');
formData.append('referenceType', 'face');
formData.append('aspectRatio', '1:1');
formData.append('numberOfImages', '2');
formData.append('projectId', 'optional-uuid');

const response = await fetch('/api/generate/image-reference', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### Option 2: Use Previous Generation

```javascript
const formData = new FormData();
formData.append('referenceImageId', '550e8400-e29b-41d4-a716-446655440000'); // UUID from uploads
formData.append('prompt', 'Transform into cyberpunk style');
formData.append('referenceType', 'full_image');
formData.append('aspectRatio', '16:9');
formData.append('numberOfImages', '1');

const response = await fetch('/api/generate/image-reference', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

---

## 📋 Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | Text description of desired output (5-2000 chars) |
| `referenceType` | string | Yes | Focus mode: `subject`, `face`, or `full_image` |
| `image` | file | No* | Reference image file (JPEG, PNG, WEBP, max 10MB) |
| `referenceImageId` | UUID | No* | UUID of previously uploaded/generated image |
| `aspectRatio` | string | No | Output aspect ratio: `1:1`, `16:9`, `9:16`, `4:3`, `3:4` (default: `1:1`) |
| `numberOfImages` | integer | No | Number of images to generate: 1-4 (default: 1) |
| `projectId` | UUID | No | Optional project ID to associate generation |

**Note:** Either `image` OR `referenceImageId` must be provided (not both).

---

## 📤 Response Structure

### Success Response (202 Accepted)

```json
{
  "success": true,
  "message": "Job queued successfully",
  "data": {
    "jobId": "12345",
    "generationId": "550e8400-e29b-41d4-a716-446655440000",
    "referenceImageId": "660e8400-e29b-41d4-a716-446655440001",
    "status": "pending",
    "message": "Image reference generation queued successfully",
    "numberOfImages": 2,
    "metadata": {
      "prompt": "Professional headshot in business attire",
      "referenceType": "face",
      "aspectRatio": "1:1",
      "projectId": null,
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

### Error Response (400 Bad Request)

```json
{
  "success": false,
  "status": 400,
  "message": "Either upload an image file or provide referenceImageId"
}
```

---

## 🔄 WebSocket Integration

Listen for real-time updates on generation progress:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: userToken }
});

// Progress updates (0-100%)
socket.on('generation_progress', ({ generationId, progress, message }) => {
  console.log(`Generation ${generationId}: ${progress}% - ${message}`);
  updateProgressBar(progress);
});

// Completion event
socket.on('generation_completed', ({ generationId, images }) => {
  console.log('Generated images:', images);
  displayImages(images);
  removeSkeletonLoaders();
});

// Failure event
socket.on('generation_failed', ({ generationId, error }) => {
  console.error('Generation failed:', error);
  showErrorMessage(error);
});
```

---

## 🎨 UI Integration Flow

### 1. Initial Setup

```javascript
// Show skeleton loaders immediately after submission
const response = await submitImageReference({
  referenceImageId: selectedImageId,
  prompt: userPrompt,
  referenceType: 'face',
  numberOfImages: 4
});

// Show 4 skeleton loaders
showSkeletonLoaders(response.data.numberOfImages);
```

### 2. Monitor Progress

```javascript
// Update UI based on WebSocket events
socket.on('generation_progress', ({ generationId, progress, message }) => {
  updateProgressIndicator(generationId, progress, message);
});
```

### 3. Display Results

```javascript
socket.on('generation_completed', ({ generationId, images }) => {
  // Remove skeleton loaders
  removeSkeletonLoaders(generationId);
  
  // Display generated images
  images.forEach(image => {
    renderImageCard({
      imageUrl: image.imageUrl,
      imageId: image.imageId,
      mimeType: image.mimeType
    });
  });
});
```

---

## 💰 Token Pricing

| Operation Type | Token Cost | Description |
|----------------|-----------|-------------|
| Image Reference | 150 tokens | Generate images using reference image |

**Example:** 
- 1,000 free signup tokens = ~6-7 reference generations (with 1 image each)
- Generating 4 images with reference = 600 tokens (4 × 150)

---

## 🔍 Use Cases

### Product Photography
```javascript
{
  "prompt": "Professional product photo on white background with studio lighting",
  "referenceType": "subject",
  "aspectRatio": "1:1"
}
```

### Character Consistency
```javascript
{
  "prompt": "Same character in a fantasy forest setting wearing wizard robes",
  "referenceType": "face",
  "aspectRatio": "16:9"
}
```

### Style Transfer
```javascript
{
  "prompt": "Apply watercolor painting style to this scene",
  "referenceType": "full_image",
  "aspectRatio": "4:3"
}
```

---

## ⚠️ Validation Rules

### File Upload
- **Allowed formats:** JPEG, JPG, PNG, WEBP, GIF, BMP
- **Maximum size:** 10MB
- **Dimensions:** 32x32 to 4096x4096 pixels

### Prompt
- **Minimum length:** 5 characters
- **Maximum length:** 2000 characters
- **Sanitized:** Script tags removed automatically

### Reference Type
- Must be one of: `subject`, `face`, `full_image`

---

## 🐛 Error Handling

### Common Errors

#### Missing Reference
```json
{
  "success": false,
  "status": 400,
  "message": "Either upload an image file or provide referenceImageId"
}
```
**Solution:** Provide either `image` file OR `referenceImageId`

#### Invalid Reference Type
```json
{
  "success": false,
  "status": 400,
  "message": "Invalid reference type. Allowed: subject, face, full_image"
}
```
**Solution:** Use valid reference type

#### Insufficient Tokens
```json
{
  "success": false,
  "status": 400,
  "message": "Insufficient tokens. Need 150, have 50"
}
```
**Solution:** Top up user token balance

#### Reference Image Not Found
```json
{
  "success": false,
  "status": 500,
  "message": "Reference image not found or access denied"
}
```
**Solution:** Verify `referenceImageId` belongs to authenticated user

---

## 📊 Database Schema

### imageGenerations Table (Updated Fields)

```sql
ALTER TABLE image_generations 
ADD COLUMN reference_image_id UUID REFERENCES uploads(id),
ADD COLUMN reference_type VARCHAR(50);
```

### Example Record

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-uuid",
  "operationTypeId": "image_reference-operation-uuid",
  "prompt": "Professional portrait in modern office",
  "referenceImageId": "660e8400-e29b-41d4-a716-446655440001",
  "referenceType": "face",
  "outputImageId": "770e8400-e29b-41d4-a716-446655440002",
  "status": "completed",
  "tokensUsed": 150,
  "aiMetadata": {
    "referenceType": "face",
    "referenceImageId": "660e8400-e29b-41d4-a716-446655440001",
    "enhancedPrompt": "...",
    "imageIds": ["770e8400-..."]
  }
}
```

---

## 🔄 Integration with Existing System

### Unified Generations Endpoint

Results appear in `/api/generate/my-generations`:

```javascript
const response = await fetch('/api/generate/my-generations?limit=20', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Queue includes pending image reference jobs
const { queue, completed } = response.data;

// Completed includes all generation types
completed.forEach(item => {
  if (item.metadata.referenceType) {
    // This is an image reference generation
    console.log(`Reference type: ${item.metadata.referenceType}`);
  }
});
```

---

## 🚀 Complete Example

```javascript
// Full implementation example
class ImageReferenceAPI {
  constructor(apiUrl, token) {
    this.apiUrl = apiUrl;
    this.token = token;
    this.socket = null;
  }

  // Initialize WebSocket connection
  connectWebSocket() {
    this.socket = io(this.apiUrl, {
      auth: { token: this.token }
    });

    this.socket.on('generation_progress', this.handleProgress.bind(this));
    this.socket.on('generation_completed', this.handleCompleted.bind(this));
    this.socket.on('generation_failed', this.handleFailed.bind(this));
  }

  // Submit generation with file upload
  async generateWithUpload(file, prompt, referenceType, options = {}) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('prompt', prompt);
    formData.append('referenceType', referenceType);
    formData.append('aspectRatio', options.aspectRatio || '1:1');
    formData.append('numberOfImages', options.numberOfImages || 1);

    if (options.projectId) {
      formData.append('projectId', options.projectId);
    }

    const response = await fetch(`${this.apiUrl}/generate/image-reference`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      },
      body: formData
    });

    return response.json();
  }

  // Submit generation with existing image
  async generateWithReference(referenceImageId, prompt, referenceType, options = {}) {
    const formData = new FormData();
    formData.append('referenceImageId', referenceImageId);
    formData.append('prompt', prompt);
    formData.append('referenceType', referenceType);
    formData.append('aspectRatio', options.aspectRatio || '1:1');
    formData.append('numberOfImages', options.numberOfImages || 1);

    if (options.projectId) {
      formData.append('projectId', options.projectId);
    }

    const response = await fetch(`${this.apiUrl}/generate/image-reference`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      },
      body: formData
    });

    return response.json();
  }

  // Event handlers
  handleProgress({ generationId, progress, message }) {
    console.log(`[${generationId}] ${progress}%: ${message}`);
    this.updateProgressUI(generationId, progress, message);
  }

  handleCompleted({ generationId, images }) {
    console.log(`[${generationId}] Completed with ${images.length} images`);
    this.displayImages(generationId, images);
  }

  handleFailed({ generationId, error }) {
    console.error(`[${generationId}] Failed: ${error}`);
    this.showError(generationId, error);
  }

  // UI update methods
  updateProgressUI(generationId, progress, message) {
    // Update progress bar, skeleton loaders, etc.
  }

  displayImages(generationId, images) {
    // Remove loaders, show generated images
  }

  showError(generationId, error) {
    // Display error message
  }
}

// Usage
const api = new ImageReferenceAPI('http://localhost:3000', userToken);
api.connectWebSocket();

// Upload new image
const result = await api.generateWithUpload(
  fileBlob,
  'Professional headshot in business attire',
  'face',
  { aspectRatio: '1:1', numberOfImages: 2 }
);

// Or use existing image
const result2 = await api.generateWithReference(
  'existing-image-uuid',
  'Transform into cyberpunk style',
  'full_image',
  { aspectRatio: '16:9', numberOfImages: 1 }
);
```

---

## 📝 Notes

- **No `promptTemplateId` support:** Image reference uses its own prompt enhancement system based on reference type
- **Authorization built-in:** Users can only reference their own uploaded/generated images
- **File cleanup:** Uploaded temp files are automatically cleaned up after processing
- **Storage:** Reference images are saved to R2 with purpose `generation_input`
- **Queue system:** Uses same BullMQ queue as text-to-image (`image-generation`)

---

## 🔗 Related Endpoints

- `POST /api/generate/text-to-image` - Generate without reference
- `GET /api/generate/my-generations` - View all generations (unified)
- `GET /api/generate/queue/:generationId` - Check specific job status
- `GET /api/uploads` - List user's uploaded images

---

## 📚 Additional Resources

- [Unified Generations API Guide](../unified-generations-api.md)
- [NANO_BANANA_SETUP_GUIDE](../core-features/NANO_BANANA_SETUP_GUIDE.md)
- [Swagger Documentation](http://localhost:3000/api-docs)

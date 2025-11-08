# Image Generation Database Flow Explained

## 📊 Database Structure

### **Design Pattern: 1 Generation → Multiple Images**

```
┌─────────────────────────────────────────────────────────┐
│           image_generations (1 record)                   │
├─────────────────────────────────────────────────────────┤
│ id: generation-id-123                                   │
│ prompt: "A sunset"                                      │
│ status: "completed"                                     │
│ metadata: {                                             │
│   numberOfImages: 2,         ← Request parameters      │
│   aspectRatio: "16:9"                                   │
│ }                                                        │
│ aiMetadata: {                                           │
│   imageIds: ["img-1", "img-2"]  ← Links to uploads     │
│ }                                                        │
└─────────────────────────────────────────────────────────┘
                    │
                    └──────┬───────────┐
                           ↓           ↓
            ┌──────────────────┐  ┌──────────────────┐
            │  uploads (img-1) │  │  uploads (img-2) │
            ├──────────────────┤  ├──────────────────┤
            │ id: img-1        │  │ id: img-2        │
            │ publicUrl: ...   │  │ publicUrl: ...   │
            │ purpose: output  │  │ purpose: output  │
            └──────────────────┘  └──────────────────┘
```

---

## 🔄 Complete Flow

### **Step 1: Client Request**
```javascript
POST /api/generate/text-to-image
{
  "prompt": "A sunset",
  "numberOfImages": 2,
  "aspectRatio": "16:9"
}
```

### **Step 2: Controller Creates Generation Record**
```javascript
// Creates 1 record in image_generations
generationId = await createGenerationRecord(userId, operationType.id, prompt, {
  numberOfImages: 2,        // Stored in metadata JSON
  aspectRatio: "16:9",      // Stored in metadata JSON
  originalPrompt: prompt,
  projectId: projectId,
});

// Result: 1 row inserted into image_generations table
// Status: PENDING
```

**Database State:**
```sql
SELECT * FROM image_generations WHERE id = 'generation-id-123';
-- 1 row with metadata: {"numberOfImages": 2, "aspectRatio": "16:9"}
```

### **Step 3: Worker Processes Job**
```javascript
// Worker generates 2 images
for (let i = 0; i < 2; i++) {
  const result = await GeminiService.textToImage(...);
  generationResults.push(result);
}

// Worker uploads 2 images to R2
const uploadRecords = await saveMultipleToStorage(imagesToUpload);
// Result: 2 rows inserted into uploads table
```

**Database State:**
```sql
SELECT * FROM uploads WHERE purpose = 'generation_output';
-- 2 rows: img-1, img-2
```

### **Step 4: Worker Updates Generation Record**
```javascript
await updateGenerationRecord(generationId, {
  status: GENERATION_STATUS.COMPLETED,
  outputImageId: generatedImages[0].imageId,  // Primary image
  tokensUsed: 200,  // 100 per image
  aiMetadata: JSON.stringify({
    imageIds: ["img-1", "img-2"],  // Links to all images
    numberOfImages: 2,
  }),
});
```

**Final Database State:**
```sql
-- image_generations: Still 1 row, now COMPLETED
SELECT * FROM image_generations WHERE id = 'generation-id-123';
/*
{
  id: "generation-id-123",
  status: "completed",
  outputImageId: "img-1",  -- Primary image reference
  metadata: {"numberOfImages": 2, "aspectRatio": "16:9"},
  aiMetadata: {"imageIds": ["img-1", "img-2"]}
}
*/

-- uploads: 2 rows (the actual images)
SELECT * FROM uploads WHERE id IN ('img-1', 'img-2');
-- Returns 2 rows with publicUrl, storageKey, etc.
```

---

## ✅ Why This Design?

### **1 Generation Record Per Job**
- Tracks the entire generation job
- Contains request parameters (numberOfImages, aspectRatio)
- Contains AI response metadata (imageIds array)
- Stores status, tokens used, timing

### **Multiple Upload Records**
- Each generated image is stored in uploads table
- Contains actual file metadata (URL, size, storage location)
- Reusable across different features
- Can be queried independently

---

## 🔍 How to Query

### **Get Generation with All Images**
```javascript
// 1. Get generation record
const generation = await db
  .select()
  .from(imageGenerations)
  .where(eq(imageGenerations.id, generationId))
  .limit(1);

// 2. Parse aiMetadata to get image IDs
const aiMetadata = JSON.parse(generation[0].aiMetadata);
const imageIds = aiMetadata.imageIds;  // ["img-1", "img-2"]

// 3. Fetch all images
const images = await db
  .select()
  .from(uploads)
  .where(inArray(uploads.id, imageIds));

// Result: 2 image records with URLs
```

**This is exactly what `getGenerationStatus` does!**

---

## 📝 Database Tables Summary

### **image_generations**
| Field | Description | Example |
|-------|-------------|---------|
| id | Generation ID (UUID) | `gen-123` |
| userId | User who requested | `user-456` |
| prompt | Text prompt | `"A sunset"` |
| status | Job status | `"completed"` |
| **metadata** | **Request params (JSON)** | **`{"numberOfImages": 2}`** |
| **aiMetadata** | **AI response (JSON)** | **`{"imageIds": ["img-1", "img-2"]}`** |
| outputImageId | Primary image ID | `img-1` |
| tokensUsed | Total tokens | `200` |

### **uploads**
| Field | Description | Example |
|-------|-------------|---------|
| id | Image ID (UUID) | `img-1` |
| userId | Owner | `user-456` |
| publicUrl | R2 public URL | `https://...` |
| purpose | Upload purpose | `"generation_output"` |
| mimeType | File type | `"image/png"` |

---

## 🎯 Key Points

1. **1 Request = 1 Generation Record**
   - Even if numberOfImages = 4, still only 1 row in image_generations

2. **numberOfImages = Number of Upload Records**
   - numberOfImages: 2 → 2 rows in uploads table

3. **imageIds Array Links Them**
   - aiMetadata.imageIds = ["img-1", "img-2"]
   - This allows querying all images for a generation

4. **outputImageId = Primary Image**
   - The first/main image from the generation
   - Used for quick display/thumbnail

---

## 🐛 Common Misunderstandings

### ❌ Wrong Assumption
> "If I request 2 images, I should see 2 rows in image_generations"

### ✅ Correct Understanding
> "1 generation job = 1 row in image_generations"  
> "2 images = 2 rows in uploads"  
> "The generation record links to both via aiMetadata.imageIds"

---

## 🔧 Debugging Queries

### **Check Generation Record**
```sql
SELECT 
  id, 
  status, 
  metadata, 
  ai_metadata, 
  output_image_id,
  tokens_used
FROM image_generations 
WHERE id = 'YOUR-GENERATION-ID';
```

### **Check All Images from Generation**
```sql
-- First get the generation
SELECT ai_metadata FROM image_generations WHERE id = 'gen-123';
-- Result: {"imageIds": ["img-1", "img-2"]}

-- Then query uploads
SELECT * FROM uploads WHERE id = ANY(ARRAY['img-1', 'img-2']);
-- Returns 2 rows with image details
```

### **Count Images Per Generation**
```sql
SELECT 
  id,
  (ai_metadata::jsonb->>'imageIds')::jsonb AS image_ids,
  jsonb_array_length((ai_metadata::jsonb->>'imageIds')::jsonb) AS image_count
FROM image_generations 
WHERE status = 'completed';
```

---

## 📚 Related Tables

```
users
  ↓
image_generations (1 per job)
  ├→ uploads (n images per generation)
  ├→ operation_type (what operation)
  └→ image_projects (optional)
```

---

**Last Updated:** 2025-10-27  
**Schema Version:** With metadata field added

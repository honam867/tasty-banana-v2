# Metadata Issue - Fixed! ✅

## 🐛 Problem Report

When calling `GET /api/generate/queue/:generationId`, the response showed incorrect metadata:

**Sent:**
```json
{
  "aspectRatio": "16:9",
  "numberOfImages": 2
}
```

**Received:**
```json
{
  "metadata": {
    "numberOfImages": 1,    // ❌ Wrong (defaulted)
    "aspectRatio": "1:1"    // ❌ Wrong (defaulted)
  }
}
```

---

## 🔍 Root Cause

The `image_generations` table schema was **missing the `metadata` field**!

### **What Was Happening:**

1. **Controller tried to save metadata:**
```javascript
generationId = await createGenerationRecord(userId, operationType.id, prompt, {
  numberOfImages: 2,      // ✍️ Trying to store
  aspectRatio: "16:9",    // ✍️ Trying to store
  projectId: projectId,
});
```

2. **Database silently ignored it:**
```javascript
// In createGenerationRecord helper:
metadata: JSON.stringify({ ...options })  // ❌ Field doesn't exist!
```

3. **When reading back:**
```javascript
const metadata = generationData.metadata ? JSON.parse(generationData.metadata) : {};
// metadata = {} (empty because field was NULL)

numberOfImages: metadata.numberOfImages || 1,    // Falls back to 1
aspectRatio: metadata.aspectRatio || "1:1",      // Falls back to "1:1"
```

---

## ✅ Solution Applied

### **1. Added `metadata` Field to Schema**

**File:** `server/src/db/schema.js`

```javascript
export const imageGenerations = pgTable("image_generations", {
  // ... other fields ...
  
  // Request metadata (input parameters)
  metadata: text("metadata"),  // ✅ NEW FIELD
  
  // AI response metadata
  aiMetadata: text("ai_metadata"),
  
  // ... timestamps ...
});
```

### **2. Generated Migration**

```bash
npm run db:generate
# Created: drizzle/0001_opposite_dormammu.sql
```

**Migration SQL:**
```sql
ALTER TABLE "image_generations" ADD COLUMN "metadata" text;
```

### **3. Applied Migration**

```bash
npm run db:push
# ✓ Changes applied
```

---

## 🎯 How It Works Now

### **Saving Data:**
```javascript
// POST /api/generate/text-to-image with numberOfImages=2, aspectRatio="16:9"

// Creates generation record
generationId = await createGenerationRecord(userId, operationType.id, prompt, {
  numberOfImages: 2,
  aspectRatio: "16:9",
  projectId: projectId,
  originalPrompt: prompt,
});

// Stores in database:
// metadata = {"numberOfImages": 2, "aspectRatio": "16:9", "projectId": "...", ...}
```

### **Reading Data:**
```javascript
// GET /api/generate/queue/:generationId

const generation = await db.select()...;
const metadata = JSON.parse(generation.metadata);
// metadata = {numberOfImages: 2, aspectRatio: "16:9", projectId: "...", ...}

// Build response
metadata: {
  prompt: metadata.originalPrompt,
  numberOfImages: metadata.numberOfImages,    // ✅ Correct: 2
  aspectRatio: metadata.aspectRatio,          // ✅ Correct: "16:9"
  projectId: metadata.projectId,
}
```

---

## 🧪 Testing

### **Test the Fix:**

1. **Create a new generation:**
```bash
curl -X POST http://localhost:3000/api/generate/text-to-image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A sunset",
    "numberOfImages": 2,
    "aspectRatio": "16:9"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "12345",
    "generationId": "gen-abc-123",
    "status": "pending",
    "numberOfImages": 2,
    "metadata": {
      "aspectRatio": "16:9",
      "numberOfImages": 2  // ✅ Correct
    }
  }
}
```

2. **Check generation status:**
```bash
curl http://localhost:3000/api/generate/queue/gen-abc-123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "generationId": "gen-abc-123",
    "status": "processing",
    "progress": 50,
    "metadata": {
      "prompt": "A sunset",
      "numberOfImages": 2,      // ✅ Correct!
      "aspectRatio": "16:9"     // ✅ Correct!
    }
  }
}
```

---

## 📊 Database Verification

### **Check the Field Exists:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'image_generations' 
  AND column_name = 'metadata';

-- Result:
-- column_name | data_type
-- metadata    | text
```

### **Check Stored Data:**
```sql
SELECT 
  id,
  metadata,
  ai_metadata,
  status
FROM image_generations 
WHERE id = 'YOUR-GENERATION-ID';

-- Result:
-- metadata: {"numberOfImages": 2, "aspectRatio": "16:9", ...}
```

---

## 🔧 What Changed

| File | Change | Type |
|------|--------|------|
| `server/src/db/schema.js` | Added `metadata: text("metadata")` field | Schema |
| `drizzle/0001_opposite_dormammu.sql` | Migration to add column | Migration |
| Database | `image_generations` table now has `metadata` column | Structure |

---

## ⚠️ Important Notes

### **For Existing Records:**

Old generation records created before this fix will have `metadata = NULL`. They will fall back to defaults:
```javascript
numberOfImages: metadata.numberOfImages || 1,     // Falls back to 1
aspectRatio: metadata.aspectRatio || "1:1",       // Falls back to "1:1"
```

**This is safe!** Old records will still work, they just won't show the original parameters.

### **For New Records:**

All new generations will properly store and retrieve metadata. ✅

---

## 📝 Summary

✅ **Schema updated** with `metadata` field  
✅ **Migration generated** and applied  
✅ **Data now persists** correctly  
✅ **API returns correct values**  
✅ **Backward compatible** with old records  

---

**Status:** ✅ **FIXED**  
**Applied:** 2025-10-27  
**Migration:** `0001_opposite_dormammu.sql`

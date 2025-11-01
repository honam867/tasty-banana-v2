# Unified Generations API - Integration Guide

## Overview

The new **`/api/generate/my-generations`** endpoint combines queue status and generation history into a single unified API, perfect for displaying real-time progress with infinite scroll.

---

## 🎯 Key Features

✅ **Single endpoint** for both queue and completed results  
✅ **Cursor-based pagination** for infinite scroll  
✅ **WebSocket integration** instead of polling  
✅ **Skeleton loader support** via `numberOfImages`  
✅ **Real-time updates** when items move from queue to completed

---

## 📡 Endpoint

```
GET /api/generate/my-generations
```

**Authentication:** Required (Bearer token)

---

## 📥 Request Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 20 | Max completed items per page (1-100) |
| `cursor` | string | - | Base64 cursor for pagination (empty for first page) |
| `includeFailed` | boolean | false | Include failed generations |

---

## 📤 Response Structure

```json
{
  "success": true,
  "message": "User generations retrieved successfully",
  "data": {
    "results": [
      {
        "generationId": "550e8400-e29b-41d4-a716-446655440000",
        "status": "pending",
        "progress": 0,
        "createdAt": "2025-10-28T10:00:00Z",
        "metadata": {
          "prompt": "A beautiful sunset over mountains",
          "numberOfImages": 4,
          "aspectRatio": "16:9",
          "projectId": null
        },
        "tokensUsed": 0
      },
      {
        "generationId": "660e8400-e29b-41d4-a716-446655440001",
        "status": "completed",
        "progress": 100,
        "createdAt": "2025-10-28T09:50:00Z",
        "completedAt": "2025-10-28T09:51:30Z",
        "metadata": {
          "prompt": "A cyberpunk city at night",
          "numberOfImages": 2,
          "aspectRatio": "1:1",
          "projectId": null
        },
        "images": [
          {
            "imageId": "770e8400-e29b-41d4-a716-446655440002",
            "imageUrl": "https://cdn.example.com/image1.jpg",
            "mimeType": "image/jpeg",
            "sizeBytes": 245678
          },
          {
            "imageId": "880e8400-e29b-41d4-a716-446655440003",
            "imageUrl": "https://cdn.example.com/image2.jpg",
            "mimeType": "image/jpeg",
            "sizeBytes": 198432
          }
        ],
        "tokensUsed": 150,
        "processingTimeMs": 8500
      },
      {
        "generationId": "770e8400-e29b-41d4-a716-446655440004",
        "status": "failed",
        "progress": 0,
        "createdAt": "2025-10-28T09:45:00Z",
        "metadata": {
          "prompt": "Invalid generation attempt",
          "numberOfImages": 1,
          "aspectRatio": "1:1",
          "projectId": null
        },
        "error": "Insufficient tokens",
        "tokensUsed": 0
      }
    ],
    "cursor": {
      "next": "eyJjcmVhdGVkQXQiOiIyMDI1LTEwLTI4VDA5OjQwOjAwWiIsImlkIjoidXVpZCJ9",
      "hasMore": true
    }
  }
}
```

---

## 🔄 UI Integration Flow

### 1️⃣ **Initial Load**

When user opens the page:

```javascript
const response = await fetch('/api/generate/my-generations?limit=20', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { results, cursor } = response.data;

// Render all items based on status
results.forEach(item => {
  if (item.status === 'pending' || item.status === 'processing') {
    // Show skeleton loaders
    renderSkeletonLoaders(item.metadata.numberOfImages, item.progress);
  } else if (item.status === 'completed') {
    // Show actual images
    renderCompletedImages(item.images);
  } else if (item.status === 'failed') {
    // Show error state
    renderErrorState(item.error);
  }
});
```

---

### 2️⃣ **User Submits Prompt**

When user generates images:

```javascript
// Submit generation request
const genResponse = await fetch('/api/generate/text-to-image', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'A beautiful sunset',
    numberOfImages: 4,
    aspectRatio: '16:9'
  })
});

const { generationId } = genResponse.data;

// Immediately show optimistic UI (4 skeleton loaders)
addSkeletonLoadersToUI(generationId, 4);

// Fetch updated list to confirm
const updatedResponse = await fetch('/api/generate/my-generations?limit=20', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Results now show the new pending item
updateUI(updatedResponse.data.results);
```

---

### 3️⃣ **WebSocket Events (No Polling!)**

Listen for generation completion:

```javascript
socket.on('generation_completed', async ({ generationId }) => {
  console.log(`Generation ${generationId} completed!`);
  
  // Fetch fresh data to update the item status
  const response = await fetch('/api/generate/my-generations?limit=20', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  // Update UI: Replace skeletons with real images
  updateUI(response.data.results);
});

socket.on('generation_failed', async ({ generationId, error }) => {
  console.error(`Generation ${generationId} failed:`, error);
  
  // Fetch with includeFailed=true to show error
  const response = await fetch('/api/generate/my-generations?limit=20&includeFailed=true', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  updateUI(response.data.results);
});
```

---

### 4️⃣ **Infinite Scroll**

Load more completed items:

```javascript
let currentCursor = null;

// On scroll to bottom
async function loadMore() {
  if (!cursor.hasMore) return;
  
  const response = await fetch(
    `/api/generate/my-generations?limit=20&cursor=${cursor.next}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  const { completed, cursor: newCursor } = response.data;
  
  // Append to existing list
  appendCompletedItems(completed);
  
  // Update cursor for next load
  currentCursor = newCursor;
}
```

---

## 🎨 UI Rendering Examples

### Unified Item Renderer

```javascript
function renderGenerationItem(item) {
  const container = document.getElementById('generation-results');
  
  switch (item.status) {
    case 'pending':
    case 'processing':
      // Show skeleton loaders with progress
      for (let i = 0; i < item.metadata.numberOfImages; i++) {
        const skeleton = `
          <div class="skeleton-loader" data-generation-id="${item.generationId}">
            <div class="skeleton-image animate-pulse"></div>
            <div class="progress-bar" style="width: ${item.progress}%"></div>
          </div>
        `;
        container.insertAdjacentHTML('afterbegin', skeleton);
      }
      break;
    
    case 'completed':
      // Show actual images
      item.images.forEach(image => {
        const imageCard = `
          <div class="image-card">
            <img src="${image.imageUrl}" alt="Generated image" />
            <div class="image-actions">
              <button onclick="addToProject('${image.imageId}')">Add to Project</button>
              <button onclick="download('${image.imageUrl}')">Download</button>
            </div>
          </div>
        `;
        container.insertAdjacentHTML('afterbegin', imageCard);
      });
      break;
    
    case 'failed':
      // Show error state
      const errorCard = `
        <div class="error-card">
          <div class="error-icon">❌</div>
          <p class="error-message">${item.error}</p>
          <button onclick="retryGeneration('${item.generationId}')">Retry</button>
        </div>
      `;
      container.insertAdjacentHTML('afterbegin', errorCard);
      break;
  }
}
```

### Render All Results

```javascript
function renderAllResults(results) {
  const container = document.getElementById('generation-results');
  container.innerHTML = ''; // Clear existing
  
  results.forEach(item => {
    renderGenerationItem(item);
  });
}
```

---

## 🔄 Migration from Old Endpoints

### Before (Separate arrays)

```javascript
const response = await fetch('/api/generate/my-generations?limit=20');
const { queue, completed, failed } = response.data;

// Handle each array separately
queue.forEach(item => renderQueue(item));
completed.forEach(item => renderCompleted(item));
if (failed) failed.forEach(item => renderFailed(item));
```

### After (Unified results)

```javascript
const response = await fetch('/api/generate/my-generations?limit=20');
const { results } = response.data;

// Single loop handles all statuses
results.forEach(item => {
  renderGenerationItem(item); // Handles pending/processing/completed/failed
});

// No polling - use WebSocket events
socket.on('generation_completed', async () => {
  const updated = await fetch('/api/generate/my-generations?limit=20');
  renderAllResults(updated.data.results);
});
```

---

## 📊 Benefits

| Feature | Old Approach | New Approach |
|---------|-------------|-------------|
| **Response Structure** | 3 separate arrays (queue, completed, failed) | 1 unified results array |
| **UI Rendering** | 3 different renderers | Single renderer with switch/case |
| **Sorting** | Must manually merge arrays | Pre-sorted by createdAt |
| **Status Handling** | Separate logic for each type | Unified status-based rendering |
| **Real-time Updates** | Polling every 3-5s | WebSocket events |
| **Pagination** | Offset-based | Cursor-based (better for infinite scroll) |
| **Skeleton Support** | Manual tracking | Built-in via `numberOfImages` + progress |
| **Network Efficiency** | High (constant polling) | Low (event-driven) |
| **Code Complexity** | Higher (multiple loops) | Lower (single loop) |

---

## 🔧 Cursor Pagination Details

Cursors are **base64-encoded** strings containing:
```json
{
  "createdAt": "2025-10-28T09:40:00Z",
  "id": "uuid"
}
```

This ensures:
- **Stable pagination** (no skipped/duplicated items)
- **Efficient queries** (indexed by createdAt + id)
- **Infinite scroll** support

---

## 🚀 Quick Start Example

```javascript
class GenerationsManager {
  constructor(apiUrl, token) {
    this.apiUrl = apiUrl;
    this.token = token;
    this.cursor = null;
  }
  
  async fetchGenerations(cursor = null) {
    const url = cursor 
      ? `${this.apiUrl}/my-generations?limit=20&cursor=${cursor}`
      : `${this.apiUrl}/my-generations?limit=20`;
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    
    const { queue, completed, cursor: newCursor } = response.data;
    
    this.renderQueue(queue);
    this.renderCompleted(completed);
    this.cursor = newCursor;
    
    return newCursor.hasMore;
  }
  
  renderQueue(queue) {
    queue.forEach(item => {
      // Render skeleton loaders based on numberOfImages
      this.addSkeletonLoaders(item.generationId, item.metadata.numberOfImages);
    });
  }
  
  renderCompleted(completed) {
    completed.forEach(item => {
      // Render actual images
      this.addImages(item.generationId, item.images);
    });
  }
  
  setupWebSocket() {
    socket.on('generation_completed', () => {
      this.fetchGenerations(); // Refresh to move from queue to completed
    });
  }
}

// Usage
const manager = new GenerationsManager('/api/generate', userToken);
manager.setupWebSocket();
manager.fetchGenerations();

// Infinite scroll
window.addEventListener('scroll', () => {
  if (isScrolledToBottom() && manager.cursor?.hasMore) {
    manager.fetchGenerations(manager.cursor.next);
  }
});
```

---

## 📝 Notes

- **Queue items** are always included (not paginated) since they're typically few
- **Completed items** use cursor pagination for infinite scroll
- **Failed items** are optional (use `includeFailed=true` to see them)
- WebSocket events: `generation_completed`, `generation_failed`, `generation_progress`
- Old endpoints (`/my-queue`, `/queue/:generationId`) still work but are deprecated

---

## 🐛 Troubleshooting

**Q: Queue not updating after submission?**  
A: Make sure to call `/my-generations` after POST to `/text-to-image`

**Q: Cursor pagination not working?**  
A: Ensure you're passing `cursor.next` value exactly as returned

**Q: Images not showing?**  
A: Check that `aiMetadata.imageIds` exists in generation records

**Q: WebSocket not firing?**  
A: Verify socket connection and event listeners are set up correctly

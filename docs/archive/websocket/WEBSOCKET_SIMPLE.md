# Simple WebSocket Implementation

A lightweight WebSocket system for **Queue/Job Updates** and **User Presence** only.

## What's Included

- ✅ JWT Authentication
- ✅ Job Progress/Completion/Failed notifications
- ✅ User Online/Offline presence tracking
- ✅ Connection management
- ✅ Simple utilities

## Quick Usage

### 1. Send Job Updates (from Queue Worker)

```javascript
// In your queue worker (e.g., workers/imageGeneration.worker.js)
import websocketService, { wsUtils, WS_EVENTS } from "../websocket/index.js";

class ImageGenerationWorker {
  async process(job) {
    const { userId } = job.data;
    const io = websocketService.getIO();
    
    // Send progress
    job.updateProgress(50);
    wsUtils.emitToUser(io, userId, WS_EVENTS.JOB_PROGRESS, {
      jobId: job.id,
      progress: 50,
      status: "processing"
    });
    
    // ... do work ...
    
    // Send completion
    wsUtils.emitToUser(io, userId, WS_EVENTS.JOB_COMPLETED, {
      jobId: job.id,
      result: { imageUrl: "..." }
    });
  }
}
```

### 2. Check User Presence

```javascript
import { wsUtils } from "./services/websocket/index.js";

// Check if user is online
const isOnline = wsUtils.isUserOnline(userId);

// Get all online users
const onlineUsers = wsUtils.getOnlineUsers();

// Get online count
const count = wsUtils.getOnlineUsersCount();
```

### 3. Client Connection (Frontend)

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  auth: { token: "your-jwt-token" }
});

// Listen for authentication
socket.on("authenticated", (data) => {
  console.log("Connected as:", data.user.email);
});

// Listen for job updates
socket.on("job_progress", (data) => {
  console.log(`Job ${data.jobId}: ${data.progress}%`);
  updateProgressBar(data.progress);
});

socket.on("job_completed", (data) => {
  console.log("Job done:", data.result);
});

socket.on("job_failed", (data) => {
  console.error("Job failed:", data.error);
});

// Listen for user presence
socket.on("user_online", (data) => {
  console.log(`User ${data.userId} is online`);
});

socket.on("user_offline", (data) => {
  console.log(`User ${data.userId} is offline`);
});
```

## Available Events

### Server → Client

```javascript
import { WS_EVENTS } from "./services/websocket/config.js";

WS_EVENTS.AUTHENTICATED    // User successfully authenticated
WS_EVENTS.UNAUTHORIZED     // Authentication failed
WS_EVENTS.USER_ONLINE      // A user came online
WS_EVENTS.USER_OFFLINE     // A user went offline
WS_EVENTS.JOB_PROGRESS     // Job progress update
WS_EVENTS.JOB_COMPLETED    // Job finished successfully
WS_EVENTS.JOB_FAILED       // Job failed with error
```

## Helper Functions

```javascript
import websocketService, { wsUtils } from "./services/websocket/index.js";

const io = websocketService.getIO();

// Send to specific user
wsUtils.emitToUser(io, userId, "event_name", { data });

// Check user status
wsUtils.isUserOnline(userId);          // Returns boolean
wsUtils.getOnlineUsers();              // Returns array of user IDs
wsUtils.getOnlineUsersCount();         // Returns number
```

## Integration Example

### Complete Queue Worker Integration

```javascript
// server/src/services/queue/workers/imageGeneration.worker.js
import websocketService, { wsUtils, WS_EVENTS } from "../../websocket/index.js";
import logger from "../../../config/logger.js";

export default async function imageGenerationWorker(job) {
  const { userId, prompt } = job.data;
  const io = websocketService.getIO();
  
  try {
    // Initial progress
    job.updateProgress(10);
    wsUtils.emitToUser(io, userId, WS_EVENTS.JOB_PROGRESS, {
      jobId: job.id,
      progress: 10,
      status: "initializing"
    });
    
    // Process the job
    job.updateProgress(50);
    wsUtils.emitToUser(io, userId, WS_EVENTS.JOB_PROGRESS, {
      jobId: job.id,
      progress: 50,
      status: "generating"
    });
    
    const result = await generateImage(prompt);
    
    // Completion
    job.updateProgress(100);
    wsUtils.emitToUser(io, userId, WS_EVENTS.JOB_COMPLETED, {
      jobId: job.id,
      result: {
        imageUrl: result.url,
        width: result.width,
        height: result.height
      }
    });
    
    return result;
    
  } catch (error) {
    logger.error("Image generation failed:", error);
    
    // Send failure notification
    wsUtils.emitToUser(io, userId, WS_EVENTS.JOB_FAILED, {
      jobId: job.id,
      error: error.message
    });
    
    throw error;
  }
}
```

## Frontend Integration Example

### React Hook for Job Updates

```javascript
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

export function useJobProgress(jobId, token) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("pending");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const socket = io("http://localhost:3000", {
      auth: { token }
    });
    
    socket.on("job_progress", (data) => {
      if (data.jobId === jobId) {
        setProgress(data.progress);
        setStatus(data.status);
      }
    });
    
    socket.on("job_completed", (data) => {
      if (data.jobId === jobId) {
        setProgress(100);
        setStatus("completed");
        setResult(data.result);
      }
    });
    
    socket.on("job_failed", (data) => {
      if (data.jobId === jobId) {
        setStatus("failed");
        setError(data.error);
      }
    });
    
    return () => socket.disconnect();
  }, [jobId, token]);
  
  return { progress, status, result, error };
}

// Usage
function ImageGenerationComponent() {
  const { progress, status, result, error } = useJobProgress(jobId, token);
  
  return (
    <div>
      {status === "processing" && <ProgressBar value={progress} />}
      {status === "completed" && <img src={result.imageUrl} />}
      {status === "failed" && <ErrorMessage message={error} />}
    </div>
  );
}
```

## File Structure

```
server/src/services/websocket/
├── config.js                    # Events and constants
├── WebSocketService.js          # Main service
├── ConnectionManager.js         # Track connections
├── EventRegistry.js             # Event system (for future)
├── middleware/auth.js           # Authentication
├── utils.js                     # Helper functions
└── index.js                     # Exports
```

## Configuration

The WebSocket server is already integrated in `server/src/index.js`. No additional setup needed!

### Environment Variables

```env
# .env
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=your-secret-key
```

## That's It!

This is a simple, focused implementation for:
1. **Job Updates** - Real-time progress, completion, and failure notifications
2. **User Presence** - Track who's online/offline

No complex room management, no broadcasting - just what you need.

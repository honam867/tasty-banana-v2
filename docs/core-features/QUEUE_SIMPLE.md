# Queue System - Ready for Your Implementation

A production-ready **BullMQ** queue system with Redis backend. The infrastructure is set up and ready - just add your job processors when you need them.

## ✅ What's Ready

- Queue infrastructure (BullMQ + Redis)
- Worker service for processing jobs
- Monitor service for tracking job status
- Queue controller for API endpoints
- Graceful shutdown handling

## 📁 File Structure

```
server/src/services/queue/
├── QueueService.js          # Add jobs to queues
├── WorkerService.js         # Process jobs with workers
├── MonitorService.js        # Monitor job status & metrics
├── redis.js                 # Redis connection manager
├── jobs/index.js            # Define your job types here
├── workers/index.js         # Register your workers here
└── processors/              # Put your job processors here

server/src/controllers/
└── queue.controller.js      # API endpoints for monitoring

server/src/routes/
└── queue.route.js           # Queue API routes
```

## 🚀 How to Add Your First Job

### 1. Define Your Job Types

```javascript
// server/src/services/queue/jobs/index.js

export const QUEUE_NAMES = {
  EMAIL: "email",
  // Add more queues...
};

export const JOB_TYPES = {
  EMAIL: {
    SEND_WELCOME: "send-welcome-email",
    SEND_VERIFICATION: "send-verification-email",
  },
  // Add more job types...
};
```

### 2. Create a Processor

```javascript
// server/src/services/queue/processors/email.processor.js

import logger from "../../../config/logger.js";

export async function sendWelcomeEmailProcessor(job) {
  const { userId, email, name } = job.data;
  
  logger.info(`Sending welcome email to ${email}`);
  
  try {
    // Your email sending logic here
    await sendEmail({
      to: email,
      subject: "Welcome!",
      template: "welcome",
      data: { name }
    });
    
    return { success: true, sentTo: email };
  } catch (error) {
    logger.error("Failed to send email:", error);
    throw error;
  }
}
```

### 3. Register Your Worker

```javascript
// server/src/services/queue/workers/index.js

import workerService from "../WorkerService.js";
import { QUEUE_NAMES, JOB_TYPES } from "../jobs/index.js";
import { sendWelcomeEmailProcessor } from "../processors/email.processor.js";
import logger from "../../../config/logger.js";

function registerEmailWorkers() {
  logger.info("Registering email processors...");

  // Register processor
  workerService.registerProcessor(
    QUEUE_NAMES.EMAIL,
    JOB_TYPES.EMAIL.SEND_WELCOME,
    sendWelcomeEmailProcessor
  );

  // Create worker
  workerService.createWorker(QUEUE_NAMES.EMAIL, {
    concurrency: 5, // Process 5 jobs at once
  });

  logger.info("Email workers registered");
}

export async function initializeWorkers() {
  try {
    logger.info("=== Initializing Queue Workers ===");
    
    registerEmailWorkers();
    
    logger.info("=== Queue Workers Ready ===");
  } catch (error) {
    logger.error("Failed to initialize workers:", error);
    throw error;
  }
}
```

### 4. Add Jobs to Queue

```javascript
// In your controller or service
import queueService from "../services/queue/QueueService.js";
import { QUEUE_NAMES, JOB_TYPES } from "../services/queue/jobs/index.js";

// Add a job
const job = await queueService.addJob(
  QUEUE_NAMES.EMAIL,
  JOB_TYPES.EMAIL.SEND_WELCOME,
  {
    userId: user.id,
    email: user.email,
    name: user.name
  },
  {
    priority: 2, // Higher priority = processed first
    attempts: 3, // Retry 3 times on failure
  }
);

console.log(`Job ${job.id} queued`);
```

### 5. Track Job Progress (with WebSocket)

```javascript
// In your processor
import websocketService, { wsUtils, WS_EVENTS } from "../../websocket/index.js";

export async function longRunningJobProcessor(job) {
  const { userId } = job.data;
  const io = websocketService.getIO();
  
  // Send progress updates
  job.updateProgress(25);
  wsUtils.emitToUser(io, userId, WS_EVENTS.JOB_PROGRESS, {
    jobId: job.id,
    progress: 25,
    status: "processing"
  });
  
  // ... do work ...
  
  job.updateProgress(100);
  wsUtils.emitToUser(io, userId, WS_EVENTS.JOB_COMPLETED, {
    jobId: job.id,
    result: yourResult
  });
  
  return yourResult;
}
```

## 📊 Monitor Jobs

### API Endpoints (Already Setup)

```
GET  /api/queue/status/:jobId       - Get job status
GET  /api/queue/metrics             - Get all queue metrics
GET  /api/queue/metrics/:queueName  - Get specific queue metrics
GET  /api/queue/failed/:queueName   - Get failed jobs
POST /api/queue/retry/:queueName/:jobId - Retry failed job
POST /api/queue/clean/:queueName    - Clean old jobs
GET  /api/queue/health              - System health
```

### Check Job Status

```javascript
import { monitorService } from "../services/queue/index.js";

// Get job details
const jobDetails = await monitorService.getJobDetails(queueName, jobId);

// Get queue metrics
const metrics = await monitorService.getQueueMetrics(queueName);

// Get failed jobs
const failedJobs = await monitorService.getFailedJobs(queueName);
```

## ⚙️ Configuration

### Queue Options

```javascript
await queueService.addJob(queueName, jobType, data, {
  priority: 1,           // 1 = highest, 5 = lowest
  delay: 5000,           // Delay 5 seconds before processing
  attempts: 3,           // Retry 3 times on failure
  backoff: {
    type: "exponential",
    delay: 2000
  },
  removeOnComplete: true, // Auto-remove after completion
  removeOnFail: false     // Keep failed jobs for debugging
});
```

### Worker Options

```javascript
workerService.createWorker(queueName, {
  concurrency: 5,        // Process 5 jobs simultaneously
  limiter: {
    max: 10,             // Max 10 jobs
    duration: 1000       // Per 1 second
  }
});
```

## 🔧 Environment Setup

Make sure Redis is running and configured in your `.env`:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## 📝 Job Priority Levels

```javascript
export const JOB_PRIORITY = {
  CRITICAL: 1,
  HIGH: 2,
  NORMAL: 3,
  LOW: 4,
  VERY_LOW: 5,
};
```

## 🎯 Example Use Cases

1. **Email Sending** - Welcome emails, notifications, password resets
2. **File Processing** - Image resizing, video transcoding, PDF generation
3. **Data Processing** - Analytics, report generation, data exports
4. **Scheduled Tasks** - Daily summaries, cleanup jobs, backups
5. **API Integration** - Third-party API calls, webhook processing

## 🚦 Current Status

The queue system is **ready but has no workers registered yet**. 

When you start the server, you'll see:
```
[INFO] === Queue Workers Ready (No workers registered yet) ===
```

Once you add your first worker, you'll see:
```
[INFO] === Initializing Queue Workers ===
[INFO] Registering email processors...
[INFO] Email workers registered
[INFO] === Queue Workers Ready ===
```

## 💡 Tips

1. **Start Simple** - Add one queue at a time
2. **Test Locally** - Use Redis CLI to inspect queues
3. **Monitor Jobs** - Use the API endpoints to track progress
4. **Handle Failures** - Implement proper error handling in processors
5. **Use WebSocket** - Send real-time updates to users

## 📚 Related Documentation

- WebSocket Integration: `WEBSOCKET_SIMPLE.md`
- Queue Controller: `src/controllers/queue.controller.js`
- Example Processors: Create in `src/services/queue/processors/`

Ready to add your first job? Start by defining it in `jobs/index.js`!

# Coding Guidelines for Tasty Banana v2

## Project Architecture

### Layered Architecture Pattern
```
Client Request → Routes → Controllers → Services → Database
                    ↓          ↓           ↓
                Validation  Business   Data Access
                Middleware   Logic      & External APIs
```

**Key Principles:**
- **Routes**: Thin layer for endpoint definition, middleware chaining, and request routing
- **Controllers**: Handle request/response, input validation, call services, format responses
- **Services**: Contain business logic, database operations, external API calls
- **Keep concerns separated**: Never put business logic in routes, never handle HTTP in services

---

## Code Structure & Patterns

### 1. Constants Management

**Always check `server/src/utils/constant.js` before hardcoding values.**

```javascript
// ❌ DON'T: Hardcode values
const status = 'pending';
const provider = 'r2';
const errorCode = 'INVALID_FILE_TYPE';

// ✅ DO: Import and use constants
import { 
  GENERATION_STATUS, 
  STORAGE_PROVIDER, 
  GEMINI_ERRORS 
} from '../utils/constant.js';

const status = GENERATION_STATUS.PENDING;
const provider = STORAGE_PROVIDER.R2;
const errorCode = GEMINI_ERRORS.INVALID_FILE_TYPE;
```

**If constant doesn't exist, add it to `constant.js` first:**
```javascript
// server/src/utils/constant.js
export const MY_NEW_CONSTANTS = {
  VALUE_ONE: 'value_one',
  VALUE_TWO: 'value_two'
};
```

---

### 2. Lodash Usage (ES Module Style)

**Always use this import pattern for projects with `"type": "module"`:**

```javascript
// ✅ DO: ES Module style with destructuring
import lodash from 'lodash';
const { get, map, filter, isEmpty, isNil, merge, pick } = lodash;

// Usage
const userId = get(req, 'user.id');
const emails = map(users, 'email');
const hasData = !isEmpty(results);

// ❌ DON'T: Named imports (not supported in this project)
import { get, map } from 'lodash'; // Won't work
```

**Common lodash methods used in this project:**
- `get()` - Safe property access
- `isEmpty()` - Check empty arrays/objects
- `isNil()` - Check null or undefined
- `merge()` - Deep merge objects
- `map()`, `filter()` - Array operations
- `pick()` - Select object properties

---

### 3. Controller Pattern

**Location:** `server/src/controllers/`

**Structure:**
```javascript
import lodash from 'lodash';
const { get, isEmpty } = lodash;

import { HTTP_STATUS } from '../utils/constant.js';
import { sendSuccess, throwError } from '../utils/response.js';
import MyService from '../services/myService.js';
import logger from '../config/logger.js';

/**
 * GET /api/resource/:id - Get resource by ID
 */
export const getResource = async (req, res, next) => {
  try {
    // 1. Extract data using lodash.get (safe property access)
    const user = get(req, 'user');
    const userId = get(user, 'id');
    const resourceId = get(req.params, 'id');
    
    // 2. Validate required fields
    if (!userId) {
      throwError('User not authenticated', HTTP_STATUS.UNAUTHORIZED);
    }
    
    if (!resourceId) {
      throwError('Resource ID is required', HTTP_STATUS.BAD_REQUEST);
    }
    
    // 3. Call service layer
    const result = await MyService.getResource(resourceId, userId);
    
    // 4. Log success
    logger.info(`Resource ${resourceId} retrieved by user ${userId}`);
    
    // 5. Send standardized success response
    sendSuccess(res, result, 'Resource retrieved successfully');
    
  } catch (error) {
    // 6. Log error and pass to error middleware
    logger.error('Get resource error:', error);
    next(error);
  }
};

/**
 * POST /api/resource - Create new resource
 */
export const createResource = async (req, res, next) => {
  try {
    const userId = get(req, 'user.id');
    const name = get(req.body, 'name');
    const description = get(req.body, 'description');
    
    // Validation
    if (!name) {
      throwError('Name is required', HTTP_STATUS.BAD_REQUEST);
    }
    
    // Create via service
    const newResource = await MyService.createResource({
      userId,
      name,
      description
    });
    
    logger.info(`Resource created by user ${userId}: ${newResource.id}`);
    sendSuccess(res, newResource, 'Resource created successfully');
    
  } catch (error) {
    logger.error('Create resource error:', error);
    next(error);
  }
};
```

**Controller Best Practices:**
- Always use `lodash.get()` for accessing nested properties
- Use `throwError()` for validation errors
- Use `sendSuccess()` for successful responses
- Always use `next(error)` to pass errors to error middleware
- Log important actions with `logger.info()` or `logger.error()`
- Keep controllers focused on request/response handling
- Put complex logic in services

---

### 4. Service Pattern

**Location:** `server/src/services/`

**Structure:**
```javascript
import { db } from '../db/drizzle.js';
import { myTable } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import logger from '../config/logger.js';

class MyService {
  /**
   * Get resource by ID with authorization check
   */
  async getResource(resourceId, userId) {
    const resource = await db
      .select()
      .from(myTable)
      .where(
        and(
          eq(myTable.id, resourceId),
          eq(myTable.userId, userId) // Authorization check
        )
      )
      .limit(1);
    
    if (!resource.length) {
      throw new Error('Resource not found or access denied');
    }
    
    return resource[0];
  }
  
  /**
   * Create new resource
   */
  async createResource(data) {
    const [newResource] = await db
      .insert(myTable)
      .values({
        userId: data.userId,
        name: data.name,
        description: data.description,
        createdAt: new Date()
      })
      .returning();
    
    return newResource;
  }
  
  /**
   * Update resource with validation
   */
  async updateResource(resourceId, userId, updates) {
    // Check ownership first
    await this.getResource(resourceId, userId);
    
    const [updated] = await db
      .update(myTable)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(myTable.id, resourceId))
      .returning();
    
    return updated;
  }
}

export default new MyService();
```

**Service Best Practices:**
- Export singleton instances (`export default new MyService()`)
- Keep database operations in services
- Throw descriptive errors (caught by controllers)
- Use database transactions for multi-step operations
- Add JSDoc comments for complex methods

---

### 5. Route Pattern

**Location:** `server/src/routes/`

**Structure:**
```javascript
import express from 'express';
import { getResource, createResource } from '../controllers/myController.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validators.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = express.Router();

// GET /api/resource/:id - Get resource (authenticated)
router.get(
  '/:id',
  verifyToken,
  asyncHandler(getResource)
);

// POST /api/resource - Create resource (authenticated + validation)
router.post(
  '/',
  verifyToken,
  validateRequest,
  asyncHandler(createResource)
);

export default router;
```

**Route Best Practices:**
- Keep routes thin (no business logic)
- Chain middlewares clearly
- Use `asyncHandler` for async controllers
- Group related routes in same file
- Use consistent naming (`resource.route.js`)

---

### 6. Error Handling

**Use standardized error responses:**

```javascript
import { throwError } from '../utils/response.js';
import { HTTP_STATUS } from '../utils/constant.js';

// In controllers
if (!userId) {
  throwError('User not authenticated', HTTP_STATUS.UNAUTHORIZED);
}

if (balance < required) {
  throwError(
    `Insufficient balance. Required: ${required}, Available: ${balance}`,
    HTTP_STATUS.BAD_REQUEST
  );
}

// In services - throw standard Error (caught by controller)
if (!resource) {
  throw new Error('Resource not found');
}
```

**Error middleware will handle:**
- Consistent error format
- Status code mapping
- Error logging
- Stack traces (in development only)

---

### 7. Environment Variables

**Always load from `.env` with fallback to constants:**

```javascript
// ✅ DO: Environment variable with constant fallback
const model = process.env.GEMINI_MODEL || GEMINI_CONFIG.DEFAULT_MODEL;
const bucket = process.env.R2_BUCKET;
const apiKey = process.env.GOOGLE_AI_API_KEY;

// ❌ DON'T: Hardcode environment-specific values
const model = 'gemini-2.5-flash-image'; // Should be in .env
```

**Update `.env.example` when adding new variables.**

---

## Testing Patterns

### Test File Structure

**Location:** `server/tests/[feature]/[feature].spec.js`

**Basic Structure:**
```javascript
import lodash from 'lodash';
const { get } = lodash;

import request from 'supertest';
import { createApp } from '../utils/appFactory.js';
import {
  expectSuccessShape,
  expectErrorShape,
  getTestAccountToken,
  userFactory
} from '../utils/testHelpers.js';

describe('Feature Name - API Tests', () => {
  let app;
  let testToken;
  let testUserId;
  
  beforeAll(async () => {
    // Initialize app
    app = createApp();
    
    // Get authenticated test account
    const { token, userId } = await getTestAccountToken(app);
    testToken = token;
    testUserId = userId;
    
    expect(testToken).toBeDefined();
  });
  
  describe('Success Cases', () => {
    it('should successfully perform operation with valid data', async () => {
      // Arrange
      const requestData = {
        field1: 'value1',
        field2: 'value2'
      };
      
      // Act
      const response = await request(app)
        .post('/api/endpoint')
        .set('Authorization', `Bearer ${testToken}`)
        .send(requestData)
        .expect(200);
      
      // Assert - Response structure
      expectSuccessShape(response, 200);
      expect(get(response, 'body.message')).toBe('Success message');
      
      // Assert - Response data
      const data = get(response, 'body.data');
      expect(data).toBeDefined();
      expect(get(data, 'id')).toBeDefined();
      expect(get(data, 'userId')).toBe(testUserId);
      expect(get(data, 'field1')).toBe('value1');
    });
  });
  
  describe('Error Cases', () => {
    it('should fail without authentication', async () => {
      // Act
      const response = await request(app)
        .post('/api/endpoint')
        .send({ field1: 'value' })
        .expect(401);
      
      // Assert
      expectErrorShape(response, 401);
      expect(get(response, 'body.message')).toContain('authentication');
    });
    
    it('should fail with invalid data', async () => {
      // Act
      const response = await request(app)
        .post('/api/endpoint')
        .set('Authorization', `Bearer ${testToken}`)
        .send({}) // Missing required fields
        .expect(400);
      
      // Assert
      expectErrorShape(response, 400);
    });
  });
});
```

### Test Helpers Usage

**Authentication Token (Reusable Test Account):**
```javascript
// ✅ ALWAYS use this pattern for authenticated tests
const { token, userId, user } = await getTestAccountToken(app);

// Use in requests
const response = await request(app)
  .get('/api/protected-endpoint')
  .set('Authorization', `Bearer ${token}`)
  .expect(200);
```

**Creating Test Users:**
```javascript
// Create unique user for specific test
const testUser = await userFactory({
  email: 'specific@test.com',
  username: 'testuser',
  passwordPlain: 'Test@123',
  role: 'admin'
});

// testUser includes: id, email, username, plainPassword
```

**Response Validation:**
```javascript
// Success response
expectSuccessShape(response, 200);
expect(get(response, 'body.data')).toBeDefined();

// Error response
expectErrorShape(response, 400)
  .withMessage('Specific error message');
```

**Data Extraction with lodash.get:**
```javascript
// ✅ DO: Safe property access
const userId = get(response, 'body.data.userId');
const balance = get(response, 'body.data.tokens.remaining');
const imageUrl = get(response, 'body.data.imageUrl');

// ❌ DON'T: Direct access (may throw errors)
const userId = response.body.data.userId; // Error if undefined
```

---

## File Organization

### Documentation
```
docs/
├── feature-[n]-[name]-test-instructions.md  # Test instructions for agents
├── architectural-improvements.md            # Architecture documentation
└── [feature]-api-endpoints.md              # API endpoint documentation
```

### Source Code
```
server/src/
├── config/          # Configuration (logger, database, R2, etc.)
├── controllers/     # Request handlers (thin layer)
├── db/             # Database schema and migrations
├── middlewares/    # Express middlewares (auth, validation, error)
├── routes/         # Route definitions (endpoint mapping)
├── services/       # Business logic and data access
└── utils/          # Utilities (constants, helpers, response)
```

### Tests
```
server/tests/
├── config/         # Test fixtures and config
├── utils/          # Test helpers (appFactory, testHelpers)
└── [feature]/      # Feature-specific tests
    └── [feature].spec.js
```

---

## Common Patterns

### Database Transactions
```javascript
// Use transactions for multi-step operations
return await db.transaction(async (tx) => {
  const [record1] = await tx.insert(table1).values(data1).returning();
  await tx.update(table2).set(updates).where(eq(table2.id, id));
  return record1;
});
```

### Pagination
```javascript
const limit = Math.min(
  Math.max(TOKEN_PAGINATION.MIN_LIMIT, requestedLimit), 
  TOKEN_PAGINATION.MAX_LIMIT
);

const results = await db
  .select()
  .from(table)
  .limit(limit)
  .offset(offset);
```

### File Cleanup
```javascript
const cleanupFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

// Always cleanup in finally or catch
try {
  // Process file
} catch (error) {
  cleanupFile(filePath);
  throw error;
}
```

---

## Code Quality Checklist

Before committing code, verify:

- [ ] No hardcoded strings (use constants)
- [ ] Lodash imports follow ES Module pattern
- [ ] Controllers call services (no business logic in controllers)
- [ ] Services don't handle HTTP (no `res` or `req` objects)
- [ ] Error handling uses `throwError()` and `next()`
- [ ] All async functions wrapped in `asyncHandler()` or try-catch
- [ ] Environment variables have fallbacks to constants
- [ ] Test files use `getTestAccountToken()` for authentication
- [ ] Lodash `.get()` used for nested property access
- [ ] Database operations use transactions when needed
- [ ] Proper logging with `logger.info()` / `logger.error()`

---

## Quick Reference

**Import Template:**
```javascript
import lodash from 'lodash';
const { get, isEmpty, isNil } = lodash;

import { HTTP_STATUS, MY_CONSTANTS } from '../utils/constant.js';
import { sendSuccess, throwError } from '../utils/response.js';
import MyService from '../services/myService.js';
import logger from '../config/logger.js';
```

**Controller Template:**
```javascript
export const myController = async (req, res, next) => {
  try {
    const userId = get(req, 'user.id');
    const data = get(req.body, 'field');
    
    if (!data) throwError('Required', HTTP_STATUS.BAD_REQUEST);
    
    const result = await MyService.doSomething(userId, data);
    logger.info(`Action completed by ${userId}`);
    sendSuccess(res, result, 'Success message');
  } catch (error) {
    logger.error('Error:', error);
    next(error);
  }
};
```

**Test Template:**
```javascript
const { token, userId } = await getTestAccountToken(app);
const response = await request(app)
  .post('/api/endpoint')
  .set('Authorization', `Bearer ${token}`)
  .send(data)
  .expect(200);
expectSuccessShape(response, 200);
const result = get(response, 'body.data');
```

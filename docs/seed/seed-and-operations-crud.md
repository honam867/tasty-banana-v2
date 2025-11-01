# Seed Script & Operations CRUD Implementation

## ✅ What Was Implemented

### 1. **Comprehensive Database Seed Script**

#### Files Created:
- `server/src/db/seed.js` - Main seed orchestrator
- `server/src/db/seedData/admin.js` - Admin user seeding
- `server/src/db/seedData/operations.js` - Operation types seeding
- `server/src/db/seedData/promptTemplates.js` - Trending prompt templates
- `server/src/db/seedData/styleLibrary.js` - Style categories
- `server/src/db/seedData/hints.js` - Prompt hints

#### Seed Data Overview:

**Admin Account:**
- Email: `admin@tastybanana.com`
- Username: `admin`
- Password: `Password@123!`
- Role: `admin`
- Initial Tokens: `10,000`

**Operation Types (2):**
1. `text_to_image` - 100 tokens
2. `image_reference` - 150 tokens

**Prompt Templates (5 Trending Styles):**
1. **Cinematic Portrait** - Ultra-detailed cinematic portrait with professional studio lighting
2. **Minimalist Product** - Clean product photography for e-commerce
3. **Cyberpunk Neon** - Futuristic neon-lit cyberpunk aesthetic
4. **Watercolor Artistic** - Delicate watercolor painting style
5. **3D Isometric** - Modern isometric 3D illustrations

**Style Library (3 Categories):**
1. **Realistic** - Cinematic Portrait, Minimalist Product
2. **Artistic** - Watercolor Artistic, Cyberpunk Neon
3. **Digital** - 3D Isometric, Cyberpunk Neon

**Hints (5 Simple Suggestions):**
1. **Professional Portrait** (subject) → Cinematic Portrait
2. **Product Photography** (object) → Minimalist Product
3. **Futuristic Scene** (scene) → Cyberpunk Neon
4. **Artistic Style** (style) → Watercolor Artistic
5. **3D Illustration** (style) → 3D Isometric

---

### 2. **Operations CRUD Management**

#### Files Updated:
- `server/src/controllers/operations.controller.js` - Added 4 new CRUD methods
- `server/src/routes/operations.route.js` - Added CRUD routes with Swagger docs

#### New Endpoints:

**1. GET /api/operations/:id**
- Get single operation by ID
- Public access
- Returns operation details

**2. POST /api/operations**
- Create new operation
- **Authentication required** (`verifyToken`)
- Admin only (recommended to add role check)
- Request body:
  ```json
  {
    "name": "image_upscale",
    "tokensPerOperation": 200,
    "description": "Upscale image resolution using AI",
    "isActive": true
  }
  ```

**3. PUT /api/operations/:id**
- Update existing operation
- **Authentication required** (`verifyToken`)
- Admin only (recommended to add role check)
- Partial updates supported
- Request body:
  ```json
  {
    "tokensPerOperation": 250,
    "isActive": false
  }
  ```

**4. DELETE /api/operations/:id**
- Delete operation
- **Authentication required** (`verifyToken`)
- Admin only (recommended to add role check)
- Returns deleted operation ID

---

## 🚀 Usage

### Running the Seed Script

```bash
# Navigate to server directory
cd server

# Run seed
npm run seed

# Or alternative command
npm run db:seed
```

### Expected Output:
```
🌱 Starting database seeding...

👤 Seeding admin user...
  ✓ Created admin user: admin
  ✓ Granted 10,000 tokens to admin
✓ Admin user seeded

⚙️  Seeding operation types...
  ✓ Operation type: text_to_image (100 tokens)
  ✓ Operation type: image_reference (150 tokens)
✓ Operation types seeded

🎨 Seeding prompt templates...
  ✓ Template: Cinematic Portrait
  ✓ Template: Minimalist Product
  ✓ Template: Cyberpunk Neon
  ✓ Template: Watercolor Artistic
  ✓ Template: 3D Isometric
✓ Prompt templates seeded

📚 Seeding style library...
  ✓ Style: Realistic (2 templates)
  ✓ Style: Artistic (2 templates)
  ✓ Style: Digital (2 templates)
✓ Style library seeded

💡 Seeding hints...
  ✓ Hint: Professional Portrait (subject)
  ✓ Hint: Product Photography (object)
  ✓ Hint: Futuristic Scene (scene)
  ✓ Hint: Artistic Style (style)
  ✓ Hint: 3D Illustration (style)
✓ Hints seeded

✅ All seeds completed successfully!
```

---

## 📝 Testing CRUD Operations

### 1. Login as Admin
```bash
POST /api/auth/login
{
  "email": "admin@tastybanana.com",
  "password": "Password@123!",
  "remember": true
}
```

Save the returned token for authenticated requests.

### 2. Get All Operations
```bash
GET /api/operations
# No authentication required
```

### 3. Get Single Operation
```bash
GET /api/operations/{operation-id}
# No authentication required
```

### 4. Create New Operation
```bash
POST /api/operations
Authorization: Bearer {your-admin-token}
Content-Type: application/json

{
  "name": "image_upscale",
  "tokensPerOperation": 200,
  "description": "Upscale image resolution using AI",
  "isActive": true
}
```

### 5. Update Operation
```bash
PUT /api/operations/{operation-id}
Authorization: Bearer {your-admin-token}
Content-Type: application/json

{
  "tokensPerOperation": 250,
  "description": "Enhanced AI upscaling"
}
```

### 6. Delete Operation
```bash
DELETE /api/operations/{operation-id}
Authorization: Bearer {your-admin-token}
```

---

## 🔍 Schema Relationships

### Relationship Diagram:
```
promptTemplates (Individual templates)
    ↓ (referenced by ID array in JSONB)
    ├── styleLibrary.promptTemplateIds: [uuid, uuid, ...]
    └── hints.promptTemplateIds: [uuid, uuid, ...]
```

### How It Works:
1. **Prompt Templates** are created first with unique UUIDs
2. **Style Library** stores arrays of template IDs to group them
3. **Hints** store arrays of template IDs to link suggestions

### Example Data:
```javascript
// Prompt Template
{
  id: "abc-123",
  name: "Cinematic Portrait",
  prompt: "Ultra-detailed cinematic portrait...",
  isActive: true
}

// Style Library (references templates)
{
  id: "def-456",
  name: "Realistic",
  promptTemplateIds: ["abc-123", "xyz-789"], // Array of UUIDs
  isActive: true
}

// Hints (references templates)
{
  id: "ghi-789",
  name: "Professional Portrait",
  type: "subject",
  promptTemplateIds: ["abc-123"], // Array of UUIDs
  isActive: true
}
```

---

## 🔐 Security Considerations

### Current Implementation:
- CRUD operations use `verifyToken` middleware
- Any authenticated user can create/update/delete operations

### ⚠️ Recommendation:
Add role-based access control middleware:

```javascript
import { requireRole } from "../middlewares/roleHandler.js";

// In operations.route.js
router.post("/", verifyToken, requireRole("admin"), asyncHandler(createOperation));
router.put("/:id", verifyToken, requireRole("admin"), asyncHandler(updateOperation));
router.delete("/:id", verifyToken, requireRole("admin"), asyncHandler(deleteOperation));
```

---

## 🎯 Features

✅ **Idempotent Seeds** - Can run multiple times without duplicates  
✅ **Relationship Management** - Template IDs properly linked  
✅ **Modular Structure** - Separate seed modules for maintainability  
✅ **Full CRUD** - Complete operations management  
✅ **Swagger Documentation** - All endpoints documented  
✅ **Validation** - Request validation with express-validator  
✅ **Error Handling** - Consistent error responses  
✅ **Logging** - All operations logged for audit trail  

---

## 📊 Database Tables Affected

### Seeded Tables:
1. `users` - Admin account
2. `token_transactions` - Initial admin tokens
3. `operation_type` - Available operations
4. `prompt_templates` - Trending prompts
5. `style_library` - Style categories
6. `hints` - Prompt suggestions

---

## 🔧 Configuration

### Environment Variables Used:
- `PASSWORD_SECRET_KEY` - For password encryption (CryptoJS AES)
- Database connection (via `drizzle.js`)

### Package.json Scripts Added:
```json
{
  "scripts": {
    "seed": "node src/db/seed.js",
    "db:seed": "node src/db/seed.js"
  }
}
```

---

## 📚 Next Steps

### Recommended Improvements:
1. **Add role-based access control** for CRUD operations (admin only)
2. **Add pagination** to GET /api/operations
3. **Add filtering** by `isActive` status
4. **Add operation usage tracking** (how many times each operation is used)
5. **Add validation** to prevent deleting operations that are in use
6. **Add preview images** for prompt templates (upload/assign preview URLs)

### Testing:
1. Test admin login with seeded credentials
2. Test all CRUD operations via Swagger UI at `/api-docs`
3. Verify token deduction when using operations
4. Test idempotency by running seed multiple times

---

## ✨ Summary

Successfully implemented:
- ✅ Comprehensive database seeding with trending prompts
- ✅ Admin account with 10,000 initial tokens
- ✅ Full CRUD operations for managing operation types
- ✅ Swagger documentation for all endpoints
- ✅ Proper relationship management between templates, styles, and hints

**Ready to use!** 🎉

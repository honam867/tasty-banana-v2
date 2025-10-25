# Database Design PRD - AI Image Editor MVP (Gemini Flash 2.5)

## Overview
This PRD outlines the database schema for an MVP AI-powered image editing platform using **Gemini Flash 2.5 Image (Nano Banana)**. The platform leverages Gemini's conversational AI image generation and editing capabilities with a token-based monetization model.

## Core Business Model
- **Free Tier**: 1,000 tokens on signup
- **Token System**: Users consume tokens for AI operations (1290 tokens per image)
- **Manual Top-up**: Users contact admin for more tokens (no payment gateway for MVP)
- **Future**: Video generation support (Veo integration)

## Gemini Flash 2.5 Image - Real Capabilities

### What Gemini ACTUALLY Does:
1. **Text-to-Image Generation** - Create images from detailed text descriptions
2. **Image Editing (Image + Text → Image)** - Natural language editing of existing images
3. **Multi-Image Composition** - Combine elements from multiple images
4. **Style Transfer** - Apply style from one image to another
5. **Conversational Editing** - Multi-turn iterative refinement through chat
6. **High-Fidelity Text Rendering** - Accurate text in images (logos, posters, diagrams)

### How It Works:
- **Everything is prompt-based** - No separate API endpoints for "remove background" or "flip image"
- Users describe what they want in natural language
- Examples:
  - "Remove the background and make it pure white"
  - "Flip this product horizontally" 
  - "Replace the background with a modern minimalist studio setting"
  - "Take this product and show it from a 45-degree angle"

### Pricing:
- **Image Output**: $30 per 1 million tokens (1290 tokens per image = ~$0.04 per image)
- **Aspect Ratios**: 1:1, 16:9, 9:16, 4:3, 3:4, etc. (all 1290 tokens)

## Research Findings - How Competitors Use AI

### What We Learned:
1. Most competitors use AI models (like Stable Diffusion, DALL-E) but hide complexity behind "features"
2. They package prompt engineering as "background removal", "flip", etc.
3. Users don't care about the underlying tech - they want simple solutions

### Our Approach:
- Use Gemini's natural language power
- Create user-friendly "operation types" that translate to optimized prompts
- Let advanced users write custom prompts
- Database tracks what users actually want to do

## Database Schema Design

### 1. Token System Tables

#### `user_tokens`
Tracks user token balance and transaction history.

```javascript
export const userTokens = pgTable("user_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull()
    .unique(),
  
  balance: integer("balance").notNull().default(0),
  totalEarned: integer("total_earned").notNull().default(0),
  totalSpent: integer("total_spent").notNull().default(0),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdx: index("idx_user_tokens_user").on(table.userId),
}));
```

#### `token_transactions`
Records all token credits/debits with detailed metadata.

```javascript
export const tokenTransactions = pgTable("token_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  
  type: varchar("type", { length: 50 }).notNull(), // 'credit', 'debit'
  amount: integer("amount").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  
  reason: varchar("reason", { length: 100 }).notNull(), // 'signup_bonus', 'admin_topup', 'image_generation', 'image_edit', etc.
  referenceType: varchar("reference_type", { length: 50 }), // 'image_generation', 'image_edit', 'admin_action'
  referenceId: uuid("reference_id"), // Links to related record (generation, edit, etc.)
  
  notes: text("notes"), // Admin notes for manual top-ups
  adminId: uuid("admin_id").references(() => users.id), // Who added tokens
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdx: index("idx_token_transactions_user").on(table.userId),
  referenceIdx: index("idx_token_transactions_reference").on(table.referenceType, table.referenceId),
  createdAtIdx: index("idx_token_transactions_created").on(table.createdAt),
}));
```

### 2. Image Project Management

#### `image_projects`
User's image editing projects/sessions.

```javascript
export const imageProjects = pgTable("image_projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  status: varchar("status", { length: 50 }).notNull().default("active"), // 'active', 'archived', 'deleted'
  
  // Project metadata
  metadata: text("metadata"), // JSON string for additional data
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdx: index("idx_image_projects_user").on(table.userId),
  statusIdx: index("idx_image_projects_status").on(table.status),
}));
```

### 3. AI Generation & Editing

#### `image_generations`
Tracks all AI image generation/editing operations.

```javascript
export const imageGenerations = pgTable("image_generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  
  projectId: uuid("project_id")
    .references(() => imageProjects.id),
  
  // Operation type
  operationType: varchar("operation_type", { length: 50 }).notNull(), 
  // 'text_to_image', 'image_edit', 'background_remove', 'background_replace', 
  // 'product_reposition', 'style_transfer', 'upscale', 'video_generation' (future)
  
  // Input data
  inputImageId: uuid("input_image_id").references(() => uploads.id), // Original image
  prompt: text("prompt").notNull(), // User's text prompt
  negativePrompt: text("negative_prompt"), // What to avoid
  
  // AI parameters
  model: varchar("model", { length: 100 }).notNull().default("gemini-2.5-flash-image"),
  temperature: varchar("temperature", { length: 10 }), // Stored as string for flexibility
  seed: varchar("seed", { length: 50 }), // For reproducibility
  
  // Output data
  outputImageId: uuid("output_image_id").references(() => uploads.id), // Generated/edited image
  status: varchar("status", { length: 50 }).notNull().default("pending"), 
  // 'pending', 'processing', 'completed', 'failed', 'cancelled'
  
  // Token usage
  tokensUsed: integer("tokens_used").notNull().default(0),
  
  // Error tracking
  errorMessage: text("error_message"),
  
  // Timing
  processingTimeMs: integer("processing_time_ms"), // How long it took
  
  // AI response metadata
  aiMetadata: text("ai_metadata"), // JSON string with AI response details
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  userIdx: index("idx_image_generations_user").on(table.userId),
  projectIdx: index("idx_image_generations_project").on(table.projectId),
  statusIdx: index("idx_image_generations_status").on(table.status),
  operationIdx: index("idx_image_generations_operation").on(table.operationType),
  createdAtIdx: index("idx_image_generations_created").on(table.createdAt),
}));
```

#### `image_edit_history`
Detailed history of edits for an image project (versioning).

```javascript
export const imageEditHistory = pgTable("image_edit_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  projectId: uuid("project_id")
    .references(() => imageProjects.id)
    .notNull(),
  
  generationId: uuid("generation_id")
    .references(() => imageGenerations.id)
    .notNull(),
  
  version: integer("version").notNull(), // 1, 2, 3...
  
  action: varchar("action", { length: 100 }).notNull(), // 'background_remove', 'flip_horizontal', 'replace_object'
  description: text("description"), // Human-readable description
  
  beforeImageId: uuid("before_image_id").references(() => uploads.id),
  afterImageId: uuid("after_image_id").references(() => uploads.id).notNull(),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  projectIdx: index("idx_image_edit_history_project").on(table.projectId),
  generationIdx: index("idx_image_edit_history_generation").on(table.generationId),
}));
```

### 4. Feature Configuration

#### `token_pricing`
Defines token costs for different operations (admin configurable).

```javascript
export const tokenPricing = pgTable("token_pricing", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  operationType: varchar("operation_type", { length: 50 }).notNull().unique(),
  // 'text_to_image', 'image_edit', 'background_remove', etc.
  
  tokensPerOperation: integer("tokens_per_operation").notNull(),
  
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

## Token Cost Strategy (MVP)

### Gemini API Reality:
- **Gemini charges**: 1290 tokens per image output (fixed cost)
- **Our cost**: ~$0.04 per image generated
- **Competitor pricing**: $0.02-$0.05 per operation

### Our Token System (User-Facing):
We abstract Gemini's token system into simple credits:

- **Text-to-Image Generation**: 100 tokens
- **Image Editing (Simple)**: 100 tokens  
  Examples: "Remove background", "Change color", "Add text"
- **Image Editing (Complex)**: 150 tokens  
  Examples: "Flip product and change background", "Combine multiple edits"
- **Multi-Image Composition**: 200 tokens  
  Examples: "Combine these 2 products in one scene"
- **Style Transfer**: 150 tokens  
  Examples: "Apply this artistic style to my product"
- **Conversational Refinement**: 100 tokens per iteration  
  Examples: Follow-up edits like "Make it brighter", "Change angle"
- **Video Generation** (future): 500-1000 tokens

### Why This Pricing?
- **1,000 free tokens** = 6-10 image operations (great trial experience)
- **Simple pricing** = Users understand 100 tokens ≈ 1 image
- **We pay**: $0.04 per image, **We charge**: effective $0.05-$0.08 per operation
- **Margin**: 25-100% markup to cover infrastructure, storage, API overhead

### Token Packages (Future):
- **Starter**: 1,000 tokens = $5 (100 images)
- **Pro**: 5,000 tokens = $20 (50+ images, 20% discount)
- **Business**: 20,000 tokens = $60 (200+ images, 40% discount)

## Migration Strategy

1. Add token system tables first
2. Add image project tables
3. Add generation tracking tables
4. Seed `token_pricing` with default values
5. Create trigger to give 1,000 tokens on user signup

## Indexes & Performance

All foreign keys are indexed for query performance. Additional indexes on:
- Status fields for filtering
- Created timestamps for sorting
- User IDs for user-specific queries
- Operation types for analytics

## Future Scalability

### Phase 2 (Video Support)
- `video_generations` table (similar to `image_generations`)
- Update `operationType` to include video operations
- Higher token costs for video

### Phase 3 (Payment Integration)
- `payment_transactions` table
- Link to token transactions
- Payment gateway metadata

## Security Considerations

- User can only access their own projects/generations
- Admin role verification for manual token top-ups
- Rate limiting on generation endpoints
- Token balance validation before operations

## API Endpoints Implications

### Token Management
- `GET /api/tokens/balance` - Get current balance
- `GET /api/tokens/history` - Transaction history
- `POST /api/admin/tokens/topup` - Admin adds tokens

### Image Operations (All use Gemini's generateContent)
- `POST /api/generate/text-to-image` - Generate image from text prompt
- `POST /api/generate/edit-image` - Edit image with text prompt
- `POST /api/generate/compose` - Combine multiple images
- `POST /api/generate/style-transfer` - Apply style from one image to another
- `POST /api/conversation/continue` - Continue editing in conversation
- `GET /api/projects` - List user projects
- `GET /api/projects/:id/history` - Project edit history

### How It Works Behind the Scenes:
All endpoints call `model.generateContent()` with different prompt templates:
- "Edit image" → Optimized prompt for editing
- "Text-to-image" → Optimized prompt for generation
- Backend handles prompt engineering, users just describe what they want

## Notes

- All timestamps use UTC
- Use UUIDs for security (non-sequential IDs)
- Store JSON metadata as text (parse in application layer)
- Status fields use lowercase with underscores
- Soft delete where possible (status = 'deleted')

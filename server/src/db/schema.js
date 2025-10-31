import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  index,
  jsonb,
} from "drizzle-orm/pg-core";

/**
 * Users Table Schema
 * Stores user authentication and profile information
 */
export const users = pgTable("users", {
  // Primary key - UUID v4
  id: uuid("id").primaryKey().defaultRandom(),

  // Authentication fields
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 500 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),

  // Role and status
  role: varchar("role", { length: 50 }).notNull().default("user"),
  status: varchar("status", { length: 50 }).notNull().default("active"),

  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Uploads Table Schema
 * Stores metadata for user-uploaded files (images, masks, references, attachments)
 */
export const uploads = pgTable(
  "uploads",
  {
    // Primary key - UUID v4
    id: uuid("id").primaryKey().defaultRandom(),

    // Foreign key to users table (uploader)
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),

    // Optional title/label for the file
    title: varchar("title", { length: 255 }),

    // Purpose of the upload: init, mask, reference, attachment
    purpose: varchar("purpose", { length: 50 }).notNull().default("attachment"),

    // File metadata
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),

    // Storage details
    storageProvider: varchar("storage_provider", { length: 50 })
      .notNull()
      .default("r2"),
    storageBucket: varchar("storage_bucket", { length: 255 }).notNull(),
    storageKey: text("storage_key").notNull(),
    publicUrl: text("public_url").notNull(),

    // Timestamp with timezone
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index("idx_uploads_user").on(table.userId),
  })
);

/**
 * User Tokens Table Schema
 * Tracks user token balance for AI operations
 */
export const userTokens = pgTable(
  "user_tokens",
  {
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
  },
  (table) => ({
    userIdx: index("idx_user_tokens_user").on(table.userId),
  })
);

/**
 * Token Transactions Table Schema
 * Records all token credits/debits with metadata
 */
export const tokenTransactions = pgTable(
  "token_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),

    type: varchar("type", { length: 50 }).notNull(), // 'credit', 'debit'
    amount: integer("amount").notNull(),
    balanceAfter: integer("balance_after").notNull(),

    reason: varchar("reason", { length: 100 }).notNull(),
    // 'signup_bonus', 'admin_topup', 'image_generation', 'image_edit', etc.

    referenceType: varchar("reference_type", { length: 50 }),
    // 'image_generation', 'image_edit', 'admin_action'

    referenceId: uuid("reference_id"),
    // Links to related record (generation, edit, etc.)

    notes: jsonb("notes"), // JSON metadata including idempotency keys
    adminId: uuid("admin_id").references(() => users.id), // Who added tokens

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("idx_token_transactions_user").on(table.userId),
    referenceIdx: index("idx_token_transactions_reference").on(
      table.referenceType,
      table.referenceId
    ),
    createdAtIdx: index("idx_token_transactions_created").on(table.createdAt),
  })
);

/**
 * Image Projects Table Schema
 * User's image editing projects/sessions
 */
export const imageProjects = pgTable(
  "image_projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),

    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),

    status: varchar("status", { length: 50 }).notNull().default("active"),
    // 'active', 'archived', 'deleted'

    metadata: text("metadata"), // JSON string for additional data

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("idx_image_projects_user").on(table.userId),
    statusIdx: index("idx_image_projects_status").on(table.status),
  })
);

/**
 * Image Generations Table Schema
 * Tracks all AI image generation/editing operations
 */
export const imageGenerations = pgTable(
  "image_generations",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),

    projectId: uuid("project_id").references(() => imageProjects.id),

    operationTypeId: uuid("operation_type_id")
      .references(() => operationType.id)
      .notNull(),

    // Input data
    inputImageId: uuid("input_image_id").references(() => uploads.id),
    prompt: text("prompt").notNull(),
    negativePrompt: text("negative_prompt"),

    // Image reference fields (for image_reference operation type)
    referenceImageId: uuid("reference_image_id").references(() => uploads.id),
    referenceType: varchar("reference_type", { length: 50 }),
    // Values: 'subject', 'face', 'full_image', null

    // AI parameters
    model: varchar("model", { length: 100 })
      .notNull()
      .default("gemini-2.5-flash-image"),
    temperature: varchar("temperature", { length: 10 }),
    seed: varchar("seed", { length: 50 }),

    // Output data
    outputImageId: uuid("output_image_id").references(() => uploads.id),
    status: varchar("status", { length: 50 }).notNull().default("pending"),
    // 'pending', 'processing', 'completed', 'failed', 'cancelled'

    // Token usage
    tokensUsed: integer("tokens_used").notNull().default(0),

    // Error tracking
    errorMessage: text("error_message"),

    // Timing
    processingTimeMs: integer("processing_time_ms"),

    // Request metadata (input parameters like aspectRatio, numberOfImages, etc.)
    metadata: text("metadata"), // JSON string for request parameters
    
    // AI response metadata
    aiMetadata: text("ai_metadata"), // JSON string for AI response data

    createdAt: timestamp("created_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    userIdx: index("idx_image_generations_user").on(table.userId),
    projectIdx: index("idx_image_generations_project").on(table.projectId),
    statusIdx: index("idx_image_generations_status").on(table.status),
    operationTypeIdx: index("idx_image_generations_operation_type").on(
      table.operationTypeId
    ),
    createdAtIdx: index("idx_image_generations_created").on(table.createdAt),
  })
);

/**
 * Image Edit History Table Schema
 * Detailed history of edits for versioning
 */
export const imageEditHistory = pgTable(
  "image_edit_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    projectId: uuid("project_id")
      .references(() => imageProjects.id)
      .notNull(),

    generationId: uuid("generation_id")
      .references(() => imageGenerations.id)
      .notNull(),

    version: integer("version").notNull(), // 1, 2, 3...

    action: varchar("action", { length: 100 }).notNull(),
    // 'background_remove', 'flip_horizontal', 'replace_object', etc.

    description: text("description"), // Human-readable description

    beforeImageId: uuid("before_image_id").references(() => uploads.id),
    afterImageId: uuid("after_image_id")
      .references(() => uploads.id)
      .notNull(),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    projectIdx: index("idx_image_edit_history_project").on(table.projectId),
    generationIdx: index("idx_image_edit_history_generation").on(
      table.generationId
    ),
  })
);

/**
 * Operation Type Table Schema
 * Defines available operation types with token costs (admin configurable)
 */
export const operationType = pgTable("operation_type", {
  id: uuid("id").primaryKey().defaultRandom(),

  name: varchar("name", { length: 50 }).notNull().unique(),
  // 'text_to_image', 'image_reference', etc.

  tokensPerOperation: integer("tokens_per_operation").notNull(),

  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Prompt Templates Table Schema
 * Stores reusable prompt templates for image generation enhancement
 */
export const promptTemplates = pgTable(
  "prompt_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    name: varchar("name", { length: 255 }).notNull(),
    prompt: text("prompt").notNull(),
    previewUrl: text("preview_url"),

    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: index("idx_prompt_templates_name").on(table.name),
    isActiveIdx: index("idx_prompt_templates_is_active").on(table.isActive),
  })
);

/**
 * Style Library Table Schema
 * Groups prompt templates into style categories (Fun, Realistic, etc.)
 */
export const styleLibrary = pgTable(
  "style_library",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    name: varchar("name", { length: 255 }).notNull().unique(),
    description: text("description"),

    // Array of prompt template IDs
    promptTemplateIds: jsonb("prompt_template_ids").notNull().default([]),

    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: index("idx_style_library_name").on(table.name),
    isActiveIdx: index("idx_style_library_is_active").on(table.isActive),
  })
);

/**
 * Hints Table Schema
 * Provides prompt suggestions/hints for users who need inspiration
 */
export const hints = pgTable(
  "hints",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    // 'object', 'scene', 'style', 'mood', etc.

    description: text("description"),

    // Array of prompt template IDs
    promptTemplateIds: jsonb("prompt_template_ids").notNull().default([]),

    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    typeIdx: index("idx_hints_type").on(table.type),
    isActiveIdx: index("idx_hints_is_active").on(table.isActive),
  })
);

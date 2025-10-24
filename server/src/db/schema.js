import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  index,
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

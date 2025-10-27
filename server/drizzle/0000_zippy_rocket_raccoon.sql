CREATE TABLE "image_edit_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"generation_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"action" varchar(100) NOT NULL,
	"description" text,
	"before_image_id" uuid,
	"after_image_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "image_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid,
	"operation_type_id" uuid NOT NULL,
	"input_image_id" uuid,
	"prompt" text NOT NULL,
	"negative_prompt" text,
	"model" varchar(100) DEFAULT 'gemini-2.5-flash-image' NOT NULL,
	"temperature" varchar(10),
	"seed" varchar(50),
	"output_image_id" uuid,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"tokens_used" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"processing_time_ms" integer,
	"ai_metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "image_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operation_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"tokens_per_operation" integer NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "operation_type_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "token_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"reason" varchar(100) NOT NULL,
	"reference_type" varchar(50),
	"reference_id" uuid,
	"notes" jsonb,
	"admin_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255),
	"purpose" varchar(50) DEFAULT 'attachment' NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_provider" varchar(50) DEFAULT 'r2' NOT NULL,
	"storage_bucket" varchar(255) NOT NULL,
	"storage_key" text NOT NULL,
	"public_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"total_earned" integer DEFAULT 0 NOT NULL,
	"total_spent" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_tokens_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(255) NOT NULL,
	"password" varchar(500) NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'user' NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "image_edit_history" ADD CONSTRAINT "image_edit_history_project_id_image_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."image_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_edit_history" ADD CONSTRAINT "image_edit_history_generation_id_image_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."image_generations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_edit_history" ADD CONSTRAINT "image_edit_history_before_image_id_uploads_id_fk" FOREIGN KEY ("before_image_id") REFERENCES "public"."uploads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_edit_history" ADD CONSTRAINT "image_edit_history_after_image_id_uploads_id_fk" FOREIGN KEY ("after_image_id") REFERENCES "public"."uploads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_generations" ADD CONSTRAINT "image_generations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_generations" ADD CONSTRAINT "image_generations_project_id_image_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."image_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_generations" ADD CONSTRAINT "image_generations_operation_type_id_operation_type_id_fk" FOREIGN KEY ("operation_type_id") REFERENCES "public"."operation_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_generations" ADD CONSTRAINT "image_generations_input_image_id_uploads_id_fk" FOREIGN KEY ("input_image_id") REFERENCES "public"."uploads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_generations" ADD CONSTRAINT "image_generations_output_image_id_uploads_id_fk" FOREIGN KEY ("output_image_id") REFERENCES "public"."uploads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_projects" ADD CONSTRAINT "image_projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_transactions" ADD CONSTRAINT "token_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_transactions" ADD CONSTRAINT "token_transactions_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tokens" ADD CONSTRAINT "user_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_image_edit_history_project" ON "image_edit_history" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_image_edit_history_generation" ON "image_edit_history" USING btree ("generation_id");--> statement-breakpoint
CREATE INDEX "idx_image_generations_user" ON "image_generations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_image_generations_project" ON "image_generations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_image_generations_status" ON "image_generations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_image_generations_operation_type" ON "image_generations" USING btree ("operation_type_id");--> statement-breakpoint
CREATE INDEX "idx_image_generations_created" ON "image_generations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_image_projects_user" ON "image_projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_image_projects_status" ON "image_projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_token_transactions_user" ON "token_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_token_transactions_reference" ON "token_transactions" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE INDEX "idx_token_transactions_created" ON "token_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_uploads_user" ON "uploads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_tokens_user" ON "user_tokens" USING btree ("user_id");
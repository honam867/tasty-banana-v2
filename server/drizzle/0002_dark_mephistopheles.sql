CREATE TABLE "hints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"description" text,
	"prompt_template_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"prompt" text NOT NULL,
	"preview_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "style_library" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"prompt_template_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "style_library_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE INDEX "idx_hints_type" ON "hints" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_hints_is_active" ON "hints" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_prompt_templates_name" ON "prompt_templates" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_prompt_templates_is_active" ON "prompt_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_style_library_name" ON "style_library" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_style_library_is_active" ON "style_library" USING btree ("is_active");
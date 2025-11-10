-- Add multiple reference fields to image_generations table
-- Note: reference_image_id and reference_type already exist from migration 0003
ALTER TABLE "image_generations" ADD COLUMN "target_image_id" uuid;--> statement-breakpoint
ALTER TABLE "image_generations" ADD COLUMN "reference_image_ids" jsonb;--> statement-breakpoint
ALTER TABLE "image_generations" ADD COLUMN "prompt_template_id" uuid;--> statement-breakpoint
ALTER TABLE "image_generations" ADD CONSTRAINT "image_generations_target_image_id_uploads_id_fk" FOREIGN KEY ("target_image_id") REFERENCES "public"."uploads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_generations" ADD CONSTRAINT "image_generations_prompt_template_id_prompt_templates_id_fk" FOREIGN KEY ("prompt_template_id") REFERENCES "public"."prompt_templates"("id") ON DELETE no action ON UPDATE no action;
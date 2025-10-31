-- Add reference image fields to image_generations table for image reference feature
ALTER TABLE "image_generations" ADD COLUMN "reference_image_id" uuid;--> statement-breakpoint
ALTER TABLE "image_generations" ADD COLUMN "reference_type" varchar(50);--> statement-breakpoint
ALTER TABLE "image_generations" ADD CONSTRAINT "image_generations_reference_image_id_uploads_id_fk" FOREIGN KEY ("reference_image_id") REFERENCES "uploads"("id") ON DELETE no action ON UPDATE no action;

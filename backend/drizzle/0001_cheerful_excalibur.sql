ALTER TABLE "subjects" DROP CONSTRAINT "subjects_user_id_name_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "subject_user_id_name_lower_idx" ON "subjects" USING btree ("user_id",lower("name"));
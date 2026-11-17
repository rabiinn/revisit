DROP INDEX "reviews_topic_id_index";--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "state_before" smallint NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "stability_before" double precision NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "stability_fast_before" double precision NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "difficulty_before" double precision NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "scheduled_days_before" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "due_at_before" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "last_review_at_before" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "scheduled_days" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "stability" double precision NOT NULL;--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "stability_fast" double precision NOT NULL;--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "difficulty" double precision NOT NULL;--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "fsrs_state" smallint NOT NULL;--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "schedule_status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "reps" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "lapses" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "scheduled_days" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "last_review_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "reviews_topic_id_reviewed_at_index" ON "reviews" USING btree ("topic_id","reviewed_at");--> statement-breakpoint
ALTER TABLE "reviews" DROP COLUMN "previous_interval_days";--> statement-breakpoint
ALTER TABLE "reviews" DROP COLUMN "next_interval_days";--> statement-breakpoint
ALTER TABLE "topics" DROP COLUMN "strength";--> statement-breakpoint
ALTER TABLE "topics" DROP COLUMN "interval_days";
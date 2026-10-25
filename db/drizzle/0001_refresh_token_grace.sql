ALTER TABLE "refresh_tokens" ADD COLUMN "token_id" uuid;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD COLUMN "issued_at" timestamp;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD COLUMN "previous_token_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD COLUMN "previous_valid_until" timestamp;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_previous_token_hash_unique" UNIQUE("previous_token_hash");
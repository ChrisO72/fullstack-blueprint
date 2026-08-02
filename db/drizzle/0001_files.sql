CREATE TABLE "files" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "files_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"organization_id" integer NOT NULL,
	"uploaded_by_user_id" integer,
	"storage_key" varchar(512) NOT NULL,
	"original_filename" varchar(255) NOT NULL,
	"content_type" varchar(255) NOT NULL,
	"expected_size" integer NOT NULL,
	"actual_size" integer,
	"status" varchar DEFAULT 'pending' NOT NULL,
	CONSTRAINT "files_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "files_active_idx" ON "files" USING btree ("id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "files_org_active_idx" ON "files" USING btree ("organization_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "files_org_status_active_idx" ON "files" USING btree ("organization_id","status") WHERE deleted_at IS NULL;
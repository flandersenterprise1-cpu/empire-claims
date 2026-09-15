ALTER TABLE "rate_tables" ADD COLUMN "rate_basis" varchar(32) DEFAULT 'monthly_exact' NOT NULL;--> statement-breakpoint
ALTER TABLE "rate_tables" ADD COLUMN "annual_policy_fee" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "rate_tables" ADD COLUMN "monthly_modal_factor" numeric(8, 5);
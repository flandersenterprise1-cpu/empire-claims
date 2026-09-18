ALTER TABLE "rate_tables" ADD COLUMN "policy_fee_threshold" integer;--> statement-breakpoint
ALTER TABLE "rate_tables" ADD COLUMN "monthly_policy_fee_below_threshold" numeric(10, 2);
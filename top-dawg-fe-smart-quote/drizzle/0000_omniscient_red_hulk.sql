CREATE TYPE "public"."activation_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."answer_type" AS ENUM('boolean', 'single_select', 'multi_select', 'integer', 'decimal', 'months_ago', 'text', 'height_weight', 'medication_list');--> statement-breakpoint
CREATE TYPE "public"."benefit_type" AS ENUM('level', 'graded', 'modified', 'guaranteed_issue');--> statement-breakpoint
CREATE TYPE "public"."publish_status" AS ENUM('draft', 'published', 'archived', 'failed');--> statement-breakpoint
CREATE TYPE "public"."rule_lifecycle" AS ENUM('draft', 'verified', 'expired', 'archived');--> statement-breakpoint
CREATE TYPE "public"."rule_result" AS ENUM('decline', 'level', 'graded', 'modified', 'guaranteed_issue', 'refer', 'allow');--> statement-breakpoint
CREATE TYPE "public"."sex" AS ENUM('male', 'female', 'unisex');--> statement-breakpoint
CREATE TYPE "public"."tobacco_class" AS ENUM('tobacco', 'non_tobacco', 'unismoke');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'agent');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_user_id" integer,
	"actor_email" varchar(255),
	"action" varchar(80) NOT NULL,
	"entity_type" varchar(80) NOT NULL,
	"entity_id" varchar(80),
	"entity_version" integer,
	"summary" text,
	"before" jsonb,
	"after" jsonb,
	"ip_address" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carriers" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(80) NOT NULL,
	"name" varchar(160) NOT NULL,
	"status" "activation_status" DEFAULT 'inactive' NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_fictional_sample" boolean DEFAULT false NOT NULL,
	"agent_portal_url" text,
	"notes" text,
	"published_version" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(80) NOT NULL,
	"category" varchar(80) NOT NULL,
	"prompt" text NOT NULL,
	"help_text" text,
	"answer_type" "answer_type" NOT NULL,
	"options" jsonb,
	"is_required" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"parent_question_id" integer,
	"show_when" jsonb,
	"fact_path" varchar(120),
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medication_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"carrier_id" integer NOT NULL,
	"product_id" integer,
	"medication_name" varchar(160) NOT NULL,
	"implies_condition_code" varchar(80),
	"result" "rule_result" DEFAULT 'refer' NOT NULL,
	"benefit_classification" "benefit_type",
	"explanation" text NOT NULL,
	"source_document_id" integer,
	"source_page" varchar(40),
	"effective_date" date NOT NULL,
	"expiration_date" date,
	"last_reviewed_at" date,
	"rule_version" integer DEFAULT 1 NOT NULL,
	"verification_status" "rule_lifecycle" DEFAULT 'draft' NOT NULL,
	"is_fictional_sample" boolean DEFAULT false NOT NULL,
	"created_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_face_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"min_age" integer NOT NULL,
	"max_age" integer NOT NULL,
	"min_face_amount" integer NOT NULL,
	"max_face_amount" integer NOT NULL,
	"state_code" varchar(2),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "product_states" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"state_code" varchar(2) NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"effective_date" date,
	"end_date" date,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"carrier_id" integer NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(160) NOT NULL,
	"benefit_type" "benefit_type" NOT NULL,
	"status" "activation_status" DEFAULT 'inactive' NOT NULL,
	"min_face_amount" integer DEFAULT 3000 NOT NULL,
	"max_face_amount" integer DEFAULT 25000 NOT NULL,
	"face_increment" integer DEFAULT 1000 NOT NULL,
	"min_age" integer DEFAULT 50 NOT NULL,
	"max_age" integer DEFAULT 85 NOT NULL,
	"tobacco_classes" jsonb DEFAULT '["non_tobacco","tobacco"]'::jsonb NOT NULL,
	"sex_classes" jsonb DEFAULT '["male","female"]'::jsonb NOT NULL,
	"waiting_period_months" integer DEFAULT 0 NOT NULL,
	"simplicity_score" integer DEFAULT 3 NOT NULL,
	"rate_methodology" varchar(32) DEFAULT 'exact_only' NOT NULL,
	"allow_interpolation" boolean DEFAULT false NOT NULL,
	"application_url" text,
	"e_application_url" text,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"quote_session_id" varchar(32) NOT NULL,
	"engine_version" varchar(20) NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_sessions" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"state_code" varchar(2),
	"age" integer,
	"sex" "sex",
	"tobacco_use" boolean,
	"face_amount" integer,
	"monthly_budget" numeric(10, 2),
	"health_answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"step" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"rate_table_id" integer NOT NULL,
	"age" integer NOT NULL,
	"sex" "sex" NOT NULL,
	"tobacco_class" "tobacco_class" NOT NULL,
	"face_amount" integer NOT NULL,
	"monthly_premium" numeric(10, 2) NOT NULL,
	"annual_premium" numeric(10, 2),
	"rate_per_thousand" numeric(10, 4)
);
--> statement-breakpoint
CREATE TABLE "rate_imports" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"rate_table_id" integer,
	"filename" varchar(255) NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"accepted_count" integer DEFAULT 0 NOT NULL,
	"rejected_count" integer DEFAULT 0 NOT NULL,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"errors" jsonb,
	"created_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_tables" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"state_code" varchar(2),
	"benefit_type" "benefit_type" NOT NULL,
	"effective_date" date NOT NULL,
	"end_date" date,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"monthly_policy_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"source_document_id" integer,
	"source_page" varchar(40),
	"is_fictional_sample" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_by_user_id" integer,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rule_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_id" integer NOT NULL,
	"version" integer NOT NULL,
	"action" varchar(40) NOT NULL,
	"snapshot" jsonb NOT NULL,
	"changed_by_user_id" integer,
	"changed_by_email" varchar(255),
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"carrier_id" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"doc_type" varchar(60) DEFAULT 'underwriting_guide' NOT NULL,
	"reference" text,
	"document_date" date,
	"effective_date" date,
	"notes" text,
	"uploaded_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "underwriting_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"carrier_id" integer NOT NULL,
	"product_id" integer,
	"state_code" varchar(2),
	"rule_category" varchar(80) NOT NULL,
	"condition_code" varchar(80) NOT NULL,
	"treatment" varchar(120),
	"lookback_months" integer,
	"criteria" jsonb,
	"result" "rule_result" NOT NULL,
	"benefit_classification" "benefit_type",
	"explanation" text NOT NULL,
	"underwriting_concern" text,
	"priority" integer DEFAULT 100 NOT NULL,
	"source_document_id" integer,
	"source_page" varchar(40),
	"effective_date" date NOT NULL,
	"expiration_date" date,
	"last_reviewed_at" date,
	"rule_version" integer DEFAULT 1 NOT NULL,
	"verification_status" "rule_lifecycle" DEFAULT 'draft' NOT NULL,
	"is_fictional_sample" boolean DEFAULT false NOT NULL,
	"created_by_user_id" integer,
	"published_by_user_id" integer,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'agent' NOT NULL,
	"display_name" varchar(120),
	"is_active" boolean DEFAULT true NOT NULL,
	"token_version" integer DEFAULT 1 NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_rules" ADD CONSTRAINT "medication_rules_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_rules" ADD CONSTRAINT "medication_rules_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_rules" ADD CONSTRAINT "medication_rules_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_rules" ADD CONSTRAINT "medication_rules_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_face_limits" ADD CONSTRAINT "product_face_limits_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_states" ADD CONSTRAINT "product_states_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_results" ADD CONSTRAINT "quote_results_quote_session_id_quote_sessions_id_fk" FOREIGN KEY ("quote_session_id") REFERENCES "public"."quote_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_entries" ADD CONSTRAINT "rate_entries_rate_table_id_rate_tables_id_fk" FOREIGN KEY ("rate_table_id") REFERENCES "public"."rate_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_imports" ADD CONSTRAINT "rate_imports_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_imports" ADD CONSTRAINT "rate_imports_rate_table_id_rate_tables_id_fk" FOREIGN KEY ("rate_table_id") REFERENCES "public"."rate_tables"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_imports" ADD CONSTRAINT "rate_imports_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_tables" ADD CONSTRAINT "rate_tables_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_tables" ADD CONSTRAINT "rate_tables_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_tables" ADD CONSTRAINT "rate_tables_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_versions" ADD CONSTRAINT "rule_versions_rule_id_underwriting_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."underwriting_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_versions" ADD CONSTRAINT "rule_versions_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "underwriting_rules" ADD CONSTRAINT "underwriting_rules_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "underwriting_rules" ADD CONSTRAINT "underwriting_rules_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "underwriting_rules" ADD CONSTRAINT "underwriting_rules_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "underwriting_rules" ADD CONSTRAINT "underwriting_rules_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "underwriting_rules" ADD CONSTRAINT "underwriting_rules_published_by_user_id_users_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "carriers_slug_key" ON "carriers" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "health_questions_code_key" ON "health_questions" USING btree ("code");--> statement-breakpoint
CREATE INDEX "health_questions_category_idx" ON "health_questions" USING btree ("category","sort_order");--> statement-breakpoint
CREATE INDEX "medication_rules_name_idx" ON "medication_rules" USING btree ("medication_name");--> statement-breakpoint
CREATE INDEX "product_face_limits_product_idx" ON "product_face_limits" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_states_key" ON "product_states" USING btree ("product_id","state_code");--> statement-breakpoint
CREATE UNIQUE INDEX "products_carrier_slug_key" ON "products" USING btree ("carrier_id","slug");--> statement-breakpoint
CREATE INDEX "products_carrier_idx" ON "products" USING btree ("carrier_id");--> statement-breakpoint
CREATE INDEX "quote_results_session_idx" ON "quote_results" USING btree ("quote_session_id");--> statement-breakpoint
CREATE INDEX "quote_sessions_expires_idx" ON "quote_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rate_entries_key" ON "rate_entries" USING btree ("rate_table_id","age","sex","tobacco_class","face_amount");--> statement-breakpoint
CREATE INDEX "rate_entries_lookup_idx" ON "rate_entries" USING btree ("rate_table_id","age","face_amount");--> statement-breakpoint
CREATE INDEX "rate_imports_product_idx" ON "rate_imports" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "rate_tables_product_idx" ON "rate_tables" USING btree ("product_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "rule_versions_key" ON "rule_versions" USING btree ("rule_id","version","action","changed_at");--> statement-breakpoint
CREATE INDEX "source_documents_carrier_idx" ON "source_documents" USING btree ("carrier_id");--> statement-breakpoint
CREATE INDEX "underwriting_rules_carrier_idx" ON "underwriting_rules" USING btree ("carrier_id","verification_status");--> statement-breakpoint
CREATE INDEX "underwriting_rules_condition_idx" ON "underwriting_rules" USING btree ("condition_code");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email");
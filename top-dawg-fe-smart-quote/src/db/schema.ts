/**
 * Top Dawg FE Smart Quote — database schema.
 *
 * Everything the recommendation engine consumes (carriers, products, state
 * availability, age/face limits, health questions, underwriting rules,
 * medication rules and rate tables) lives here. Nothing is hardcoded in the UI.
 */
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

/* -------------------------------------------------------------------------- */
/* Enums                                                                      */
/* -------------------------------------------------------------------------- */

export const userRoleEnum = pgEnum('user_role', ['admin', 'agent']);

/** Activation state for carriers and products. */
export const activationEnum = pgEnum('activation_status', ['active', 'inactive']);

/** Lifecycle of an underwriting / medication rule. */
export const ruleLifecycleEnum = pgEnum('rule_lifecycle', [
  'draft',
  'verified',
  'expired',
  'archived',
]);

/** Lifecycle of a rate table or an import batch. */
export const publishStatusEnum = pgEnum('publish_status', ['draft', 'published', 'archived', 'failed']);

export const benefitTypeEnum = pgEnum('benefit_type', [
  'level',
  'graded',
  'modified',
  'guaranteed_issue',
]);

export const sexEnum = pgEnum('sex', ['male', 'female', 'unisex']);

export const tobaccoClassEnum = pgEnum('tobacco_class', ['tobacco', 'non_tobacco', 'unismoke']);

/**
 * Outcome an underwriting rule asserts when it matches.
 *  - decline      : hard knockout, do not submit
 *  - level/graded/modified/guaranteed_issue : benefit classification ceiling
 *  - refer        : the carrier must be asked; engine returns "requires verification"
 *  - allow        : explicitly acceptable at the stated benefit classification
 */
export const ruleResultEnum = pgEnum('rule_result', [
  'decline',
  'level',
  'graded',
  'modified',
  'guaranteed_issue',
  'refer',
  'allow',
]);

export const answerTypeEnum = pgEnum('answer_type', [
  'boolean',
  'single_select',
  'multi_select',
  'integer',
  'decimal',
  'months_ago',
  'text',
  'height_weight',
  'medication_list',
]);

/* -------------------------------------------------------------------------- */
/* Authentication + audit                                                      */
/* -------------------------------------------------------------------------- */

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    role: userRoleEnum('role').notNull().default('agent'),
    displayName: varchar('display_name', { length: 120 }),
    isActive: boolean('is_active').notNull().default(true),
    /** Bumped to invalidate every outstanding session cookie for this user. */
    tokenVersion: integer('token_version').notNull().default(1),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('users_email_key').on(t.email)],
);

export const auditLog = pgTable(
  'audit_log',
  {
    id: serial('id').primaryKey(),
    actorUserId: integer('actor_user_id').references(() => users.id),
    actorEmail: varchar('actor_email', { length: 255 }),
    action: varchar('action', { length: 80 }).notNull(),
    entityType: varchar('entity_type', { length: 80 }).notNull(),
    entityId: varchar('entity_id', { length: 80 }),
    /** Version published/rolled back to, when the action touched a versioned row. */
    entityVersion: integer('entity_version'),
    summary: text('summary'),
    before: jsonb('before'),
    after: jsonb('after'),
    ipAddress: varchar('ip_address', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('audit_log_entity_idx').on(t.entityType, t.entityId),
    index('audit_log_created_idx').on(t.createdAt),
  ],
);

/* -------------------------------------------------------------------------- */
/* Carriers, source documents, products                                        */
/* -------------------------------------------------------------------------- */

export const carriers = pgTable(
  'carriers',
  {
    id: serial('id').primaryKey(),
    slug: varchar('slug', { length: 80 }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    /** Carriers ship INACTIVE until verified documentation has been loaded. */
    status: activationEnum('status').notNull().default('inactive'),
    /** True only once an admin has published a verified carrier module. */
    isVerified: boolean('is_verified').notNull().default(false),
    /** Marks demo/fictional data so it can never be mistaken for real rates. */
    isFictionalSample: boolean('is_fictional_sample').notNull().default(false),
    agentPortalUrl: text('agent_portal_url'),
    notes: text('notes'),
    publishedVersion: integer('published_version').notNull().default(0),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('carriers_slug_key').on(t.slug)],
);

export const sourceDocuments = pgTable(
  'source_documents',
  {
    id: serial('id').primaryKey(),
    carrierId: integer('carrier_id')
      .notNull()
      .references(() => carriers.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    docType: varchar('doc_type', { length: 60 }).notNull().default('underwriting_guide'),
    /** Either an uploaded file path or an external reference/URL. */
    reference: text('reference'),
    documentDate: date('document_date'),
    effectiveDate: date('effective_date'),
    notes: text('notes'),
    uploadedByUserId: integer('uploaded_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('source_documents_carrier_idx').on(t.carrierId)],
);

export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    carrierId: integer('carrier_id')
      .notNull()
      .references(() => carriers.id, { onDelete: 'cascade' }),
    slug: varchar('slug', { length: 100 }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    benefitType: benefitTypeEnum('benefit_type').notNull(),
    status: activationEnum('status').notNull().default('inactive'),

    /** Face amount rules (dollars). */
    minFaceAmount: integer('min_face_amount').notNull().default(3000),
    maxFaceAmount: integer('max_face_amount').notNull().default(25000),
    faceIncrement: integer('face_increment').notNull().default(1000),

    /**
     * Which age the carrier rates on. Carriers differ: American Amicable and
     * Mutual of Omaha rate on age last birthday, Combined Insurance on age
     * nearest birthday. Quoting the wrong one mis-prices the case.
     */
    ageBasis: varchar('age_basis', { length: 24 }).notNull().default('last_birthday'),

    /** Issue ages, inclusive. */
    minAge: integer('min_age').notNull().default(50),
    maxAge: integer('max_age').notNull().default(85),

    /** Which tobacco classes the product actually rates. */
    tobaccoClasses: jsonb('tobacco_classes').$type<string[]>().notNull().default(['non_tobacco', 'tobacco']),
    /** Which sexes the rate tables distinguish. */
    sexClasses: jsonb('sex_classes').$type<string[]>().notNull().default(['male', 'female']),

    /** Months of reduced/returned-premium benefit for graded & modified plans. */
    waitingPeriodMonths: integer('waiting_period_months').notNull().default(0),

    /**
     * 1 (hardest) .. 5 (easiest). Used only as the final ranking tiebreaker
     * ("application simplicity"). Never influenced by compensation.
     */
    simplicityScore: integer('simplicity_score').notNull().default(3),

    /**
     * 'exact_only'  — premiums must come from an exact rate-table row.
     * 'per_thousand' — carrier's verified methodology is rate per $1,000; only
     *                  usable when allowInterpolation is explicitly true.
     */
    rateMethodology: varchar('rate_methodology', { length: 32 }).notNull().default('exact_only'),
    allowInterpolation: boolean('allow_interpolation').notNull().default(false),

    applicationUrl: text('application_url'),
    eApplicationUrl: text('e_application_url'),
    notes: text('notes'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('products_carrier_slug_key').on(t.carrierId, t.slug),
    index('products_carrier_idx').on(t.carrierId),
  ],
);

/** Per-state availability. A product with no rows is treated as unavailable everywhere. */
export const productStates = pgTable(
  'product_states',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    stateCode: varchar('state_code', { length: 2 }).notNull(),
    isAvailable: boolean('is_available').notNull().default(true),
    effectiveDate: date('effective_date'),
    endDate: date('end_date'),
    notes: text('notes'),
  },
  (t) => [uniqueIndex('product_states_key').on(t.productId, t.stateCode)],
);

/** Optional age-banded overrides for face amount (e.g. 76+ capped at $15,000). */
export const productFaceLimits = pgTable(
  'product_face_limits',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    minAge: integer('min_age').notNull(),
    maxAge: integer('max_age').notNull(),
    minFaceAmount: integer('min_face_amount').notNull(),
    maxFaceAmount: integer('max_face_amount').notNull(),
    stateCode: varchar('state_code', { length: 2 }),
    notes: text('notes'),
  },
  (t) => [index('product_face_limits_product_idx').on(t.productId)],
);

/* -------------------------------------------------------------------------- */
/* Rate tables                                                                 */
/* -------------------------------------------------------------------------- */

export const rateTables = pgTable(
  'rate_tables',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    /** NULL means the table applies to every state the product is sold in. */
    stateCode: varchar('state_code', { length: 2 }),
    benefitType: benefitTypeEnum('benefit_type').notNull(),
    effectiveDate: date('effective_date').notNull(),
    endDate: date('end_date'),
    status: publishStatusEnum('status').notNull().default('draft'),
    version: integer('version').notNull().default(1),
    /** Monthly policy/administrative fee added to the looked-up premium. */
    monthlyPolicyFee: numeric('monthly_policy_fee', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),

    /**
     * How the rows in this table are expressed.
     *  'monthly_exact'       — each row is the monthly premium for that face amount.
     *  'annual_per_thousand' — each row is an ANNUAL rate per $1,000 and the monthly
     *                          premium is the carrier's own published formula:
     *                          (rate × units + annualPolicyFee) × monthlyModalFactor
     * The second form is a documented carrier methodology, not interpolation.
     */
    rateBasis: varchar('rate_basis', { length: 32 }).notNull().default('monthly_exact'),
    /** Annual policy fee, for annual_per_thousand tables. */
    annualPolicyFee: numeric('annual_policy_fee', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    /** Carrier's published monthly modal factor, e.g. 0.088. */
    monthlyModalFactor: numeric('monthly_modal_factor', { precision: 8, scale: 5 }),
    sourceDocumentId: integer('source_document_id').references(() => sourceDocuments.id),
    sourcePage: varchar('source_page', { length: 40 }),
    isFictionalSample: boolean('is_fictional_sample').notNull().default(false),
    notes: text('notes'),
    createdByUserId: integer('created_by_user_id').references(() => users.id),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('rate_tables_product_idx').on(t.productId, t.status)],
);

export const rateEntries = pgTable(
  'rate_entries',
  {
    id: serial('id').primaryKey(),
    rateTableId: integer('rate_table_id')
      .notNull()
      .references(() => rateTables.id, { onDelete: 'cascade' }),
    age: integer('age').notNull(),
    sex: sexEnum('sex').notNull(),
    tobaccoClass: tobaccoClassEnum('tobacco_class').notNull(),
    faceAmount: integer('face_amount').notNull(),
    monthlyPremium: numeric('monthly_premium', { precision: 10, scale: 2 }).notNull(),
    annualPremium: numeric('annual_premium', { precision: 10, scale: 2 }),
    /** Populated only for per-$1,000 methodologies. */
    ratePerThousand: numeric('rate_per_thousand', { precision: 10, scale: 4 }),
  },
  (t) => [
    uniqueIndex('rate_entries_key').on(t.rateTableId, t.age, t.sex, t.tobaccoClass, t.faceAmount),
    index('rate_entries_lookup_idx').on(t.rateTableId, t.age, t.faceAmount),
  ],
);

export const rateImports = pgTable(
  'rate_imports',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    rateTableId: integer('rate_table_id').references(() => rateTables.id, { onDelete: 'set null' }),
    filename: varchar('filename', { length: 255 }).notNull(),
    rowCount: integer('row_count').notNull().default(0),
    acceptedCount: integer('accepted_count').notNull().default(0),
    rejectedCount: integer('rejected_count').notNull().default(0),
    status: publishStatusEnum('status').notNull().default('draft'),
    errors: jsonb('errors').$type<Array<{ row: number; message: string }>>(),
    createdByUserId: integer('created_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('rate_imports_product_idx').on(t.productId)],
);

/* -------------------------------------------------------------------------- */
/* Health interview                                                            */
/* -------------------------------------------------------------------------- */

export const healthQuestions = pgTable(
  'health_questions',
  {
    id: serial('id').primaryKey(),
    /** Stable machine code referenced by rules and by follow-up conditions. */
    code: varchar('code', { length: 80 }).notNull(),
    category: varchar('category', { length: 80 }).notNull(),
    prompt: text('prompt').notNull(),
    helpText: text('help_text'),
    answerType: answerTypeEnum('answer_type').notNull(),
    options: jsonb('options').$type<Array<{ value: string; label: string }>>(),
    isRequired: boolean('is_required').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    /** Follow-up questions point at the question that triggers them. */
    parentQuestionId: integer('parent_question_id'),
    /**
     * Branching condition. NULL = always shown.
     * Shape: { all?: Criterion[]; any?: Criterion[]; none?: Criterion[] }
     * Criterion: { question: string; op: string; value?: unknown }
     */
    showWhen: jsonb('show_when'),
    /** Canonical fact this answer contributes to, e.g. "diabetes.treatment". */
    factPath: varchar('fact_path', { length: 120 }),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('health_questions_code_key').on(t.code),
    index('health_questions_category_idx').on(t.category, t.sortOrder),
  ],
);

/* -------------------------------------------------------------------------- */
/* Underwriting rules + version history                                        */
/* -------------------------------------------------------------------------- */

export const underwritingRules = pgTable(
  'underwriting_rules',
  {
    id: serial('id').primaryKey(),
    carrierId: integer('carrier_id')
      .notNull()
      .references(() => carriers.id, { onDelete: 'cascade' }),
    /** NULL = applies to every product of the carrier. */
    productId: integer('product_id').references(() => products.id, { onDelete: 'cascade' }),
    /** NULL = applies in every state. */
    stateCode: varchar('state_code', { length: 2 }),

    ruleCategory: varchar('rule_category', { length: 80 }).notNull(),
    /** Canonical condition code, e.g. "diabetes", "cancer", "adl_assistance". */
    conditionCode: varchar('condition_code', { length: 80 }).notNull(),
    treatment: varchar('treatment', { length: 120 }),
    lookbackMonths: integer('lookback_months'),

    /** Deterministic criteria tree evaluated against extracted client facts. */
    criteria: jsonb('criteria').$type<unknown>(),

    result: ruleResultEnum('result').notNull(),
    benefitClassification: benefitTypeEnum('benefit_classification'),

    /** Agent-facing sentence. Shown verbatim when this rule drives a result. */
    explanation: text('explanation').notNull(),
    underwritingConcern: text('underwriting_concern'),

    /** Higher wins when two rules are otherwise equally specific. */
    priority: integer('priority').notNull().default(100),

    sourceDocumentId: integer('source_document_id').references(() => sourceDocuments.id),
    sourcePage: varchar('source_page', { length: 40 }),
    effectiveDate: date('effective_date').notNull(),
    expirationDate: date('expiration_date'),
    lastReviewedAt: date('last_reviewed_at'),
    ruleVersion: integer('rule_version').notNull().default(1),
    verificationStatus: ruleLifecycleEnum('verification_status').notNull().default('draft'),
    isFictionalSample: boolean('is_fictional_sample').notNull().default(false),

    createdByUserId: integer('created_by_user_id').references(() => users.id),
    publishedByUserId: integer('published_by_user_id').references(() => users.id),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('underwriting_rules_carrier_idx').on(t.carrierId, t.verificationStatus),
    index('underwriting_rules_condition_idx').on(t.conditionCode),
  ],
);

/** Immutable snapshots of every published version of a rule. Enables rollback. */
export const ruleVersions = pgTable(
  'rule_versions',
  {
    id: serial('id').primaryKey(),
    ruleId: integer('rule_id')
      .notNull()
      .references(() => underwritingRules.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    action: varchar('action', { length: 40 }).notNull(),
    snapshot: jsonb('snapshot').notNull(),
    changedByUserId: integer('changed_by_user_id').references(() => users.id),
    changedByEmail: varchar('changed_by_email', { length: 255 }),
    changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('rule_versions_key').on(t.ruleId, t.version, t.action, t.changedAt)],
);

export const medicationRules = pgTable(
  'medication_rules',
  {
    id: serial('id').primaryKey(),
    carrierId: integer('carrier_id')
      .notNull()
      .references(() => carriers.id, { onDelete: 'cascade' }),
    productId: integer('product_id').references(() => products.id, { onDelete: 'cascade' }),
    /** Lower-cased medication name or ingredient as entered by the agent. */
    medicationName: varchar('medication_name', { length: 160 }).notNull(),
    /** Condition this medication implies, fed back into the rules engine. */
    impliesConditionCode: varchar('implies_condition_code', { length: 80 }),
    result: ruleResultEnum('result').notNull().default('refer'),
    benefitClassification: benefitTypeEnum('benefit_classification'),
    explanation: text('explanation').notNull(),
    sourceDocumentId: integer('source_document_id').references(() => sourceDocuments.id),
    sourcePage: varchar('source_page', { length: 40 }),
    effectiveDate: date('effective_date').notNull(),
    expirationDate: date('expiration_date'),
    lastReviewedAt: date('last_reviewed_at'),
    ruleVersion: integer('rule_version').notNull().default(1),
    verificationStatus: ruleLifecycleEnum('verification_status').notNull().default('draft'),
    isFictionalSample: boolean('is_fictional_sample').notNull().default(false),
    createdByUserId: integer('created_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('medication_rules_name_idx').on(t.medicationName)],
);

/* -------------------------------------------------------------------------- */
/* Anonymous quote sessions                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Deliberately minimal. No name, no SSN, no banking, no beneficiary, no DOB —
 * only the attributes the rules and rate engines actually need.
 */
export const quoteSessions = pgTable(
  'quote_sessions',
  {
    id: varchar('id', { length: 32 }).primaryKey(),
    stateCode: varchar('state_code', { length: 2 }),
    age: integer('age'),
    sex: sexEnum('sex'),
    tobaccoUse: boolean('tobacco_use'),
    faceAmount: integer('face_amount'),
    monthlyBudget: numeric('monthly_budget', { precision: 10, scale: 2 }),
    /** Answer map keyed by health question code. Pseudonymous, auto-expiring. */
    healthAnswers: jsonb('health_answers').$type<Record<string, unknown>>().notNull().default({}),
    step: integer('step').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('quote_sessions_expires_idx').on(t.expiresAt)],
);

/** Immutable snapshot of a Super Quote, for traceability and support. */
export const quoteResults = pgTable(
  'quote_results',
  {
    id: serial('id').primaryKey(),
    quoteSessionId: varchar('quote_session_id', { length: 32 })
      .notNull()
      .references(() => quoteSessions.id, { onDelete: 'cascade' }),
    engineVersion: varchar('engine_version', { length: 20 }).notNull(),
    payload: jsonb('payload').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('quote_results_session_idx').on(t.quoteSessionId)],
);

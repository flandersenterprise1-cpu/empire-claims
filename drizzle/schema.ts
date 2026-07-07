import {
  int, mysqlEnum, mysqlTable, text, timestamp,
  varchar, decimal, boolean, json
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "adjuster", "manager"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Adjusters ────────────────────────────────────────────────────────────────
export const adjusters = mysqlTable("adjusters", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 30 }),
  licensedStates: text("licensedStates"), // comma-separated state codes e.g. "CA,TX,FL"
  isActive: boolean("isActive").default(true).notNull(),
  bio: text("bio"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Adjuster = typeof adjusters.$inferSelect;

// ─── Claims ───────────────────────────────────────────────────────────────────
export const claims = mysqlTable("claims", {
  id: int("id").autoincrement().primaryKey(),
  claimNumber: varchar("claimNumber", { length: 32 }).notNull().unique(),

  // Client info
  clientName: varchar("clientName", { length: 255 }).notNull(),
  clientPhone: varchar("clientPhone", { length: 30 }),
  clientEmail: varchar("clientEmail", { length: 320 }),

  // Property
  propertyAddress: text("propertyAddress"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zipCode", { length: 10 }),

  // Insurance
  insuranceCompany: varchar("insuranceCompany", { length: 255 }),
  policyNumber: varchar("policyNumber", { length: 100 }),
  insuranceClaimNumber: varchar("insuranceClaimNumber", { length: 100 }),

  // Damage
  damageType: mysqlEnum("damageType", [
    "Fire", "Smoke", "Water", "Storm", "Wind", "Hail",
    "Vandalism", "Theft", "Mold", "Flood", "Earthquake", "Other"
  ]).notNull().default("Other"),
  dateOfLoss: varchar("dateOfLoss", { length: 20 }),
  damageDescription: text("damageDescription"),

  // Status
  status: mysqlEnum("status", [
    "New Claim", "Contacted", "Inspection Scheduled",
    "Inspection Completed", "Estimate Submitted",
    "Negotiation", "Settlement Reached", "Closed", "Denied"
  ]).default("New Claim").notNull(),

  // Financials
  estimatedValue: decimal("estimatedValue", { precision: 12, scale: 2 }),
  settlementAmount: decimal("settlementAmount", { precision: 12, scale: 2 }),
  feePercentage: decimal("feePercentage", { precision: 5, scale: 2 }).default("10.00"),

  // Assignment
  assignedAdjusterId: int("assignedAdjusterId"),

  // Source
  source: mysqlEnum("source", [
    "Website Form", "Referral", "Phone", "Walk-In", "Partner", "Other"
  ]).default("Website Form"),

  priority: mysqlEnum("priority", ["Low", "Normal", "High", "Urgent"]).default("Normal"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  closedAt: timestamp("closedAt"),
});

export type Claim = typeof claims.$inferSelect;

// ─── Claim Notes ──────────────────────────────────────────────────────────────
export const claimNotes = mysqlTable("claim_notes", {
  id: int("id").autoincrement().primaryKey(),
  claimId: int("claimId").notNull(),
  authorId: int("authorId"),
  authorName: varchar("authorName", { length: 255 }),
  authorRole: varchar("authorRole", { length: 32 }),
  content: text("content").notNull(),
  isInternal: boolean("isInternal").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Inspections ──────────────────────────────────────────────────────────────
export const inspections = mysqlTable("inspections", {
  id: int("id").autoincrement().primaryKey(),
  claimId: int("claimId").notNull(),
  adjusterId: int("adjusterId"),
  scheduledDate: varchar("scheduledDate", { length: 20 }),
  scheduledTime: varchar("scheduledTime", { length: 10 }),
  location: text("location"),
  status: mysqlEnum("status", ["Scheduled", "Completed", "Cancelled", "No-Show"]).default("Scheduled").notNull(),
  notes: text("notes"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Inspection = typeof inspections.$inferSelect;

// ─── Documents ────────────────────────────────────────────────────────────────
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  claimId: int("claimId").notNull(),
  uploadedById: int("uploadedById"),
  uploadedByName: varchar("uploadedByName", { length: 255 }),
  fileName: varchar("fileName", { length: 500 }).notNull(),
  fileKey: varchar("fileKey", { length: 1000 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"),
  category: mysqlEnum("category", [
    "Photo", "Estimate", "Policy", "Report", "Correspondence", "Other"
  ]).default("Other"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;

// ─── Tasks ────────────────────────────────────────────────────────────────────
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  claimId: int("claimId"),
  assignedAdjusterId: int("assignedAdjusterId"),
  createdById: int("createdById"),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  priority: mysqlEnum("priority", ["Low", "Medium", "High", "Urgent"]).default("Medium"),
  dueDate: varchar("dueDate", { length: 20 }),
  isCompleted: boolean("isCompleted").default(false).notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;

// ─── Activity Feed ────────────────────────────────────────────────────────────
export const activityFeed = mysqlTable("activity_feed", {
  id: int("id").autoincrement().primaryKey(),
  claimId: int("claimId"),
  userId: int("userId"),
  adjusterId: int("adjusterId"),
  type: varchar("type", { length: 64 }).notNull(),
  description: text("description").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Admin Credentials (username/password auth) ─────────────────────────────
export const adminCredentials = mysqlTable("admin_credentials", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  role: mysqlEnum("role", ["admin", "adjuster", "manager"]).default("adjuster").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  lastLoginAt: timestamp("lastLoginAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdminCredential = typeof adminCredentials.$inferSelect;

// ─── Form Submissions (from public website) ───────────────────────────────────
export const formSubmissions = mysqlTable("form_submissions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 320 }),
  propertyAddress: text("propertyAddress"),
  insuranceCompany: varchar("insuranceCompany", { length: 255 }),
  damageType: varchar("damageType", { length: 100 }),
  dateOfLoss: varchar("dateOfLoss", { length: 20 }),
  message: text("message"),
  serviceRequested: varchar("serviceRequested", { length: 255 }),
  isConverted: boolean("isConverted").default(false).notNull(),
  convertedClaimId: int("convertedClaimId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

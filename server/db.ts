import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  adjusters, claims, claimNotes, inspections, documents,
  tasks, activityFeed, formSubmissions, adminCredentials,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "user" | "admin" | "adjuster" | "manager") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role } as any).where(eq(users.id, userId));
}

// ─── Adjusters ────────────────────────────────────────────────────────────────
export async function getAllAdjusters() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(adjusters).orderBy(adjusters.name);
}

export async function getAdjusterById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(adjusters).where(eq(adjusters.id, id)).limit(1);
  return result[0];
}

export async function createAdjuster(data: {
  name: string; email?: string; phone?: string;
  licensedStates?: string; bio?: string; userId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(adjusters).values({ ...data, isActive: true }).$returningId();
  return result[0];
}

export async function updateAdjuster(id: number, data: Partial<{
  name: string; email: string; phone: string;
  licensedStates: string; bio: string; isActive: boolean;
}>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(adjusters).set(data as any).where(eq(adjusters.id, id));
}

// ─── Claims ───────────────────────────────────────────────────────────────────
function generateClaimNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 90000) + 10000;
  return `ECG-${year}-${rand}`;
}

export async function getAllClaims(filters?: {
  status?: string; damageType?: string; state?: string;
  adjusterId?: number; search?: string; priority?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.status) conditions.push(eq(claims.status, filters.status as any));
  if (filters?.damageType) conditions.push(eq(claims.damageType, filters.damageType as any));
  if (filters?.state) conditions.push(eq(claims.state, filters.state));
  if (filters?.adjusterId) conditions.push(eq(claims.assignedAdjusterId, filters.adjusterId));
  if (filters?.priority) conditions.push(eq(claims.priority, filters.priority as any));
  if (filters?.search) {
    conditions.push(or(
      like(claims.clientName, `%${filters.search}%`),
      like(claims.claimNumber, `%${filters.search}%`),
      like(claims.insuranceCompany, `%${filters.search}%`),
    ));
  }
  return conditions.length > 0
    ? db.select().from(claims).where(and(...conditions)).orderBy(desc(claims.createdAt))
    : db.select().from(claims).orderBy(desc(claims.createdAt));
}

export async function getClaimById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(claims).where(eq(claims.id, id)).limit(1);
  return result[0];
}

export async function createClaim(data: {
  clientName: string; clientPhone?: string; clientEmail?: string;
  propertyAddress?: string; city?: string; state?: string; zipCode?: string;
  insuranceCompany?: string; policyNumber?: string; insuranceClaimNumber?: string;
  damageType?: string; dateOfLoss?: string; damageDescription?: string;
  status?: string; estimatedValue?: string; feePercentage?: string;
  assignedAdjusterId?: number; source?: string; priority?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const claimNumber = generateClaimNumber();
  const result = await db.insert(claims).values({
    claimNumber,
    clientName: data.clientName,
    clientPhone: data.clientPhone,
    clientEmail: data.clientEmail,
    propertyAddress: data.propertyAddress,
    city: data.city,
    state: data.state,
    zipCode: data.zipCode,
    insuranceCompany: data.insuranceCompany,
    policyNumber: data.policyNumber,
    insuranceClaimNumber: data.insuranceClaimNumber,
    damageType: (data.damageType as any) || "Other",
    dateOfLoss: data.dateOfLoss,
    damageDescription: data.damageDescription,
    status: (data.status as any) || "New Claim",
    estimatedValue: data.estimatedValue,
    feePercentage: data.feePercentage || "10.00",
    assignedAdjusterId: data.assignedAdjusterId,
    source: (data.source as any) || "Website Form",
    priority: (data.priority as any) || "Normal",
  }).$returningId();
  return { claimNumber, id: result[0]?.id };
}

export async function updateClaim(id: number, data: Partial<{
  clientName: string; clientPhone: string; clientEmail: string;
  propertyAddress: string; city: string; state: string; zipCode: string;
  insuranceCompany: string; policyNumber: string; insuranceClaimNumber: string;
  damageType: string; dateOfLoss: string; damageDescription: string;
  status: string; estimatedValue: string; settlementAmount: string;
  feePercentage: string; assignedAdjusterId: number; source: string; priority: string;
  closedAt: Date | null;
}>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(claims).set(data as any).where(eq(claims.id, id));
}

export async function getClaimStats() {
  const db = await getDb();
  if (!db) return { total: 0, newToday: 0, active: 0, inspectionScheduled: 0, negotiation: 0, settlements: 0, totalSettlementValue: 0 };
  const [totalR, newTodayR, activeR, inspR, negR, settR] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(claims),
    db.select({ count: sql<number>`count(*)` }).from(claims).where(sql`DATE(createdAt) = CURDATE()`),
    db.select({ count: sql<number>`count(*)` }).from(claims).where(sql`status NOT IN ('Closed', 'Denied')`),
    db.select({ count: sql<number>`count(*)` }).from(claims).where(eq(claims.status, "Inspection Scheduled")),
    db.select({ count: sql<number>`count(*)` }).from(claims).where(eq(claims.status, "Negotiation")),
    db.select({ count: sql<number>`count(*)`, total: sql<string>`COALESCE(SUM(settlementAmount), 0)` }).from(claims).where(eq(claims.status, "Settlement Reached")),
  ]);
  return {
    total: Number(totalR[0]?.count ?? 0),
    newToday: Number(newTodayR[0]?.count ?? 0),
    active: Number(activeR[0]?.count ?? 0),
    inspectionScheduled: Number(inspR[0]?.count ?? 0),
    negotiation: Number(negR[0]?.count ?? 0),
    settlements: Number(settR[0]?.count ?? 0),
    totalSettlementValue: Number(settR[0]?.total ?? 0),
  };
}

// ─── Claim Notes ──────────────────────────────────────────────────────────────
export async function getClaimNotes(claimId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(claimNotes).where(eq(claimNotes.claimId, claimId)).orderBy(desc(claimNotes.createdAt));
}

export async function addClaimNote(data: {
  claimId: number; authorId?: number; authorName?: string;
  authorRole?: string; content: string; isInternal?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(claimNotes).values(data);
}

// ─── Inspections ──────────────────────────────────────────────────────────────
export async function getAllInspections(filters?: { status?: string; adjusterId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.status) conditions.push(eq(inspections.status, filters.status as any));
  if (filters?.adjusterId) conditions.push(eq(inspections.adjusterId, filters.adjusterId));
  return conditions.length > 0
    ? db.select().from(inspections).where(and(...conditions)).orderBy(desc(inspections.createdAt))
    : db.select().from(inspections).orderBy(desc(inspections.createdAt));
}

export async function getInspectionsByClaimId(claimId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inspections).where(eq(inspections.claimId, claimId)).orderBy(desc(inspections.createdAt));
}

export async function createInspection(data: {
  claimId: number; adjusterId?: number; scheduledDate?: string;
  scheduledTime?: string; location?: string; notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(inspections).values({ ...data, status: "Scheduled" });
}

export async function updateInspection(id: number, data: Partial<{
  adjusterId: number; scheduledDate: string; scheduledTime: string;
  location: string; status: string; notes: string; completedAt: Date | null;
}>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(inspections).set(data as any).where(eq(inspections.id, id));
}

// ─── Documents ────────────────────────────────────────────────────────────────
export async function getDocumentsByClaimId(claimId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documents).where(eq(documents.claimId, claimId)).orderBy(desc(documents.createdAt));
}

export async function createDocument(data: {
  claimId: number; uploadedById?: number; uploadedByName?: string;
  fileName: string; fileKey: string; fileUrl: string;
  mimeType?: string; fileSize?: number; category?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(documents).values({ ...data, category: (data.category as any) || "Other" });
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(documents).where(eq(documents.id, id));
}

// ─── Tasks ────────────────────────────────────────────────────────────────────
export async function getAllTasks(filters?: { isCompleted?: boolean; adjusterId?: number; claimId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.isCompleted !== undefined) conditions.push(eq(tasks.isCompleted, filters.isCompleted));
  if (filters?.adjusterId) conditions.push(eq(tasks.assignedAdjusterId, filters.adjusterId));
  if (filters?.claimId) conditions.push(eq(tasks.claimId, filters.claimId));
  return conditions.length > 0
    ? db.select().from(tasks).where(and(...conditions)).orderBy(desc(tasks.createdAt))
    : db.select().from(tasks).orderBy(desc(tasks.createdAt));
}

export async function createTask(data: {
  claimId?: number; assignedAdjusterId?: number; createdById?: number;
  title: string; description?: string; priority?: string; dueDate?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(tasks).values({ ...data, priority: (data.priority as any) || "Medium", isCompleted: false });
}

export async function updateTask(id: number, data: Partial<{
  title: string; description: string; priority: string;
  dueDate: string; isCompleted: boolean; completedAt: Date | null;
  assignedAdjusterId: number;
}>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(tasks).set(data as any).where(eq(tasks.id, id));
}

// ─── Activity Feed ────────────────────────────────────────────────────────────
export async function getActivityFeed(limit = 50, claimId?: number) {
  const db = await getDb();
  if (!db) return [];
  return claimId
    ? db.select().from(activityFeed).where(eq(activityFeed.claimId, claimId)).orderBy(desc(activityFeed.createdAt)).limit(limit)
    : db.select().from(activityFeed).orderBy(desc(activityFeed.createdAt)).limit(limit);
}

export async function logActivity(data: {
  claimId?: number; userId?: number; adjusterId?: number;
  type: string; description: string; metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(activityFeed).values(data);
}

// ─── Form Submissions ─────────────────────────────────────────────────────────
export async function getAllFormSubmissions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(formSubmissions).orderBy(desc(formSubmissions.createdAt));
}

export async function createFormSubmission(data: {
  name: string; phone?: string; email?: string; propertyAddress?: string;
  insuranceCompany?: string; damageType?: string; dateOfLoss?: string;
  message?: string; serviceRequested?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(formSubmissions).values({ ...data, isConverted: false }).$returningId();
  return result[0];
}

export async function convertFormSubmissionToClaim(submissionId: number, claimId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(formSubmissions).set({ isConverted: true, convertedClaimId: claimId }).where(eq(formSubmissions.id, submissionId));
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export async function getClaimsByStatus() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    status: claims.status,
    count: sql<number>`count(*)`,
  }).from(claims).groupBy(claims.status);
}

export async function getClaimsByDamageType() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    damageType: claims.damageType,
    count: sql<number>`count(*)`,
  }).from(claims).groupBy(claims.damageType);
}

export async function getClaimsByMonth() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    month: sql<string>`DATE_FORMAT(createdAt, '%Y-%m')`,
    count: sql<number>`count(*)`,
    totalValue: sql<string>`COALESCE(SUM(settlementAmount), 0)`,
  }).from(claims)
    .where(sql`createdAt >= DATE_SUB(NOW(), INTERVAL 12 MONTH)`)
    .groupBy(sql`DATE_FORMAT(createdAt, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(createdAt, '%Y-%m')`);
}

export async function getAdjusterPerformance() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    adjusterId: claims.assignedAdjusterId,
    count: sql<number>`count(*)`,
    settled: sql<number>`SUM(CASE WHEN status = 'Settlement Reached' THEN 1 ELSE 0 END)`,
    totalValue: sql<string>`COALESCE(SUM(settlementAmount), 0)`,
  }).from(claims)
    .where(sql`assignedAdjusterId IS NOT NULL`)
    .groupBy(claims.assignedAdjusterId);
}

// ─── Admin Credentials ────────────────────────────────────────────────────────
export async function getCredentialByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(adminCredentials)
    .where(eq(adminCredentials.username, username)).limit(1);
  return result[0];
}

export async function getCredentialById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(adminCredentials)
    .where(eq(adminCredentials.id, id)).limit(1);
  return result[0];
}

export async function createCredential(data: {
  username: string;
  passwordHash: string;
  name?: string;
  role?: "admin" | "adjuster" | "manager";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(adminCredentials).values({
    username: data.username,
    passwordHash: data.passwordHash,
    name: data.name ?? null,
    role: data.role ?? "adjuster",
    isActive: true,
  });
}

export async function updateCredentialLastLogin(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(adminCredentials)
    .set({ lastLoginAt: new Date() })
    .where(eq(adminCredentials.id, id));
}

export async function updateCredentialPassword(id: number, passwordHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(adminCredentials)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(adminCredentials.id, id));
}

export async function getAllCredentials() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: adminCredentials.id,
    username: adminCredentials.username,
    name: adminCredentials.name,
    role: adminCredentials.role,
    isActive: adminCredentials.isActive,
    lastLoginAt: adminCredentials.lastLoginAt,
    createdAt: adminCredentials.createdAt,
  }).from(adminCredentials).orderBy(adminCredentials.createdAt);
}

export async function updateCredential(id: number, data: {
  name?: string;
  role?: "admin" | "adjuster" | "manager";
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(adminCredentials).set({ ...data, updatedAt: new Date() })
    .where(eq(adminCredentials.id, id));
}

export async function deleteCredential(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(adminCredentials).where(eq(adminCredentials.id, id));
}

export async function credentialExists() {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(adminCredentials);
  return (result[0]?.count ?? 0) > 0;
}

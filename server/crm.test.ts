import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module so tests don't need a real database
vi.mock("./db", () => ({
  getAllUsers: vi.fn().mockResolvedValue([]),
  updateUserRole: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  getDb: vi.fn().mockResolvedValue(null),
  // Adjusters
  getAllAdjusters: vi.fn().mockResolvedValue([]),
  getAdjusterById: vi.fn().mockResolvedValue(null),
  createAdjuster: vi.fn().mockResolvedValue({ id: 1, name: "Test Adjuster", email: "adj@test.com", phone: null, licenseNumber: null, specializations: null, isActive: true, createdAt: new Date(), updatedAt: new Date() }),
  updateAdjuster: vi.fn().mockResolvedValue(undefined),
  // Claims
  getAllClaims: vi.fn().mockResolvedValue([]),
  getClaimById: vi.fn().mockResolvedValue(null),
  createClaim: vi.fn().mockResolvedValue({ id: 1, claimNumber: "ECG-2026-0001", clientName: "Test Client", status: "New Claim" }),
  updateClaim: vi.fn().mockResolvedValue(undefined),
  getClaimStats: vi.fn().mockResolvedValue({ total: 0, newToday: 0, active: 0, inspectionScheduled: 0, negotiation: 0, settlements: 0, totalSettlementValue: 0 }),
  // Claim Notes
  getClaimNotes: vi.fn().mockResolvedValue([]),
  addClaimNote: vi.fn().mockResolvedValue({ id: 1, content: "Test note" }),
  // Inspections
  getAllInspections: vi.fn().mockResolvedValue([]),
  getInspectionsByClaimId: vi.fn().mockResolvedValue([]),
  createInspection: vi.fn().mockResolvedValue({ id: 1 }),
  updateInspection: vi.fn().mockResolvedValue(undefined),
  // Documents
  getDocumentsByClaimId: vi.fn().mockResolvedValue([]),
  createDocument: vi.fn().mockResolvedValue({ id: 1, url: "https://example.com/doc.pdf" }),
  deleteDocument: vi.fn().mockResolvedValue(undefined),
  // Tasks
  getAllTasks: vi.fn().mockResolvedValue([]),
  createTask: vi.fn().mockResolvedValue({ id: 1, title: "Test Task" }),
  updateTask: vi.fn().mockResolvedValue(undefined),
  // Activity
  getActivityFeed: vi.fn().mockResolvedValue([]),
  logActivity: vi.fn().mockResolvedValue(undefined),
  // Form Submissions
  getAllFormSubmissions: vi.fn().mockResolvedValue([]),
  createFormSubmission: vi.fn().mockResolvedValue({ id: 1, name: "Test Sub" }),
  convertFormSubmissionToClaim: vi.fn().mockResolvedValue(undefined),
  // Analytics
  getClaimsByStatus: vi.fn().mockResolvedValue([]),
  getClaimsByDamageType: vi.fn().mockResolvedValue([]),
  getClaimsByMonth: vi.fn().mockResolvedValue([]),
  getAdjusterPerformance: vi.fn().mockResolvedValue([]),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "test-key", url: "https://example.com/test.pdf" }),
}));

function makeAdminCtx(): TrpcContext {
  return {
    user: { id: 1, openId: "admin-user", email: "admin@example.com", name: "Admin User", loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeUnauthCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("claims procedures", () => {
  it("admin can list claims", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.claims.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can get claim stats", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.claims.stats();
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("active");
    expect(result).toHaveProperty("settlements");
  });

  it("admin can create a claim", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.claims.create({
      clientName: "John Smith",
      clientPhone: "555-0100",
      propertyAddress: "123 Main St, Los Angeles, CA",
      damageType: "Fire",
      insuranceCompany: "State Farm",
    });
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("claimNumber");
  });

  it("unauthenticated user cannot list claims", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.claims.list({})).rejects.toThrow();
  });

  it("unauthenticated user cannot create claims", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.claims.create({ clientName: "Test" })).rejects.toThrow();
  });
});

describe("adjusters procedures", () => {
  it("admin can list adjusters", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.adjusters.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can create an adjuster", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.adjusters.create({ name: "Jane Doe", email: "jane@example.com" });
    expect(result).toHaveProperty("id");
  });

  it("unauthenticated user cannot create adjusters", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.adjusters.create({ name: "Test" })).rejects.toThrow();
  });
});

describe("tasks procedures", () => {
  it("admin can list tasks", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.tasks.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can create a task", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.tasks.create({ title: "Follow up with client", priority: "High" });
    expect(result).toHaveProperty("success");
    expect(result.success).toBe(true);
  });

  it("unauthenticated user cannot create tasks", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.tasks.create({ title: "Unauthorized task" })).rejects.toThrow();
  });
});

describe("formSubmissions procedures", () => {
  it("public user can submit a form", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    const result = await caller.formSubmissions.create({
      name: "Jane Smith",
      phone: "555-9999",
      serviceRequested: "Free Claim Review",
    });
    expect(result).toHaveProperty("id");
  });

  it("admin can list form submissions", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.formSubmissions.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("unauthenticated user cannot convert submission to claim", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.formSubmissions.convertToClaim({ submissionId: 1, clientName: "Test" })).rejects.toThrow();
  });
});

describe("analytics procedures", () => {
  it("admin can view claims by status", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.analytics.claimsByStatus();
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can view adjuster performance", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.analytics.adjusterPerformance();
    expect(Array.isArray(result)).toBe(true);
  });

  it("unauthenticated user cannot view analytics", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.analytics.claimsByStatus()).rejects.toThrow();
  });
});

describe("users procedures", () => {
  it("admin can list users", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.users.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("unauthenticated user cannot list users", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.users.list()).rejects.toThrow();
  });
});

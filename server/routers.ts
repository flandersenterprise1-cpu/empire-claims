import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import bcrypt from "bcryptjs";
import {
  getCredentialByUsername, createCredential, getAllCredentials,
  updateCredential, deleteCredential, credentialExists, updateCredentialPassword,
} from "./db";
import {
  signAdminSession, setAdminSessionCookie, clearAdminSessionCookie,
} from "./_core/credentialAuth";
import {
  getAllUsers, updateUserRole,
  getAllAdjusters, getAdjusterById, createAdjuster, updateAdjuster,
  getAllClaims, getClaimById, createClaim, updateClaim, getClaimStats,
  getClaimNotes, addClaimNote,
  getAllInspections, getInspectionsByClaimId, createInspection, updateInspection,
  getDocumentsByClaimId, createDocument, deleteDocument,
  getAllTasks, createTask, updateTask,
  getActivityFeed, logActivity,
  getAllFormSubmissions, createFormSubmission, convertFormSubmissionToClaim,
  getClaimsByStatus, getClaimsByDamageType, getClaimsByMonth, getAdjusterPerformance,
} from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { notifyOwner } from "./_core/notification";

// Admin guard middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// Staff procedure (admin, manager, adjuster)
const staffProcedure = protectedProcedure.use(({ ctx, next }) => {
  const allowed = ["admin", "manager", "adjuster"];
  if (!allowed.includes(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Staff access required" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      clearAdminSessionCookie(ctx.res, ctx.req);
      return { success: true } as const;
    }),
  }),

  // ─── Credential Auth (username/password) ────────────────────────────────────
  credentialAuth: router({
    login: publicProcedure
      .input(z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const credential = await getCredentialByUsername(input.username);
        if (!credential || !credential.isActive) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid username or password" });
        }
        const valid = await bcrypt.compare(input.password, credential.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid username or password" });
        }
        const token = await signAdminSession({
          credentialId: credential.id,
          role: credential.role,
          name: credential.name ?? credential.username,
        });
        setAdminSessionCookie(ctx.res, ctx.req, token);
        await import("./db").then(db => db.updateCredentialLastLogin(credential.id));
        return { success: true, name: credential.name ?? credential.username, role: credential.role };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      clearAdminSessionCookie(ctx.res, ctx.req);
      return { success: true };
    }),

    // Setup: create the first admin account (only allowed when no credentials exist)
    setup: publicProcedure
      .input(z.object({
        username: z.string().min(3).max(64),
        password: z.string().min(8),
        name: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const hasAny = await credentialExists();
        if (hasAny) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Setup already completed" });
        }
        const passwordHash = await bcrypt.hash(input.password, 12);
        await createCredential({
          username: input.username,
          passwordHash,
          name: input.name ?? input.username,
          role: "admin",
        });
        return { success: true };
      }),

    hasSetup: publicProcedure.query(() => credentialExists()),

    // Admin-only: manage staff accounts
    listUsers: adminProcedure.query(() => getAllCredentials()),

    createUser: adminProcedure
      .input(z.object({
        username: z.string().min(3).max(64),
        password: z.string().min(8),
        name: z.string().optional(),
        role: z.enum(["admin", "adjuster", "manager"]).default("adjuster"),
      }))
      .mutation(async ({ input }) => {
        const existing = await getCredentialByUsername(input.username);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Username already taken" });
        }
        const passwordHash = await bcrypt.hash(input.password, 12);
        await createCredential({
          username: input.username,
          passwordHash,
          name: input.name ?? input.username,
          role: input.role,
        });
        return { success: true };
      }),

    updateUser: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        role: z.enum(["admin", "adjuster", "manager"]).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(({ input: { id, ...data } }) => updateCredential(id, data)),

    resetPassword: adminProcedure
      .input(z.object({
        id: z.number(),
        newPassword: z.string().min(8),
      }))
      .mutation(async ({ input }) => {
        const passwordHash = await bcrypt.hash(input.newPassword, 12);
        await updateCredentialPassword(input.id, passwordHash);
        return { success: true };
      }),

    deleteUser: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteCredential(input.id)),
  }),

  // ─── Users ──────────────────────────────────────────────────────────────────
  users: router({
    list: adminProcedure.query(() => getAllUsers()),
    updateRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["user", "admin", "adjuster", "manager"]),
      }))
      .mutation(({ input }) => updateUserRole(input.userId, input.role)),
  }),

  // ─── Adjusters ──────────────────────────────────────────────────────────────
  adjusters: router({
    list: staffProcedure.query(() => getAllAdjusters()),
    get: staffProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getAdjusterById(input.id)),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        licensedStates: z.string().optional(),
        bio: z.string().optional(),
      }))
      .mutation(({ input }) => createAdjuster(input)),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        licensedStates: z.string().optional(),
        bio: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(({ input: { id, ...data } }) => updateAdjuster(id, data)),
  }),

  // ─── Claims ─────────────────────────────────────────────────────────────────
  claims: router({
    list: staffProcedure
      .input(z.object({
        status: z.string().optional(),
        damageType: z.string().optional(),
        state: z.string().optional(),
        adjusterId: z.number().optional(),
        search: z.string().optional(),
        priority: z.string().optional(),
      }).optional())
      .query(({ input }) => getAllClaims(input ?? {})),

    get: staffProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getClaimById(input.id)),

    stats: staffProcedure.query(() => getClaimStats()),

    create: staffProcedure
      .input(z.object({
        clientName: z.string().min(1),
        clientPhone: z.string().optional(),
        clientEmail: z.string().optional(),
        propertyAddress: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        insuranceCompany: z.string().optional(),
        policyNumber: z.string().optional(),
        insuranceClaimNumber: z.string().optional(),
        damageType: z.string().optional(),
        dateOfLoss: z.string().optional(),
        damageDescription: z.string().optional(),
        status: z.string().optional(),
        estimatedValue: z.string().optional(),
        feePercentage: z.string().optional(),
        assignedAdjusterId: z.number().optional(),
        source: z.string().optional(),
        priority: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await createClaim(input);
        await logActivity({
          claimId: result.id,
          userId: ctx.user.id,
          type: "claim_created",
          description: `New claim ${result.claimNumber} created for ${input.clientName}`,
        });
        await notifyOwner({
          title: "New Claim Created",
          content: `Claim ${result.claimNumber} created for ${input.clientName}`,
        });
        return result;
      }),

    update: staffProcedure
      .input(z.object({
        id: z.number(),
        clientName: z.string().optional(),
        clientPhone: z.string().optional(),
        clientEmail: z.string().optional(),
        propertyAddress: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        insuranceCompany: z.string().optional(),
        policyNumber: z.string().optional(),
        insuranceClaimNumber: z.string().optional(),
        damageType: z.string().optional(),
        dateOfLoss: z.string().optional(),
        damageDescription: z.string().optional(),
        status: z.string().optional(),
        estimatedValue: z.string().optional(),
        settlementAmount: z.string().optional(),
        feePercentage: z.string().optional(),
        assignedAdjusterId: z.number().optional(),
        source: z.string().optional(),
        priority: z.string().optional(),
      }))
      .mutation(async ({ input: { id, ...data }, ctx }) => {
        await updateClaim(id, data as any);
        if (data.status) {
          await logActivity({
            claimId: id,
            userId: ctx.user.id,
            type: "status_changed",
            description: `Claim status updated to "${data.status}"`,
          });
        }
        return { success: true };
      }),
  }),

  // ─── Claim Notes ────────────────────────────────────────────────────────────
  claimNotes: router({
    list: staffProcedure
      .input(z.object({ claimId: z.number() }))
      .query(({ input }) => getClaimNotes(input.claimId)),

    add: staffProcedure
      .input(z.object({
        claimId: z.number(),
        content: z.string().min(1),
        isInternal: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await addClaimNote({
          claimId: input.claimId,
          authorId: ctx.user.id,
          authorName: ctx.user.name ?? "Unknown",
          authorRole: ctx.user.role,
          content: input.content,
          isInternal: input.isInternal ?? false,
        });
        await logActivity({
          claimId: input.claimId,
          userId: ctx.user.id,
          type: "note_added",
          description: `Note added by ${ctx.user.name ?? "staff"}`,
        });
        return { success: true };
      }),
  }),

  // ─── Inspections ────────────────────────────────────────────────────────────
  inspections: router({
    list: staffProcedure
      .input(z.object({
        status: z.string().optional(),
        adjusterId: z.number().optional(),
      }).optional())
      .query(({ input }) => getAllInspections(input ?? {})),

    listByClaim: staffProcedure
      .input(z.object({ claimId: z.number() }))
      .query(({ input }) => getInspectionsByClaimId(input.claimId)),

    create: staffProcedure
      .input(z.object({
        claimId: z.number(),
        adjusterId: z.number().optional(),
        scheduledDate: z.string().optional(),
        scheduledTime: z.string().optional(),
        location: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await createInspection(input);
        await updateClaim(input.claimId, { status: "Inspection Scheduled" });
        await logActivity({
          claimId: input.claimId,
          userId: ctx.user.id,
          type: "inspection_scheduled",
          description: `Inspection scheduled for ${input.scheduledDate ?? "TBD"}`,
        });
        return { success: true };
      }),

    update: staffProcedure
      .input(z.object({
        id: z.number(),
        adjusterId: z.number().optional(),
        scheduledDate: z.string().optional(),
        scheduledTime: z.string().optional(),
        location: z.string().optional(),
        status: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input: { id, ...data } }) => {
        const completedAt = data.status === "Completed" ? new Date() : undefined;
        await updateInspection(id, { ...data, completedAt } as any);
        return { success: true };
      }),
  }),

  // ─── Documents ──────────────────────────────────────────────────────────────
  documents: router({
    listByClaim: staffProcedure
      .input(z.object({ claimId: z.number() }))
      .query(({ input }) => getDocumentsByClaimId(input.claimId)),

    uploadFile: staffProcedure
      .input(z.object({
        claimId: z.number(),
        fileName: z.string(),
        mimeType: z.string(),
        fileSize: z.number(),
        category: z.string().optional(),
        fileDataBase64: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const fileKey = `claims/${input.claimId}/${nanoid()}-${input.fileName}`;
        const buffer = Buffer.from(input.fileDataBase64, "base64");
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        await createDocument({
          claimId: input.claimId,
          uploadedById: ctx.user.id,
          uploadedByName: ctx.user.name ?? "Unknown",
          fileName: input.fileName,
          fileKey,
          fileUrl: url,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          category: input.category,
        });
        await logActivity({
          claimId: input.claimId,
          userId: ctx.user.id,
          type: "document_uploaded",
          description: `Document "${input.fileName}" uploaded`,
        });
        return { url, fileKey };
      }),

    delete: staffProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteDocument(input.id)),
  }),

  // ─── Tasks ──────────────────────────────────────────────────────────────────
  tasks: router({
    list: staffProcedure
      .input(z.object({
        isCompleted: z.boolean().optional(),
        adjusterId: z.number().optional(),
        claimId: z.number().optional(),
      }).optional())
      .query(({ input }) => getAllTasks(input ?? {})),

    create: staffProcedure
      .input(z.object({
        claimId: z.number().optional(),
        assignedAdjusterId: z.number().optional(),
        title: z.string().min(1),
        description: z.string().optional(),
        priority: z.string().optional(),
        dueDate: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await createTask({ ...input, createdById: ctx.user.id });
        return { success: true };
      }),

    update: staffProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        priority: z.string().optional(),
        dueDate: z.string().optional(),
        isCompleted: z.boolean().optional(),
        assignedAdjusterId: z.number().optional(),
      }))
      .mutation(async ({ input: { id, isCompleted, ...data } }) => {
        const completedAt = isCompleted === true ? new Date() : isCompleted === false ? null : undefined;
        await updateTask(id, { ...data, isCompleted, completedAt } as any);
        return { success: true };
      }),
  }),

  // ─── Activity Feed ──────────────────────────────────────────────────────────
  activity: router({
    list: staffProcedure
      .input(z.object({
        limit: z.number().optional(),
        claimId: z.number().optional(),
      }).optional())
      .query(({ input }) => getActivityFeed(input?.limit ?? 50, input?.claimId)),
  }),

  // ─── Form Submissions ───────────────────────────────────────────────────────
  formSubmissions: router({
    list: staffProcedure.query(() => getAllFormSubmissions()),

    create: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        phone: z.string().optional(),
        email: z.string().optional(),
        propertyAddress: z.string().optional(),
        insuranceCompany: z.string().optional(),
        damageType: z.string().optional(),
        dateOfLoss: z.string().optional(),
        message: z.string().optional(),
        serviceRequested: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await createFormSubmission(input);
        await notifyOwner({
          title: "New Website Inquiry",
          content: `${input.name} submitted a claim review request${input.damageType ? ` for ${input.damageType} damage` : ""}.`,
        });
        return result;
      }),

    convertToClaim: staffProcedure
      .input(z.object({
        submissionId: z.number(),
        clientName: z.string(),
        clientPhone: z.string().optional(),
        clientEmail: z.string().optional(),
        propertyAddress: z.string().optional(),
        insuranceCompany: z.string().optional(),
        damageType: z.string().optional(),
        dateOfLoss: z.string().optional(),
        damageDescription: z.string().optional(),
      }))
      .mutation(async ({ input: { submissionId, ...claimData }, ctx }) => {
        const result = await createClaim(claimData);
        if (result.id) {
          await convertFormSubmissionToClaim(submissionId, result.id);
          await logActivity({
            claimId: result.id,
            userId: ctx.user.id,
            type: "claim_created",
            description: `Claim ${result.claimNumber} created from website form submission`,
          });
        }
        return result;
      }),
  }),

  // ─── Analytics ──────────────────────────────────────────────────────────────
  analytics: router({
    claimsByStatus: staffProcedure.query(() => getClaimsByStatus()),
    claimsByDamageType: staffProcedure.query(() => getClaimsByDamageType()),
    claimsByMonth: staffProcedure.query(() => getClaimsByMonth()),
    adjusterPerformance: staffProcedure.query(async () => {
      const [perf, adjList] = await Promise.all([
        getAdjusterPerformance(),
        getAllAdjusters(),
      ]);
      return perf.map(p => ({
        ...p,
        adjusterName: adjList.find(a => a.id === p.adjusterId)?.name ?? "Unassigned",
      }));
    }),
  }),
});

export type AppRouter = typeof appRouter;

import type { Request, Response } from "express";
import type { User } from "../../drizzle/schema";
import { authenticateAdminRequest } from "./credentialAuth";

export interface TrpcContext {
  user: User | null;
  req: Request;
  res: Response;
}

/**
 * Build the tRPC request context. Authentication is credential-based:
 * we look for a valid admin_session cookie and resolve it to a User.
 * Unauthenticated requests get `user: null`.
 */
export async function createContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): Promise<TrpcContext> {
  let user: User | null = null;
  try {
    user = await authenticateAdminRequest(req);
  } catch {
    user = null;
  }
  return { user, req, res };
}

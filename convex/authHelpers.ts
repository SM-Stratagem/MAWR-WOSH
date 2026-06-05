import { QueryCtx, MutationCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { GenericId } from "convex/values";

export type Role = "customer" | "operator" | "admin" | "superadmin";
type UserRole = Role;

export async function getUserByClerkId(ctx: QueryCtx | MutationCtx, clerkId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .first();
}

export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized");
  }
  return identity;
}

export async function requireUserRole(
  ctx: QueryCtx | MutationCtx,
  allowedRoles: UserRole[]
) {
  const identity = await requireAuth(ctx);
  const user = await getUserByClerkId(ctx, identity.subject);

  if (!user || !allowedRoles.includes(user.role)) {
    throw new Error("Forbidden");
  }

  return { identity, user };
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  return requireUserRole(ctx, ["admin", "superadmin"]);
}

export async function requireAdminOrOperator(ctx: QueryCtx | MutationCtx) {
  return requireUserRole(ctx, ["admin", "superadmin", "operator"]);
}

export async function requireSuperAdmin(ctx: QueryCtx | MutationCtx) {
  return requireUserRole(ctx, ["superadmin"]);
}

export async function requireOwnership(
  ctx: QueryCtx | MutationCtx,
  userId: GenericId<"users">
) {
  const identity = await requireAuth(ctx);
  const currentUser = await getUserByClerkId(ctx, identity.subject);

  if (!currentUser || currentUser._id !== userId) {
    throw new Error("Forbidden: You can only access your own resources");
  }

  return currentUser;
}

export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  allowed: Role[]
): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!allowed.includes(user.role as Role)) {
    throw new Error(`Forbidden: requires one of ${allowed.join(", ")}`);
  }
  return user;
}

export const STAFF_ROLES: Role[] = ["operator", "admin", "superadmin"];
export const ADMIN_ROLES: Role[] = ["admin", "superadmin"];
export const SUPERADMIN_ONLY: Role[] = ["superadmin"];

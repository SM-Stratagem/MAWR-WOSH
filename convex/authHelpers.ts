import { QueryCtx, MutationCtx } from "./_generated/server";
import { GenericId } from "convex/values";

type UserRole = "customer" | "operator" | "admin" | "superadmin";

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

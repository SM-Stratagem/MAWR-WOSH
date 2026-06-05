import { v } from "convex/values";
import { MutationCtx, mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireRole, STAFF_ROLES, ADMIN_ROLES, SUPERADMIN_ONLY, getCurrentUser } from "./authHelpers";

async function upsertUserRecord(
  ctx: MutationCtx,
  args: {
    clerkId: string;
    email: string;
    name: string;
    phone?: string;
  }
) {
  const normalizedEmail = args.email.trim().toLowerCase();
  const normalizedName = args.name.trim() || normalizedEmail.split("@")[0];

  const existingByClerkId = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
    .first();

  if (existingByClerkId) {
    await ctx.db.patch(existingByClerkId._id, {
      email: normalizedEmail,
      name: normalizedName,
      phone: args.phone,
      lastSeenAt: Date.now(),
    });
    return existingByClerkId._id;
  }

  const existingByEmail = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
    .first();

  if (existingByEmail) {
    const prevClerkIds: string[] = existingByEmail.prevClerkIds || [];
    if (existingByEmail.clerkId !== args.clerkId && !prevClerkIds.includes(existingByEmail.clerkId)) {
      prevClerkIds.push(existingByEmail.clerkId);
    }

    await ctx.db.patch(existingByEmail._id, {
      clerkId: args.clerkId,
      prevClerkIds,
      email: normalizedEmail,
      name: normalizedName,
      phone: args.phone,
      lastSeenAt: Date.now(),
    });
    return existingByEmail._id;
  }

  const userId = await ctx.db.insert("users", {
    clerkId: args.clerkId,
    email: normalizedEmail,
    name: normalizedName,
    phone: args.phone,
    role: "customer",
    isActive: true,
    createdAt: Date.now(),
    lastSeenAt: Date.now(),
  });

  await ctx.db.insert("activityLogs", {
    actorUserId: userId,
    actorRole: "customer",
    entityType: "user",
    entityId: userId.toString(),
    action: "created",
    createdAt: Date.now(),
  });

  return userId;
}

export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

// Internal counterpart for use from HTTP actions / scheduler chains.
export const internalGetByClerkId = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

export const getCurrentUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const clerkId = identity.subject;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    return user;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").take(1000);
  },
});

export const adminListUsers = query({
  args: { searchQuery: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireRole(ctx, STAFF_ROLES);

    let users = await ctx.db.query("users").take(1000);

    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase();
      users = users.filter(
        (u) =>
          u.email.toLowerCase().includes(query) ||
          u.name.toLowerCase().includes(query)
      );
    }

    return users;
  },
});

export const adminListStaff = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, STAFF_ROLES);
    const all = await ctx.db.query("users").take(1000);
    return all.filter((u) => u.role !== "customer");
  },
});

/**
 * Invite a staff member by email.
 *
 * NOTE: The Clerk side of the invite is NOT wired in this phase. This mutation
 * only creates (or updates) the Convex user row with a placeholder
 * `pending:<email>` clerkId. The admin must separately invite the email in
 * Clerk; when the invitee first signs in, the existing upsertUserRecord flow
 * matches on email and reconciles the real Clerk subject onto this row
 * (preserving prevClerkIds for audit). Building a proper Clerk SDK invite is
 * tracked as future work.
 */
export const adminInviteStaff = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    role: v.union(
      v.literal("operator"),
      v.literal("admin"),
      v.literal("superadmin")
    ),
  },
  handler: async (ctx, args) => {
    // Only superadmin can mint a new superadmin; admin can invite operator/admin.
    const allowed = args.role === "superadmin" ? SUPERADMIN_ONLY : ADMIN_ROLES;
    const actor = await requireRole(ctx, allowed);

    const normalizedEmail = args.email.trim().toLowerCase();
    const normalizedName = args.name.trim() || normalizedEmail.split("@")[0];

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        role: args.role,
        name: normalizedName,
        isActive: true,
      });
      await ctx.db.insert("activityLogs", {
        actorUserId: actor._id,
        actorRole: actor.role,
        entityType: "user",
        entityId: existing._id.toString(),
        action: "staff_invited_existing",
        payload: JSON.stringify({ email: normalizedEmail, role: args.role }),
        createdAt: Date.now(),
      });
      return { userId: existing._id, action: "updated" as const };
    }

    const userId = await ctx.db.insert("users", {
      clerkId: `pending:${normalizedEmail}`,
      email: normalizedEmail,
      name: normalizedName,
      role: args.role,
      isActive: true,
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
    });
    await ctx.db.insert("activityLogs", {
      actorUserId: actor._id,
      actorRole: actor.role,
      entityType: "user",
      entityId: userId.toString(),
      action: "staff_invited",
      payload: JSON.stringify({ email: normalizedEmail, role: args.role }),
      createdAt: Date.now(),
    });
    return { userId, action: "created" as const };
  },
});

export const syncUserFromClerk = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await upsertUserRecord(ctx, args);
  },
});

export const ensureCurrentUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return await upsertUserRecord(ctx, {
      clerkId: identity.subject,
      email: args.email,
      name: args.name,
      phone: args.phone,
    });
  },
});

export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.optional(v.union(v.literal("customer"), v.literal("operator"), v.literal("admin"), v.literal("superadmin"))),
    isActive: v.optional(v.boolean()),
    defaultAddressId: v.optional(v.id("addresses")),
  },
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("User not found");

    const isSelf = actor._id === args.userId;
    const wantsRoleChange = args.role !== undefined && args.role !== target.role;

    if (wantsRoleChange) {
      // Only superadmin can change roles
      if (actor.role !== "superadmin") {
        throw new Error("Forbidden: only superadmin can change roles");
      }
    }
    if (!isSelf && !ADMIN_ROLES.includes(actor.role as any)) {
      throw new Error("Forbidden");
    }

    const { userId, ...updates } = args;
    await ctx.db.patch(userId, updates);

    if (wantsRoleChange) {
      await ctx.db.insert("activityLogs", {
        actorUserId: actor._id,
        actorRole: actor.role,
        entityType: "user",
        entityId: args.userId.toString(),
        action: "role_changed",
        payload: JSON.stringify({ from: target.role, to: args.role }),
        createdAt: Date.now(),
      });
    }

    await ctx.db.insert("activityLogs", {
      actorUserId: actor._id,
      actorRole: actor.role,
      entityType: "user",
      entityId: userId.toString(),
      action: "updated",
      payload: JSON.stringify(updates),
      createdAt: Date.now(),
    });
  },
});

export const seedAdmin = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("superadmin")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        role: args.role,
        isActive: true,
      });
      console.log(`[Seed Admin] Updated user ${args.email} to role: ${args.role}`);
      return existing._id;
    }

    const userId = await ctx.db.insert("users", {
      clerkId: `seed_${args.email}`,
      email: args.email,
      name: args.name,
      role: args.role,
      isActive: true,
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
    });

    await ctx.db.insert("activityLogs", {
      actorUserId: userId,
      actorRole: args.role,
      entityType: "user",
      entityId: userId.toString(),
      action: "seeded_admin",
      createdAt: Date.now(),
    });

    console.log(`[Seed Admin] Created admin user ${args.email} with role: ${args.role}`);
    return userId;
  },
});

export const createAdminWithClerkId = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("superadmin")),
  },
  handler: async (ctx, args) => {
    const existingByClerkId = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingByClerkId) {
      await ctx.db.patch(existingByClerkId._id, {
        role: args.role,
        isActive: true,
        email: args.email,
        name: args.name,
      });
      console.log(`[Create Admin] Updated existing user to role: ${args.role}`);
      return existingByClerkId._id;
    }

    const existingByEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingByEmail) {
      await ctx.db.patch(existingByEmail._id, {
        clerkId: args.clerkId,
        role: args.role,
        isActive: true,
        name: args.name,
      });
      console.log(`[Create Admin] Updated user by email to role: ${args.role}`);
      return existingByEmail._id;
    }

    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      role: args.role,
      isActive: true,
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
    });

    await ctx.db.insert("activityLogs", {
      actorUserId: userId,
      actorRole: args.role,
      entityType: "user",
      entityId: userId.toString(),
      action: "admin_created_with_clerk_id",
      createdAt: Date.now(),
    });

    console.log(`[Create Admin] Created admin user ${args.email} with Clerk ID: ${args.clerkId}`);
    return userId;
  },
});

/**
 * Cascade delete a user and their owned data.
 *
 * - Deletes cars and the bookingCars rows that reference them.
 * - Deletes addresses.
 * - Cancels subscriptions (preserves history rather than hard-deleting).
 * - Leaves bookings untouched for audit / financial history.
 *
 * Idempotent: missing user is a no-op.
 */
export const cascadeDeleteUser = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return { ok: true };

    // Cars + their booking-cars rows
    const cars = await ctx.db
      .query("cars")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();
    for (const c of cars) {
      const bcs = await ctx.db
        .query("bookingCars")
        .withIndex("by_car_id", (q) => q.eq("carId", c._id))
        .collect();
      for (const bc of bcs) await ctx.db.delete(bc._id);
      await ctx.db.delete(c._id);
    }

    // Addresses
    const addrs = await ctx.db
      .query("addresses")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();
    for (const a of addrs) await ctx.db.delete(a._id);

    // Subscriptions — cancel rather than delete (preserves history)
    const subs = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();
    for (const s of subs) {
      await ctx.db.patch(s._id, { status: "canceled", updatedAt: Date.now() });
    }

    // Bookings: preserve for audit/financial history. Patch nothing.

    // User
    await ctx.db.delete(args.userId);

    await ctx.db.insert("activityLogs", {
      entityType: "user",
      entityId: args.userId.toString(),
      action: "cascade_deleted",
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

export const deleteMyAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    await ctx.scheduler.runAfter(0, internal.users.cascadeDeleteUser, {
      userId: user._id,
    });
    return { ok: true };
  },
});

export const adminGetCustomerDetail = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRole(ctx, STAFF_ROLES);
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const cars = await ctx.db
      .query("cars")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();

    const addresses = await ctx.db
      .query("addresses")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50);

    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();

    const refunds = await ctx.db
      .query("refunds")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();

    // Enrich bookings with washType name
    const wtIds = Array.from(new Set(bookings.map((b) => b.washTypeId)));
    const wts = await Promise.all(wtIds.map((id) => ctx.db.get(id)));
    const wtMap = new Map(wts.filter((w) => w !== null).map((w) => [w!._id, w!]));

    const totalSpent = bookings
      .filter((b) => b.paymentStatus === "succeeded")
      .reduce((acc, b) => acc + (b.total ?? 0), 0);

    return {
      user,
      cars,
      addresses,
      bookings: bookings.map((b) => ({
        ...b,
        washType: wtMap.get(b.washTypeId) ?? null,
      })),
      subscriptions,
      refunds,
      totalSpent,
    };
  },
});

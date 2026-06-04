import { v } from "convex/values";
import { MutationCtx, mutation, query } from "./_generated/server";

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || (user.role !== "admin" && user.role !== "superadmin" && user.role !== "operator")) {
      throw new Error("Forbidden");
    }

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "superadmin")) {
      throw new Error("Forbidden");
    }

    const { userId, ...updates } = args;
    await ctx.db.patch(userId, updates);

    await ctx.db.insert("activityLogs", {
      actorUserId: adminUser._id,
      actorRole: adminUser.role,
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

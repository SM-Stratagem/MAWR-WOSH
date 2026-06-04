import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listWashTypes = query({
  args: {},
  handler: async (ctx) => {
    const washTypes = await ctx.db.query("washTypes").collect();
    return washTypes
      .filter((w) => w.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const listAllWashTypes = query({
  args: {},
  handler: async (ctx) => {
    const washTypes = await ctx.db.query("washTypes").collect();
    return washTypes.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const getWashType = query({
  args: { washTypeId: v.id("washTypes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.washTypeId);
  },
});

export const adminUpsertWashType = mutation({
  args: {
    washTypeId: v.optional(v.id("washTypes")),
    key: v.string(),
    name: v.string(),
    description: v.string(),
    basePrice: v.number(),
    currency: v.string(),
    durationMins: v.number(),
    imageUrl: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
    isActive: v.boolean(),
    sortOrder: v.number(),
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

    if (args.washTypeId) {
      const { washTypeId, ...updates } = args;
      await ctx.db.patch(washTypeId, updates);

      await ctx.db.insert("activityLogs", {
        actorUserId: adminUser._id,
        actorRole: adminUser.role,
        entityType: "washType",
        entityId: washTypeId.toString(),
        action: "updated",
        payload: JSON.stringify(updates),
        createdAt: Date.now(),
      });

      return washTypeId;
    } else {
      const existing = await ctx.db
        .query("washTypes")
        .withIndex("by_key", (q) => q.eq("key", args.key))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, args);
        return existing._id;
      }

      const id = await ctx.db.insert("washTypes", args);

      await ctx.db.insert("activityLogs", {
        actorUserId: adminUser._id,
        actorRole: adminUser.role,
        entityType: "washType",
        entityId: id.toString(),
        action: "created",
        createdAt: Date.now(),
      });

      return id;
    }
  },
});

export const adminDeleteWashType = mutation({
  args: { washTypeId: v.id("washTypes") },
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

    await ctx.db.patch(args.washTypeId, { isActive: false });

    await ctx.db.insert("activityLogs", {
      actorUserId: adminUser._id,
      actorRole: adminUser.role,
      entityType: "washType",
      entityId: args.washTypeId.toString(),
      action: "deleted",
      createdAt: Date.now(),
    });
  },
});

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole, ADMIN_ROLES } from "./authHelpers";

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
    const adminUser = await requireRole(ctx, ADMIN_ROLES);

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
    const adminUser = await requireRole(ctx, ADMIN_ROLES);

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

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole, STAFF_ROLES, SUPERADMIN_ONLY } from "./authHelpers";

export const getSetting = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    return setting?.value;
  },
});

export const getPublic = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const ALLOWED = new Set([
      "subscription_discount_pct",
      "default_service_fee_pct",
      "currency",
    ]);
    if (!ALLOWED.has(args.key)) return null;
    const row = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    return row?.value ?? null;
  },
});

export const listSettings = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, STAFF_ROLES);
    return await ctx.db.query("systemSettings").take(100);
  },
});

export const adminUpdateSystemSetting = mutation({
  args: {
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireRole(ctx, SUPERADMIN_ONLY);

    const existing = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedBy: adminUser._id,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("systemSettings", {
        key: args.key,
        value: args.value,
        updatedBy: adminUser._id,
        updatedAt: Date.now(),
      });
    }

    await ctx.db.insert("activityLogs", {
      actorUserId: adminUser._id,
      actorRole: adminUser.role,
      entityType: "systemSetting",
      entityId: args.key,
      action: "updated",
      payload: JSON.stringify({ value: args.value }),
      createdAt: Date.now(),
    });
  },
});

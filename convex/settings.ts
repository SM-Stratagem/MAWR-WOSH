import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

export const listSettings = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("systemSettings").collect();
  },
});

export const adminUpdateSystemSetting = mutation({
  args: {
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!adminUser || adminUser.role !== "superadmin") {
      throw new Error("Forbidden");
    }

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

export const seedDefaultSettings = mutation({
  args: {},
  handler: async (ctx) => {
    const defaults = [
      { key: "default_eta_min", value: "30" },
      { key: "default_eta_max", value: "45" },
      { key: "service_fee", value: "0" },
      { key: "currency", value: "AED" },
    ];

    for (const setting of defaults) {
      const existing = await ctx.db
        .query("systemSettings")
        .withIndex("by_key", (q) => q.eq("key", setting.key))
        .first();

      if (!existing) {
        await ctx.db.insert("systemSettings", {
          key: setting.key,
          value: setting.value,
          updatedAt: Date.now(),
        });
      }
    }
  },
});

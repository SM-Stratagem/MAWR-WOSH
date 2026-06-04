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
    return await ctx.db.query("systemSettings").take(100);
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

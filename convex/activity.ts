import { v } from "convex/values";
import { query } from "./_generated/server";

export const listActivityLogs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("activityLogs")
      .order("desc")
      .take(100);
  },
});

export const listActivityLogsByEntity = query({
  args: { entityType: v.string(), entityId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("activityLogs")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", args.entityType).eq("entityId", args.entityId)
      )
      .collect();
  },
});

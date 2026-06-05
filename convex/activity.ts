import { v } from "convex/values";
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireRole, STAFF_ROLES } from "./authHelpers";

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
      .take(100);
  },
});

/**
 * Admin-facing activity feed. Filters by entityType (and optionally entityId)
 * and enriches each row with the actor's display name.
 */
export const adminListActivity = query({
  args: {
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, STAFF_ROLES);
    const limit = Math.min(args.limit ?? 100, 200);

    let rows;
    if (args.entityType && args.entityId) {
      const entityType = args.entityType;
      const entityId = args.entityId;
      rows = await ctx.db
        .query("activityLogs")
        .withIndex("by_entity", (q) =>
          q.eq("entityType", entityType).eq("entityId", entityId)
        )
        .order("desc")
        .take(limit);
    } else if (args.entityType) {
      const entityType = args.entityType;
      rows = await ctx.db
        .query("activityLogs")
        .withIndex("by_entity", (q) => q.eq("entityType", entityType))
        .order("desc")
        .take(limit);
    } else {
      rows = await ctx.db
        .query("activityLogs")
        .withIndex("by_created_at")
        .order("desc")
        .take(limit);
    }

    // Enrich actor names
    const userIds = Array.from(
      new Set(rows.map((r) => r.actorUserId).filter(Boolean) as Id<"users">[])
    );
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u!]));

    return rows.map((r) => ({
      ...r,
      actor: r.actorUserId ? (userMap.get(r.actorUserId)?.name ?? null) : null,
    }));
  },
});

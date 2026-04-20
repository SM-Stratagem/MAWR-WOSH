import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listTeams = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || (user.role !== "admin" && user.role !== "superadmin" && user.role !== "operator")) {
      throw new Error("Forbidden");
    }

    return await ctx.db.query("teams").collect();
  },
});

export const adminListTeams = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "superadmin" && adminUser.role !== "operator")) {
      throw new Error("Forbidden");
    }

    return await ctx.db.query("teams").collect();
  },
});

export const adminUpsertTeam = mutation({
  args: {
    teamId: v.optional(v.id("teams")),
    name: v.string(),
    status: v.union(v.literal("available"), v.literal("busy"), v.literal("offline")),
    currentLat: v.optional(v.number()),
    currentLng: v.optional(v.number()),
    isActive: v.boolean(),
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

    if (args.teamId) {
      const { teamId, ...updates } = args;
      await ctx.db.patch(teamId, updates);

      await ctx.db.insert("activityLogs", {
        actorUserId: adminUser._id,
        actorRole: adminUser.role,
        entityType: "team",
        entityId: teamId.toString(),
        action: "updated",
        payload: JSON.stringify(updates),
        createdAt: Date.now(),
      });

      return teamId;
    } else {
      const id = await ctx.db.insert("teams", {
        name: args.name,
        status: args.status,
        currentLat: args.currentLat,
        currentLng: args.currentLng,
        lastLocationAt: Date.now(),
        isActive: args.isActive,
      });

      await ctx.db.insert("activityLogs", {
        actorUserId: adminUser._id,
        actorRole: adminUser.role,
        entityType: "team",
        entityId: id.toString(),
        action: "created",
        createdAt: Date.now(),
      });

      return id;
    }
  },
});

export const adminDeleteTeam = mutation({
  args: { teamId: v.id("teams") },
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

    await ctx.db.patch(args.teamId, { isActive: false });

    await ctx.db.insert("activityLogs", {
      actorUserId: adminUser._id,
      actorRole: adminUser.role,
      entityType: "team",
      entityId: args.teamId.toString(),
      action: "deleted",
      createdAt: Date.now(),
    });
  },
});

export const recordTeamLocationUpdate = mutation({
  args: {
    teamId: v.id("teams"),
    latitude: v.number(),
    longitude: v.number(),
  },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Team not found");

    await ctx.db.patch(args.teamId, {
      currentLat: args.latitude,
      currentLng: args.longitude,
      lastLocationAt: Date.now(),
    });
  },
});

export const seedTeams = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("teams").first();
    if (existing) return;

    await ctx.db.insert("teams", {
      name: "Team Alpha",
      status: "available",
      isActive: true,
    });

    await ctx.db.insert("teams", {
      name: "Team Beta",
      status: "available",
      isActive: true,
    });

    await ctx.db.insert("teams", {
      name: "Team Gamma",
      status: "offline",
      isActive: true,
    });
  },
});

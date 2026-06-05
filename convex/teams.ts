import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { normalizePhone } from "./phone";
import { requireRole, STAFF_ROLES, ADMIN_ROLES } from "./authHelpers";

export const listTeams = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, STAFF_ROLES);
    return await ctx.db.query("teams").take(100);
  },
});

export const adminListTeams = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, STAFF_ROLES);
    const allTeams = await ctx.db.query("teams").take(100);
    return allTeams.filter((t) => t.isActive !== false);
  },
});

export const adminUpsertTeam = mutation({
  args: {
    teamId: v.optional(v.id("teams")),
    name: v.string(),
    phone: v.string(),
    pin: v.optional(v.string()),
    status: v.union(v.literal("available"), v.literal("busy"), v.literal("offline")),
    currentLat: v.optional(v.number()),
    currentLng: v.optional(v.number()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireRole(ctx, ADMIN_ROLES);

    const normalizedPhone = normalizePhone(args.phone);

    if (args.teamId) {
      const { teamId, pin, ...updates } = args;
      const updatesWithPhone: any = { ...updates, phone: normalizedPhone };

      if (pin) {
        updatesWithPhone.pinHash = await hashPin(pin);
      }

      await ctx.db.patch(teamId, updatesWithPhone);

      await ctx.db.insert("activityLogs", {
        actorUserId: adminUser._id,
        actorRole: adminUser.role,
        entityType: "team",
        entityId: teamId.toString(),
        action: "updated",
        payload: JSON.stringify({ ...updatesWithPhone, pinHash: "[REDACTED]" }),
        createdAt: Date.now(),
      });

      return teamId;
    } else {
      if (!args.pin) {
        throw new Error("PIN is required when creating a new team");
      }
      const id = await ctx.db.insert("teams", {
        name: args.name,
        phone: normalizedPhone,
        pinHash: await hashPin(args.pin),
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
    const adminUser = await requireRole(ctx, ADMIN_ROLES);

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

export const teamUpdateLocation = mutation({
  args: {
    sessionId: v.string(),
    latitude: v.number(),
    longitude: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("teamSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Unauthorized");
    }

    const team = await ctx.db.get(session.teamId);
    if (!team || !team.isActive) throw new Error("Team not found");

    await ctx.db.patch(session.teamId, {
      currentLat: args.latitude,
      currentLng: args.longitude,
      lastLocationAt: Date.now(),
    });

    return { success: true };
  },
});

export const adminLiveTeams = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, STAFF_ROLES);

    const teams = await ctx.db.query("teams").take(200);
    return teams
      .filter((t) => t.isActive)
      .map((t) => ({
        _id: t._id,
        name: t.name,
        status: t.status,
        currentLat: t.currentLat ?? null,
        currentLng: t.currentLng ?? null,
        lastLocationAt: t.lastLocationAt ?? null,
      }));
  },
});

export const teamSetAvailability = mutation({
  args: {
    sessionId: v.string(),
    status: v.union(v.literal("available"), v.literal("offline")),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("teamSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Unauthorized");
    }

    const team = await ctx.db.get(session.teamId);
    if (!team || !team.isActive) {
      throw new Error("Team not found");
    }

    // Don't allow going offline if currently busy
    if (args.status === "offline" && team.status === "busy") {
      throw new Error("Cannot go offline while on an active booking");
    }

    await ctx.db.patch(session.teamId, { status: args.status });

    await ctx.db.insert("activityLogs", {
      actorRole: "team",
      entityType: "team",
      entityId: session.teamId.toString(),
      action: `status_changed_to_${args.status}`,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const teamGetProfile = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("teamSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session || session.expiresAt < Date.now()) return null;

    const team = await ctx.db.get(session.teamId);
    if (!team || !team.isActive) return null;

    return {
      _id: team._id,
      name: team.name,
      phone: team.phone,
      status: team.status,
      isActive: team.isActive,
    };
  },
});

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + "wosh-team-secret-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

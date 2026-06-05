import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { normalizePhone } from "./phone";
import { requireRole, STAFF_ROLES, ADMIN_ROLES } from "./authHelpers";
import { hashPin } from "./pinHash";

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
        const { hash, salt } = await hashPin(pin);
        updatesWithPhone.pinHash = hash;
        updatesWithPhone.pinSalt = salt;
      }

      await ctx.db.patch(teamId, updatesWithPhone);

      await ctx.db.insert("activityLogs", {
        actorUserId: adminUser._id,
        actorRole: adminUser.role,
        entityType: "team",
        entityId: teamId.toString(),
        action: "updated",
        payload: JSON.stringify({ ...updatesWithPhone, pinHash: "[REDACTED]", pinSalt: "[REDACTED]" }),
        createdAt: Date.now(),
      });

      return teamId;
    } else {
      if (!args.pin) {
        throw new Error("PIN is required when creating a new team");
      }
      const { hash, salt } = await hashPin(args.pin);
      const id = await ctx.db.insert("teams", {
        name: args.name,
        phone: normalizedPhone,
        pinHash: hash,
        pinSalt: salt,
        status: args.status,
        isActive: args.isActive,
      });

      // Seed the location row if the admin provided initial coordinates.
      if (
        typeof args.currentLat === "number" &&
        typeof args.currentLng === "number"
      ) {
        await upsertTeamLocation(ctx, id, args.currentLat, args.currentLng);
      }

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

async function upsertTeamLocation(
  ctx: any,
  teamId: any,
  lat: number,
  lng: number,
) {
  const existing = await ctx.db
    .query("teamLocations")
    .withIndex("by_team_id", (q: any) => q.eq("teamId", teamId))
    .first();
  if (existing) {
    await ctx.db.patch(existing._id, {
      currentLat: lat,
      currentLng: lng,
      lastLocationAt: Date.now(),
    });
  } else {
    await ctx.db.insert("teamLocations", {
      teamId,
      currentLat: lat,
      currentLng: lng,
      lastLocationAt: Date.now(),
    });
  }
}

export const recordTeamLocationUpdate = mutation({
  args: {
    teamId: v.id("teams"),
    latitude: v.number(),
    longitude: v.number(),
  },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Team not found");

    await upsertTeamLocation(ctx, args.teamId, args.latitude, args.longitude);
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

    await upsertTeamLocation(ctx, session.teamId, args.latitude, args.longitude);

    return { success: true };
  },
});

export const adminLiveTeams = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, STAFF_ROLES);

    const teams = await ctx.db.query("teams").take(200);
    const active = teams.filter((t) => t.isActive);
    return await Promise.all(
      active.map(async (t) => {
        const loc = await ctx.db
          .query("teamLocations")
          .withIndex("by_team_id", (q) => q.eq("teamId", t._id))
          .first();
        return {
          _id: t._id,
          name: t.name,
          status: t.status,
          currentLat: loc?.currentLat ?? t.currentLat ?? null,
          currentLng: loc?.currentLng ?? t.currentLng ?? null,
          lastLocationAt: loc?.lastLocationAt ?? t.lastLocationAt ?? null,
        };
      }),
    );
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

export const adminResetTeamPin = mutation({
  args: {
    teamId: v.id("teams"),
    newPin: v.string(),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireRole(ctx, ADMIN_ROLES);

    if (!args.newPin || args.newPin.length < 4 || args.newPin.length > 6) {
      throw new Error("PIN must be 4-6 digits");
    }

    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Team not found");

    const { hash, salt } = await hashPin(args.newPin);
    await ctx.db.patch(args.teamId, { pinHash: hash, pinSalt: salt });

    // Revoke all existing sessions for this team
    const sessions = await ctx.db
      .query("teamSessions")
      .withIndex("by_team_id", (q) => q.eq("teamId", args.teamId))
      .collect();
    for (const s of sessions) {
      await ctx.db.delete(s._id);
    }

    await ctx.db.insert("activityLogs", {
      actorUserId: adminUser._id,
      actorRole: adminUser.role,
      entityType: "team",
      entityId: args.teamId.toString(),
      action: "pin_reset",
      payload: JSON.stringify({ revokedSessions: sessions.length }),
      createdAt: Date.now(),
    });

    return { success: true, revokedSessions: sessions.length };
  },
});

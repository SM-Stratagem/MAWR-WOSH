import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { normalizePhone } from "./phone";

export const login = mutation({
  args: {
    phone: v.string(),
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    const phone = normalizePhone(args.phone);
    const pin = args.pin;

    if (!phone || phone.length < 8) {
      throw new Error("Invalid phone number");
    }

    if (!pin || pin.length < 4 || pin.length > 6) {
      throw new Error("PIN must be 4-6 digits");
    }

    const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
    const MAX_FAILED_ATTEMPTS = 5;
    const windowStart = Date.now() - RATE_LIMIT_WINDOW_MS;

    const recentAttempts = await ctx.db
      .query("teamLoginAttempts")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .collect();
    const recentFailed = recentAttempts.filter(
      (a) => !a.success && a.attemptedAt >= windowStart,
    );
    if (recentFailed.length >= MAX_FAILED_ATTEMPTS) {
      throw new Error("Too many failed attempts. Try again in 15 minutes.");
    }

    const recordAttempt = async (success: boolean) => {
      await ctx.db.insert("teamLoginAttempts", {
        phone,
        attemptedAt: Date.now(),
        success,
      });
    };

    const team = await ctx.db
      .query("teams")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .first();

    if (!team) {
      await recordAttempt(false);
      throw new Error("Invalid phone or PIN");
    }

    if (!team.pinHash) {
      throw new Error("Team PIN not configured. Contact admin.");
    }

    if (!team.isActive) {
      throw new Error("Team account is deactivated");
    }

    const pinHash = await hashPin(pin);
    if (team.pinHash !== pinHash) {
      await recordAttempt(false);
      throw new Error("Invalid phone or PIN");
    }

    await recordAttempt(true);

    for (const old of recentAttempts) {
      if (old.attemptedAt < windowStart) {
        await ctx.db.delete(old._id);
      }
    }

    const sessionId = crypto.randomUUID();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    await ctx.db.insert("teamSessions", {
      teamId: team._id,
      sessionId,
      expiresAt,
    });

    return {
      sessionId,
      teamId: team._id,
      name: team.name,
      expiresAt,
    };
  },
});

export const logout = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("teamSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }
  },
});

export const getMyTeam = query({
  args: {
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sessionId = args.sessionId;
    if (!sessionId) {
      return null;
    }

    const session = await ctx.db
      .query("teamSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", sessionId))
      .first();

    if (!session) {
      return null;
    }

    if (session.expiresAt < Date.now()) {
      return { expired: true, teamId: session.teamId };
    }

    const team = await ctx.db.get(session.teamId);
    if (!team || !team.isActive) {
      return { expired: true, teamId: session.teamId };
    }

    return {
      _id: team._id,
      name: team.name,
      phone: team.phone,
      status: team.status,
    };
  },
});

export const cleanupExpiredSessions = mutation({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db.query("teamSessions").collect();
    const now = Date.now();

    for (const session of sessions) {
      if (session.expiresAt < now) {
        await ctx.db.delete(session._id);
      }
    }
  },
});

export const resetPin = mutation({
  args: {
    teamId: v.id("teams"),
    newPin: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found in system");
    }

    if (user.role !== "admin" && user.role !== "superadmin" && user.role !== "operator") {
      throw new Error("Unauthorized: Admin access required");
    }

    const pinHash = await hashPin(args.newPin);
    await ctx.db.patch(args.teamId, { pinHash });
    return { success: true };
  },
});

export const adminUpdateTeamPin = mutation({
  args: {
    teamId: v.id("teams"),
    phone: v.string(),
    newPinHash: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.teamId, {
      phone: args.phone,
      pinHash: args.newPinHash,
    });

    // Revoke all existing sessions for this team
    const sessions = await ctx.db
      .query("teamSessions")
      .filter((q) => q.eq(q.field("teamId"), args.teamId))
      .collect();

    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }
  },
});

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + "wosh-team-secret-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPinPublic(pin: string): Promise<string> {
  return hashPin(pin);
}

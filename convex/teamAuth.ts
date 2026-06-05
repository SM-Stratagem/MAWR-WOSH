import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { normalizePhone } from "./phone";
import { hashPin, verifyPin } from "./pinHash";

/**
 * Legacy PIN verifier (SHA-256 + global salt).
 *
 * TODO: Remove once all teams have reset to bcrypt PINs.
 *
 * Migration plan:
 *   1. Operators reset PINs via adminResetTeamPin (writes bcrypt hash + salt).
 *   2. Once teamSessions usage and login analytics confirm 100% of active
 *      teams are on bcrypt (team.pinHash starts with "$2" AND team.pinSalt
 *      is defined), drop this helper and remove the back-compat branch in
 *      `login` below.
 */
async function legacyHashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + "wosh-team-secret-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const SESSION_TTL_MS = 1000 * 60 * 60 * 24; // 24h

export const login = mutation({
  args: {
    phone: v.string(),
    pin: v.string(),
    deviceLabel: v.optional(v.string()),
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

    // Back-compat: bcrypt hashes start with "$2"; legacy SHA-256 hashes are
    // hex-only. If pinSalt is set or hash looks like bcrypt, verify with
    // bcrypt; otherwise fall through to legacy SHA-256 verification.
    let pinOk = false;
    if (team.pinHash.startsWith("$2")) {
      pinOk = await verifyPin(pin, team.pinHash);
    } else {
      // Legacy path — should be migrated via adminResetTeamPin ASAP.
      const legacy = await legacyHashPin(pin);
      pinOk = team.pinHash === legacy;
    }

    if (!pinOk) {
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
    const expiresAt = Date.now() + SESSION_TTL_MS;

    await ctx.db.insert("teamSessions", {
      teamId: team._id,
      sessionId,
      expiresAt,
      deviceLabel: args.deviceLabel,
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
    const now = Date.now();
    const expired = await ctx.db
      .query("teamSessions")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", now))
      .collect();
    for (const s of expired) await ctx.db.delete(s._id);
    return { deleted: expired.length };
  },
});

export const listMySessions = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("teamSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (!session || session.expiresAt < Date.now()) throw new Error("Unauthorized");
    return await ctx.db
      .query("teamSessions")
      .withIndex("by_team_id", (q) => q.eq("teamId", session.teamId))
      .collect();
  },
});

export const revokeOtherSessions = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("teamSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (!session || session.expiresAt < Date.now()) throw new Error("Unauthorized");
    const all = await ctx.db
      .query("teamSessions")
      .withIndex("by_team_id", (q) => q.eq("teamId", session.teamId))
      .collect();
    let revoked = 0;
    for (const s of all) {
      if (s._id !== session._id) {
        await ctx.db.delete(s._id);
        revoked++;
      }
    }
    return { revoked };
  },
});

/**
 * @deprecated Use adminResetTeamPin (in teams.ts) instead.
 * Kept for back-compat with admin UI; routes to the new bcrypt-based flow.
 */
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

    return { success: true };
  },
});

/**
 * @deprecated Use adminResetTeamPin instead. Accepts a pre-hashed PIN, which
 * the new bcrypt flow can't support — kept only so admin clients that already
 * use it don't crash.
 */
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
      .withIndex("by_team_id", (q) => q.eq("teamId", args.teamId))
      .collect();

    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }
  },
});

/**
 * @deprecated Exposed legacy SHA-256 hasher. Do not use for new code; call
 * `hashPin` from `pinHash.ts` instead. Kept for any external scripts that
 * may import it; remove after audit.
 */
export async function hashPinPublic(pin: string): Promise<string> {
  return legacyHashPin(pin);
}

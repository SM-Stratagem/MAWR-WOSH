import { internalMutation, query } from "./_generated/server";
import { ADMIN_ROLES, STAFF_ROLES, requireRole } from "./authHelpers";

type Snapshot = {
  bookings: { total: number; byStatus: Record<string, number> };
  revenue: { totalAed: number; last30dAed: number };
  subscriptions: { active: number; paused: number; canceled: number };
  users: { customers: number; staff: number };
  teams: { available: number; busy: number; offline: number };
  computedAt: number;
};

export const computeDashboardSnapshot = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const cutoff30d = now - 30 * 24 * 60 * 60 * 1000;

    const bookings = await ctx.db.query("bookings").collect();
    const byStatus: Record<string, number> = {};
    let totalAed = 0;
    let last30dAed = 0;
    for (const b of bookings) {
      byStatus[b.status] = (byStatus[b.status] ?? 0) + 1;
      if (b.paymentStatus === "succeeded") {
        totalAed += b.total ?? 0;
        if (b._creationTime >= cutoff30d) last30dAed += b.total ?? 0;
      }
    }

    const subs = await ctx.db.query("subscriptions").collect();
    const subCounts = { active: 0, paused: 0, canceled: 0 };
    for (const s of subs) {
      if (s.status in subCounts) (subCounts as any)[s.status]++;
    }

    const users = await ctx.db.query("users").collect();
    let customers = 0;
    let staff = 0;
    for (const u of users) {
      if (u.role === "customer") customers++;
      else staff++;
    }

    const teams = await ctx.db.query("teams").collect();
    const teamCounts = { available: 0, busy: 0, offline: 0 };
    for (const t of teams) {
      if (t.status in teamCounts) (teamCounts as any)[t.status]++;
    }

    const snap: Snapshot = {
      bookings: { total: bookings.length, byStatus },
      revenue: { totalAed, last30dAed },
      subscriptions: subCounts,
      users: { customers, staff },
      teams: teamCounts,
      computedAt: now,
    };

    // Keep only the latest one — delete older
    const previous = await ctx.db.query("dashboardSnapshots").collect();
    for (const p of previous) await ctx.db.delete(p._id);
    await ctx.db.insert("dashboardSnapshots", {
      computedAt: now,
      data: JSON.stringify(snap),
    });

    return { ok: true };
  },
});

export const getLatestSnapshot = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ADMIN_ROLES);
    const row = await ctx.db
      .query("dashboardSnapshots")
      .withIndex("by_computed_at")
      .order("desc")
      .first();
    if (!row) return null;
    return JSON.parse(row.data) as Snapshot;
  },
});

/**
 * Live operational health metrics. Cheap aggregates over current state for the
 * /dashboard/health page. Computes inline rather than from the snapshot so the
 * "stuck > 1h" and "paymentFailed (24h)" counters stay current between snapshots.
 */
export const adminHealthMetrics = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, STAFF_ROLES);
    const now = Date.now();
    const cutoff24h = now - 24 * 60 * 60 * 1000;
    const cutoff1h = now - 60 * 60 * 1000;

    const bookings = await ctx.db.query("bookings").collect();
    const last24h = bookings.filter((b) => b._creationTime >= cutoff24h);
    const completed24h = last24h.filter((b) => b.status === "completed").length;
    const failed24h = last24h.filter((b) => b.paymentStatus === "failed").length;
    const stuckAssigned = bookings.filter(
      (b) => b.status === "team_assigned" && b.updatedAt < cutoff1h
    ).length;

    const teams = await ctx.db.query("teams").collect();
    const teamsByStatus = { available: 0, busy: 0, offline: 0 };
    for (const t of teams) {
      if (t.status in teamsByStatus) (teamsByStatus as any)[t.status]++;
    }

    return {
      bookings24h: last24h.length,
      completed24h,
      paymentFailed24h: failed24h,
      stuckAssigned1h: stuckAssigned,
      teams: teamsByStatus,
      computedAt: now,
    };
  },
});

import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

export function isWithinHour(a: number | undefined, b: number | undefined): boolean {
  if (!a || !b) return false;
  return Math.abs(a - b) <= 60 * 60 * 1000;
}

/**
 * Picks the closest available team that isn't already busy at the same time window
 * (±1h overlap on scheduledFor). Returns null if no team qualifies.
 */
export async function selectClosestAvailableTeam(
  ctx: QueryCtx | MutationCtx,
  pickup: { lat: number; lng: number },
  scheduledFor: number | undefined,
  opts: { maxConcurrent?: number } = {}
): Promise<{ teamId: Id<"teams">; distanceKm: number } | null> {
  const maxConcurrent = opts.maxConcurrent ?? 2;

  const teams = await ctx.db
    .query("teams")
    .withIndex("by_status", (q) => q.eq("status", "available"))
    .collect();

  let best: { id: Id<"teams">; dist: number } | null = null;

  for (const team of teams) {
    if (!team.isActive) continue;

    // Location from the split-out teamLocations table (preferred).
    let lat: number | undefined;
    let lng: number | undefined;
    const loc = await ctx.db
      .query("teamLocations")
      .withIndex("by_team_id", (q) => q.eq("teamId", team._id))
      .first();
    if (loc) {
      lat = loc.currentLat;
      lng = loc.currentLng;
    } else if ((team as any).currentLat != null && (team as any).currentLng != null) {
      // Legacy fallback until 3.2 migration completes
      lat = (team as any).currentLat;
      lng = (team as any).currentLng;
    } else {
      continue;
    }

    if (scheduledFor) {
      const teamBookings = await ctx.db
        .query("bookings")
        .withIndex("by_assigned_team", (q) => q.eq("assignedTeamId", team._id))
        .collect();
      const overlapping = teamBookings.filter((b) =>
        isWithinHour(b.scheduledFor, scheduledFor)
      ).length;
      if (overlapping >= maxConcurrent) continue;
    }

    const d = haversineKm(pickup, { lat: lat!, lng: lng! });
    if (!best || d < best.dist) best = { id: team._id, dist: d };
  }

  return best ? { teamId: best.id, distanceKm: best.dist } : null;
}

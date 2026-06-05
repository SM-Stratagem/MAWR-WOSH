import { v } from "convex/values";
import { query } from "./_generated/server";

const WINDOW_CONFIG = {
  morning: { start: 8, end: 12, label: "Morning (8 AM - 12 PM)" },
  afternoon: { start: 12, end: 16, label: "Afternoon (12 PM - 4 PM)" },
  evening: { start: 16, end: 20, label: "Evening (4 PM - 8 PM)" },
};

const MAX_BOOKINGS_PER_WINDOW = 3;
const WINDOW_DURATION_HOURS = 4;
const WASH_DURATION_MINS = 35;

// Status set used for window-capacity counting. We hit each status index in
// parallel so we never see a "canceled"/"completed"/"draft" booking that we'd
// just discard. Splitting like this is still cheap because each per-status
// list is small relative to the full table.
const CAPACITY_STATUSES = [
  "confirmed",
  "team_assigned",
  "on_the_way",
  "arrived",
  "washing_in_progress",
] as const;

async function fetchCapacityBookings(ctx: any) {
  const lists = await Promise.all(
    CAPACITY_STATUSES.map((status) =>
      ctx.db
        .query("bookings")
        .withIndex("by_status", (q: any) => q.eq("status", status))
        .take(500),
    ),
  );
  return lists.flat();
}

export const getAvailableWindows = query({
  args: {
    date: v.number(),
  },
  handler: async (ctx, args) => {
    const date = new Date(args.date);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const windows = ["morning", "afternoon", "evening"] as const;
    const result: Record<string, { available: boolean; bookingsCount: number; label: string }> = {};

    const allBookings = await fetchCapacityBookings(ctx);

    for (const window of windows) {
      const windowStart = new Date(startOfDay);
      windowStart.setHours(WINDOW_CONFIG[window].start, 0, 0, 0);
      const windowEnd = new Date(startOfDay);
      windowEnd.setHours(WINDOW_CONFIG[window].end, 0, 0, 0);

      // Filter bookings manually to handle null scheduledFor
      const confirmedOrAssigned = allBookings.filter((b) => {
        if (!b.scheduledFor) return false;
        return b.scheduledFor >= windowStart.getTime() &&
               b.scheduledFor < windowEnd.getTime() &&
               b.scheduledFor >= startOfDay.getTime() &&
               b.scheduledFor < endOfDay.getTime();
      });

      result[window] = {
        available: confirmedOrAssigned.length < MAX_BOOKINGS_PER_WINDOW,
        bookingsCount: confirmedOrAssigned.length,
        label: WINDOW_CONFIG[window].label,
      };
    }

    return result;
  },
});

export const getWindowsForDateRange = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const windows = ["morning", "afternoon", "evening"] as const;
    const result: Record<string, Record<string, { available: boolean; bookingsCount: number }>> = {};

    const allBookings = await fetchCapacityBookings(ctx);

    const current = new Date(args.startDate);
    while (current <= new Date(args.endDate)) {
      const dateKey = current.toISOString().split("T")[0];
      result[dateKey] = {};

      const startOfDay = new Date(current);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(current);
      endOfDay.setHours(23, 59, 59, 999);

      for (const window of windows) {
        const windowStart = new Date(startOfDay);
        windowStart.setHours(WINDOW_CONFIG[window].start, 0, 0, 0);
        const windowEnd = new Date(startOfDay);
        windowEnd.setHours(WINDOW_CONFIG[window].end, 0, 0, 0);

        const confirmedOrAssigned = allBookings.filter((b) => {
          if (!b.scheduledFor) return false;
          return b.scheduledFor >= windowStart.getTime() &&
                 b.scheduledFor < windowEnd.getTime() &&
                 b.scheduledFor >= startOfDay.getTime() &&
                 b.scheduledFor < endOfDay.getTime();
        });

        result[dateKey][window] = {
          available: confirmedOrAssigned.length < MAX_BOOKINGS_PER_WINDOW,
          bookingsCount: confirmedOrAssigned.length,
        };
      }

      current.setDate(current.getDate() + 1);
    }

    return result;
  },
});

export function getWindowTimeRange(
  date: Date,
  window: "morning" | "afternoon" | "evening"
): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(WINDOW_CONFIG[window].start, 0, 0, 0);

  const end = new Date(date);
  end.setHours(WINDOW_CONFIG[window].end, 0, 0, 0);

  return { start, end };
}

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

    // Fetch all bookings and filter manually to handle null scheduledFor
    const allBookings = await ctx.db.query("bookings").take(500);

    for (const window of windows) {
      const windowStart = new Date(startOfDay);
      windowStart.setHours(WINDOW_CONFIG[window].start, 0, 0, 0);
      const windowEnd = new Date(startOfDay);
      windowEnd.setHours(WINDOW_CONFIG[window].end, 0, 0, 0);

      // Filter bookings manually to handle null scheduledFor
      const bookingsInWindow = allBookings.filter((b) => {
        if (!b.scheduledFor) return false;
        if (b.status === "canceled" || b.status === "completed") return false;
        // Check if scheduledFor falls within the window and matches the date
        return b.scheduledFor >= windowStart.getTime() && 
               b.scheduledFor < windowEnd.getTime() &&
               b.scheduledFor >= startOfDay.getTime() &&
               b.scheduledFor < endOfDay.getTime();
      });

      const confirmedOrAssigned = bookingsInWindow.filter((b) =>
        ["confirmed", "team_assigned", "on_the_way", "arrived", "washing_in_progress"].includes(b.status)
      );

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

    // Fetch all bookings once
    const allBookings = await ctx.db.query("bookings").take(500);

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

        // Filter manually to handle null scheduledFor
        const bookingsInWindow = allBookings.filter((b) => {
          if (!b.scheduledFor) return false;
          if (b.status === "canceled" || b.status === "completed") return false;
          return b.scheduledFor >= windowStart.getTime() && 
                 b.scheduledFor < windowEnd.getTime() &&
                 b.scheduledFor >= startOfDay.getTime() &&
                 b.scheduledFor < endOfDay.getTime();
        });

        const confirmedOrAssigned = bookingsInWindow.filter((b) =>
          ["confirmed", "team_assigned", "on_the_way", "arrived", "washing_in_progress"].includes(b.status)
        );

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

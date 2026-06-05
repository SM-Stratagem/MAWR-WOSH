import { v } from "convex/values";
import { mutation } from "./_generated/server";

const REQUIRED_CONFIRMATION = "WIPE-ALL-DATA-I-UNDERSTAND";

export const clearAllData = mutation({
  args: {
    confirmation: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "superadmin") {
      throw new Error("Only superadmins can clear the database");
    }

    if (args.confirmation !== REQUIRED_CONFIRMATION) {
      throw new Error(
        `Confirmation phrase required: pass "${REQUIRED_CONFIRMATION}" to proceed.`,
      );
    }

    const tables = [
      "activityLogs",
      "bookingAssignments",
      "bookingPhotos",
      "bookingCars",
      "bookings",
      "subscriptions",
      "teamSessions",
      "teamLoginAttempts",
      "teams",
      "cars",
      "addresses",
      "washTypes",
      "systemSettings",
      "refunds",
      "users",
    ];

    let totalDeleted = 0;

    for (const table of tables) {
      const records = await ctx.db.query(table as any).collect();
      for (const record of records) {
        await ctx.db.delete(record._id);
        totalDeleted++;
      }
    }

    return { success: true, deleted: totalDeleted };
  },
});

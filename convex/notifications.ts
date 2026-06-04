import { v } from "convex/values";
import { mutation } from "./_generated/server";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

async function sendPushNotification(token: string, title: string, body: string, data?: Record<string, string>) {
  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: token,
        title,
        body,
        data,
        sound: "default",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[Push] Failed to send to ${token}:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Push] Error:", error);
    return false;
  }
}

export const storePushToken = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, { pushToken: args.token });
    return true;
  },
});

export const storeTeamPushToken = mutation({
  args: {
    teamId: v.id("teams"),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.teamId, { pushToken: args.token });
    return true;
  },
});

export const storeTeamPushTokenBySession = mutation({
  args: {
    sessionId: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("teamSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Unauthorized");
    }
    await ctx.db.patch(session.teamId, { pushToken: args.token });
    return true;
  },
});

export const sendBookingConfirmedPush = mutation({
  args: {
    userId: v.id("users"),
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.pushToken) {
      console.log(`[Push] No token for user ${args.userId}`);
      return false;
    }

    return await sendPushNotification(
      user.pushToken,
      "Booking Confirmed!",
      `Your wash booking has been confirmed.`,
      { bookingId: args.bookingId, type: "booking_confirmed" }
    );
  },
});

export const sendTeamAssignedPush = mutation({
  args: {
    userId: v.id("users"),
    bookingId: v.id("bookings"),
    teamName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.pushToken) {
      console.log(`[Push] No token for user ${args.userId}`);
      return false;
    }

    return await sendPushNotification(
      user.pushToken,
      "Team Assigned!",
      `${args.teamName} will be handling your wash.`,
      { bookingId: args.bookingId, type: "team_assigned" }
    );
  },
});

export const sendStatusUpdatePush = mutation({
  args: {
    userId: v.id("users"),
    bookingId: v.id("bookings"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.pushToken) {
      console.log(`[Push] No token for user ${args.userId}`);
      return false;
    }

    const statusConfig: Record<string, { title: string; body: string }> = {
      on_the_way: { title: "Team On The Way!", body: "is on the way to your location" },
      arrived: { title: "Team Arrived!", body: "has arrived at your location" },
      washing_in_progress: { title: "Washing Started!", body: "has started washing your car" },
      completed: { title: "Wash Complete!", body: "has completed your wash!" },
    };

    const config = statusConfig[args.status] || { title: "Booking Update", body: `status changed to ${args.status}` };

    return await sendPushNotification(
      user.pushToken,
      config.title,
      `Your wash booking ${config.body}`,
      { bookingId: args.bookingId, type: `status_${args.status}` }
    );
  },
});

export const sendTeamNewBookingPush = mutation({
  args: {
    teamId: v.id("teams"),
    bookingId: v.id("bookings"),
    customerName: v.string(),
    address: v.string(),
    window: v.string(),
  },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team?.pushToken) {
      console.log(`[Push] No token for team ${args.teamId}`);
      return false;
    }

    const windowLabels: Record<string, string> = {
      morning: "Morning (8 AM - 12 PM)",
      afternoon: "Afternoon (12 PM - 4 PM)",
      evening: "Evening (4 PM - 8 PM)",
    };

    return await sendPushNotification(
      team.pushToken,
      "New Booking Assigned!",
      `${args.customerName} - ${windowLabels[args.window] || args.window}`,
      { bookingId: args.bookingId, type: "new_booking" }
    );
  },
});

export const sendSubscriptionReminderPush = mutation({
  args: {
    userId: v.id("users"),
    subscriptionId: v.id("subscriptions"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.pushToken) {
      console.log(`[Push] No token for user ${args.userId}`);
      return false;
    }

    return await sendPushNotification(
      user.pushToken,
      "Subscription Reminder",
      "Your car wash subscription is coming up soon!",
      { subscriptionId: args.subscriptionId, type: "subscription_reminder" }
    );
  },
});

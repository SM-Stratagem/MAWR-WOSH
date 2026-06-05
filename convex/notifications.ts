import { v } from "convex/values";
import {
  mutation,
  internalAction,
  internalMutation,
} from "./_generated/server";
import { internal } from "./_generated/api";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// ---------------------------------------------------------------------------
// Token storage (user + team)
// ---------------------------------------------------------------------------

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

/**
 * @deprecated Use storeTeamPushTokenBySession (session-scoped, multi-token).
 * Kept so existing direct-by-id callers don't break.
 */
export const storeTeamPushToken = mutation({
  args: {
    teamId: v.id("teams"),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Team not found");
    const set = new Set(team.pushTokens ?? []);
    set.add(args.token);
    await ctx.db.patch(args.teamId, {
      pushToken: args.token,
      pushTokens: Array.from(set),
    });
    return true;
  },
});

export const storeTeamPushTokenBySession = mutation({
  args: {
    sessionId: v.string(),
    pushToken: v.string(),
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
    if (!team) throw new Error("Team not found");
    const set = new Set(team.pushTokens ?? []);
    set.add(args.pushToken);
    await ctx.db.patch(team._id, { pushTokens: Array.from(set) });
    return { ok: true };
  },
});

// ---------------------------------------------------------------------------
// Push delivery (internal action)
// ---------------------------------------------------------------------------

export const sendExpoPush = internalAction({
  args: {
    tokens: v.array(v.string()),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (_ctx, args) => {
    const valid = args.tokens.filter(
      (t) => typeof t === "string" && t.startsWith("ExponentPushToken"),
    );
    if (valid.length === 0) return { sent: 0 };
    const messages = valid.map((to) => ({
      to,
      sound: "default",
      title: args.title,
      body: args.body,
      data: args.data ?? {},
    }));
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(messages),
      });
      const json = await res.json().catch(() => null);
      return { sent: valid.length, status: res.status, response: json };
    } catch (e: any) {
      return { sent: 0, error: e?.message ?? String(e) };
    }
  },
});

// ---------------------------------------------------------------------------
// Booking event dispatcher
// ---------------------------------------------------------------------------

type CustomerEvent =
  | "team_assigned"
  | "on_the_way"
  | "arrived"
  | "washing_started"
  | "completed";

type TeamEvent = "new_booking" | "team_reassigned" | "team_rejected";

const CUSTOMER_MESSAGES: Record<CustomerEvent, { title: string; body: string }> = {
  team_assigned: { title: "Driver assigned", body: "A driver is on the way." },
  on_the_way: { title: "Driver on the way", body: "ETA shortly." },
  arrived: { title: "Driver arrived", body: "They're here." },
  washing_started: { title: "Wash started", body: "Your car is being washed." },
  completed: { title: "Wash complete", body: "Your car is sparkling." },
};

const TEAM_MESSAGES: Record<TeamEvent, { title: string; body: string }> = {
  new_booking: { title: "New booking assigned", body: "Open the app for details." },
  team_reassigned: { title: "New booking assigned", body: "Open the app for details." },
  team_rejected: { title: "Booking re-pooled", body: "Driver couldn't take a booking." },
};

const CUSTOMER_EVENTS = new Set<string>([
  "team_assigned",
  "on_the_way",
  "arrived",
  "washing_started",
  "completed",
]);

const TEAM_EVENTS = new Set<string>([
  "new_booking",
  "team_reassigned",
  "team_rejected",
]);

export const notifyBookingEvent = internalMutation({
  args: {
    bookingId: v.id("bookings"),
    event: v.string(),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) return { ok: false, reason: "booking_not_found" };

    const data = {
      bookingId: args.bookingId,
      event: args.event,
      bookingNumber: booking.bookingNumber,
    };

    if (CUSTOMER_EVENTS.has(args.event)) {
      const user = await ctx.db.get(booking.userId);
      const token = user?.pushToken;
      const msg = CUSTOMER_MESSAGES[args.event as CustomerEvent];
      if (!token || !msg) return { ok: true, sent: 0 };
      await ctx.scheduler.runAfter(0, internal.notifications.sendExpoPush, {
        tokens: [token],
        title: msg.title,
        body: msg.body,
        data,
      });
      return { ok: true, scheduled: 1 };
    }

    if (TEAM_EVENTS.has(args.event)) {
      if (!booking.assignedTeamId) return { ok: true, sent: 0 };
      const team = await ctx.db.get(booking.assignedTeamId);
      const tokens = team?.pushTokens ?? (team?.pushToken ? [team.pushToken] : []);
      const msg = TEAM_MESSAGES[args.event as TeamEvent];
      if (!tokens.length || !msg) return { ok: true, sent: 0 };
      await ctx.scheduler.runAfter(0, internal.notifications.sendExpoPush, {
        tokens,
        title: msg.title,
        body: msg.body,
        data,
      });
      return { ok: true, scheduled: tokens.length };
    }

    return { ok: true, ignored: true };
  },
});

// ---------------------------------------------------------------------------
// Legacy mutation shims — kept so existing callers (admin/mobile) don't break.
// New code should schedule notifyBookingEvent instead.
// ---------------------------------------------------------------------------

/** @deprecated schedule internal.notifications.notifyBookingEvent instead. */
export const sendBookingConfirmedPush = mutation({
  args: {
    userId: v.id("users"),
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.pushToken) return false;
    await ctx.scheduler.runAfter(0, internal.notifications.sendExpoPush, {
      tokens: [user.pushToken],
      title: "Booking Confirmed!",
      body: "Your wash booking has been confirmed.",
      data: { bookingId: args.bookingId, type: "booking_confirmed" },
    });
    return true;
  },
});

/** @deprecated schedule internal.notifications.notifyBookingEvent instead. */
export const sendTeamAssignedPush = mutation({
  args: {
    userId: v.id("users"),
    bookingId: v.id("bookings"),
    teamName: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(0, internal.notifications.notifyBookingEvent, {
      bookingId: args.bookingId,
      event: "team_assigned",
    });
    return true;
  },
});

/** @deprecated schedule internal.notifications.notifyBookingEvent instead. */
export const sendStatusUpdatePush = mutation({
  args: {
    userId: v.id("users"),
    bookingId: v.id("bookings"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const map: Record<string, string> = {
      on_the_way: "on_the_way",
      arrived: "arrived",
      washing_in_progress: "washing_started",
      completed: "completed",
    };
    const event = map[args.status];
    if (!event) return false;
    await ctx.scheduler.runAfter(0, internal.notifications.notifyBookingEvent, {
      bookingId: args.bookingId,
      event,
    });
    return true;
  },
});

/** @deprecated schedule internal.notifications.notifyBookingEvent with event "new_booking". */
export const sendTeamNewBookingPush = mutation({
  args: {
    teamId: v.id("teams"),
    bookingId: v.id("bookings"),
    customerName: v.string(),
    address: v.string(),
    window: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(0, internal.notifications.notifyBookingEvent, {
      bookingId: args.bookingId,
      event: "new_booking",
    });
    return true;
  },
});

/** @deprecated kept for back-compat with subscription reminders. */
export const sendSubscriptionReminderPush = mutation({
  args: {
    userId: v.id("users"),
    subscriptionId: v.id("subscriptions"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.pushToken) return false;
    await ctx.scheduler.runAfter(0, internal.notifications.sendExpoPush, {
      tokens: [user.pushToken],
      title: "Subscription Reminder",
      body: "Your car wash subscription is coming up soon!",
      data: {
        subscriptionId: args.subscriptionId,
        type: "subscription_reminder",
      },
    });
    return true;
  },
});

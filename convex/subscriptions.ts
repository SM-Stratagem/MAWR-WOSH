import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireRole, STAFF_ROLES, ADMIN_ROLES } from "./authHelpers";

export const listMySubscriptions = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100);

    return await Promise.all(
      subscriptions.map(async (subscription) => {
        const washType = await ctx.db.get(subscription.washTypeId);
        const address = await ctx.db.get(subscription.addressId);
        const selectedCarCount = subscription.selectedCarIds.length;
        const pricePerRun = washType ? Math.round(washType.basePrice * selectedCarCount * 0.85) : 0;

        return {
          ...subscription,
          washType,
          address,
          selectedCarCount,
          pricePerRun,
        };
      })
    );
  },
});

export const createSubscription = mutation({
  args: {
    addressId: v.id("addresses"),
    washTypeId: v.id("washTypes"),
    carIds: v.array(v.id("cars")),
    frequency: v.union(v.literal("weekly"), v.literal("biweekly"), v.literal("monthly")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const address = await ctx.db.get(args.addressId);
    if (!address || address.userId !== user._id) throw new Error("Address not found");

    const washType = await ctx.db.get(args.washTypeId);
    if (!washType) throw new Error("Wash type not found");

    const uniqueCarIds = Array.from(new Set(args.carIds));
    if (uniqueCarIds.length === 0) {
      throw new Error("Select at least one car");
    }

    for (const carId of uniqueCarIds) {
      const car = await ctx.db.get(carId);
      if (!car || car.userId !== user._id || car.isActive === false) {
        throw new Error("Car not found");
      }
    }

    const nextRunAt = calculateNextRun(args.frequency);

    // Resolve discount % from settings; recurring plans get the configured
    // discount (default 15%), one-time gets 0.
    const discountSetting = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", "subscription_discount_pct"))
      .first();
    const rawDiscount = discountSetting?.value != null ? Number(discountSetting.value) : 15;
    const safeDiscount = Number.isFinite(rawDiscount) ? Math.max(0, Math.min(100, rawDiscount)) : 15;
    const discountPercent = (args.frequency as string) === "one_time" ? 0 : safeDiscount;

    const subscriptionId = await ctx.db.insert("subscriptions", {
      userId: user._id,
      addressId: args.addressId,
      washTypeId: args.washTypeId,
      frequency: args.frequency,
      status: "active",
      nextRunAt,
      selectedCarIds: uniqueCarIds,
      discountPercent,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("activityLogs", {
      actorUserId: user._id,
      actorRole: user.role,
      entityType: "subscription",
      entityId: subscriptionId.toString(),
      action: "created",
      createdAt: Date.now(),
    });

    return subscriptionId;
  },
});

function calculateNextRun(frequency: "weekly" | "biweekly" | "monthly"): number {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  switch (frequency) {
    case "weekly":
      return now + 7 * day;
    case "biweekly":
      return now + 14 * day;
    case "monthly":
      return now + 30 * day;
    default:
      return now + 7 * day;
  }
}

export const pauseSubscription = mutation({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription || subscription.userId !== user._id) {
      throw new Error("Subscription not found");
    }

    await ctx.db.patch(args.subscriptionId, {
      status: "paused",
      updatedAt: Date.now(),
    });

    await ctx.db.insert("activityLogs", {
      actorUserId: user._id,
      actorRole: user.role,
      entityType: "subscription",
      entityId: args.subscriptionId.toString(),
      action: "paused",
      createdAt: Date.now(),
    });
  },
});

export const cancelSubscription = mutation({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription || subscription.userId !== user._id) {
      throw new Error("Subscription not found");
    }

    await ctx.db.patch(args.subscriptionId, {
      status: "canceled",
      updatedAt: Date.now(),
    });

    await ctx.db.insert("activityLogs", {
      actorUserId: user._id,
      actorRole: user.role,
      entityType: "subscription",
      entityId: args.subscriptionId.toString(),
      action: "canceled",
      createdAt: Date.now(),
    });
  },
});

export const resumeMySubscription = mutation({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription || subscription.userId !== user._id) {
      throw new Error("Subscription not found");
    }

    if (subscription.status === "canceled") {
      throw new Error("Canceled subscriptions cannot be resumed");
    }
    if (subscription.frequency === "one_time") {
      throw new Error("One-time plans cannot be resumed");
    }

    await ctx.db.patch(args.subscriptionId, {
      status: "active",
      nextRunAt: calculateNextRun(subscription.frequency),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("activityLogs", {
      actorUserId: user._id,
      actorRole: user.role,
      entityType: "subscription",
      entityId: args.subscriptionId.toString(),
      action: "resumed",
      createdAt: Date.now(),
    });
  },
});

export const adminListSubscriptions = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireRole(ctx, STAFF_ROLES);

    let subscriptions = await ctx.db.query("subscriptions").take(1000);

    if (args.status) {
      subscriptions = subscriptions.filter((s) => s.status === args.status);
    }

    const enriched = await Promise.all(
      subscriptions.map(async (sub) => {
        const user = await ctx.db.get(sub.userId);
        const address = await ctx.db.get(sub.addressId);
        const washType = await ctx.db.get(sub.washTypeId);

        return {
          ...sub,
          user: user ? { _id: user._id, name: user.name, email: user.email } : null,
          address,
          washType,
        };
      })
    );

    return enriched.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const adminGetSubscriptionDetail = query({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, args) => {
    await requireRole(ctx, STAFF_ROLES);
    const sub = await ctx.db.get(args.subscriptionId);
    if (!sub) return null;
    const user = await ctx.db.get(sub.userId);
    const address = await ctx.db.get(sub.addressId);
    const washType = await ctx.db.get(sub.washTypeId);
    const cars = await Promise.all(sub.selectedCarIds.map((id) => ctx.db.get(id)));
    const recentBookings = await ctx.db
      .query("bookings")
      .withIndex("by_subscription_id", (q) => q.eq("subscriptionId", sub._id))
      .order("desc")
      .take(20);
    return {
      sub,
      user,
      address,
      washType,
      cars: cars.filter((c) => c !== null),
      recentBookings,
    };
  },
});

export const adminUpdateSubscription = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    frequency: v.optional(v.union(v.literal("weekly"), v.literal("biweekly"), v.literal("monthly"))),
    status: v.optional(v.union(v.literal("active"), v.literal("paused"), v.literal("canceled"))),
    discountPercent: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireRole(ctx, ADMIN_ROLES);

    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) throw new Error("Subscription not found");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.frequency) {
      updates.frequency = args.frequency;
      updates.nextRunAt = calculateNextRun(args.frequency);
    }

    if (args.status) {
      updates.status = args.status;
    }

    if (args.discountPercent !== undefined) {
      if (!Number.isFinite(args.discountPercent) || args.discountPercent < 0 || args.discountPercent > 100) {
        throw new Error("discountPercent must be between 0 and 100");
      }
      updates.discountPercent = args.discountPercent;
    }

    await ctx.db.patch(args.subscriptionId, updates);

    await ctx.db.insert("activityLogs", {
      actorUserId: adminUser._id,
      actorRole: adminUser.role,
      entityType: "subscription",
      entityId: args.subscriptionId.toString(),
      action: "updated",
      payload: JSON.stringify(updates),
      createdAt: Date.now(),
    });
  },
});

export const generateRecurringBookings = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Read pricing settings once for the whole batch.
    const settingsRows = await ctx.db.query("systemSettings").collect();
    const settingsMap: Record<string, string> = {};
    for (const s of settingsRows) settingsMap[s.key] = s.value;
    const serviceFeePct = parseFloat(settingsMap["default_service_fee_pct"] ?? "0");

    for (const sub of subscriptions) {
      if (sub.nextRunAt && sub.nextRunAt <= now && sub.frequency !== "one_time") {
        const washType = await ctx.db.get(sub.washTypeId);
        if (!washType) continue;

        const carCount = sub.selectedCarIds.length;
        const subtotal = washType.basePrice * carCount;

        const rawDiscountPct = sub.discountPercent ?? 0;
        const discountPct = Math.max(0, Math.min(100, rawDiscountPct));
        const serviceFee = Math.round(subtotal * (serviceFeePct / 100));
        const discount = Math.round(subtotal * (discountPct / 100));
        const total = subtotal - discount + serviceFee;

        await ctx.db.insert("bookings", {
          bookingNumber: `CW-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          userId: sub.userId,
          addressId: sub.addressId,
          washTypeId: sub.washTypeId,
          status: "confirmed",
          selectedCarCount: carCount,
          subtotal,
          serviceFee,
          discount,
          total,
          currency: washType.currency,
          paymentStatus: "succeeded",
          subscriptionId: sub._id,
          subscriptionDiscountPercent: discountPct,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.patch(sub._id, {
          lastRunAt: now,
          nextRunAt: calculateNextRun(sub.frequency),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("activityLogs", {
          actorUserId: sub.userId,
          actorRole: "system",
          entityType: "subscription",
          entityId: sub._id.toString(),
          action: "recurring_booking_generated",
          createdAt: Date.now(),
        });
      }
    }
  },
});

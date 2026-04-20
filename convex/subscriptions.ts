import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

    return await ctx.db
      .query("subscriptions")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const createSubscription = mutation({
  args: {
    addressId: v.id("addresses"),
    washTypeId: v.id("washTypes"),
    carIds: v.array(v.id("cars")),
    frequency: v.union(v.literal("weekly"), v.literal("biweekly"), v.literal("monthly")),
    stripeCustomerId: v.string(),
    defaultPaymentMethodId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const nextRunAt = calculateNextRun(args.frequency);

    const subscriptionId = await ctx.db.insert("subscriptions", {
      userId: user._id,
      addressId: args.addressId,
      washTypeId: args.washTypeId,
      frequency: args.frequency,
      status: "active",
      nextRunAt,
      stripeCustomerId: args.stripeCustomerId,
      defaultPaymentMethodId: args.defaultPaymentMethodId,
      selectedCarIds: args.carIds,
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

export const adminListSubscriptions = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "superadmin" && adminUser.role !== "operator")) {
      throw new Error("Forbidden");
    }

    let subscriptions = await ctx.db.query("subscriptions").collect();

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

export const adminUpdateSubscription = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    frequency: v.optional(v.union(v.literal("weekly"), v.literal("biweekly"), v.literal("monthly"))),
    status: v.optional(v.union(v.literal("active"), v.literal("paused"), v.literal("canceled"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "superadmin")) {
      throw new Error("Forbidden");
    }

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

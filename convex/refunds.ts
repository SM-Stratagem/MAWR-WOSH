import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const adminListRefunds = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const adminUser = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject)).first();
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "superadmin")) throw new Error("Forbidden");

    const refunds = await ctx.db.query("refunds").order("desc").take(100);
    return await Promise.all(
      refunds.map(async (refund) => {
        const user = await ctx.db.get(refund.userId);
        const booking = await ctx.db.get(refund.bookingId);
        return {
          ...refund,
          user: user ? { name: user.name, email: user.email } : null,
          booking: booking ? { bookingNumber: booking.bookingNumber, total: booking.total } : null,
        };
      })
    );
  },
});

export const adminCreateRefund = mutation({
  args: {
    bookingId: v.id("bookings"),
    userId: v.id("users"),
    amount: v.number(),
    currency: v.string(),
    reason: v.string(),
    requestedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const adminUser = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject)).first();
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "superadmin")) throw new Error("Forbidden");

    return await ctx.db.insert("refunds", {
      bookingId: args.bookingId,
      userId: args.userId,
      amount: args.amount,
      currency: args.currency,
      reason: args.reason,
      requestedBy: args.requestedBy,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const adminReviewRefund = mutation({
  args: {
    refundId: v.id("refunds"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const adminUser = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject)).first();
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "superadmin")) throw new Error("Forbidden");

    await ctx.db.patch(args.refundId, {
      status: args.status,
      reviewedBy: adminUser.name,
      reviewedAt: Date.now(),
      rejectionReason: args.rejectionReason,
      updatedAt: Date.now(),
    });
  },
});

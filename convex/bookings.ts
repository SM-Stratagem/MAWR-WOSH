import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function generateBookingNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CW-${timestamp}-${random}`;
}

export const listMyBookings = query({
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
      .query("bookings")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const getMyBookingDetail = query({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.userId !== user._id) throw new Error("Booking not found");

    const address = await ctx.db.get(booking.addressId);
    const washType = await ctx.db.get(booking.washTypeId);
    const bookingCars = await ctx.db
      .query("bookingCars")
      .withIndex("by_booking_id", (q) => q.eq("bookingId", args.bookingId))
      .collect();

    const cars = await Promise.all(bookingCars.map((bc) => ctx.db.get(bc.carId)));
    const team = booking.assignedTeamId ? await ctx.db.get(booking.assignedTeamId) : null;

    return {
      ...booking,
      address,
      washType,
      cars: cars.filter(Boolean),
      team,
    };
  },
});

export const createBookingDraft = mutation({
  args: {
    addressId: v.id("addresses"),
    washTypeId: v.id("washTypes"),
    carIds: v.array(v.id("cars")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const washType = await ctx.db.get(args.washTypeId);
    if (!washType) throw new Error("Wash type not found");

    const carCount = args.carIds.length;
    const subtotal = washType.basePrice * carCount;
    const serviceFee = 0;
    const discount = 0;
    const total = subtotal + serviceFee - discount;

    const bookingId = await ctx.db.insert("bookings", {
      bookingNumber: generateBookingNumber(),
      userId: user._id,
      addressId: args.addressId,
      washTypeId: args.washTypeId,
      status: "confirmed", // AUTO-CONFIRM: no fake payment step
      selectedCarCount: carCount,
      subtotal,
      serviceFee,
      discount,
      total,
      currency: washType.currency,
      paymentStatus: "succeeded", // Mark as paid (until Stripe integration)
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    for (const carId of args.carIds) {
      await ctx.db.insert("bookingCars", {
        bookingId,
        carId,
      });
    }

    await ctx.db.insert("activityLogs", {
      actorUserId: user._id,
      actorRole: user.role,
      entityType: "booking",
      entityId: bookingId.toString(),
      action: "confirmed", // Auto-confirmed booking
      createdAt: Date.now(),
    });

    return bookingId;
  },
});

export const attachCarsToBooking = mutation({
  args: {
    bookingId: v.id("bookings"),
    carIds: v.array(v.id("cars")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.userId !== user._id) throw new Error("Booking not found");

    const existingCars = await ctx.db
      .query("bookingCars")
      .withIndex("by_booking_id", (q) => q.eq("bookingId", args.bookingId))
      .collect();

    for (const car of existingCars) {
      await ctx.db.delete(car._id);
    }

    for (const carId of args.carIds) {
      await ctx.db.insert("bookingCars", {
        bookingId: args.bookingId,
        carId,
      });
    }

    const washType = await ctx.db.get(booking.washTypeId);
    if (washType) {
      const carCount = args.carIds.length;
      const subtotal = washType.basePrice * carCount;
      const total = subtotal + booking.serviceFee - booking.discount;

      await ctx.db.patch(args.bookingId, {
        selectedCarCount: carCount,
        subtotal,
        total,
        updatedAt: Date.now(),
      });
    }
  },
});

export const setBookingLocation = mutation({
  args: {
    bookingId: v.id("bookings"),
    addressId: v.id("addresses"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.userId !== user._id) throw new Error("Booking not found");

    await ctx.db.patch(args.bookingId, {
      addressId: args.addressId,
      updatedAt: Date.now(),
    });
  },
});

export const confirmBookingAfterPayment = mutation({
  args: {
    bookingId: v.id("bookings"),
    paymentIntentId: v.string(),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    await ctx.db.patch(args.bookingId, {
      status: "confirmed",
      paymentStatus: "succeeded",
      paymentIntentId: args.paymentIntentId,
      updatedAt: Date.now(),
    });

    const user = await ctx.db.get(booking.userId);
    await ctx.db.insert("activityLogs", {
      actorUserId: booking.userId,
      actorRole: user?.role,
      entityType: "booking",
      entityId: booking._id.toString(),
      action: "confirmed",
      payload: JSON.stringify({ paymentIntentId: args.paymentIntentId }),
      createdAt: Date.now(),
    });
  },
});

export const cancelBooking = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.userId !== user._id) throw new Error("Booking not found");

    if (["completed", "canceled"].includes(booking.status)) {
      throw new Error("Cannot cancel this booking");
    }

    await ctx.db.patch(args.bookingId, {
      status: "canceled",
      paymentStatus: "canceled",
      updatedAt: Date.now(),
    });

    await ctx.db.insert("activityLogs", {
      actorUserId: user._id,
      actorRole: user.role,
      entityType: "booking",
      entityId: args.bookingId.toString(),
      action: "canceled",
      createdAt: Date.now(),
    });
  },
});

export const adminListBookings = query({
  args: {
    status: v.optional(v.string()),
    searchQuery: v.optional(v.string()),
  },
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

    let bookings = await ctx.db.query("bookings").collect();

    if (args.status) {
      bookings = bookings.filter((b) => b.status === args.status);
    }

    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase();
      bookings = bookings.filter((b) =>
        b.bookingNumber.toLowerCase().includes(query)
      );
    }

    const enrichedBookings = await Promise.all(
      bookings.map(async (booking) => {
        const user = await ctx.db.get(booking.userId);
        const address = await ctx.db.get(booking.addressId);
        const washType = await ctx.db.get(booking.washTypeId);
        const team = booking.assignedTeamId ? await ctx.db.get(booking.assignedTeamId) : null;

        return {
          ...booking,
          user: user ? { _id: user._id, name: user.name, email: user.email } : null,
          address,
          washType,
          team,
        };
      })
    );

    return enrichedBookings.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const adminGetBookingDetail = query({
  args: { bookingId: v.id("bookings") },
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

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    const user = await ctx.db.get(booking.userId);
    const address = await ctx.db.get(booking.addressId);
    const washType = await ctx.db.get(booking.washTypeId);
    const bookingCars = await ctx.db
      .query("bookingCars")
      .withIndex("by_booking_id", (q) => q.eq("bookingId", args.bookingId))
      .collect();

    const cars = await Promise.all(bookingCars.map((bc) => ctx.db.get(bc.carId)));
    const team = booking.assignedTeamId ? await ctx.db.get(booking.assignedTeamId) : null;

    const assignment = await ctx.db
      .query("bookingAssignments")
      .withIndex("by_booking_id", (q) => q.eq("bookingId", args.bookingId))
      .first();

    return {
      ...booking,
      user,
      address,
      washType,
      cars: cars.filter(Boolean),
      team,
      assignment,
    };
  },
});

export const adminUpdateBookingStatus = mutation({
  args: {
    bookingId: v.id("bookings"),
    status: v.union(
      v.literal("confirmed"),
      v.literal("team_assigned"),
      v.literal("on_the_way"),
      v.literal("arrived"),
      v.literal("washing_in_progress"),
      v.literal("completed"),
      v.literal("canceled"),
      v.literal("payment_failed")
    ),
  },
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

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    await ctx.db.patch(args.bookingId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("activityLogs", {
      actorUserId: adminUser._id,
      actorRole: adminUser.role,
      entityType: "booking",
      entityId: args.bookingId.toString(),
      action: `status_changed_to_${args.status}`,
      createdAt: Date.now(),
    });
  },
});

export const adminAssignTeam = mutation({
  args: {
    bookingId: v.id("bookings"),
    teamId: v.id("teams"),
  },
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

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Team not found");

    await ctx.db.patch(args.bookingId, {
      status: "team_assigned",
      assignedTeamId: args.teamId,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("bookingAssignments", {
      bookingId: args.bookingId,
      teamId: args.teamId,
      assignedByUserId: adminUser._id,
      assignedAt: Date.now(),
    });

    await ctx.db.patch(team._id, { status: "busy" });

    await ctx.db.insert("activityLogs", {
      actorUserId: adminUser._id,
      actorRole: adminUser.role,
      entityType: "booking",
      entityId: args.bookingId.toString(),
      action: "team_assigned",
      payload: JSON.stringify({ teamId: args.teamId.toString(), teamName: team.name }),
      createdAt: Date.now(),
    });
  },
});

export const adminConfirmBooking = mutation({
  args: {
    bookingId: v.id("bookings"),
  },
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

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    if (booking.status !== "booked") {
      throw new Error("Can only confirm bookings with 'booked' status");
    }

    await ctx.db.patch(args.bookingId, {
      status: "confirmed",
      updatedAt: Date.now(),
    });

    await ctx.db.insert("activityLogs", {
      actorUserId: adminUser._id,
      actorRole: adminUser.role,
      entityType: "booking",
      entityId: args.bookingId.toString(),
      action: "admin_confirmed",
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const adminRejectBooking = mutation({
  args: {
    bookingId: v.id("bookings"),
    reason: v.string(),
  },
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

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    if (booking.status !== "booked") {
      throw new Error("Can only reject bookings with 'booked' status");
    }

    await ctx.db.patch(args.bookingId, {
      status: "rejected",
      rejectionReason: args.reason,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("activityLogs", {
      actorUserId: adminUser._id,
      actorRole: adminUser.role,
      entityType: "booking",
      entityId: args.bookingId.toString(),
      action: "admin_rejected",
      payload: JSON.stringify({ reason: args.reason }),
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const adminDashboardMetrics = query({
  args: {},
  handler: async (ctx) => {
    console.log("[Dashboard Metrics] Starting...");

    const identity = await ctx.auth.getUserIdentity();
    console.log("[Dashboard Metrics] Identity:", identity ? {
      subject: identity.subject,
      tokenIdentifier: identity.tokenIdentifier
    } : "NULL");

    if (!identity) {
      console.log("[Dashboard Metrics] Unauthorized - no identity");
      return {
        totalBookingsToday: 0,
        activeBookings: 0,
        totalUsers: 0,
        activeSubscriptions: 0,
        availableTeams: 0,
        totalTeams: 0,
        todayRevenue: 0,
        failedPayments: 0,
      };
    }

    console.log("[Dashboard Metrics] Clerk ID:", identity.subject);

    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    console.log("[Dashboard Metrics] Admin user:", adminUser ? "FOUND" : "NOT FOUND");

    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "superadmin")) {
      console.log("[Dashboard Metrics] Forbidden - role:", adminUser?.role);
      return {
        totalBookingsToday: 0,
        activeBookings: 0,
        totalUsers: 0,
        activeSubscriptions: 0,
        availableTeams: 0,
        totalTeams: 0,
        todayRevenue: 0,
        failedPayments: 0,
      };
    }

    const bookings = await ctx.db.query("bookings").collect();
    const users = await ctx.db.query("users").collect();
    const subscriptions = await ctx.db.query("subscriptions").collect();
    const teams = await ctx.db.query("teams").collect();

    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);

    const todayBookings = bookings.filter((b) => b.createdAt >= todayStart);
    const activeBookings = bookings.filter((b) =>
      ["confirmed", "team_assigned", "on_the_way", "arrived", "washing_in_progress"].includes(b.status)
    );
    const activeSubscriptions = subscriptions.filter((s) => s.status === "active");
    const availableTeams = teams.filter((t) => t.status === "available" && t.isActive);

    const todayRevenue = todayBookings
      .filter((b) => b.paymentStatus === "succeeded")
      .reduce((sum, b) => sum + b.total, 0);

    const failedPayments = bookings.filter((b) => b.paymentStatus === "failed").length;

    console.log("[Dashboard Metrics] Calculated metrics successfully");

    return {
      totalBookingsToday: todayBookings.length,
      activeBookings: activeBookings.length,
      totalUsers: users.filter((u) => u.role === "customer").length,
      activeSubscriptions: activeSubscriptions.length,
      availableTeams: availableTeams.length,
      totalTeams: teams.filter((t) => t.isActive).length,
      todayRevenue,
      failedPayments,
    };
  },
});

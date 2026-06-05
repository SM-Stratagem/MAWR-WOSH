/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

async function seed(t: any) {
  return await t.run(async (ctx: any) => {
    const operator1 = await ctx.db.insert("users", {
      clerkId: "op1", email: "o1@x", name: "Op1", role: "operator",
      isActive: true, createdAt: 0, lastSeenAt: 0,
    });
    const admin1 = await ctx.db.insert("users", {
      clerkId: "ad1", email: "a@x", name: "Ad", role: "admin",
      isActive: true, createdAt: 0, lastSeenAt: 0,
    });
    const customer = await ctx.db.insert("users", {
      clerkId: "cust", email: "c@x", name: "C", role: "customer",
      isActive: true, createdAt: 0, lastSeenAt: 0,
    });
    const teamA = await ctx.db.insert("teams", {
      name: "A", status: "available", isActive: true,
    });
    const teamB = await ctx.db.insert("teams", {
      name: "B", status: "available", isActive: true,
    });
    const addr = await ctx.db.insert("addresses", {
      userId: customer, formattedAddress: "X", latitude: 0, longitude: 0,
      isDefault: true, createdAt: 0, updatedAt: 0,
    });
    const wt = await ctx.db.insert("washTypes", {
      key: "basic", name: "Basic", description: "", basePrice: 50,
      currency: "AED", durationMins: 30, isActive: true, sortOrder: 1,
    });
    const booking = await ctx.db.insert("bookings", {
      bookingNumber: "B1", userId: customer, addressId: addr, washTypeId: wt,
      status: "team_assigned", assignedTeamId: teamA,
      selectedCarCount: 1, subtotal: 50, serviceFee: 0, discount: 0, total: 50,
      currency: "AED", paymentStatus: "succeeded",
      createdAt: 0, updatedAt: 0,
    });
    return { operator1, admin1, customer, teamA, teamB, booking, addr, wt };
  });
}

test("operator CANNOT update system settings", async () => {
  const t = convexTest(schema, modules);
  await seed(t);
  const asOp = t.withIdentity({ subject: "op1" });
  await expect(asOp.mutation(api.settings.adminUpdateSystemSetting, {
    key: "default_eta_min", value: "1",
  })).rejects.toThrow(/Forbidden/);
});

test("operator CANNOT approve refunds", async () => {
  const t = convexTest(schema, modules);
  const { customer, booking } = await seed(t);
  const refundId = await t.run(async (ctx: any) =>
    ctx.db.insert("refunds", {
      bookingId: booking, userId: customer, amount: 50, currency: "AED",
      reason: "test", requestedBy: "customer", status: "pending",
      createdAt: 0, updatedAt: 0,
    }));
  const asOp = t.withIdentity({ subject: "op1" });
  await expect(asOp.mutation(api.refunds.adminReviewRefund, {
    refundId, status: "approved",
  })).rejects.toThrow(/Forbidden/);
});

test("operator CAN force-transition booking status (dispatch power)", async () => {
  const t = convexTest(schema, modules);
  const { booking } = await seed(t);
  const asOp = t.withIdentity({ subject: "op1" });
  await asOp.mutation(api.bookings.adminUpdateBookingStatus, {
    bookingId: booking, status: "canceled",
  });
  const b = await t.run(async (ctx: any) => ctx.db.get(booking));
  expect(b.status).toBe("canceled");
});

test("deprecated teamUpdateStatus throws", async () => {
  const t = convexTest(schema, modules);
  const { booking } = await seed(t);
  const asOp = t.withIdentity({ subject: "op1" });
  await expect(asOp.mutation(api.bookings.teamUpdateStatus, {
    bookingId: booking, status: "on_the_way",
  })).rejects.toThrow(/deprecated/);
});

test("session-based team status update rejects other-team bookings", async () => {
  const t = convexTest(schema, modules);
  const { teamB, booking } = await seed(t);
  await t.run(async (ctx: any) =>
    ctx.db.insert("teamSessions", {
      teamId: teamB, sessionId: "sess-B",
      expiresAt: Date.now() + 60_000,
    }));
  await expect(t.mutation(api.bookings.teamUpdateStatusWithSession, {
    sessionId: "sess-B",
    bookingId: booking,
    status: "on_the_way",
  })).rejects.toThrow(/not assigned|not found/i);
});

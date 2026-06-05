/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("createBookingDraft applies service fee and discount from args + settings", async () => {
  const t = convexTest(schema, modules);
  const { addrId, wtId } = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      clerkId: "c", email: "c@x", name: "C", role: "customer",
      isActive: true, createdAt: 0, lastSeenAt: 0,
    });
    await ctx.db.insert("cars", {
      userId, make: "Toyota", model: "Camry", plateNumber: "ABC123",
      isActive: true, createdAt: 0,
    });
    const a = await ctx.db.insert("addresses", {
      userId, formattedAddress: "X", latitude: 25.1, longitude: 55.2,
      isDefault: true, createdAt: 0, updatedAt: 0,
    });
    const w = await ctx.db.insert("washTypes", {
      key: "basic", name: "Basic", description: "", basePrice: 100,
      currency: "AED", durationMins: 30, isActive: true, sortOrder: 1,
    });
    await ctx.db.insert("systemSettings", {
      key: "default_service_fee_pct", value: "5", updatedAt: 0,
    });
    return { addrId: a, wtId: w };
  });

  const asC = t.withIdentity({ subject: "c" });
  const cars = await asC.query(api.cars.listMyCars, {});
  const bookingId = await asC.mutation(api.bookings.createBookingDraft, {
    addressId: addrId,
    washTypeId: wtId,
    carIds: [cars[0]._id],
    subscriptionDiscountPercent: 15,
  });

  const b = await t.run(async (ctx) => await ctx.db.get(bookingId));
  expect(b).not.toBeNull();
  expect(b!.subtotal).toBe(100);
  expect(b!.discount).toBe(15);
  expect(b!.serviceFee).toBe(5);
  expect(b!.total).toBe(90);
  expect(b!.subscriptionDiscountPercent).toBe(15);
});

test("createBookingDraft defaults discount and service fee to 0 when args/settings absent", async () => {
  const t = convexTest(schema, modules);
  const { addrId, wtId } = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      clerkId: "c2", email: "c2@x", name: "C2", role: "customer",
      isActive: true, createdAt: 0, lastSeenAt: 0,
    });
    await ctx.db.insert("cars", {
      userId, make: "Toyota", model: "Camry", plateNumber: "ZZZ999",
      isActive: true, createdAt: 0,
    });
    const a = await ctx.db.insert("addresses", {
      userId, formattedAddress: "Y", latitude: 25.1, longitude: 55.2,
      isDefault: true, createdAt: 0, updatedAt: 0,
    });
    const w = await ctx.db.insert("washTypes", {
      key: "basic", name: "Basic", description: "", basePrice: 80,
      currency: "AED", durationMins: 30, isActive: true, sortOrder: 1,
    });
    return { addrId: a, wtId: w };
  });

  const asC = t.withIdentity({ subject: "c2" });
  const cars = await asC.query(api.cars.listMyCars, {});
  const bookingId = await asC.mutation(api.bookings.createBookingDraft, {
    addressId: addrId,
    washTypeId: wtId,
    carIds: [cars[0]._id],
  });

  const b = await t.run(async (ctx) => await ctx.db.get(bookingId));
  expect(b!.subtotal).toBe(80);
  expect(b!.discount).toBe(0);
  expect(b!.serviceFee).toBe(0);
  expect(b!.total).toBe(80);
  expect(b!.subscriptionDiscountPercent).toBe(0);
});

test("team selection prefers team without ±1h overlap", async () => {
  const t = convexTest(schema, modules);
  // Two teams. teamBusy already has a booking at the same scheduledFor (overlap).
  // teamFree has a booking 4 hours away (no overlap).
  // The auto-assigner should choose teamFree even if teamBusy is closer.
  //
  // createBookingDraft derives scheduledFor from scheduledDate via
  //   const d = new Date(scheduledDate); d.setHours(8, 0, 0, 0)
  // so pre-seed PRE1 with that same value to guarantee an overlap.
  const scheduledDate = new Date("2026-07-01T00:00:00.000Z").getTime();
  const computedScheduledFor = (() => {
    const d = new Date(scheduledDate);
    d.setHours(8, 0, 0, 0);
    return d.getTime();
  })();
  const targetTime = computedScheduledFor;
  const farTime = targetTime + 4 * 60 * 60 * 1000;

  const { userClerk, addrId, wtId, carId, teamBusy, teamFree } = await t.run(async (ctx) => {
    const u = await ctx.db.insert("users", {
      clerkId: "cwin", email: "cw@x", name: "CW", role: "customer",
      isActive: true, createdAt: 0, lastSeenAt: 0,
    });
    const c = await ctx.db.insert("cars", {
      userId: u, make: "T", model: "C", plateNumber: "WIN1",
      isActive: true, createdAt: 0,
    });
    const a = await ctx.db.insert("addresses", {
      userId: u, formattedAddress: "Z", latitude: 25.10, longitude: 55.20,
      isDefault: true, createdAt: 0, updatedAt: 0,
    });
    const w = await ctx.db.insert("washTypes", {
      key: "basic", name: "Basic", description: "", basePrice: 50,
      currency: "AED", durationMins: 30, isActive: true, sortOrder: 1,
    });

    // teamBusy is closer to the target address than teamFree
    const teamBusy = await ctx.db.insert("teams", {
      name: "Busy", status: "available", isActive: true,
      currentLat: 25.10, currentLng: 55.20, // exact location, distance ~0
      lastLocationAt: 0,
    });
    const teamFree = await ctx.db.insert("teams", {
      name: "Free", status: "available", isActive: true,
      currentLat: 25.20, currentLng: 55.30, // a bit further
      lastLocationAt: 0,
    });

    // Pre-seed: teamBusy already has a booking at exactly targetTime → overlap.
    await ctx.db.insert("bookings", {
      bookingNumber: "PRE1", userId: u, addressId: a, washTypeId: w,
      status: "team_assigned", assignedTeamId: teamBusy,
      selectedCarCount: 1, subtotal: 50, serviceFee: 0, discount: 0, total: 50,
      currency: "AED", paymentStatus: "succeeded",
      scheduledFor: targetTime,
      createdAt: 0, updatedAt: 0,
    });

    // teamFree has a booking 4h away → no overlap with target.
    await ctx.db.insert("bookings", {
      bookingNumber: "PRE2", userId: u, addressId: a, washTypeId: w,
      status: "team_assigned", assignedTeamId: teamFree,
      selectedCarCount: 1, subtotal: 50, serviceFee: 0, discount: 0, total: 50,
      currency: "AED", paymentStatus: "succeeded",
      scheduledFor: farTime,
      createdAt: 0, updatedAt: 0,
    });

    // Cap to 1-per-window so the overlap actually disqualifies teamBusy.
    await ctx.db.insert("systemSettings", {
      key: "max_per_window", value: "1", updatedAt: 0,
    });

    return { userClerk: "cwin", addrId: a, wtId: w, carId: c, teamBusy, teamFree };
  });

  const asC = t.withIdentity({ subject: userClerk });
  const newId = await asC.mutation(api.bookings.createBookingDraft, {
    addressId: addrId,
    washTypeId: wtId,
    carIds: [carId],
    scheduledWindow: "morning",
    scheduledDate,
  });

  const newBooking = await t.run(async (ctx) => await ctx.db.get(newId));
  // The new booking's scheduledFor should match PRE1 (teamBusy), so teamBusy
  // hits the max_per_window=1 cap and the assigner must pick teamFree
  // (whose only existing booking is 4h away — no overlap).
  expect(newBooking!.scheduledFor).toBe(targetTime);
  expect(newBooking!.assignedTeamId).toBeDefined();
  expect(newBooking!.assignedTeamId).not.toBe(teamBusy);
  expect(newBooking!.assignedTeamId).toBe(teamFree);
});

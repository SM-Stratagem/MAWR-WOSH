/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("backfillTeamLocations creates one row per team with coords", async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert("teams", {
      name: "T1", status: "available", isActive: true,
      currentLat: 25.1, currentLng: 55.2, lastLocationAt: 100,
    } as any);
    await ctx.db.insert("teams", {
      name: "T2", status: "available", isActive: true,
    });
  });
  await t.mutation(internal.migrations.backfillTeamLocations, {});
  const locs = await t.run(async (ctx) => await ctx.db.query("teamLocations").collect());
  expect(locs).toHaveLength(1);
  expect(locs[0].currentLat).toBe(25.1);
});

test("backfillSubscriptionDiscount sets 15% for weekly subs missing it", async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      clerkId:"c1", email:"a@b.c", name:"A", role:"customer",
      isActive:true, createdAt:0, lastSeenAt:0,
    });
    const addrId = await ctx.db.insert("addresses", {
      userId, formattedAddress:"X", latitude:0, longitude:0,
      isDefault:true, createdAt:0, updatedAt:0,
    });
    const wtId = await ctx.db.insert("washTypes", {
      key:"basic", name:"Basic", description:"", basePrice:50,
      currency:"AED", durationMins:30, isActive:true, sortOrder:1,
    });
    await ctx.db.insert("subscriptions", {
      userId, addressId: addrId, washTypeId: wtId,
      frequency:"weekly", status:"active",
      selectedCarIds:[], createdAt:0, updatedAt:0,
    } as any);
  });
  await t.mutation(internal.migrations.backfillSubscriptionDiscount, {});
  const subs = await t.run(async (ctx) => await ctx.db.query("subscriptions").collect());
  expect(subs[0].discountPercent).toBe(15);
});

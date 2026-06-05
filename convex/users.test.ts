/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("cascadeDeleteUser removes cars + addresses + cancels subs + deletes user", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.run(async (ctx) => {
    const u = await ctx.db.insert("users", {
      clerkId: "x",
      email: "x@y",
      name: "X",
      role: "customer",
      isActive: true,
      createdAt: 0,
      lastSeenAt: 0,
    });
    const car = await ctx.db.insert("cars", {
      userId: u,
      make: "a",
      model: "b",
      plateNumber: "P",
      isActive: true,
      createdAt: 0,
    });
    const addr = await ctx.db.insert("addresses", {
      userId: u,
      formattedAddress: "X",
      latitude: 0,
      longitude: 0,
      isDefault: true,
      createdAt: 0,
      updatedAt: 0,
    });
    const wt = await ctx.db.insert("washTypes", {
      key: "basic",
      name: "Basic",
      description: "",
      basePrice: 50,
      currency: "AED",
      durationMins: 30,
      isActive: true,
      sortOrder: 1,
    });
    await ctx.db.insert("subscriptions", {
      userId: u,
      addressId: addr,
      washTypeId: wt,
      frequency: "weekly",
      status: "active",
      selectedCarIds: [car],
      createdAt: 0,
      updatedAt: 0,
    } as any);
    return u;
  });

  await t.mutation(internal.users.cascadeDeleteUser, { userId });

  const counts = await t.run(async (ctx) => ({
    user: await ctx.db.get(userId),
    cars: (await ctx.db.query("cars").collect()).length,
    addresses: (await ctx.db.query("addresses").collect()).length,
    activeSubs: (
      await ctx.db
        .query("subscriptions")
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect()
    ).length,
  }));

  expect(counts.user).toBeNull();
  expect(counts.cars).toBe(0);
  expect(counts.addresses).toBe(0);
  expect(counts.activeSubs).toBe(0);
});

/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { getCurrentUser, requireRole } from "./authHelpers";

const modules = import.meta.glob("./**/*.ts");

test("getCurrentUser returns the user matching identity.subject", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      clerkId: "abc", email:"x@y", name:"X", role:"customer",
      isActive:true, createdAt:0, lastSeenAt:0,
    }));
  const asUser = t.withIdentity({ subject: "abc" });
  await asUser.run(async (ctx) => {
    const u = await getCurrentUser(ctx);
    expect(u._id).toBe(userId);
  });
});

test("requireRole throws when role mismatch", async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) =>
    ctx.db.insert("users", {
      clerkId: "abc", email:"x@y", name:"X", role:"customer",
      isActive:true, createdAt:0, lastSeenAt:0,
    }));
  const asUser = t.withIdentity({ subject: "abc" });
  await expect(asUser.run(async (ctx) => {
    await requireRole(ctx, ["admin"]);
  })).rejects.toThrow(/Forbidden/);
});

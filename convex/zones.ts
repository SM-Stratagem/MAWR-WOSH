import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole, STAFF_ROLES, ADMIN_ROLES } from "./authHelpers";

export const adminListZones = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, STAFF_ROLES);
    const allZones = await ctx.db.query("zones").take(100);
    return allZones.filter((z) => z.isActive !== false);
  },
});

export const adminCreateZone = mutation({
  args: {
    name: v.string(),
    baseEtaMin: v.number(),
    baseEtaMax: v.number(),
    driversAvailable: v.number(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ADMIN_ROLES);
    return await ctx.db.insert("zones", {
      name: args.name,
      status: "active",
      baseEtaMin: args.baseEtaMin,
      baseEtaMax: args.baseEtaMax,
      driversAvailable: args.driversAvailable,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const adminUpdateZone = mutation({
  args: {
    zoneId: v.id("zones"),
    name: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("busy"), v.literal("inactive"))),
    baseEtaMin: v.optional(v.number()),
    baseEtaMax: v.optional(v.number()),
    driversAvailable: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ADMIN_ROLES);
    const updates: Record<string, any> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.status !== undefined) updates.status = args.status;
    if (args.baseEtaMin !== undefined) updates.baseEtaMin = args.baseEtaMin;
    if (args.baseEtaMax !== undefined) updates.baseEtaMax = args.baseEtaMax;
    if (args.driversAvailable !== undefined) updates.driversAvailable = args.driversAvailable;
    await ctx.db.patch(args.zoneId, updates);
  },
});

export const adminDeleteZone = mutation({
  args: { zoneId: v.id("zones") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ADMIN_ROLES);
    await ctx.db.patch(args.zoneId, { isActive: false });
  },
});

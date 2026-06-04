import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const adminListVans = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const adminUser = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject)).first();
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "superadmin")) throw new Error("Forbidden");
    const allVans = await ctx.db.query("vans").take(100);
    return allVans.filter((v) => v.isActive !== false);
  },
});

export const adminCreateVan = mutation({
  args: {
    name: v.string(),
    plate: v.string(),
    teamId: v.optional(v.id("teams")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const adminUser = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject)).first();
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "superadmin")) throw new Error("Forbidden");
    return await ctx.db.insert("vans", {
      name: args.name,
      plate: args.plate,
      teamId: args.teamId,
      status: "available",
      notes: args.notes,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const adminUpdateVan = mutation({
  args: {
    vanId: v.id("vans"),
    name: v.optional(v.string()),
    plate: v.optional(v.string()),
    teamId: v.optional(v.id("teams")),
    status: v.optional(v.union(v.literal("available"), v.literal("busy"), v.literal("maintenance"))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const adminUser = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject)).first();
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "superadmin")) throw new Error("Forbidden");
    const updates: Record<string, any> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.plate !== undefined) updates.plate = args.plate;
    if (args.teamId !== undefined) updates.teamId = args.teamId;
    if (args.status !== undefined) updates.status = args.status;
    if (args.notes !== undefined) updates.notes = args.notes;
    await ctx.db.patch(args.vanId, updates);
  },
});

export const adminDeleteVan = mutation({
  args: { vanId: v.id("vans") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const adminUser = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject)).first();
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "superadmin")) throw new Error("Forbidden");
    await ctx.db.patch(args.vanId, { isActive: false });
  },
});

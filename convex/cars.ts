import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    return await ctx.storage.generateUploadUrl();
  },
});

export const getPhotoUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const saveCarPhoto = mutation({
  args: {
    carId: v.id("cars"),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const car = await ctx.db.get(args.carId);
    if (!car || car.userId !== user._id) throw new Error("Car not found");

    await ctx.db.patch(args.carId, { photoStorageId: args.storageId });
  },
});

export const listMyCars = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const clerkId = identity.subject;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!user) return [];

    return await ctx.db
      .query("cars")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("desc")
      .take(100);
  },
});

export const createCar = mutation({
  args: {
    nickname: v.optional(v.string()),
    make: v.string(),
    model: v.string(),
    year: v.optional(v.number()),
    plateNumber: v.string(),
    plateRegion: v.optional(v.string()),
    color: v.optional(v.string()),
    photoStorageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized - Please log in again");
    }
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found in database. Please try logging out and back in.");
    }

    const carId = await ctx.db.insert("cars", {
      userId: user._id,
      nickname: args.nickname,
      make: args.make,
      model: args.model,
      year: args.year,
      plateNumber: args.plateNumber,
      plateRegion: args.plateRegion,
      color: args.color,
      photoStorageId: args.photoStorageId,
      isActive: true,
      createdAt: Date.now(),
    });

    await ctx.db.insert("activityLogs", {
      actorUserId: user._id,
      actorRole: user.role,
      entityType: "car",
      entityId: carId.toString(),
      action: "created",
      createdAt: Date.now(),
    });

    return carId;
  },
});

export const updateCar = mutation({
  args: {
    carId: v.id("cars"),
    nickname: v.optional(v.string()),
    make: v.optional(v.string()),
    model: v.optional(v.string()),
    year: v.optional(v.number()),
    plateNumber: v.optional(v.string()),
    plateRegion: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const car = await ctx.db.get(args.carId);
    if (!car || car.userId !== user._id) throw new Error("Car not found");

    const { carId, ...updates } = args;
    await ctx.db.patch(carId, updates);

    await ctx.db.insert("activityLogs", {
      actorUserId: user._id,
      actorRole: user.role,
      entityType: "car",
      entityId: carId.toString(),
      action: "updated",
      payload: JSON.stringify(updates),
      createdAt: Date.now(),
    });
  },
});

export const deleteCar = mutation({
  args: { carId: v.id("cars") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const car = await ctx.db.get(args.carId);
    if (!car || car.userId !== user._id) throw new Error("Car not found");

    await ctx.db.patch(args.carId, { isActive: false });

    await ctx.db.insert("activityLogs", {
      actorUserId: user._id,
      actorRole: user.role,
      entityType: "car",
      entityId: args.carId.toString(),
      action: "deleted",
      createdAt: Date.now(),
    });
  },
});

export const adminListCars = query({
  args: { userId: v.optional(v.id("users")) },
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

    if (args.userId !== undefined) {
      const userId = args.userId;
      return await ctx.db
        .query("cars")
        .withIndex("by_user_id", (q) => q.eq("userId", userId))
        .order("desc")
        .take(100);
    }

    return await ctx.db.query("cars").order("desc").take(1000);
  },
});

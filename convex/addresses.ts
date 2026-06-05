import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listMyAddresses = query({
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
      .query("addresses")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const createAddress = mutation({
  args: {
    label: v.optional(v.string()),
    formattedAddress: v.string(),
    apartmentOrVilla: v.optional(v.string()),
    buildingOrCommunity: v.optional(v.string()),
    street: v.optional(v.string()),
    notes: v.optional(v.string()),
    latitude: v.number(),
    longitude: v.number(),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    if (args.isDefault) {
      // Use the (userId, isDefault) index to fetch just the current default
      // (if any) instead of scanning the whole address list.
      const prev = await ctx.db
        .query("addresses")
        .withIndex("by_user_id_and_default", (q) =>
          q.eq("userId", user._id).eq("isDefault", true),
        )
        .first();
      if (prev) {
        await ctx.db.patch(prev._id, { isDefault: false });
      }
    }

    const addressId = await ctx.db.insert("addresses", {
      userId: user._id,
      label: args.label,
      formattedAddress: args.formattedAddress,
      apartmentOrVilla: args.apartmentOrVilla,
      buildingOrCommunity: args.buildingOrCommunity,
      street: args.street,
      notes: args.notes,
      latitude: args.latitude,
      longitude: args.longitude,
      isDefault: args.isDefault ?? false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("activityLogs", {
      actorUserId: user._id,
      actorRole: user.role,
      entityType: "address",
      entityId: addressId.toString(),
      action: "created",
      createdAt: Date.now(),
    });

    return addressId;
  },
});

export const updateAddress = mutation({
  args: {
    addressId: v.id("addresses"),
    label: v.optional(v.string()),
    formattedAddress: v.optional(v.string()),
    apartmentOrVilla: v.optional(v.string()),
    buildingOrCommunity: v.optional(v.string()),
    street: v.optional(v.string()),
    notes: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const address = await ctx.db.get(args.addressId);
    if (!address || address.userId !== user._id) throw new Error("Address not found");

    if (args.isDefault) {
      const prev = await ctx.db
        .query("addresses")
        .withIndex("by_user_id_and_default", (q) =>
          q.eq("userId", user._id).eq("isDefault", true),
        )
        .first();
      if (prev && prev._id !== args.addressId) {
        await ctx.db.patch(prev._id, { isDefault: false });
      }
    }

    const { addressId, ...updates } = args;
    await ctx.db.patch(addressId, { ...updates, updatedAt: Date.now() });

    await ctx.db.insert("activityLogs", {
      actorUserId: user._id,
      actorRole: user.role,
      entityType: "address",
      entityId: addressId.toString(),
      action: "updated",
      payload: JSON.stringify(updates),
      createdAt: Date.now(),
    });
  },
});

export const setDefaultAddress = mutation({
  args: { addressId: v.id("addresses") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const address = await ctx.db.get(args.addressId);
    if (!address || address.userId !== user._id) throw new Error("Address not found");

    // Clear the previous default (if any), then mark the new one.
    const prev = await ctx.db
      .query("addresses")
      .withIndex("by_user_id_and_default", (q) =>
        q.eq("userId", user._id).eq("isDefault", true),
      )
      .first();
    if (prev && prev._id !== args.addressId) {
      await ctx.db.patch(prev._id, { isDefault: false });
    }
    if (!address.isDefault) {
      await ctx.db.patch(args.addressId, { isDefault: true });
    }

    await ctx.db.patch(user._id, { defaultAddressId: args.addressId });
  },
});

export const deleteAddress = mutation({
  args: { addressId: v.id("addresses") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const address = await ctx.db.get(args.addressId);
    if (!address || address.userId !== user._id) throw new Error("Address not found");

    await ctx.db.delete(args.addressId);

    await ctx.db.insert("activityLogs", {
      actorUserId: user._id,
      actorRole: user.role,
      entityType: "address",
      entityId: args.addressId.toString(),
      action: "deleted",
      createdAt: Date.now(),
    });
  },
});

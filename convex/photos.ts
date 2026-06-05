import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const savePhoto = mutation({
  args: {
    bookingId: v.id("bookings"),
    type: v.union(v.literal("arrival_car"), v.literal("arrival_location"), v.literal("completion")),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    const url = (await ctx.storage.getUrl(args.storageId as Id<"_storage">)) || "";
    if (!url) {
      throw new Error("Failed to get photo URL from storage");
    }

    const photoId = await ctx.db.insert("bookingPhotos", {
      bookingId: args.bookingId,
      type: args.type,
      storageId: args.storageId,
      url,
      createdAt: Date.now(),
    });

    return { photoId, url };
  },
});

export const addPhotoUrl = mutation({
  args: {
    bookingId: v.id("bookings"),
    type: v.union(v.literal("arrival_car"), v.literal("arrival_location"), v.literal("completion")),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const photoId = await ctx.db.insert("bookingPhotos", {
      bookingId: args.bookingId,
      type: args.type,
      storageId: "",
      url: args.url,
      createdAt: Date.now(),
    });

    return { photoId };
  },
});

export const getPhotoUrl = query({
  args: {
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId as Id<"_storage">);
    return url;
  },
});

export const listBookingPhotos = query({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bookingPhotos")
      .withIndex("by_booking_id", (q) => q.eq("bookingId", args.bookingId))
      .collect();
  },
});

export const getCompletionPhotos = query({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const photos = await ctx.db
      .query("bookingPhotos")
      .withIndex("by_booking_id", (q) => q.eq("bookingId", args.bookingId))
      .collect();

    return photos.filter((p) => p.type === "completion");
  },
});

export const getArrivalPhotos = query({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const photos = await ctx.db
      .query("bookingPhotos")
      .withIndex("by_booking_id", (q) => q.eq("bookingId", args.bookingId))
      .collect();

    return photos.filter((p) => p.type === "arrival_car" || p.type === "arrival_location");
  },
});

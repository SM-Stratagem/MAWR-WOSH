import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    role: v.union(v.literal("customer"), v.literal("operator"), v.literal("admin"), v.literal("superadmin")),
    defaultAddressId: v.optional(v.id("addresses")),
    isActive: v.boolean(),
    createdAt: v.number(),
    lastSeenAt: v.number(),
  }).index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  cars: defineTable({
    userId: v.id("users"),
    nickname: v.optional(v.string()),
    make: v.string(),
    model: v.string(),
    year: v.optional(v.number()),
    plateNumber: v.string(),
    plateRegion: v.optional(v.string()),
    color: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_user_id", ["userId"]),

  addresses: defineTable({
    userId: v.id("users"),
    label: v.optional(v.string()),
    formattedAddress: v.string(),
    apartmentOrVilla: v.optional(v.string()),
    buildingOrCommunity: v.optional(v.string()),
    street: v.optional(v.string()),
    notes: v.optional(v.string()),
    latitude: v.number(),
    longitude: v.number(),
    isDefault: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_id", ["userId"]),

  washTypes: defineTable({
    key: v.string(),
    name: v.string(),
    description: v.string(),
    basePrice: v.number(),
    currency: v.string(),
    durationMins: v.number(),
    isActive: v.boolean(),
    sortOrder: v.number(),
  }),

  bookings: defineTable({
    bookingNumber: v.string(),
    userId: v.id("users"),
    addressId: v.id("addresses"),
    washTypeId: v.id("washTypes"),
    status: v.union(
      v.literal("draft"),
      v.literal("awaiting_payment"),
      v.literal("confirmed"),
      v.literal("team_assigned"),
      v.literal("on_the_way"),
      v.literal("arrived"),
      v.literal("washing_in_progress"),
      v.literal("completed"),
      v.literal("canceled"),
      v.literal("payment_failed")
    ),
    selectedCarCount: v.number(),
    subtotal: v.number(),
    serviceFee: v.number(),
    discount: v.number(),
    total: v.number(),
    currency: v.string(),
    paymentStatus: v.union(
      v.literal("pending"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("canceled")
    ),
    paymentIntentId: v.optional(v.string()),
    setupIntentId: v.optional(v.string()),
    subscriptionId: v.optional(v.id("subscriptions")),
    etaMin: v.optional(v.number()),
    etaMax: v.optional(v.number()),
    scheduledFor: v.optional(v.number()),
    assignedTeamId: v.optional(v.id("teams")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_id", ["userId"])
    .index("by_status", ["status"])
    .index("by_booking_number", ["bookingNumber"]),

  bookingCars: defineTable({
    bookingId: v.id("bookings"),
    carId: v.id("cars"),
  }).index("by_booking_id", ["bookingId"])
    .index("by_car_id", ["carId"]),

  subscriptions: defineTable({
    userId: v.id("users"),
    addressId: v.id("addresses"),
    washTypeId: v.id("washTypes"),
    frequency: v.union(
      v.literal("one_time"),
      v.literal("weekly"),
      v.literal("biweekly"),
      v.literal("monthly")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("canceled")
    ),
    nextRunAt: v.optional(v.number()),
    lastRunAt: v.optional(v.number()),
    stripeCustomerId: v.optional(v.string()),
    defaultPaymentMethodId: v.optional(v.string()),
    selectedCarIds: v.array(v.id("cars")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_id", ["userId"])
    .index("by_status", ["status"]),

  teams: defineTable({
    name: v.string(),
    status: v.union(
      v.literal("available"),
      v.literal("busy"),
      v.literal("offline")
    ),
    currentLat: v.optional(v.number()),
    currentLng: v.optional(v.number()),
    lastLocationAt: v.optional(v.number()),
    isActive: v.boolean(),
  }),

  bookingAssignments: defineTable({
    bookingId: v.id("bookings"),
    teamId: v.id("teams"),
    assignedByUserId: v.id("users"),
    assignedAt: v.number(),
    acceptedAt: v.optional(v.number()),
    arrivedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  }).index("by_booking_id", ["bookingId"])
    .index("by_team_id", ["teamId"]),

  activityLogs: defineTable({
    actorUserId: v.optional(v.id("users")),
    actorRole: v.optional(v.string()),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    action: v.string(),
    payload: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_entity", ["entityType", "entityId"])
    .index("by_created_at", ["createdAt"]),

  systemSettings: defineTable({
    key: v.string(),
    value: v.string(),
    updatedBy: v.optional(v.id("users")),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
});

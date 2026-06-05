/**
 * Dev/local seed helpers. INTERNAL ONLY — these mutations bypass auth so
 * they're safe to call from `npx convex run` during local setup. They are
 * NOT callable from the client.
 *
 * Usage (from repo root):
 *   npx convex run seed:seedDevData
 *   npx convex run seed:promoteToSuperadmin '{"email":"you@example.com"}'
 *   npx convex run seed:seedTestCustomer    # one fake customer + car + address
 *   npx convex run seed:resetAll            # ⚠️ wipes bookings/refunds/etc.
 */
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { hashPin } from "./pinHash";

const DEFAULT_SETTINGS: Array<{ key: string; value: string }> = [
  { key: "default_service_fee_pct", value: "5" },
  { key: "subscription_discount_pct", value: "15" },
  { key: "currency", value: "AED" },
  { key: "default_eta_min", value: "30" },
  { key: "default_eta_max", value: "45" },
  { key: "max_per_window", value: "3" },
  { key: "time_window_morning_start", value: "8" },
  { key: "time_window_morning_end", value: "12" },
  { key: "time_window_afternoon_start", value: "12" },
  { key: "time_window_afternoon_end", value: "16" },
  { key: "time_window_evening_start", value: "16" },
  { key: "time_window_evening_end", value: "20" },
];

const DEFAULT_WASH_TYPES = [
  {
    key: "basic",
    name: "Basic Wash",
    description: "Exterior rinse, soap, and dry.",
    basePrice: 50,
    durationMins: 25,
    features: ["Exterior wash", "Tire shine"],
    sortOrder: 1,
  },
  {
    key: "premium",
    name: "Premium Wash",
    description: "Exterior plus interior vacuum and dashboard wipe.",
    basePrice: 90,
    durationMins: 40,
    features: ["Exterior wash", "Tire shine", "Interior vacuum", "Dashboard wipe"],
    sortOrder: 2,
  },
  {
    key: "deluxe",
    name: "Deluxe Detail",
    description: "Full interior detail plus exterior wax.",
    basePrice: 180,
    durationMins: 75,
    features: ["All Premium features", "Interior shampoo", "Exterior wax", "Window polish"],
    sortOrder: 3,
  },
];

const DEFAULT_ZONES = [
  { name: "Marina", baseEtaMin: 20, baseEtaMax: 35 },
  { name: "Downtown", baseEtaMin: 25, baseEtaMax: 40 },
  { name: "JBR", baseEtaMin: 20, baseEtaMax: 30 },
  { name: "Business Bay", baseEtaMin: 25, baseEtaMax: 40 },
];

/**
 * Idempotent: writes all default system settings (only inserts keys that
 * don't already exist; existing rows are left alone).
 */
export const seedSystemSettings = internalMutation({
  args: {},
  handler: async (ctx) => {
    let created = 0, skipped = 0;
    for (const { key, value } of DEFAULT_SETTINGS) {
      const existing = await ctx.db
        .query("systemSettings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
      if (existing) {
        skipped++;
        continue;
      }
      await ctx.db.insert("systemSettings", {
        key,
        value,
        updatedAt: Date.now(),
      });
      created++;
    }
    return { created, skipped, total: DEFAULT_SETTINGS.length };
  },
});

/**
 * Idempotent: inserts the three default wash types if missing.
 */
export const seedWashTypes = internalMutation({
  args: {},
  handler: async (ctx) => {
    let created = 0, skipped = 0;
    for (const wt of DEFAULT_WASH_TYPES) {
      const existing = await ctx.db
        .query("washTypes")
        .withIndex("by_key", (q) => q.eq("key", wt.key))
        .first();
      if (existing) {
        skipped++;
        continue;
      }
      await ctx.db.insert("washTypes", {
        ...wt,
        currency: "AED",
        isActive: true,
      });
      created++;
    }
    return { created, skipped, total: DEFAULT_WASH_TYPES.length };
  },
});

/**
 * Idempotent: inserts a few Dubai-area zones.
 */
export const seedZones = internalMutation({
  args: {},
  handler: async (ctx) => {
    let created = 0, skipped = 0;
    const existing = await ctx.db.query("zones").collect();
    const haveByName = new Set(existing.map((z: any) => z.name));
    for (const z of DEFAULT_ZONES) {
      if (haveByName.has(z.name)) {
        skipped++;
        continue;
      }
      await ctx.db.insert("zones", {
        name: z.name,
        baseEtaMin: z.baseEtaMin,
        baseEtaMax: z.baseEtaMax,
        driversAvailable: 0,
        status: "active",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as any);
      created++;
    }
    return { created, skipped, total: DEFAULT_ZONES.length };
  },
});

/**
 * Creates one demo team with PIN "1234". Idempotent on phone number.
 * Uses bcrypt via the same code path the admin UI uses.
 */
export const seedDemoTeam = internalMutation({
  args: {
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    pin: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const name = args.name ?? "Demo Crew";
    const phone = args.phone ?? "+971500000001";
    const pin = args.pin ?? "1234";

    const existing = await ctx.db
      .query("teams")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .first();
    if (existing) {
      return { teamId: existing._id, created: false };
    }

    const { hash, salt } = await hashPin(pin);

    const teamId = await ctx.db.insert("teams", {
      name,
      phone,
      pinHash: hash,
      pinSalt: salt,
      status: "available",
      isActive: true,
    } as any);
    return { teamId, created: true, phone, pin };
  },
});

/**
 * One-shot dev seed. Calls every seed helper above. Safe to re-run.
 */
export const seedDevData = internalMutation({
  args: {},
  handler: async (ctx): Promise<{
    settings: { created: number; skipped: number; total: number };
    washTypes: { created: number; skipped: number; total: number };
    zones: { created: number; skipped: number; total: number };
    team: { teamId: any; created: boolean; phone?: string; pin?: string };
  }> => {
    const settings = await ctx.runMutation(internal.seed.seedSystemSettings, {});
    const washTypes = await ctx.runMutation(internal.seed.seedWashTypes, {});
    const zones = await ctx.runMutation(internal.seed.seedZones, {});
    const team = await ctx.runMutation(internal.seed.seedDemoTeam, {});
    return { settings, washTypes, zones, team };
  },
});

/**
 * Promote any existing user (matched by email) to superadmin. Use this
 * right after you first log in to the admin panel — Clerk creates your
 * user as a customer; this elevates you.
 */
export const promoteToSuperadmin = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user) {
      throw new Error(
        `No user found with email ${args.email}. Sign in to the admin or mobile app first so Clerk creates a user record, then re-run.`,
      );
    }
    await ctx.db.patch(user._id, { role: "superadmin" });
    return { userId: user._id, previousRole: user.role };
  },
});

/**
 * Optional: insert a test customer with one car and one address.
 * Useful to verify the customer flow without going through Clerk on mobile.
 * The customer can't sign in (no real clerkId), but you can use admin's
 * "Create Manual Booking" to make bookings on their behalf.
 */
export const seedTestCustomer = internalMutation({
  args: {
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email ?? "test.customer@wosh.dev";
    const name = args.name ?? "Test Customer";

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existing) {
      return { userId: existing._id, created: false };
    }
    const userId = await ctx.db.insert("users", {
      clerkId: `seed:${email}`,
      email,
      name,
      phone: "+971501234567",
      role: "customer",
      isActive: true,
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
    });
    const addressId = await ctx.db.insert("addresses", {
      userId,
      label: "Home",
      formattedAddress: "Marina Heights, Tower 2, Dubai Marina",
      apartmentOrVilla: "Apt 1204",
      buildingOrCommunity: "Marina Heights",
      latitude: 25.0772,
      longitude: 55.1373,
      isDefault: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.db.patch(userId, { defaultAddressId: addressId });
    await ctx.db.insert("cars", {
      userId,
      nickname: "My Camry",
      make: "Toyota",
      model: "Camry",
      year: 2022,
      plateNumber: "ABC1234",
      plateRegion: "dubai",
      color: "white",
      isActive: true,
      createdAt: Date.now(),
    });
    return { userId, addressId, created: true, email };
  },
});

/**
 * ⚠️ DANGEROUS: wipes bookings, bookingCars, bookingPhotos, refunds,
 * activityLogs, dashboardSnapshots. Leaves users, teams, washTypes,
 * zones, settings alone. Use to reset local test data quickly.
 */
export const resetAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "bookings",
      "bookingCars",
      "bookingPhotos",
      "refunds",
      "activityLogs",
      "dashboardSnapshots",
      "subscriptions",
      "teamSessions",
      "teamLocations",
      "teamLoginAttempts",
    ] as const;
    const counts: Record<string, number> = {};
    for (const table of tables) {
      const rows = await ctx.db.query(table as any).collect();
      for (const r of rows) await ctx.db.delete(r._id);
      counts[table] = rows.length;
    }
    return { deleted: counts };
  },
});

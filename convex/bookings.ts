import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

const TEAM_STATUS_TRANSITIONS: Record<string, string[]> = {
  team_assigned: ["on_the_way"],
  on_the_way: ["arrived"],
  arrived: ["washing_in_progress"],
  washing_in_progress: ["completed"],
};

function generateBookingNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CW-${timestamp}-${random}`;
}

const AVG_SPEED_KM_PER_MIN = 0.4;
const SERVICE_TIME_PADDING_MIN = 5;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getOwnedActiveUniqueCarIds(
  ctx: any,
  userId: any,
  carIds: any[],
) {
  const uniqueCarIds = Array.from(new Set(carIds));
  if (uniqueCarIds.length === 0) {
    throw new Error("Select at least one car");
  }

  for (const carId of uniqueCarIds) {
    const car = await ctx.db.get(carId);
    if (!car || car.userId !== userId || car.isActive === false) {
      throw new Error("Car not found");
    }
  }

  return uniqueCarIds;
}

async function assertTeamStatusUpdateAllowed(
  ctx: any,
  booking: any,
  bookingId: any,
  nextStatus: string,
) {
  if (booking.status === nextStatus) return;

  const allowedStatuses = TEAM_STATUS_TRANSITIONS[booking.status] || [];
  if (!allowedStatuses.includes(nextStatus)) {
    throw new Error(`Cannot move booking from ${booking.status} to ${nextStatus}`);
  }

  if (nextStatus === "arrived" || nextStatus === "completed") {
    const photos = await ctx.db
      .query("bookingPhotos")
      .withIndex("by_booking_id", (q: any) => q.eq("bookingId", bookingId))
      .collect();

    if (nextStatus === "arrived") {
      const hasCarPhoto = photos.some((photo: any) => photo.type === "arrival_car");
      const hasLocationPhoto = photos.some((photo: any) => photo.type === "arrival_location");
      if (!hasCarPhoto || !hasLocationPhoto) {
        throw new Error("Arrival car and location photos are required before marking arrived");
      }
    }

    if (nextStatus === "completed") {
      const hasCompletionPhoto = photos.some((photo: any) => photo.type === "completion");
      if (!hasCompletionPhoto) {
        throw new Error("Completion photo is required before completing the booking");
      }
    }
  }
}

async function getDefaultEta(ctx: any) {
  const settings = await ctx.db.query("systemSettings").collect();
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;
  return {
    min: parseInt(map["default_eta_min"] || "30", 10),
    max: parseInt(map["default_eta_max"] || "45", 10),
  };
}

export const getLiveTracking = query({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return null;

    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.userId !== user._id) return null;

    const address = await ctx.db.get(booking.addressId);
    if (!address) return null;

    let team: any = null;
    let distanceKm: number | null = null;
    let liveEtaMin: number | null = null;
    let liveEtaMax: number | null = null;

    if (booking.assignedTeamId) {
      const t = await ctx.db.get(booking.assignedTeamId);
      if (t) {
        team = {
          _id: t._id,
          name: t.name,
          status: t.status,
          currentLat: t.currentLat ?? null,
          currentLng: t.currentLng ?? null,
          lastLocationAt: t.lastLocationAt ?? null,
        };
        if (
          typeof t.currentLat === "number" &&
          typeof t.currentLng === "number"
        ) {
          distanceKm = haversineKm(
            t.currentLat,
            t.currentLng,
            address.latitude,
            address.longitude,
          );
          const travelMin = Math.ceil(distanceKm / AVG_SPEED_KM_PER_MIN);
          liveEtaMin = Math.max(2, travelMin + SERVICE_TIME_PADDING_MIN);
          liveEtaMax =
            liveEtaMin + Math.max(3, Math.ceil(liveEtaMin * 0.3));
        }
      }
    }

    return {
      bookingId: booking._id,
      status: booking.status,
      bookingNumber: booking.bookingNumber,
      destination: {
        latitude: address.latitude,
        longitude: address.longitude,
        formattedAddress: address.formattedAddress,
      },
      team,
      distanceKm,
      liveEtaMin,
      liveEtaMax,
      storedEtaMin: booking.etaMin ?? null,
      storedEtaMax: booking.etaMax ?? null,
    };
  },
});

export const getEtaPreview = query({
  args: { addressId: v.optional(v.id("addresses")) },
  handler: async (ctx, args) => {
    const fallback = await getDefaultEta(ctx);

    if (!args.addressId) return fallback;
    const address = await ctx.db.get(args.addressId);
    if (!address) return fallback;

    const teams = await ctx.db.query("teams").collect();
    const available = teams.filter(
      (t) =>
        t.isActive &&
        t.status === "available" &&
        typeof t.currentLat === "number" &&
        typeof t.currentLng === "number",
    );
    if (available.length === 0) return fallback;

    let minDistance = Infinity;
    for (const t of available) {
      const d = haversineKm(
        t.currentLat!,
        t.currentLng!,
        address.latitude,
        address.longitude,
      );
      if (d < minDistance) minDistance = d;
    }

    const travelMin = Math.ceil(minDistance / AVG_SPEED_KM_PER_MIN);
    const etaMin = Math.max(5, travelMin + SERVICE_TIME_PADDING_MIN);
    const etaMax = etaMin + Math.max(5, Math.ceil(etaMin * 0.3));
    return { min: etaMin, max: etaMax };
  },
});

export const listMyBookings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100);

    return await Promise.all(
      bookings.map(async (booking) => {
        const washType = await ctx.db.get(booking.washTypeId);
        const address = await ctx.db.get(booking.addressId);
        const team = booking.assignedTeamId ? await ctx.db.get(booking.assignedTeamId) : null;

        return {
          ...booking,
          washType,
          address,
          team,
        };
      })
    );
  },
});

export const getMyBookingDetail = query({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.userId !== user._id) return null;

    const address = await ctx.db.get(booking.addressId);
    const washType = await ctx.db.get(booking.washTypeId);
    const bookingCars = await ctx.db
      .query("bookingCars")
      .withIndex("by_booking_id", (q) => q.eq("bookingId", args.bookingId))
      .collect();

    const cars = await Promise.all(bookingCars.map((bc) => ctx.db.get(bc.carId)));
    const team = booking.assignedTeamId ? await ctx.db.get(booking.assignedTeamId) : null;

    // Get completion photos
    const bookingPhotos = await ctx.db
      .query("bookingPhotos")
      .withIndex("by_booking_id", (q) => q.eq("bookingId", args.bookingId))
      .collect();

    const photosWithUrls = await Promise.all(
      bookingPhotos.map(async (photo) => {
        const url = await ctx.storage.getUrl(photo.storageId);
        return { ...photo, url };
      })
    );

    return {
      ...booking,
      address,
      washType,
      cars: cars.filter(Boolean),
      team,
      photos: photosWithUrls,
    };
  },
});

export const createBookingDraft = mutation({
  args: {
    addressId: v.id("addresses"),
    washTypeId: v.id("washTypes"),
    carIds: v.array(v.id("cars")),
    scheduledWindow: v.optional(v.union(v.literal("morning"), v.literal("afternoon"), v.literal("evening"))),
    scheduledDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const washType = await ctx.db.get(args.washTypeId);
    if (!washType) throw new Error("Wash type not found");

    const address = await ctx.db.get(args.addressId);
    if (!address) throw new Error("Address not found");
    if (address.userId !== user._id) throw new Error("Address not found");

    const uniqueCarIds = await getOwnedActiveUniqueCarIds(ctx, user._id, args.carIds);
    const carCount = uniqueCarIds.length;
    const subtotal = washType.basePrice * carCount;
    const serviceFee = 0;
    const discount = 0;
    const total = subtotal + serviceFee - discount;

    let scheduledFor: number | undefined;
    if (args.scheduledWindow && args.scheduledDate) {
      const date = new Date(args.scheduledDate);
      const windowTimes: Record<string, { start: number; end: number }> = {
        morning: { start: 8, end: 12 },
        afternoon: { start: 12, end: 16 },
        evening: { start: 16, end: 20 },
      };
      const window = windowTimes[args.scheduledWindow];
      date.setHours(window.start, 0, 0, 0);
      scheduledFor = date.getTime();
    }

    // Calculate ETA based on zone settings
    const settings = await ctx.db.query("systemSettings").collect();
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    const defaultEtaMin = parseInt(settingsMap["default_eta_min"] || "30", 10);
    const defaultEtaMax = parseInt(settingsMap["default_eta_max"] || "45", 10);

    // Simple zone-based ETA: check if address matches any zone
    // For MVP: zone is matched if the formattedAddress contains zone keywords
    const zoneOverrides = await ctx.db.query("systemSettings").withIndex("by_key", (q) => q.eq("key", "zone_etas")).first();
    let etaMin = defaultEtaMin;
    let etaMax = defaultEtaMax;

    if (zoneOverrides) {
      try {
        const zoneData = JSON.parse(zoneOverrides.value);
        for (const [zone, eta] of Object.entries(zoneData as Record<string, { min: number; max: number }>)) {
          if (address.formattedAddress.toLowerCase().includes(zone.toLowerCase())) {
            etaMin = eta.min;
            etaMax = eta.max;
            break;
          }
        }
      } catch {
        // Use default ETA if zone parsing fails
      }
    }

    const bookingId = await ctx.db.insert("bookings", {
      bookingNumber: generateBookingNumber(),
      userId: user._id,
      addressId: args.addressId,
      washTypeId: args.washTypeId,
      status: "confirmed", // AUTO-CONFIRM: no fake payment step
      selectedCarCount: carCount,
      subtotal,
      serviceFee,
      discount,
      total,
      currency: washType.currency,
      paymentStatus: "succeeded", // Mark as paid (until Stripe integration)
      etaMin,
      etaMax,
      scheduledFor,
      scheduledWindow: args.scheduledWindow,
      scheduledDate: args.scheduledDate,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    for (const carId of uniqueCarIds) {
      await ctx.db.insert("bookingCars", {
        bookingId,
        carId,
      });
    }

    await ctx.db.insert("activityLogs", {
      actorUserId: user._id,
      actorRole: user.role,
      entityType: "booking",
      entityId: bookingId.toString(),
      action: "confirmed", // Auto-confirmed booking
      createdAt: Date.now(),
    });

    // Auto-assign closest available team (inline to avoid scheduler issues)
    try {
      const booking = await ctx.db.get(bookingId);
      if (booking && address.latitude && address.longitude) {
        const teams = await ctx.db.query("teams").collect();
        const availableTeams = teams.filter((t) => t.isActive && t.status === "available" && t.currentLat && t.currentLng);

        if (availableTeams.length > 0) {
          const candidateTeams: { team: typeof availableTeams[0]; distance: number; windowCount: number }[] = [];

          for (const team of availableTeams) {
            if (team.currentLat && team.currentLng) {
              const R = 6371;
              const dLat = (address.latitude - team.currentLat) * Math.PI / 180;
              const dLon = (address.longitude - team.currentLng) * Math.PI / 180;
              const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(team.currentLat * Math.PI / 180) * Math.cos(address.latitude * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              const distance = R * c;

              let windowCount = 0;
              if (args.scheduledWindow && args.scheduledDate) {
                const bookingStart = new Date(args.scheduledDate);
                const windowStarts: Record<string, number> = { morning: 8, afternoon: 12, evening: 16 };
                bookingStart.setHours(windowStarts[args.scheduledWindow], 0, 0, 0);
                const bookingEnd = new Date(bookingStart);
                bookingEnd.setHours(bookingEnd.getHours() + 4);

                const teamBookings = await ctx.db.query("bookings")
                  .filter((q) => q.eq(q.field("assignedTeamId"), team._id))
                  .collect();

                for (const tb of teamBookings) {
                  if (tb.scheduledWindow === args.scheduledWindow && tb.scheduledDate) {
                    const tbStart = new Date(tb.scheduledDate);
                    const tbWindowStarts: Record<string, number> = { morning: 8, afternoon: 12, evening: 16 };
                    tbStart.setHours(tbWindowStarts[tb.scheduledWindow], 0, 0, 0);
                    const tbEnd = new Date(tbStart);
                    tbEnd.setHours(tbEnd.getHours() + 4);

                    if (tbStart.getTime() < bookingEnd.getTime() && tbEnd.getTime() > bookingStart.getTime()) {
                      windowCount++;
                    }
                  }
                }
              }

              candidateTeams.push({ team, distance, windowCount });
            }
          }

          const MAX_PER_WINDOW = parseInt(settingsMap["max_per_window"] || "3", 10);
          const eligibleTeams = candidateTeams.filter((ct) => ct.windowCount < MAX_PER_WINDOW);

          if (eligibleTeams.length > 0) {
            eligibleTeams.sort((a, b) => a.distance - b.distance);
            const best = eligibleTeams[0];

            const travelMin = Math.ceil(best.distance / AVG_SPEED_KM_PER_MIN);
            const assignedEtaMin = Math.max(5, travelMin + SERVICE_TIME_PADDING_MIN);
            const assignedEtaMax = assignedEtaMin + Math.max(5, Math.ceil(assignedEtaMin * 0.3));

            await ctx.db.patch(bookingId, {
              status: "team_assigned",
              assignedTeamId: best.team._id,
              etaMin: assignedEtaMin,
              etaMax: assignedEtaMax,
            });
            await ctx.db.patch(best.team._id, { status: "busy" });
            await ctx.db.insert("activityLogs", {
              actorUserId: undefined,
              actorRole: "system",
              entityType: "booking",
              entityId: bookingId.toString(),
              action: "auto_assigned_team",
              payload: JSON.stringify({ teamName: best.team.name, distanceKm: best.distance.toFixed(2) }),
              createdAt: Date.now(),
            });

            // Send notification to team
            if (best.team.pushToken) {
              try {
                const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
                const dateStr = args.scheduledDate ? new Date(args.scheduledDate).toLocaleDateString() : "Today";
                const windowLabel = args.scheduledWindow
                  ? `${args.scheduledWindow} (${dateStr})`
                  : "Immediate";
                await fetch(EXPO_PUSH_URL, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    to: best.team.pushToken,
                    title: "New Booking Assigned!",
                    body: `${address.formattedAddress} - ${windowLabel}`,
                    data: { bookingId: bookingId, type: "new_booking" },
                    sound: "default",
                  }),
                });
              } catch (e) {
                console.error("[Push] Failed to send notification:", e);
              }
            }

            console.log(`[AutoAssign] Assigned ${best.team.name} (${best.distance.toFixed(2)}km, ${best.windowCount} in window) to ${booking.bookingNumber}`);
          } else if (candidateTeams.length > 0) {
            candidateTeams.sort((a, b) => a.distance - b.distance);
            const best = candidateTeams[0];
            console.log(`[AutoAssign] All teams at capacity for window ${args.scheduledWindow}, assigning ${best.team.name} anyway (over capacity)`);

            await ctx.db.patch(bookingId, {
              status: "team_assigned",
              assignedTeamId: best.team._id,
            });
            await ctx.db.patch(best.team._id, { status: "busy" });
            await ctx.db.insert("activityLogs", {
              actorUserId: undefined,
              actorRole: "system",
              entityType: "booking",
              entityId: bookingId.toString(),
              action: "auto_assigned_team_over_capacity",
              payload: JSON.stringify({ teamName: best.team.name, distanceKm: best.distance.toFixed(2) }),
              createdAt: Date.now(),
            });
          } else {
            console.log(`[AutoAssign] No teams with location found for ${booking.bookingNumber}`);
          }
        }
      }
    } catch (e) {
      console.error("[AutoAssign] Error:", e);
    }

    return bookingId;
  },
});

export const attachCarsToBooking = mutation({
  args: {
    bookingId: v.id("bookings"),
    carIds: v.array(v.id("cars")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.userId !== user._id) throw new Error("Booking not found");

    const existingCars = await ctx.db
      .query("bookingCars")
      .withIndex("by_booking_id", (q) => q.eq("bookingId", args.bookingId))
      .collect();

    const uniqueCarIds = await getOwnedActiveUniqueCarIds(ctx, user._id, args.carIds);

    for (const car of existingCars) {
      await ctx.db.delete(car._id);
    }

    for (const carId of uniqueCarIds) {
      await ctx.db.insert("bookingCars", {
        bookingId: args.bookingId,
        carId,
      });
    }

    const washType = await ctx.db.get(booking.washTypeId);
    if (washType) {
      const carCount = uniqueCarIds.length;
      const subtotal = washType.basePrice * carCount;
      const total = subtotal + booking.serviceFee - booking.discount;

      await ctx.db.patch(args.bookingId, {
        selectedCarCount: carCount,
        subtotal,
        total,
        updatedAt: Date.now(),
      });
    }
  },
});

export const setBookingLocation = mutation({
  args: {
    bookingId: v.id("bookings"),
    addressId: v.id("addresses"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.userId !== user._id) throw new Error("Booking not found");

    const address = await ctx.db.get(args.addressId);
    if (!address || address.userId !== user._id) throw new Error("Address not found");

    await ctx.db.patch(args.bookingId, {
      addressId: args.addressId,
      updatedAt: Date.now(),
    });
  },
});

export const confirmBookingAfterPayment = mutation({
  args: {
    bookingId: v.id("bookings"),
    paymentIntentId: v.string(),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    await ctx.db.patch(args.bookingId, {
      status: "confirmed",
      paymentStatus: "succeeded",
      paymentIntentId: args.paymentIntentId,
      updatedAt: Date.now(),
    });

    const user = await ctx.db.get(booking.userId);
    await ctx.db.insert("activityLogs", {
      actorUserId: booking.userId,
      actorRole: user?.role,
      entityType: "booking",
      entityId: booking._id.toString(),
      action: "confirmed",
      payload: JSON.stringify({ paymentIntentId: args.paymentIntentId }),
      createdAt: Date.now(),
    });
  },
});

export const cancelBooking = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.userId !== user._id) throw new Error("Booking not found");

    if (["completed", "canceled"].includes(booking.status)) {
      throw new Error("Cannot cancel this booking");
    }

    await ctx.db.patch(args.bookingId, {
      status: "canceled",
      paymentStatus: "canceled",
      updatedAt: Date.now(),
    });

    await ctx.db.insert("activityLogs", {
      actorUserId: user._id,
      actorRole: user.role,
      entityType: "booking",
      entityId: args.bookingId.toString(),
      action: "canceled",
      createdAt: Date.now(),
    });
  },
});

export const adminListBookings = query({
  args: {
    status: v.optional(v.string()),
    searchQuery: v.optional(v.string()),
  },
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

    let bookings = args.status
      ? await ctx.db
          .query("bookings")
          .withIndex("by_status", (q) => q.eq("status", args.status as any))
          .order("desc")
          .take(1000)
      : await ctx.db.query("bookings").order("desc").take(1000);

    const enrichedBookings = await Promise.all(
      bookings.map(async (booking) => {
        const user = await ctx.db.get(booking.userId);
        const address = await ctx.db.get(booking.addressId);
        const washType = await ctx.db.get(booking.washTypeId);
        const team = booking.assignedTeamId ? await ctx.db.get(booking.assignedTeamId) : null;
        const bookingCars = await ctx.db
          .query("bookingCars")
          .withIndex("by_booking_id", (q) => q.eq("bookingId", booking._id))
          .collect();
        const cars = await Promise.all(bookingCars.map((bc) => ctx.db.get(bc.carId)));

        return {
          ...booking,
          user: user ? { _id: user._id, name: user.name, email: user.email, phone: user.phone } : null,
          address,
          washType,
          team,
          cars: cars.filter(Boolean).map((car: any) => ({
            _id: car._id,
            make: car.make,
            model: car.model,
            plateNumber: car.plateNumber,
            plateRegion: car.plateRegion,
          })),
        };
      })
    );

    const filteredBookings = args.searchQuery
      ? enrichedBookings.filter((booking) => {
          const query = args.searchQuery!.toLowerCase();
          const searchable = [
            booking.bookingNumber,
            booking.user?.name,
            booking.user?.email,
            booking.user?.phone,
            booking.address?.formattedAddress,
            booking.washType?.name,
            ...(booking.cars || []).flatMap((car: any) => [
              car.make,
              car.model,
              car.plateNumber,
              car.plateRegion,
              car.plateRegion ? `${car.plateRegion} ${car.plateNumber}` : car.plateNumber,
            ]),
          ];
          return searchable.some((value) =>
            String(value || "").toLowerCase().includes(query),
          );
        })
      : enrichedBookings;

    return filteredBookings.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const adminGetBookingDetail = query({
  args: { bookingId: v.id("bookings") },
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

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    const user = await ctx.db.get(booking.userId);
    const address = await ctx.db.get(booking.addressId);
    const washType = await ctx.db.get(booking.washTypeId);
    const bookingCars = await ctx.db
      .query("bookingCars")
      .withIndex("by_booking_id", (q) => q.eq("bookingId", args.bookingId))
      .collect();

    const cars = await Promise.all(bookingCars.map((bc) => ctx.db.get(bc.carId)));
    const team = booking.assignedTeamId ? await ctx.db.get(booking.assignedTeamId) : null;

    const assignment = await ctx.db
      .query("bookingAssignments")
      .withIndex("by_booking_id", (q) => q.eq("bookingId", args.bookingId))
      .first();

    return {
      ...booking,
      user,
      address,
      washType,
      cars: cars.filter(Boolean),
      team,
      assignment,
    };
  },
});

export const adminUpdateBookingStatus = mutation({
  args: {
    bookingId: v.id("bookings"),
    status: v.union(
      v.literal("confirmed"),
      v.literal("team_assigned"),
      v.literal("on_the_way"),
      v.literal("arrived"),
      v.literal("washing_in_progress"),
      v.literal("completed"),
      v.literal("canceled"),
      v.literal("payment_failed")
    ),
  },
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

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    await ctx.db.patch(args.bookingId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("activityLogs", {
      actorUserId: adminUser._id,
      actorRole: adminUser.role,
      entityType: "booking",
      entityId: args.bookingId.toString(),
      action: `status_changed_to_${args.status}`,
      createdAt: Date.now(),
    });
  },
});

export const adminAssignTeam = mutation({
  args: {
    bookingId: v.id("bookings"),
    teamId: v.id("teams"),
  },
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

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Team not found");

    // Get customer and address for notification
    const customer = await ctx.db.get(booking.userId);
    const address = await ctx.db.get(booking.addressId);

    await ctx.db.patch(args.bookingId, {
      status: "team_assigned",
      assignedTeamId: args.teamId,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("bookingAssignments", {
      bookingId: args.bookingId,
      teamId: args.teamId,
      assignedByUserId: adminUser._id,
      assignedAt: Date.now(),
    });

    await ctx.db.patch(team._id, { status: "busy" });

    await ctx.db.insert("activityLogs", {
      actorUserId: adminUser._id,
      actorRole: adminUser.role,
      entityType: "booking",
      entityId: args.bookingId.toString(),
      action: "team_assigned",
      payload: JSON.stringify({ teamId: args.teamId.toString(), teamName: team.name }),
      createdAt: Date.now(),
    });

    // Send push notification to team if they have a push token
    if (team.pushToken) {
      try {
        const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
        const dateStr = booking.scheduledDate ? new Date(booking.scheduledDate).toLocaleDateString() : "Today";
        const windowLabel = booking.scheduledWindow
          ? `${booking.scheduledWindow} (${dateStr})`
          : "Immediate";

        await fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: team.pushToken,
            title: "New Booking Assigned!",
            body: `${customer?.name || "Customer"} - ${address?.formattedAddress || "Unknown address"} - ${windowLabel}`,
            data: { bookingId: args.bookingId, type: "new_booking" },
            sound: "default",
          }),
        });
        console.log(`[Push] Sent notification to team ${team.name}`);
      } catch (error) {
        console.error("[Push] Failed to send notification:", error);
      }
    }
  },
});

export const recomputeActiveBookingEtas = internalMutation({
  args: {},
  handler: async (ctx) => {
    const statuses = ["team_assigned", "on_the_way"] as const;
    let updated = 0;
    for (const status of statuses) {
      const bookings = await ctx.db
        .query("bookings")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();

      for (const booking of bookings) {
        if (!booking.assignedTeamId) continue;
        const team = await ctx.db.get(booking.assignedTeamId);
        if (
          !team ||
          typeof team.currentLat !== "number" ||
          typeof team.currentLng !== "number"
        )
          continue;
        const address = await ctx.db.get(booking.addressId);
        if (!address) continue;

        const distance = haversineKm(
          team.currentLat,
          team.currentLng,
          address.latitude,
          address.longitude,
        );

        if (status === "team_assigned" && distance < 0.3) continue;
        if (status === "on_the_way" && distance < 0.1) continue;

        const travelMin = Math.ceil(distance / AVG_SPEED_KM_PER_MIN);
        const newMin = Math.max(2, travelMin + SERVICE_TIME_PADDING_MIN);
        const newMax = newMin + Math.max(3, Math.ceil(newMin * 0.3));

        if (booking.etaMin === newMin && booking.etaMax === newMax) continue;

        await ctx.db.patch(booking._id, {
          etaMin: newMin,
          etaMax: newMax,
          updatedAt: Date.now(),
        });
        updated++;
      }
    }
    return { updated };
  },
});

export const adminAutoReassign = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (
      !adminUser ||
      (adminUser.role !== "admin" &&
        adminUser.role !== "superadmin" &&
        adminUser.role !== "operator")
    ) {
      throw new Error("Forbidden");
    }

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");
    const address = await ctx.db.get(booking.addressId);
    if (!address) throw new Error("Address not found");

    if (booking.assignedTeamId) {
      const prev = await ctx.db.get(booking.assignedTeamId);
      if (prev && prev.status === "busy") {
        await ctx.db.patch(booking.assignedTeamId, { status: "available" });
      }
    }

    const teams = await ctx.db.query("teams").collect();
    const candidates = teams.filter(
      (t) =>
        t.isActive &&
        t.status === "available" &&
        typeof t.currentLat === "number" &&
        typeof t.currentLng === "number",
    );
    if (candidates.length === 0) {
      throw new Error("No available teams with location data");
    }

    let best: { team: (typeof candidates)[number]; distance: number } | null =
      null;
    for (const t of candidates) {
      const distance = haversineKm(
        t.currentLat!,
        t.currentLng!,
        address.latitude,
        address.longitude,
      );
      if (!best || distance < best.distance) best = { team: t, distance };
    }
    if (!best) throw new Error("No suitable team found");

    const travelMin = Math.ceil(best.distance / AVG_SPEED_KM_PER_MIN);
    const etaMin = Math.max(5, travelMin + SERVICE_TIME_PADDING_MIN);
    const etaMax = etaMin + Math.max(5, Math.ceil(etaMin * 0.3));

    await ctx.db.patch(args.bookingId, {
      status: "team_assigned",
      assignedTeamId: best.team._id,
      etaMin,
      etaMax,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(best.team._id, { status: "busy" });
    await ctx.db.insert("bookingAssignments", {
      bookingId: args.bookingId,
      teamId: best.team._id,
      assignedByUserId: adminUser._id,
      assignedAt: Date.now(),
    });
    await ctx.db.insert("activityLogs", {
      actorUserId: adminUser._id,
      actorRole: adminUser.role,
      entityType: "booking",
      entityId: args.bookingId.toString(),
      action: "admin_auto_reassigned",
      payload: JSON.stringify({
        teamName: best.team.name,
        distanceKm: best.distance.toFixed(2),
      }),
      createdAt: Date.now(),
    });

    if (best.team.pushToken) {
      try {
        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: best.team.pushToken,
            title: "New Booking Assigned!",
            body: `${address.formattedAddress}`,
            data: { bookingId: args.bookingId, type: "new_booking" },
            sound: "default",
          }),
        });
      } catch (e) {
        console.error("[Push] reassign notify failed", e);
      }
    }

    return {
      teamId: best.team._id,
      teamName: best.team.name,
      distanceKm: best.distance,
      etaMin,
      etaMax,
    };
  },
});

export const adminBulkAutoAssign = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (
      !adminUser ||
      (adminUser.role !== "admin" &&
        adminUser.role !== "superadmin" &&
        adminUser.role !== "operator")
    ) {
      throw new Error("Forbidden");
    }

    const unassigned = await ctx.db
      .query("bookings")
      .withIndex("by_status", (q) => q.eq("status", "confirmed"))
      .collect();

    let assigned = 0;
    let skipped = 0;

    for (const booking of unassigned) {
      if (booking.assignedTeamId) {
        skipped++;
        continue;
      }
      const address = await ctx.db.get(booking.addressId);
      if (!address) {
        skipped++;
        continue;
      }
      const teams = await ctx.db.query("teams").collect();
      const candidates = teams.filter(
        (t) =>
          t.isActive &&
          t.status === "available" &&
          typeof t.currentLat === "number" &&
          typeof t.currentLng === "number",
      );
      if (candidates.length === 0) {
        skipped++;
        continue;
      }
      let best: { team: (typeof candidates)[number]; distance: number } | null =
        null;
      for (const t of candidates) {
        const distance = haversineKm(
          t.currentLat!,
          t.currentLng!,
          address.latitude,
          address.longitude,
        );
        if (!best || distance < best.distance) best = { team: t, distance };
      }
      if (!best) {
        skipped++;
        continue;
      }
      const travelMin = Math.ceil(best.distance / AVG_SPEED_KM_PER_MIN);
      const etaMin = Math.max(5, travelMin + SERVICE_TIME_PADDING_MIN);
      const etaMax = etaMin + Math.max(5, Math.ceil(etaMin * 0.3));
      await ctx.db.patch(booking._id, {
        status: "team_assigned",
        assignedTeamId: best.team._id,
        etaMin,
        etaMax,
        updatedAt: Date.now(),
      });
      await ctx.db.patch(best.team._id, { status: "busy" });
      await ctx.db.insert("bookingAssignments", {
        bookingId: booking._id,
        teamId: best.team._id,
        assignedByUserId: adminUser._id,
        assignedAt: Date.now(),
      });
      assigned++;
    }

    return { assigned, skipped };
  },
});

export const adminConfirmBooking = mutation({
  args: {
    bookingId: v.id("bookings"),
  },
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

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    if (booking.status !== "booked") {
      throw new Error("Can only confirm bookings with 'booked' status");
    }

    await ctx.db.patch(args.bookingId, {
      status: "confirmed",
      updatedAt: Date.now(),
    });

    await ctx.db.insert("activityLogs", {
      actorUserId: adminUser._id,
      actorRole: adminUser.role,
      entityType: "booking",
      entityId: args.bookingId.toString(),
      action: "admin_confirmed",
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const adminRejectBooking = mutation({
  args: {
    bookingId: v.id("bookings"),
    reason: v.string(),
  },
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

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    if (booking.status !== "booked") {
      throw new Error("Can only reject bookings with 'booked' status");
    }

    await ctx.db.patch(args.bookingId, {
      status: "rejected",
      rejectionReason: args.reason,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("activityLogs", {
      actorUserId: adminUser._id,
      actorRole: adminUser.role,
      entityType: "booking",
      entityId: args.bookingId.toString(),
      action: "admin_rejected",
      payload: JSON.stringify({ reason: args.reason }),
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const adminDashboardMetrics = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return {
        totalBookingsToday: 0,
        activeBookings: 0,
        totalUsers: 0,
        activeSubscriptions: 0,
        availableTeams: 0,
        totalTeams: 0,
        todayRevenue: 0,
        failedPayments: 0,
      };
    }

    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "superadmin")) {
      return {
        totalBookingsToday: 0,
        activeBookings: 0,
        totalUsers: 0,
        activeSubscriptions: 0,
        availableTeams: 0,
        totalTeams: 0,
        todayRevenue: 0,
        failedPayments: 0,
      };
    }

    const bookings = await ctx.db.query("bookings").take(2000);
    const users = await ctx.db.query("users").take(2000);
    const subscriptions = await ctx.db.query("subscriptions").take(2000);
    const teams = await ctx.db.query("teams").take(500);

    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);

    const todayBookings = bookings.filter((b) => b.createdAt >= todayStart);
    const activeBookings = bookings.filter((b) =>
      ["confirmed", "team_assigned", "on_the_way", "arrived", "washing_in_progress"].includes(b.status)
    );
    const activeSubscriptions = subscriptions.filter((s) => s.status === "active");
    const availableTeams = teams.filter((t) => t.status === "available" && t.isActive);

    const todayRevenue = todayBookings
      .filter((b) => b.paymentStatus === "succeeded")
      .reduce((sum, b) => sum + b.total, 0);

    const failedPayments = bookings.filter((b) => b.paymentStatus === "failed").length;

    // Weekly revenue
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekBookings = bookings.filter((b) => b.createdAt >= weekStart.getTime() && b.paymentStatus === "succeeded");
    const weekRevenue = weekBookings.reduce((sum, b) => sum + b.total, 0);

    // Monthly revenue
    const monthStart = new Date();
    monthStart.setMonth(monthStart.getMonth() - 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthBookings = bookings.filter((b) => b.createdAt >= monthStart.getTime() && b.paymentStatus === "succeeded");
    const monthRevenue = monthBookings.reduce((sum, b) => sum + b.total, 0);

    // Last 7 days bookings for chart
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dayStart = new Date(date).setHours(0, 0, 0, 0);
      const dayEnd = new Date(date).setHours(23, 59, 59, 999);
      const dayBookings = bookings.filter((b) => b.createdAt >= dayStart && b.createdAt <= dayEnd);
      return {
        date: date.toLocaleDateString("en-US", { weekday: "short" }),
        bookings: dayBookings.length,
        revenue: dayBookings.filter((b) => b.paymentStatus === "succeeded").reduce((sum, b) => sum + b.total, 0),
      };
    });

    // Recent bookings (last 10)
    const recentBookings = await Promise.all(
      bookings
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10)
        .map(async (booking) => {
          const user = await ctx.db.get(booking.userId);
          const washType = await ctx.db.get(booking.washTypeId);
          const address = await ctx.db.get(booking.addressId);

          const bookingCars = await ctx.db
            .query("bookingCars")
            .withIndex("by_booking_id", (q) => q.eq("bookingId", booking._id))
            .collect();
          const cars = await Promise.all(bookingCars.map((bc) => ctx.db.get(bc.carId)));

          const userBookings = bookings.filter((b) => b.userId === booking.userId);
          const userTotalSpend = userBookings
            .filter((b) => b.paymentStatus === "succeeded")
            .reduce((sum, b) => sum + b.total, 0);

          return {
            _id: booking._id,
            bookingNumber: booking.bookingNumber,
            status: booking.status,
            total: booking.total,
            currency: booking.currency,
            createdAt: booking.createdAt,
            user: user
              ? {
                  name: user.name,
                  email: user.email,
                  phone: user.phone,
                  totalBookings: userBookings.length,
                  totalSpend: userTotalSpend,
                }
              : null,
            washType: washType ? { name: washType.name } : null,
            address: address ? { formattedAddress: address.formattedAddress } : null,
            cars: cars.filter(Boolean).map((c: any) => ({
              make: c.make,
              model: c.model,
              year: c.year,
            })),
          };
        })
    );

    return {
      totalBookingsToday: todayBookings.length,
      activeBookings: activeBookings.length,
      totalUsers: users.filter((u) => u.role === "customer").length,
      activeSubscriptions: activeSubscriptions.length,
      availableTeams: availableTeams.length,
      totalTeams: teams.filter((t) => t.isActive).length,
      todayRevenue,
      weekRevenue,
      monthRevenue,
      failedPayments,
      last7Days,
      recentBookings,
    };
  },
});

export const teamListMyBookings = query({
  args: {
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.sessionId) {
      const session = await ctx.db
        .query("teamSessions")
        .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId!))
        .first();

      if (!session || session.expiresAt < Date.now()) return [];

      const team = await ctx.db.get(session.teamId);
      if (!team || !team.isActive) return [];

      // Use the index instead of scanning all bookings
      const teamBookings = await ctx.db
        .query("bookings")
        .withIndex("by_assigned_team", (q) => q.eq("assignedTeamId", session.teamId))
        .filter((q) =>
          q.or(
            q.eq(q.field("status"), "team_assigned"),
            q.eq(q.field("status"), "on_the_way"),
            q.eq(q.field("status"), "arrived"),
            q.eq(q.field("status"), "washing_in_progress")
          )
        )
        .collect();

      const enrichedBookings = await Promise.all(
        teamBookings.map(async (booking) => {
          const customer = await ctx.db.get(booking.userId);
          const address = await ctx.db.get(booking.addressId);
          const washType = await ctx.db.get(booking.washTypeId);
          const team = booking.assignedTeamId ? await ctx.db.get(booking.assignedTeamId) : null;
          const bookingCars = await ctx.db
            .query("bookingCars")
            .withIndex("by_booking_id", (q) => q.eq("bookingId", booking._id))
            .collect();
          const cars = await Promise.all(bookingCars.map((bc) => ctx.db.get(bc.carId)));

          return {
            ...booking,
            customer: customer ? { _id: customer._id, name: customer.name, email: customer.email, phone: customer.phone } : null,
            address,
            washType,
            team,
            cars: cars.filter(Boolean),
          };
        })
      );

      return enrichedBookings.sort((a, b) => b.createdAt - a.createdAt);
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "operator") return [];

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_status", (q) => q.eq("status", "team_assigned"))
      .collect();

    const teamBookings = bookings.filter((b) => b.assignedTeamId !== undefined);

    const enrichedBookings = await Promise.all(
      teamBookings.map(async (booking) => {
        const customer = await ctx.db.get(booking.userId);
        const address = await ctx.db.get(booking.addressId);
        const washType = await ctx.db.get(booking.washTypeId);
        const team = booking.assignedTeamId ? await ctx.db.get(booking.assignedTeamId) : null;
        const bookingCars = await ctx.db
          .query("bookingCars")
          .withIndex("by_booking_id", (q) => q.eq("bookingId", booking._id))
          .collect();
        const cars = await Promise.all(bookingCars.map((bc) => ctx.db.get(bc.carId)));

        return {
          ...booking,
          customer: customer ? { _id: customer._id, name: customer.name, email: customer.email, phone: customer.phone } : null,
          address,
          washType,
          team,
          cars: cars.filter(Boolean),
        };
      })
    );

    return enrichedBookings.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const teamGetBookingDetail = query({
  args: { bookingId: v.id("bookings"), sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.sessionId) {
      const session = await ctx.db
        .query("teamSessions")
        .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId!))
        .first();

      if (!session || session.expiresAt < Date.now()) throw new Error("Session expired");

      const booking = await ctx.db.get(args.bookingId);
      if (!booking || !booking.assignedTeamId || booking.assignedTeamId !== session.teamId) {
        throw new Error("Booking not found");
      }

      const customer = await ctx.db.get(booking.userId);
      const address = await ctx.db.get(booking.addressId);
      const washType = await ctx.db.get(booking.washTypeId);
      const team = booking.assignedTeamId ? await ctx.db.get(booking.assignedTeamId) : null;
      const bookingCars = await ctx.db
        .query("bookingCars")
        .withIndex("by_booking_id", (q) => q.eq("bookingId", args.bookingId))
        .collect();
      const cars = await Promise.all(bookingCars.map((bc) => ctx.db.get(bc.carId)));

      return {
        ...booking,
        customer,
        address,
        washType,
        team,
        cars: cars.filter(Boolean),
      };
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "operator") throw new Error("Forbidden");

    const booking = await ctx.db.get(args.bookingId);
    if (!booking || !booking.assignedTeamId) throw new Error("Booking not found");

    const customer = await ctx.db.get(booking.userId);
    const address = await ctx.db.get(booking.addressId);
    const washType = await ctx.db.get(booking.washTypeId);
    const team = booking.assignedTeamId ? await ctx.db.get(booking.assignedTeamId) : null;
    const bookingCars = await ctx.db
      .query("bookingCars")
      .withIndex("by_booking_id", (q) => q.eq("bookingId", args.bookingId))
      .collect();
    const cars = await Promise.all(bookingCars.map((bc) => ctx.db.get(bc.carId)));

    return {
      ...booking,
      customer,
      address,
      washType,
      team,
      cars: cars.filter(Boolean),
    };
  },
});

export const teamUpdateStatus = mutation({
  args: {
    bookingId: v.id("bookings"),
    status: v.union(
      v.literal("on_the_way"),
      v.literal("arrived"),
      v.literal("washing_in_progress"),
      v.literal("completed")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "operator") throw new Error("Forbidden");

    const booking = await ctx.db.get(args.bookingId);
    if (!booking || !booking.assignedTeamId) throw new Error("Booking not found");

    if (booking.status === args.status) {
      return { success: true };
    }
    await assertTeamStatusUpdateAllowed(ctx, booking, args.bookingId, args.status);

    await ctx.db.patch(args.bookingId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("activityLogs", {
      actorUserId: user._id,
      actorRole: user.role,
      entityType: "booking",
      entityId: args.bookingId.toString(),
      action: `team_status_changed_to_${args.status}`,
      createdAt: Date.now(),
    });

    if (args.status === "completed") {
      if (booking.assignedTeamId) {
        await ctx.db.patch(booking.assignedTeamId, { status: "available" });
      }
    }

    return { success: true };
  },
});

export const teamUpdateStatusWithSession = mutation({
  args: {
    sessionId: v.string(),
    bookingId: v.id("bookings"),
    status: v.union(
      v.literal("on_the_way"),
      v.literal("arrived"),
      v.literal("washing_in_progress"),
      v.literal("completed")
    ),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("teamSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Unauthorized");
    }

    const booking = await ctx.db.get(args.bookingId);
    if (!booking || !booking.assignedTeamId || booking.assignedTeamId !== session.teamId) {
      throw new Error("Booking not found or not assigned to your team");
    }

    if (booking.status === args.status) {
      return { success: true };
    }
    await assertTeamStatusUpdateAllowed(ctx, booking, args.bookingId, args.status);

    await ctx.db.patch(args.bookingId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    // Update bookingAssignments timeline fields
    const assignment = await ctx.db
      .query("bookingAssignments")
      .withIndex("by_booking_id", (q) => q.eq("bookingId", args.bookingId))
      .first();

    if (assignment) {
      const updates: Record<string, number> = {};
      if (args.status === "on_the_way" && !assignment.acceptedAt) {
        updates.acceptedAt = Date.now();
      } else if (args.status === "arrived" && !assignment.arrivedAt) {
        updates.arrivedAt = Date.now();
      } else if (args.status === "completed" && !assignment.completedAt) {
        updates.completedAt = Date.now();
      }
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(assignment._id, updates);
      }
    }

    await ctx.db.insert("activityLogs", {
      actorUserId: undefined,
      actorRole: "team",
      entityType: "booking",
      entityId: args.bookingId.toString(),
      action: `team_status_changed_to_${args.status}`,
      createdAt: Date.now(),
    });

    // Send push notification to customer
    try {
      const customer = await ctx.db.get(booking.userId);
      const team = await ctx.db.get(session.teamId);

      if (customer?.pushToken) {
        const statusConfig: Record<string, { title: string; body: string }> = {
          on_the_way: { title: "Team On The Way!", body: `${team?.name || "Your wash team"} is heading to your location` },
          arrived: { title: "Team Arrived!", body: `${team?.name || "Your wash team"} has arrived at your location` },
          washing_in_progress: { title: "Washing Started!", body: `${team?.name || "Your wash team"} has started washing your car` },
          completed: { title: "Wash Complete!", body: `${team?.name || "Your wash team"} has completed your wash!` },
        };

        const config = statusConfig[args.status] || { title: "Booking Update", body: `Status updated to ${args.status}` };

        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: customer.pushToken,
            title: config.title,
            body: config.body,
            data: { bookingId: args.bookingId, type: `status_${args.status}` },
            sound: "default",
          }),
        });
      }
    } catch (error) {
      console.error("[Push] Failed to send customer notification:", error);
    }

    if (args.status === "completed") {
      if (booking.assignedTeamId) {
        await ctx.db.patch(booking.assignedTeamId, { status: "available" });
      }
    }

    return { success: true };
  },
});

export const adminAdvancedAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "superadmin")) {
      return null;
    }

    const bookings = await ctx.db.query("bookings").take(2000);
    const users = await ctx.db.query("users").take(2000);
    const subscriptions = await ctx.db.query("subscriptions").take(2000);
    const washTypes = await ctx.db.query("washTypes").take(100);
    const teams = await ctx.db.query("teams").take(100);

    const customers = users.filter((u) => u.role === "customer");

    const bookingFunnel = {
      draft: bookings.filter((b) => b.status === "draft").length,
      awaitingPayment: bookings.filter((b) => b.status === "awaiting_payment").length,
      booked: bookings.filter((b) => b.status === "booked").length,
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      teamAssigned: bookings.filter((b) => b.status === "team_assigned").length,
      onTheWay: bookings.filter((b) => b.status === "on_the_way").length,
      arrived: bookings.filter((b) => b.status === "arrived").length,
      washingInProgress: bookings.filter((b) => b.status === "washing_in_progress").length,
      completed: bookings.filter((b) => b.status === "completed").length,
      canceled: bookings.filter((b) => b.status === "canceled").length,
      paymentFailed: bookings.filter((b) => b.status === "payment_failed").length,
    };

    const totalStarted = bookings.length;
    const totalCompleted = bookingFunnel.completed;
    const conversionRate = totalStarted > 0 ? (totalCompleted / totalStarted) * 100 : 0;

    const abandonedStatuses = ["draft", "awaiting_payment"];
    const abandonedBookings = bookings.filter((b) => abandonedStatuses.includes(b.status));

    const userBookingCounts = new Map<string, number>();
    for (const b of bookings) {
      const count = userBookingCounts.get(b.userId) || 0;
      userBookingCounts.set(b.userId, count + 1);
    }

    const subscriptionUserIds = new Set(subscriptions.map((s) => s.userId));

    let oneTimeUsers = 0;
    let repeatUsers = 0;
    let subscriptionUsers = 0;

    for (const customer of customers) {
      const bookingCount = userBookingCounts.get(customer._id) || 0;
      const hasSubscription = subscriptionUserIds.has(customer._id);

      if (hasSubscription) {
        subscriptionUsers++;
      } else if (bookingCount > 1) {
        repeatUsers++;
      } else if (bookingCount === 1) {
        oneTimeUsers++;
      }
    }

    const usersWithNoBookings = customers.filter(
      (c) => !userBookingCounts.has(c._id)
    ).length;

    const washTypeStats = new Map<string, { name: string; key: string; bookingCount: number; revenue: number }>();
    for (const wt of washTypes) {
      washTypeStats.set(wt._id, { name: wt.name, key: wt.key, bookingCount: 0, revenue: 0 });
    }

    for (const b of bookings) {
      const stat = washTypeStats.get(b.washTypeId);
      if (stat) {
        stat.bookingCount++;
        if (b.paymentStatus === "succeeded") {
          stat.revenue += b.total;
        }
      }
    }

    const popularServices = Array.from(washTypeStats.values())
      .sort((a, b) => b.bookingCount - a.bookingCount)
      .map((s) => ({
        ...s,
        percentage: totalStarted > 0 ? (s.bookingCount / totalStarted) * 100 : 0,
      }));

    const subscriptionBreakdown = {
      weekly: subscriptions.filter((s) => s.frequency === "weekly").length,
      biweekly: subscriptions.filter((s) => s.frequency === "biweekly").length,
      monthly: subscriptions.filter((s) => s.frequency === "monthly").length,
      oneTime: subscriptions.filter((s) => s.frequency === "one_time").length,
    };

    const subscriptionStatusBreakdown = {
      active: subscriptions.filter((s) => s.status === "active").length,
      paused: subscriptions.filter((s) => s.status === "paused").length,
      canceled: subscriptions.filter((s) => s.status === "canceled").length,
    };

    const revenueByService = popularServices.map((s) => ({
      name: s.name,
      revenue: s.revenue,
    }));

    const paidBookings = bookings.filter((b) => b.paymentStatus === "succeeded");
    const totalRevenue = paidBookings.reduce((sum, b) => sum + b.total, 0);
    const avgBookingValue = paidBookings.length > 0 ? totalRevenue / paidBookings.length : 0;

    const lifetimeBuckets = {
      under100: 0,
      between100And500: 0,
      between500And1000: 0,
      over1000: 0,
    };

    for (const customer of customers) {
      const customerRevenue = paidBookings
        .filter((b) => b.userId === customer._id)
        .reduce((sum, b) => sum + b.total, 0);

      if (customerRevenue < 100) lifetimeBuckets.under100++;
      else if (customerRevenue < 500) lifetimeBuckets.between100And500++;
      else if (customerRevenue < 1000) lifetimeBuckets.between500And1000++;
      else lifetimeBuckets.over1000++;
    }

    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const dayStart = new Date(date).setHours(0, 0, 0, 0);
      const dayEnd = new Date(date).setHours(23, 59, 59, 999);
      const dayBookings = bookings.filter((b) => b.createdAt >= dayStart && b.createdAt <= dayEnd);
      const dayPaid = dayBookings.filter((b) => b.paymentStatus === "succeeded");
      return {
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        fullDate: date.toISOString().split("T")[0],
        bookings: dayBookings.length,
        revenue: dayPaid.reduce((sum, b) => sum + b.total, 0),
        completed: dayBookings.filter((b) => b.status === "completed").length,
        canceled: dayBookings.filter((b) => b.status === "canceled").length,
      };
    });

    const statusDistribution = Object.entries(bookingFunnel).map(([status, count]) => ({
      status: status.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
      count,
    }));

    const teamUtilization = await Promise.all(
      teams.filter((t) => t.isActive).map(async (team) => {
        const teamBookings = bookings.filter((b) => b.assignedTeamId === team._id);
        const completedByTeam = teamBookings.filter((b) => b.status === "completed");
        const revenueByTeam = completedByTeam
          .filter((b) => b.paymentStatus === "succeeded")
          .reduce((sum, b) => sum + b.total, 0);

        return {
          teamId: team._id,
          teamName: team.name,
          status: team.status,
          totalAssigned: teamBookings.length,
          totalCompleted: completedByTeam.length,
          revenue: revenueByTeam,
        };
      })
    );

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentCustomers = customers.filter((c) => c.createdAt >= thirtyDaysAgo);
    const returningCustomers = customers.filter(
      (c) => c.createdAt < thirtyDaysAgo && (userBookingCounts.get(c._id) || 0) > 0
    );

    return {
      bookingFunnel,
      conversionRate,
      abandonedBookingsCount: abandonedBookings.length,
      abandonedBookingsList: abandonedBookings.slice(0, 20).map((b) => ({
        _id: b._id,
        bookingNumber: b.bookingNumber,
        status: b.status,
        total: b.total,
        createdAt: b.createdAt,
      })),
      userSegmentation: {
        oneTimeUsers,
        repeatUsers,
        subscriptionUsers,
        usersWithNoBookings,
        totalCustomers: customers.length,
      },
      popularServices,
      subscriptionBreakdown,
      subscriptionStatusBreakdown,
      revenueByService,
      avgBookingValue,
      totalRevenue,
      lifetimeBuckets,
      last30Days,
      statusDistribution,
      teamUtilization,
      newUserMetrics: {
        newUsersLast30Days: recentCustomers.length,
        returningUsersLast30Days: returningCustomers.length,
      },
      topCustomers: await Promise.all(
        customers
          .map((customer) => {
            const customerBookings = bookings.filter((b) => b.userId === customer._id);
            const customerPaidBookings = customerBookings.filter((b) => b.paymentStatus === "succeeded");
            const totalSpend = customerPaidBookings.reduce((sum, b) => sum + b.total, 0);
            const lastBooking = customerBookings.sort((a, b) => b.createdAt - a.createdAt)[0];
            const hasSubscription = subscriptionUserIds.has(customer._id);
            const activeSubscription = subscriptions.find(
              (s) => s.userId === customer._id && s.status === "active"
            );

            return {
              _id: customer._id,
              name: customer.name,
              email: customer.email,
              phone: customer.phone,
              createdAt: customer.createdAt,
              totalBookings: customerBookings.length,
              completedBookings: customerPaidBookings.length,
              totalSpend,
              hasSubscription,
              subscriptionPlan: activeSubscription?.frequency || null,
              lastBookingAt: lastBooking?.createdAt || null,
              lastBookingStatus: lastBooking?.status || null,
            };
          })
          .sort((a, b) => b.totalSpend - a.totalSpend)
          .slice(0, 20)
      ),
    };
  },
});

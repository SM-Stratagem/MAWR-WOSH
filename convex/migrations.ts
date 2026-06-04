import { internalMutation } from "./_generated/server";

export const backfillTeamLocations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const teams = await ctx.db.query("teams").collect();
    let migrated = 0;
    for (const t of teams) {
      const tt = t as any;
      if (tt.currentLat == null || tt.currentLng == null) continue;
      const existing = await ctx.db
        .query("teamLocations")
        .withIndex("by_team_id", q => q.eq("teamId", t._id))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, {
          currentLat: tt.currentLat,
          currentLng: tt.currentLng,
          lastLocationAt: tt.lastLocationAt ?? Date.now(),
        });
      } else {
        await ctx.db.insert("teamLocations", {
          teamId: t._id,
          currentLat: tt.currentLat,
          currentLng: tt.currentLng,
          lastLocationAt: tt.lastLocationAt ?? Date.now(),
        });
      }
      migrated++;
    }
    return { migrated };
  },
});

export const backfillSubscriptionDiscount = internalMutation({
  args: {},
  handler: async (ctx) => {
    const subs = await ctx.db.query("subscriptions").collect();
    let migrated = 0;
    for (const s of subs) {
      if ((s as any).discountPercent === undefined) {
        const pct = s.frequency === "one_time" ? 0 : 15;
        await ctx.db.patch(s._id, { discountPercent: pct } as any);
        migrated++;
      }
    }
    return { migrated };
  },
});

export const backfillTeamPushTokens = internalMutation({
  args: {},
  handler: async (ctx) => {
    const teams = await ctx.db.query("teams").collect();
    let migrated = 0;
    for (const t of teams) {
      const tt = t as any;
      if (tt.pushToken && (!tt.pushTokens || tt.pushTokens.length === 0)) {
        await ctx.db.patch(t._id, { pushTokens: [tt.pushToken] });
        migrated++;
      }
    }
    return { migrated };
  },
});

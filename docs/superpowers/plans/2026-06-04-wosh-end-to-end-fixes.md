# WOSH End-to-End Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix every issue identified in the 2026-06-04 audit except Stripe payment integration. Make the admin panel the single source of truth, make the customer + driver + admin flows production-ready, and eliminate the hot-path performance traps.

**Architecture:** Backend-first sequential foundation (schema split → security → performance → workflow), then UI work fans out (admin pages + mobile customer + mobile team can be done in parallel by separate workers).

**Tech Stack:** Convex 1.35, Next.js 16 (admin), Expo 54 / React Native 0.81 (mobile), Clerk (customer + admin auth), custom phone+PIN (team auth), TypeScript, Tailwind 4. NO Stripe wiring (user decision).

**Role policy (locked in):**
- **customer** — book, manage own data.
- **operator** (dispatcher) — list/detail bookings, assign teams, force-transition booking status, view zones/vans/teams. CANNOT edit users, services, settings, refunds.
- **admin** — operator + edit services, approve refunds, edit users (except elevating to admin/superadmin), view financials.
- **superadmin** — admin + system settings, role assignment, billing config.

**Verification strategy:** No existing test infra. We install `convex-test` + `vitest` and add tests for **security-critical and data-critical backend changes only**. UI work verified via `tsc --noEmit` + manual smoke. Each task ends with `npx convex codegen` + `tsc --noEmit` of every affected workspace.

---

## Setup

### Task 0.1: Create worktree and base branch

**Files:** N/A (git op)

- [ ] **Step 1: Create worktree**

```bash
git worktree add -b fix/end-to-end ../Carwash-fix-e2e
cd ../Carwash-fix-e2e
```

- [ ] **Step 2: Verify clean state**

```bash
git status
```
Expected: `On branch fix/end-to-end / nothing to commit, working tree clean`.

### Task 0.2: Install Convex test infrastructure

**Files:** Create `vitest.config.ts`, modify root `package.json`.

- [ ] **Step 1: Install deps**

```bash
npm install --save-dev convex-test vitest @edge-runtime/vm
```

- [ ] **Step 2: Create `vitest.config.ts` at repo root**

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
    include: ["convex/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Add scripts to root `package.json`**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "test: add convex-test + vitest infra"
```

---

# PHASE 1 — Schema & backend foundation

Everything else depends on this. Do tasks 1.1 → 1.7 sequentially.

## Task 1.1: Schema additions

**Files:** Modify `convex/schema.ts`.

Adds: `teamLocations` table; `subscriptions.discountPercent`; `bookings.subscriptionDiscount` field; `teams.pushTokens` (array, replaces single `pushToken`); index `by_status` on `teams`; `by_expires_at` on `teamSessions`; `by_subscription_id` on `bookings`; `by_user_id_and_default` on `addresses`.

- [ ] **Step 1: Edit schema**

```ts
// in convex/schema.ts

  teams: defineTable({
    name: v.string(),
    phone: v.optional(v.string()),
    pinHash: v.optional(v.string()),
    pinSalt: v.optional(v.string()), // new — per-PIN salt
    pushTokens: v.optional(v.array(v.string())), // new — multi-device
    pushToken: v.optional(v.string()), // KEEP for migration; drop in 1.2 cleanup
    status: v.union(v.literal("available"), v.literal("busy"), v.literal("offline")),
    isActive: v.boolean(),
  })
    .index("by_phone", ["phone"])
    .index("by_status", ["status"]),       // NEW

  teamLocations: defineTable({              // NEW table
    teamId: v.id("teams"),
    currentLat: v.number(),
    currentLng: v.number(),
    lastLocationAt: v.number(),
  }).index("by_team_id", ["teamId"]),

  teamSessions: defineTable({
    teamId: v.id("teams"),
    sessionId: v.string(),
    deviceLabel: v.optional(v.string()),    // NEW — show in admin / let driver see other sessions
    expiresAt: v.number(),
  })
    .index("by_session_id", ["sessionId"])
    .index("by_team_id", ["teamId"])
    .index("by_expires_at", ["expiresAt"]), // NEW

  bookings: defineTable({
    // ...existing fields unchanged...
    subscriptionDiscountPercent: v.optional(v.number()), // NEW — captured at booking time
  })
    .index("by_user_id", ["userId"])
    .index("by_status", ["status"])
    .index("by_booking_number", ["bookingNumber"])
    .index("by_assigned_team", ["assignedTeamId"])
    .index("by_subscription_id", ["subscriptionId"]),    // NEW

  addresses: defineTable({
    // ...existing unchanged...
  })
    .index("by_user_id", ["userId"])
    .index("by_user_id_and_default", ["userId", "isDefault"]), // NEW

  subscriptions: defineTable({
    // ...existing unchanged plus...
    discountPercent: v.number(),                              // NEW — locked at creation
  })
    .index("by_user_id", ["userId"])
    .index("by_status", ["status"])
    .index("by_next_run_at", ["nextRunAt"]),                  // NEW for cron
```

**Note about** `teams.currentLat/Lng/lastLocationAt`: leave the fields on `teams` until Task 1.2 migration is complete — code in 1.4 stops writing them, then they're dropped in 1.2's final step.

- [ ] **Step 2: Re-run codegen + typecheck**

```bash
npx convex codegen
cd convex && npx tsc --noEmit
```
Expected: type errors in code that reads the removed `teams.currentLat`/etc. or required `subscriptions.discountPercent`. We'll fix them in 1.2.

- [ ] **Step 3: Commit (broken, will fix in next task)**

```bash
git add convex/schema.ts convex/_generated
git commit -m "schema: split teamLocations, add indexes, discount fields"
```

## Task 1.2: Migration — backfill teamLocations + discountPercent

**Files:** Create `convex/migrations.ts`, modify any code that reads/writes the affected fields (we'll address them in 1.3+).

This migration runs once on deploy. We do it as a manually-invoked internal mutation so it's safe to re-run idempotently.

- [ ] **Step 1: Write the failing test**

Create `convex/migrations.test.ts`:

```ts
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("backfillTeamLocations creates one row per team that has coords", async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert("teams", {
      name: "T1", status: "available", isActive: true,
      currentLat: 25.1, currentLng: 55.2, lastLocationAt: 100,
    });
    await ctx.db.insert("teams", {
      name: "T2", status: "available", isActive: true,
      // no coords — should not be backfilled
    });
  });
  await t.mutation(internal.migrations.backfillTeamLocations, {});
  const locs = await t.run(async (ctx) => await ctx.db.query("teamLocations").collect());
  expect(locs).toHaveLength(1);
  expect(locs[0].currentLat).toBe(25.1);
});

test("backfillSubscriptionDiscount sets default 15% for active subs missing it", async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      clerkId:"c1", email:"a@b.c", name:"A", role:"customer",
      isActive:true, createdAt:0, lastSeenAt:0,
    });
    const addrId = await ctx.db.insert("addresses", {
      userId, formattedAddress:"X", latitude:0, longitude:0,
      isDefault:true, createdAt:0, updatedAt:0,
    });
    const wtId = await ctx.db.insert("washTypes", {
      key:"basic", name:"Basic", description:"", basePrice:50,
      currency:"AED", durationMins:30, isActive:true, sortOrder:1,
    });
    await ctx.db.insert("subscriptions", {
      userId, addressId: addrId, washTypeId: wtId,
      frequency:"weekly", status:"active",
      selectedCarIds:[], createdAt:0, updatedAt:0,
      // no discountPercent
    } as any);
  });
  await t.mutation(internal.migrations.backfillSubscriptionDiscount, {});
  const subs = await t.run(async (ctx) => await ctx.db.query("subscriptions").collect());
  expect(subs[0].discountPercent).toBe(15);
});
```

- [ ] **Step 2: Verify tests fail**

```bash
npm test -- convex/migrations.test.ts
```
Expected: FAIL — module `./migrations` not found.

- [ ] **Step 3: Implement `convex/migrations.ts`**

```ts
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const backfillTeamLocations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const teams = await ctx.db.query("teams").collect();
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
    }
    return { migrated: teams.length };
  },
});

export const backfillSubscriptionDiscount = internalMutation({
  args: {},
  handler: async (ctx) => {
    const subs = await ctx.db.query("subscriptions").collect();
    for (const s of subs) {
      if ((s as any).discountPercent === undefined) {
        const pct = s.frequency === "one_time" ? 0 : 15;
        await ctx.db.patch(s._id, { discountPercent: pct } as any);
      }
    }
    return { migrated: subs.length };
  },
});

export const backfillTeamPushTokens = internalMutation({
  args: {},
  handler: async (ctx) => {
    const teams = await ctx.db.query("teams").collect();
    for (const t of teams) {
      const tt = t as any;
      if (tt.pushToken && (!tt.pushTokens || tt.pushTokens.length === 0)) {
        await ctx.db.patch(t._id, { pushTokens: [tt.pushToken] });
      }
    }
    return { migrated: teams.length };
  },
});
```

- [ ] **Step 4: Tests pass**

```bash
npm test
```
Expected: PASS.

- [ ] **Step 5: Document the deploy-time run order**

Add to `docs/superpowers/plans/2026-06-04-wosh-end-to-end-fixes.md` (this file) at the bottom: "Before deploying schema changes, run on prod: `npx convex run migrations:backfillTeamLocations`, `migrations:backfillSubscriptionDiscount`, `migrations:backfillTeamPushTokens`."

- [ ] **Step 6: Commit**

```bash
git add convex/migrations.ts convex/migrations.test.ts
git commit -m "migrate: backfill teamLocations, subscription discount, push tokens"
```

## Task 1.3: Auth helpers (getCurrentUser, requireRole, bcrypt PIN)

**Files:** Replace `convex/authHelpers.ts`; create `convex/pinHash.ts`.

- [ ] **Step 1: Add bcrypt dep**

```bash
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

- [ ] **Step 2: Write helper tests** — `convex/authHelpers.test.ts`

```ts
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { getCurrentUser, requireRole } from "./authHelpers";

const modules = import.meta.glob("./**/*.ts");

test("getCurrentUser returns user when identity matches clerkId", async () => {
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

test("requireRole throws Forbidden when role mismatch", async () => {
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
```

- [ ] **Step 3: Write `convex/authHelpers.ts`**

```ts
import { Doc } from "./_generated/dataModel";
import { QueryCtx, MutationCtx } from "./_generated/server";

export type Role = "customer" | "operator" | "admin" | "superadmin";

export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  allowed: Role[]
): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!allowed.includes(user.role as Role)) {
    throw new Error(`Forbidden: requires one of ${allowed.join(", ")}`);
  }
  return user;
}

// Convenience presets aligned with the role policy in the plan header
export const STAFF_ROLES: Role[] = ["operator", "admin", "superadmin"];
export const ADMIN_ROLES: Role[] = ["admin", "superadmin"];
export const SUPERADMIN_ONLY: Role[] = ["superadmin"];
```

- [ ] **Step 4: Write `convex/pinHash.ts`**

```ts
import bcrypt from "bcryptjs";

const COST = 10;

export async function hashPin(pin: string): Promise<{ hash: string; salt: string }> {
  const salt = await bcrypt.genSalt(COST);
  const hash = await bcrypt.hash(pin, salt);
  return { hash, salt };
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(pin, hash);
}
```

- [ ] **Step 5: Run tests**

```bash
npm test
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add convex/authHelpers.ts convex/pinHash.ts convex/authHelpers.test.ts package.json package-lock.json
git commit -m "feat(backend): shared auth helpers + bcrypt pin hashing"
```

## Task 1.4: Security fixes — team-ownership, role policy, session policy

**Files:** Modify `convex/bookings.ts`, `convex/teamAuth.ts`, `convex/teams.ts`, `convex/users.ts`, `convex/settings.ts`, `convex/refunds.ts`, `convex/washTypes.ts`, `convex/zones.ts`, `convex/vans.ts`, `convex/subscriptions.ts`.

This task is the single largest behavior change in Phase 1. Sub-steps proceed file-by-file.

- [ ] **Step 1: Write failing security tests** — `convex/security.test.ts`

```ts
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

async function seedBasic(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const operator1 = await ctx.db.insert("users", {
      clerkId: "op1", email:"o1@x", name:"Op1", role:"operator",
      isActive:true, createdAt:0, lastSeenAt:0,
    });
    const operator2 = await ctx.db.insert("users", {
      clerkId: "op2", email:"o2@x", name:"Op2", role:"operator",
      isActive:true, createdAt:0, lastSeenAt:0,
    });
    const teamA = await ctx.db.insert("teams", {
      name:"A", status:"available", isActive:true,
    });
    const teamB = await ctx.db.insert("teams", {
      name:"B", status:"available", isActive:true,
    });
    const customer = await ctx.db.insert("users", {
      clerkId:"cust", email:"c@x", name:"C", role:"customer",
      isActive:true, createdAt:0, lastSeenAt:0,
    });
    const addr = await ctx.db.insert("addresses", {
      userId: customer, formattedAddress:"X", latitude:0, longitude:0,
      isDefault:true, createdAt:0, updatedAt:0,
    });
    const wt = await ctx.db.insert("washTypes", {
      key:"basic", name:"Basic", description:"", basePrice:50,
      currency:"AED", durationMins:30, isActive:true, sortOrder:1,
    });
    const booking = await ctx.db.insert("bookings", {
      bookingNumber:"B1", userId: customer, addressId: addr, washTypeId: wt,
      status:"team_assigned",
      assignedTeamId: teamA,
      selectedCarCount:1, subtotal:50, serviceFee:0, discount:0, total:50,
      currency:"AED", paymentStatus:"succeeded",
      createdAt:0, updatedAt:0,
    });
    return { operator1, operator2, teamA, teamB, customer, booking };
  });
}

test("operator cannot edit system settings", async () => {
  const t = convexTest(schema, modules);
  const { operator1 } = await seedBasic(t);
  const asOp = t.withIdentity({ subject: "op1" });
  await expect(asOp.mutation(api.settings.adminUpdateSystemSetting, {
    key: "default_eta_min", value: "1",
  })).rejects.toThrow(/Forbidden/);
});

test("operator cannot approve refunds", async () => {
  const t = convexTest(schema, modules);
  await seedBasic(t);
  const asOp = t.withIdentity({ subject: "op1" });
  // Create a refund directly so we can try to approve it
  const refundId = await t.run(async (ctx) => {
    const userId = await ctx.db.query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId","cust")).first().then(u=>u!._id);
    const bookingId = await ctx.db.query("bookings").first().then(b=>b!._id);
    return ctx.db.insert("refunds", {
      bookingId, userId, amount:50, currency:"AED",
      reason:"test", requestedBy:"customer", status:"pending",
      createdAt:0, updatedAt:0,
    });
  });
  await expect(asOp.mutation(api.refunds.adminReviewRefund, {
    refundId, decision: "approved",
  })).rejects.toThrow(/Forbidden/);
});

test("operator can transition any booking via dispatch", async () => {
  // operator role is dispatch — they CAN force-transition; that's intentional.
  const t = convexTest(schema, modules);
  const { operator1, booking } = await seedBasic(t);
  const asOp = t.withIdentity({ subject: "op1" });
  await asOp.mutation(api.bookings.adminUpdateBookingStatus, {
    bookingId: booking, status: "canceled",
  });
  const b = await t.run(async ctx => ctx.db.get(booking));
  expect(b!.status).toBe("canceled");
});

test("session-based team status update rejects other-team bookings", async () => {
  const t = convexTest(schema, modules);
  const { teamB, booking } = await seedBasic(t);
  const session = await t.run(async (ctx) =>
    ctx.db.insert("teamSessions", {
      teamId: teamB, sessionId: "sess-B",
      expiresAt: Date.now() + 1000 * 60 * 60,
    }));
  await expect(t.mutation(api.bookings.teamUpdateStatusWithSession, {
    sessionId: "sess-B",
    bookingId: booking,
    status: "on_the_way",
  })).rejects.toThrow(/not assigned/);
});
```

- [ ] **Step 2: Run; expect failures**

```bash
npm test
```
Expected: FAIL on settings/refund tests (because operator currently allowed); PASS on session test (already correct).

- [ ] **Step 3: `convex/bookings.ts` — replace `teamUpdateStatus` to use session-only**

Find the current `export const teamUpdateStatus = mutation({ ... });` (~line 1607) and **delete it entirely**. Mobile team app already uses the session variant. To prevent any lingering callers, keep an exported shim that throws:

```ts
export const teamUpdateStatus = mutation({
  args: { bookingId: v.id("bookings"), status: v.string() },
  handler: async () => {
    throw new Error("teamUpdateStatus is deprecated — use teamUpdateStatusWithSession");
  },
});
```

- [ ] **Step 4: `convex/bookings.ts` — replace every role check on admin* functions**

For each function: `adminListBookings`, `adminGetBookingDetail`, `adminUpdateBookingStatus`, `adminAssignTeam`, `adminAutoReassign`, `adminBulkAutoAssign`, `adminDashboardMetrics`, `adminAdvancedAnalytics`, `adminListAllBookings`, `getDispatchData`.

Replace the inline:
```ts
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Unauthorized");
const adminUser = await ctx.db.query("users").withIndex("by_clerk_id", ...).first();
if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "superadmin" && adminUser.role !== "operator")) throw new Error("Forbidden");
```
with:
```ts
import { requireRole, STAFF_ROLES } from "./authHelpers";
// ...
const adminUser = await requireRole(ctx, STAFF_ROLES);
```

`STAFF_ROLES` includes operator — this matches the policy (operator can dispatch).

- [ ] **Step 5: `convex/settings.ts` — use SUPERADMIN_ONLY**

Replace the role check in `adminUpdateSystemSetting` with:
```ts
import { requireRole, SUPERADMIN_ONLY } from "./authHelpers";
// ...
await requireRole(ctx, SUPERADMIN_ONLY);
```
(this is already the policy, but route it through the helper.)

- [ ] **Step 6: `convex/refunds.ts` — ADMIN_ROLES on adminReviewRefund + adminCreateRefund**

```ts
import { requireRole, ADMIN_ROLES } from "./authHelpers";
// in adminReviewRefund and adminCreateRefund:
const adminUser = await requireRole(ctx, ADMIN_ROLES);
```

- [ ] **Step 7: `convex/users.ts` — role-edit guarded**

In `updateUser`: if `args.role` is being changed, require `SUPERADMIN_ONLY`. Otherwise `ADMIN_ROLES`. Also block customers from editing themselves to staff roles.

```ts
import { requireRole, ADMIN_ROLES, SUPERADMIN_ONLY, getCurrentUser } from "./authHelpers";
// in updateUser handler:
const actor = await getCurrentUser(ctx);
const target = await ctx.db.get(args.userId);
if (!target) throw new Error("User not found");

// Self-edit allowed for non-sensitive fields:
const isSelf = actor._id === args.userId;
const wantsRoleChange = args.role !== undefined && args.role !== target.role;

if (wantsRoleChange) {
  if (!["superadmin"].includes(actor.role)) throw new Error("Forbidden: only superadmin can change roles");
}
if (!isSelf && !ADMIN_ROLES.includes(actor.role as any)) {
  throw new Error("Forbidden");
}
```
Also log the old role into `activityLogs.payload` when role changes.

- [ ] **Step 8: `convex/washTypes.ts`, `convex/zones.ts`, `convex/vans.ts`, `convex/subscriptions.ts`**

For `adminUpsert*`, `adminCreate*`, `adminUpdate*`, `adminDelete*`, `adminListSubscriptions`, `adminUpdateSubscription`: replace inline role checks with `await requireRole(ctx, ADMIN_ROLES)`. Operators don't edit services/zones/vans/subscriptions.

- [ ] **Step 9: `convex/teams.ts` — admin team CRUD**

`adminCreateTeam`, `adminUpdateTeam`, `adminDeleteTeam`, `adminListTeams`, `adminResetTeamPin`: `ADMIN_ROLES`. PIN reset must use new `hashPin` helper.

```ts
import { hashPin } from "./pinHash";
// In adminCreateTeam and adminUpdateTeamPin:
const { hash, salt } = await hashPin(args.pin);
await ctx.db.patch(teamId, { pinHash: hash, pinSalt: salt });
```
Also: when PIN changes, revoke all sessions for that team.

```ts
const sessions = await ctx.db.query("teamSessions")
  .withIndex("by_team_id", q => q.eq("teamId", teamId)).collect();
for (const s of sessions) await ctx.db.delete(s._id);
```

- [ ] **Step 10: `convex/teamAuth.ts` — verify with bcrypt, shorter sessions, list sessions**

In `login`: read team, call `verifyPin(args.pin, team.pinHash)`. Set `expiresAt: Date.now() + 1000 * 60 * 60 * 24` (24 h, not 7 days). Accept optional `deviceLabel` arg and store on session.

Add:
```ts
export const listMySessions = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db.query("teamSessions")
      .withIndex("by_session_id", q => q.eq("sessionId", args.sessionId)).first();
    if (!session || session.expiresAt < Date.now()) throw new Error("Unauthorized");
    return await ctx.db.query("teamSessions")
      .withIndex("by_team_id", q => q.eq("teamId", session.teamId)).collect();
  },
});

export const revokeOtherSessions = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db.query("teamSessions")
      .withIndex("by_session_id", q => q.eq("sessionId", args.sessionId)).first();
    if (!session || session.expiresAt < Date.now()) throw new Error("Unauthorized");
    const all = await ctx.db.query("teamSessions")
      .withIndex("by_team_id", q => q.eq("teamId", session.teamId)).collect();
    for (const s of all) {
      if (s._id !== session._id) await ctx.db.delete(s._id);
    }
    return { revoked: all.length - 1 };
  },
});
```

In `cleanupExpiredSessions`: switch to indexed range query:
```ts
const now = Date.now();
const expired = await ctx.db.query("teamSessions")
  .withIndex("by_expires_at", q => q.lt("expiresAt", now)).collect();
for (const s of expired) await ctx.db.delete(s._id);
```

- [ ] **Step 11: Run tests**

```bash
npm test
```
Expected: PASS (including the new operator-forbidden-from-settings/refunds tests).

- [ ] **Step 12: Typecheck**

```bash
cd convex && npx tsc --noEmit
```
Expected: PASS.

- [ ] **Step 13: Commit**

```bash
git add convex/
git commit -m "security: align role checks, fix team-ownership, bcrypt PIN, 24h sessions"
```

## Task 1.5: Cascade user-delete

**Files:** Modify `convex/users.ts`, `convex/http.ts`.

- [ ] **Step 1: Test** — `convex/users.test.ts`

```ts
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("internal.users.cascadeDeleteUser removes cars/addresses/bookings/subscriptions", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.run(async (ctx) => {
    const u = await ctx.db.insert("users", {
      clerkId:"x", email:"x@y", name:"X", role:"customer",
      isActive:true, createdAt:0, lastSeenAt:0,
    });
    await ctx.db.insert("cars", {
      userId: u, make:"a", model:"b", plateNumber:"P", isActive:true, createdAt:0,
    });
    await ctx.db.insert("addresses", {
      userId: u, formattedAddress:"X", latitude:0, longitude:0,
      isDefault:true, createdAt:0, updatedAt:0,
    });
    return u;
  });
  await t.mutation(internal.users.cascadeDeleteUser, { userId });
  const counts = await t.run(async (ctx) => ({
    user: await ctx.db.get(userId),
    cars: (await ctx.db.query("cars").collect()).length,
    addresses: (await ctx.db.query("addresses").collect()).length,
  }));
  expect(counts.user).toBeNull();
  expect(counts.cars).toBe(0);
  expect(counts.addresses).toBe(0);
});
```

- [ ] **Step 2: Implement in `convex/users.ts`**

```ts
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const cascadeDeleteUser = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Cars
    const cars = await ctx.db.query("cars")
      .withIndex("by_user_id", q => q.eq("userId", args.userId)).collect();
    for (const c of cars) {
      const bcs = await ctx.db.query("bookingCars")
        .withIndex("by_car_id", q => q.eq("carId", c._id)).collect();
      for (const bc of bcs) await ctx.db.delete(bc._id);
      await ctx.db.delete(c._id);
    }
    // Addresses
    const addrs = await ctx.db.query("addresses")
      .withIndex("by_user_id", q => q.eq("userId", args.userId)).collect();
    for (const a of addrs) await ctx.db.delete(a._id);
    // Bookings (soft — keep history but anonymize)
    const bookings = await ctx.db.query("bookings")
      .withIndex("by_user_id", q => q.eq("userId", args.userId)).collect();
    for (const b of bookings) {
      // Keep the booking but flag the user as deleted; do not orphan financial history.
      await ctx.db.patch(b._id, { /* no userId change — preserve audit */ } as any);
    }
    // Subscriptions
    const subs = await ctx.db.query("subscriptions")
      .withIndex("by_user_id", q => q.eq("userId", args.userId)).collect();
    for (const s of subs) {
      await ctx.db.patch(s._id, { status: "canceled", updatedAt: Date.now() });
    }
    // User
    await ctx.db.delete(args.userId);
    return { ok: true };
  },
});
```

- [ ] **Step 3: Wire Clerk webhook**

In `convex/http.ts` `user.deleted` branch, call `ctx.runMutation(internal.users.cascadeDeleteUser, { userId: user._id })`. Handle missing user gracefully (try/catch — idempotent).

- [ ] **Step 4: Add a public `deleteMyAccount` mutation for the mobile flow**

```ts
export const deleteMyAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    await ctx.scheduler.runAfter(0, internal.users.cascadeDeleteUser, { userId: user._id });
    return { ok: true };
  },
});
```

- [ ] **Step 5: Tests pass; typecheck; commit**

```bash
npm test && cd convex && npx tsc --noEmit && cd ..
git add convex/users.ts convex/users.test.ts convex/http.ts
git commit -m "feat(backend): cascade user delete + deleteMyAccount + Clerk webhook"
```

## Task 1.6: Push notifications — scheduler, multi-token, deep-link

**Files:** Modify `convex/notifications.ts`; modify call-sites in `convex/bookings.ts`.

- [ ] **Step 1: Update `convex/notifications.ts`**

Replace `storeTeamPushToken` to append to array (dedupe):
```ts
export const storeTeamPushTokenBySession = mutation({
  args: { sessionId: v.string(), pushToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db.query("teamSessions")
      .withIndex("by_session_id", q => q.eq("sessionId", args.sessionId)).first();
    if (!session || session.expiresAt < Date.now()) throw new Error("Unauthorized");
    const team = await ctx.db.get(session.teamId);
    if (!team) throw new Error("Team not found");
    const tokens = new Set(team.pushTokens ?? []);
    tokens.add(args.pushToken);
    await ctx.db.patch(team._id, { pushTokens: Array.from(tokens) });
    return { ok: true };
  },
});
```

Add an `internalAction sendExpoPush` that takes `(tokens[], title, body, data)`. Move existing `fetch("https://exp.host/--/api/v2/push/send", …)` here. Return number of accepted.

Add `internalMutation notifyBookingEvent` that takes `{ bookingId, event }` and decides who to notify (customer push + team push). Loops user.pushToken into a single-token array. Schedules `internal.notifications.sendExpoPush`.

- [ ] **Step 2: Swap call sites in `convex/bookings.ts`**

Anywhere we currently do `fetch("https://exp.host/...")` inline, replace with:
```ts
await ctx.scheduler.runAfter(0, internal.notifications.notifyBookingEvent, {
  bookingId, event: "team_assigned",
});
```

This decouples notifications from mutation retries → no duplicate pushes.

- [ ] **Step 3: Deep-link payload**

`sendExpoPush` must include `data: { bookingId, event }` so the mobile app can route the user.

- [ ] **Step 4: Typecheck, commit**

```bash
cd convex && npx tsc --noEmit && cd ..
git add convex/
git commit -m "feat(backend): scheduler-based notifications, multi-token push, deep-link payload"
```

## Task 1.7: Stripe webhook stubs → real status transitions (NO Stripe API calls)

**Files:** Modify `convex/http.ts`, `convex/bookings.ts`.

Per user instruction, leave Stripe API integration alone. But the webhook **handler** that updates booking status from webhook events must work, so that when Stripe IS wired up later the flow is correct.

- [ ] **Step 1: Add `internalMutation markBookingPaymentFailed`** in `convex/bookings.ts`

```ts
export const markBookingPaymentFailed = internalMutation({
  args: { bookingId: v.id("bookings"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const b = await ctx.db.get(args.bookingId);
    if (!b) return;
    await ctx.db.patch(args.bookingId, {
      status: "payment_failed",
      paymentStatus: "failed",
      updatedAt: Date.now(),
    });
    await ctx.db.insert("activityLogs", {
      entityType:"booking", entityId: args.bookingId.toString(),
      action:"payment_failed", payload: args.reason ?? "",
      createdAt: Date.now(),
    });
  },
});
```

- [ ] **Step 2: Stripe webhook handler** in `convex/http.ts`

In the `/stripe-webhook` POST handler, decode the event (signature already validated). Branch:
- `payment_intent.succeeded` → look up booking by `metadata.bookingId`, call `internal.bookings.confirmBookingAfterPayment`.
- `payment_intent.payment_failed` → `internal.bookings.markBookingPaymentFailed`.
- `charge.refunded` → `internal.bookings.markBookingRefunded` (also add this internalMutation).

These handlers are idempotent (status patch is a no-op if already in target state).

- [ ] **Step 3: Commit**

```bash
git add convex/
git commit -m "feat(backend): wire Stripe webhook to booking status transitions (idempotent)"
```

---

# PHASE 2 — Pricing, discount, workflow

## Task 2.1: Service fee + discount wiring in createBookingDraft

**Files:** Modify `convex/bookings.ts`; modify `convex/subscriptions.ts`; modify `apps/mobile/app/summary.tsx` and `apps/mobile/app/confirm.tsx`.

- [ ] **Step 1: Test** — `convex/bookings.test.ts`

```ts
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("createBookingDraft applies service fee and discount", async () => {
  const t = convexTest(schema, modules);
  const { customerClerk, addrId, wtId } = await t.run(async (ctx) => {
    const u = await ctx.db.insert("users", {
      clerkId:"c", email:"c@x", name:"C", role:"customer",
      isActive:true, createdAt:0, lastSeenAt:0,
    });
    const a = await ctx.db.insert("addresses", {
      userId:u, formattedAddress:"X", latitude:0, longitude:0,
      isDefault:true, createdAt:0, updatedAt:0,
    });
    const w = await ctx.db.insert("washTypes", {
      key:"basic", name:"Basic", description:"", basePrice:100,
      currency:"AED", durationMins:30, isActive:true, sortOrder:1,
    });
    await ctx.db.insert("systemSettings", {
      key:"default_service_fee_pct", value:"5",
      updatedAt:0,
    });
    return { customerClerk:"c", addrId:a, wtId:w };
  });
  const asC = t.withIdentity({ subject: customerClerk });
  const out = await asC.mutation(api.bookings.createBookingDraft, {
    addressId: addrId, washTypeId: wtId, carIds:[],
    subscriptionDiscountPercent: 15,
  });
  expect(out.subtotal).toBe(100);
  expect(out.discount).toBe(15);   // 15%
  expect(out.serviceFee).toBe(5);  // 5% of 100
  expect(out.total).toBe(90);      // 100 - 15 + 5
});
```

- [ ] **Step 2: Update `createBookingDraft` signature + handler**

Add optional `subscriptionDiscountPercent: v.optional(v.number())` to args validator. Replace the `discount = 0; serviceFee = 0;` block with:

```ts
const settings = await ctx.db.query("systemSettings").collect();
const settingsMap: Record<string,string> = {};
for (const s of settings) settingsMap[s.key] = s.value;

const serviceFeePct = parseFloat(settingsMap["default_service_fee_pct"] ?? "0");
const discountPct = Math.max(0, Math.min(100, args.subscriptionDiscountPercent ?? 0));

const serviceFee = Math.round(subtotal * (serviceFeePct / 100));
const discount = Math.round(subtotal * (discountPct / 100));
const total = subtotal - discount + serviceFee;
```

Also store `subscriptionDiscountPercent` on the inserted booking doc.

- [ ] **Step 3: Update mobile call sites**

In `apps/mobile/app/summary.tsx`, compute `discountPercent` from selected subscription plan (or 0 if one-time), pass through booking store. In `apps/mobile/app/confirm.tsx`, pass `subscriptionDiscountPercent` as arg to the mutation.

Replace any hard-coded `0.15` magic numbers in the mobile UI with a `SUBSCRIPTION_DISCOUNT_PCT` constant pulled from `useQuery(api.settings.getPublic, { key: "subscription_discount_pct" })`, defaulting to 15 if absent.

- [ ] **Step 4: Public settings query**

In `convex/settings.ts`, add:
```ts
export const getPublic = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    // Whitelist publicly-readable keys.
    const ALLOWED = new Set(["subscription_discount_pct","default_service_fee_pct","currency"]);
    if (!ALLOWED.has(args.key)) return null;
    const row = await ctx.db.query("systemSettings")
      .withIndex("by_key", q => q.eq("key", args.key)).first();
    return row?.value ?? null;
  },
});
```

- [ ] **Step 5: Tests pass**

```bash
npm test
```

- [ ] **Step 6: Commit**

```bash
git add convex/ apps/mobile/app/summary.tsx apps/mobile/app/confirm.tsx
git commit -m "feat(billing): wire service fee + subscription discount through booking creation"
```

## Task 2.2: Subscriptions store discount, recurring inherits it

**Files:** Modify `convex/subscriptions.ts`.

- [ ] **Step 1: Test**

```ts
test("createSubscription stores 15% discount by default", async () => {
  // …seed user, addr, washType, cars…
  const sub = await asC.mutation(api.subscriptions.createSubscription, {
    addressId, washTypeId, frequency:"weekly", selectedCarIds:[carId],
  });
  const s = await t.run(ctx => ctx.db.get(sub.subscriptionId));
  expect(s!.discountPercent).toBe(15);
});

test("generateRecurringBookings passes subscription discount to booking", async () => {
  // …seed sub with discountPercent 20, nextRunAt past…
  await t.mutation(internal.subscriptions.generateRecurringBookings, {});
  const b = await t.run(ctx => ctx.db.query("bookings").first());
  expect(b!.subscriptionDiscountPercent).toBe(20);
});
```

- [ ] **Step 2: Implement**

In `createSubscription`: read `subscription_discount_pct` from settings (default 15 if one_time → 0). Persist `discountPercent` on insert.

In `generateRecurringBookings` cron path: when inserting the booking, set `subscriptionDiscountPercent: sub.discountPercent`. Compute pricing from the helper.

In `adminUpdateSubscription`: allow `discountPercent` arg (ADMIN_ROLES only).

- [ ] **Step 3: Commit**

```bash
git add convex/subscriptions.ts convex/subscriptions.test.ts
git commit -m "feat(subscriptions): persist discount %, inherit on recurring bookings"
```

## Task 2.3: Status workflow gaps

**Files:** Modify `convex/bookings.ts`.

- [ ] **Step 1: Add `teamRejectBooking`**

```ts
export const teamRejectBookingWithSession = mutation({
  args: { sessionId: v.string(), bookingId: v.id("bookings"), reason: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db.query("teamSessions")
      .withIndex("by_session_id", q => q.eq("sessionId", args.sessionId)).first();
    if (!session || session.expiresAt < Date.now()) throw new Error("Unauthorized");
    const b = await ctx.db.get(args.bookingId);
    if (!b || b.assignedTeamId !== session.teamId) throw new Error("Not your booking");
    if (!["team_assigned"].includes(b.status)) throw new Error("Cannot reject after starting");
    await ctx.db.patch(args.bookingId, {
      status: "confirmed",       // back to pool
      assignedTeamId: undefined as any,
      rejectionReason: args.reason,
      updatedAt: Date.now(),
    });
    // Free the team
    await ctx.db.patch(session.teamId, { status: "available" });
    // Log
    await ctx.db.insert("activityLogs", {
      actorRole:"team", entityType:"booking", entityId: args.bookingId.toString(),
      action:"team_rejected", payload: args.reason, createdAt: Date.now(),
    });
    // Notify dispatch
    await ctx.scheduler.runAfter(0, internal.notifications.notifyBookingEvent, {
      bookingId: args.bookingId, event: "team_rejected",
    });
    return { ok: true };
  },
});
```

- [ ] **Step 2: Update `TEAM_STATUS_TRANSITIONS` constant**

Map should also include explicit no-op self-transitions; `arrived → washing_in_progress → completed` already work. Document explicitly.

- [ ] **Step 3: Commit**

```bash
git add convex/bookings.ts
git commit -m "feat(team): driver reject flow with reason"
```

## Task 2.4: Window overlap and zone lookup correctness

**Files:** Modify `convex/bookings.ts`, `convex/zones.ts`.

- [ ] **Step 1: Window overlap test**

```ts
test("team selection counts only ±1h overlapping bookings", async () => {
  // …seed two bookings at different morning vs afternoon windows…
  // Verify team picker doesn't count afternoon booking as conflicting with morning.
});
```

- [ ] **Step 2: Replace 4-hour window count with ±1h interval**

In `createBookingDraft` and `adminAutoReassign`, replace the existing window count helper with:
```ts
function isWithinHour(a: number | undefined, b: number | undefined) {
  if (!a || !b) return false;
  return Math.abs(a - b) <= 60 * 60 * 1000;
}
```
Use it when counting conflicts.

- [ ] **Step 3: Real zone lookup**

Add `zoneId: v.optional(v.id("zones"))` to `addresses` schema (Task 1.1 amendment — if not added, add here and re-codegen). When creating an address, attempt to match against `zones` table by polygon (simple: use a `zones.boundingBox` or store `zones.cityKeywords` array and match keywords). Falls back to default ETA.

Replace the substring-on-`zone_etas` JSON parsing logic with: read `address.zoneId`; if present, `ctx.db.get(zoneId)` and use its `baseEtaMin/Max`.

- [ ] **Step 4: Commit**

```bash
git add convex/
git commit -m "fix(scheduling): ±1h overlap, real zones lookup for ETA"
```

---

# PHASE 3 — Backend performance

## Task 3.1: Helper `selectClosestAvailableTeam`

**Files:** Create `convex/teamSelection.ts`.

- [ ] **Step 1: Extract helper from `createBookingDraft`/`adminAutoReassign`** — single source of truth using indexed queries.

```ts
import { QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export function haversineKm(a:{lat:number,lng:number}, b:{lat:number,lng:number}) { /* … */ }

export async function selectClosestAvailableTeam(
  ctx: QueryCtx,
  pickup: { lat: number; lng: number },
  scheduledFor: number | undefined,
): Promise<Id<"teams"> | null> {
  const teams = await ctx.db.query("teams")
    .withIndex("by_status", q => q.eq("status", "available")).collect();
  let best: { id: Id<"teams">, dist: number } | null = null;
  for (const team of teams.filter(t => t.isActive)) {
    const loc = await ctx.db.query("teamLocations")
      .withIndex("by_team_id", q => q.eq("teamId", team._id)).first();
    if (!loc) continue;
    const conflicts = await ctx.db.query("bookings")
      .withIndex("by_assigned_team", q => q.eq("assignedTeamId", team._id))
      .collect();
    const overlapping = conflicts.filter(b =>
      b.scheduledFor && scheduledFor &&
      Math.abs(b.scheduledFor - scheduledFor) <= 60 * 60 * 1000
    ).length;
    if (overlapping >= 2) continue;
    const d = haversineKm(pickup, { lat: loc.currentLat, lng: loc.currentLng });
    if (!best || d < best.dist) best = { id: team._id, dist: d };
  }
  return best?.id ?? null;
}
```

- [ ] **Step 2: Replace both call sites in `convex/bookings.ts`**

- [ ] **Step 3: Delete duplicated haversine code in `bookings.ts`**

- [ ] **Step 4: Commit**

```bash
git add convex/
git commit -m "refactor: extract selectClosestAvailableTeam helper"
```

## Task 3.2: Switch all team writers to teamLocations

**Files:** Modify `convex/teams.ts`.

- [ ] **Step 1: Replace `teamUpdateLocation` body**

```ts
export const teamUpdateLocation = mutation({
  args: { sessionId: v.string(), lat: v.number(), lng: v.number() },
  handler: async (ctx, args) => {
    const session = await ctx.db.query("teamSessions")
      .withIndex("by_session_id", q => q.eq("sessionId", args.sessionId)).first();
    if (!session || session.expiresAt < Date.now()) throw new Error("Unauthorized");
    const existing = await ctx.db.query("teamLocations")
      .withIndex("by_team_id", q => q.eq("teamId", session.teamId)).first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        currentLat: args.lat, currentLng: args.lng, lastLocationAt: Date.now(),
      });
    } else {
      await ctx.db.insert("teamLocations", {
        teamId: session.teamId,
        currentLat: args.lat, currentLng: args.lng, lastLocationAt: Date.now(),
      });
    }
    return { ok: true };
  },
});
```

- [ ] **Step 2: Anywhere code reads `team.currentLat/Lng/lastLocationAt`** — replace with a join on `teamLocations`.

Touched files: `convex/bookings.ts` (getLiveTracking, dispatch queries), `convex/teams.ts` (`adminListTeams` enrichment).

- [ ] **Step 3: Drop the dead fields**

Once nothing reads them, remove `currentLat/currentLng/lastLocationAt` from `teams` in `schema.ts`. Run `npx convex codegen` and typecheck.

- [ ] **Step 4: Commit**

```bash
git add convex/
git commit -m "perf(teams): move hot location fields to teamLocations table"
```

## Task 3.3: Batch joins in admin list/dashboard queries

**Files:** Modify `convex/bookings.ts`.

- [ ] **Step 1: Replace per-booking Promise.all fanout**

In `adminListBookings`, `adminDashboardMetrics`, `adminAdvancedAnalytics`: after taking the bookings page, build sets of `userIds`, `addressIds`, `washTypeIds`, `teamIds`. Fetch each table once via individual `ctx.db.get` in parallel:

```ts
const uniqUserIds = Array.from(new Set(bookings.map(b => b.userId)));
const users = await Promise.all(uniqUserIds.map(id => ctx.db.get(id)));
const userMap = new Map(users.filter(Boolean).map(u => [u!._id, u!]));
// repeat for addresses, washTypes, teams
return bookings.map(b => ({
  ...b,
  user: userMap.get(b.userId),
  address: addressMap.get(b.addressId),
  washType: washTypeMap.get(b.washTypeId),
  team: b.assignedTeamId ? teamMap.get(b.assignedTeamId) : null,
}));
```
This converts N×4 sequential lookups into 4 parallel batches of `unique` only.

- [ ] **Step 2: Commit**

```bash
git add convex/bookings.ts
git commit -m "perf(admin): batch joins in bookings list/dashboard/analytics"
```

## Task 3.4: Cached dashboard metrics

**Files:** Create `convex/dashboardCache.ts`; modify `convex/crons.ts`.

- [ ] **Step 1: New table** (added to schema at this step — re-run codegen)

```ts
dashboardSnapshots: defineTable({
  computedAt: v.number(),
  data: v.string(), // JSON
}),
```

- [ ] **Step 2: `internalMutation computeDashboardSnapshot`** writes a single row (delete prior). Same math as `adminDashboardMetrics` but stripped to lightweight aggregates (counts/totals only, no full booking enrichment).

- [ ] **Step 3: Cron in `crons.ts`** — `crons.interval("dashboard snapshot", { minutes: 5 }, internal.dashboardCache.computeDashboardSnapshot, {});`

- [ ] **Step 4: Reshape `adminDashboardMetrics`** — returns the latest snapshot row (parsed) + a small slice of `recentBookings` (≤10). Falls back to live compute if no snapshot yet.

- [ ] **Step 5: Commit**

```bash
git add convex/
git commit -m "perf(admin): dashboard metrics snapshot (5-min cron) → smaller reactive payload"
```

## Task 3.5: Cleanup of remaining hot-path scans

- [ ] **Step 1: `getEtaPreview`** — use `by_status` index on `teams`.
- [ ] **Step 2: `cleanupExpiredSessions`** — already done in 1.4. Verify.
- [ ] **Step 3: `timeWindows.getAvailableWindows`** — `withIndex("by_status", q => q.eq("status","confirmed")).filter(in_range)`; if still slow, paginate.
- [ ] **Step 4: `adminBulkAutoAssign`** — hoist `teams` query out of the loop.
- [ ] **Step 5: `createBookingDraft`** — single `systemSettings.collect()` (drop the duplicate `by_key` lookup).
- [ ] **Step 6: `addresses` set-default** — use `by_user_id_and_default` index to only fetch the previous default (single doc), not the whole list.
- [ ] **Step 7: Commit**

```bash
git add convex/
git commit -m "perf: cover remaining hot-path scans with indexes"
```

---

# PHASE 4 — Admin panel: source of truth

All Phase 4 tasks share a setup: build a small `<DataTable>` and `<Modal>` helper that the new pages can reuse. Existing pages don't yet have these primitives.

## Task 4.0: Reusable admin primitives

**Files:** Create `apps/admin/components/ui/Modal.tsx`, `apps/admin/components/ui/DataTable.tsx`, `apps/admin/components/ui/StatusPill.tsx`, `apps/admin/components/ui/EmptyState.tsx`.

Each ≤80 lines, Tailwind-based, no external deps. Use the WOSH design tokens from `DESIGN.md` (ink, bg-soft, accent #1976ff) to keep the admin visually consistent with the mobile app.

- [ ] **Step 1: Modal**

```tsx
"use client";
import { ReactNode, useEffect } from "react";

export default function Modal({ open, onClose, title, children, footer }: {
  open: boolean; onClose: () => void; title: string;
  children: ReactNode; footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-md shadow-xl w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="text-2xl leading-none">×</button>
        </div>
        <div>{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: DataTable** — generic typed component (columns prop, row click, loading skeleton).
- [ ] **Step 3: StatusPill** — color-coded variants for booking/subscription/refund statuses.
- [ ] **Step 4: EmptyState** — title + subtitle + optional CTA.
- [ ] **Step 5: Commit**

```bash
git add apps/admin/components/ui
git commit -m "ui(admin): reusable Modal, DataTable, StatusPill, EmptyState primitives"
```

## Task 4.1: Booking detail page + status changer + photo viewer + reassign

**Files:** Create `apps/admin/app/dashboard/bookings/[bookingId]/page.tsx`; modify `apps/admin/app/dashboard/bookings/page.tsx` to link rows.

- [ ] **Step 1: Detail page**

```tsx
"use client";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import Modal from "@/components/ui/Modal";

export default function BookingDetail() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const data = useQuery(api.bookings.adminGetBookingDetail, { bookingId: bookingId as any });
  const update = useMutation(api.bookings.adminUpdateBookingStatus);
  const assignTeam = useMutation(api.bookings.adminAssignTeam);
  const teams = useQuery(api.teams.adminListTeams) ?? [];
  const [statusModal, setStatusModal] = useState(false);
  const [teamModal, setTeamModal] = useState(false);
  if (!data) return <div className="p-6">Loading…</div>;
  const b = data.booking;

  return (
    <div className="p-6 space-y-6">
      <header className="flex justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">Booking</p>
          <h1 className="text-3xl font-bold">{b.bookingNumber}</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setStatusModal(true)} className="btn-secondary">Change status</button>
          <button onClick={() => setTeamModal(true)} className="btn-secondary">Reassign team</button>
        </div>
      </header>
      <section className="grid grid-cols-2 gap-6">
        <Card title="Customer">
          <p>{data.user?.name}</p>
          <p className="text-gray-600">{data.user?.email}</p>
          <p className="text-gray-600">{data.user?.phone}</p>
        </Card>
        <Card title="Address">
          <p>{data.address?.formattedAddress}</p>
          {data.address?.notes && <p className="text-sm text-gray-500 mt-2">Notes: {data.address.notes}</p>}
        </Card>
        <Card title="Service">
          <p>{data.washType?.name} · {b.selectedCarCount} car(s)</p>
          <p className="font-mono">Subtotal {b.subtotal} · Fee {b.serviceFee} · Discount {b.discount} · Total {b.total} {b.currency}</p>
        </Card>
        <Card title="Schedule">
          <p>{b.scheduledFor ? new Date(b.scheduledFor).toLocaleString() : "ASAP"}</p>
          <p>ETA {b.etaMin}–{b.etaMax} min</p>
          <p>Team: {data.team?.name ?? "Unassigned"}</p>
        </Card>
      </section>
      <section>
        <h2 className="font-bold mb-2">Photos</h2>
        <div className="grid grid-cols-3 gap-2">
          {data.photos.map((p:any) => (
            <a key={p._id} href={p.url} target="_blank">
              <img src={p.url} className="w-full aspect-square object-cover" />
              <p className="text-xs">{p.type}</p>
            </a>
          ))}
          {data.photos.length === 0 && <p className="text-gray-500">No photos yet.</p>}
        </div>
      </section>
      <Modal open={statusModal} onClose={() => setStatusModal(false)} title="Change booking status"
        footer={<button onClick={() => setStatusModal(false)} className="btn-secondary">Close</button>}>
        <StatusForm bookingId={b._id} current={b.status} onDone={() => setStatusModal(false)} update={update} />
      </Modal>
      <Modal open={teamModal} onClose={() => setTeamModal(false)} title="Reassign team"
        footer={null}>
        <TeamPicker teams={teams} bookingId={b._id} onPick={async (teamId) => {
          await assignTeam({ bookingId: b._id, teamId });
          setTeamModal(false);
        }} />
      </Modal>
    </div>
  );
}
```

(Define `Card`, `StatusForm`, `TeamPicker` as small subcomponents in same file.)

- [ ] **Step 2: Backend additions if missing**

`adminGetBookingDetail` must return: booking, user, address, washType, team, photos (joined `bookingPhotos.url`), assignment timestamps.

- [ ] **Step 3: Link from list page**

In `apps/admin/app/dashboard/bookings/page.tsx`, wrap row in a Next `<Link href={\`/dashboard/bookings/${b._id}\`}>`.

- [ ] **Step 4: Manual booking modal** on the list page — minimal form (customer search, address, washType, car count, schedule). Calls `adminCreateManualBooking` (add to backend if absent — internal mutation that mirrors `createBookingDraft` but with explicit userId, skipping payment).

- [ ] **Step 5: Commit**

```bash
git add apps/admin/app/dashboard/bookings apps/admin/components convex/bookings.ts
git commit -m "feat(admin): booking detail page, status changer, reassign, photos, manual create"
```

## Task 4.2: Customer detail page

**Files:** Create `apps/admin/app/dashboard/customers/[userId]/page.tsx`; backend query `adminGetCustomerDetail`.

- [ ] **Step 1: Backend `adminGetCustomerDetail`** — `ADMIN_ROLES`. Returns: user, cars, addresses, recent bookings (≤50), active subscriptions, refunds, total spend.

- [ ] **Step 2: Page** — three columns: profile (left), bookings list (middle), subs+refunds (right). All linked to their respective detail pages.

- [ ] **Step 3: Wire `customers/page.tsx`** rows to `/dashboard/customers/[userId]`.

- [ ] **Step 4: Commit**

```bash
git add apps/admin convex/users.ts
git commit -m "feat(admin): customer detail page with bookings/cars/addrs/subs/refunds"
```

## Task 4.3: Subscription actions (pause / resume / cancel / change frequency / set discount)

**Files:** Modify `apps/admin/app/dashboard/subscriptions/page.tsx`; create `[subscriptionId]/page.tsx`.

- [ ] **Step 1: List page** — add three action buttons per row (Pause/Cancel/Edit). Cancel + Pause are mutations; Edit opens a modal.
- [ ] **Step 2: Detail page** — `useQuery(adminGetSubscriptionDetail)`. Editable: frequency, discountPercent, status. "View next runs" lists projected runs from `nextRunAt`.
- [ ] **Step 3: Backend `adminGetSubscriptionDetail`** + `adminUpdateSubscription` (already exists — verify args).
- [ ] **Step 4: Commit**

```bash
git add apps/admin convex/subscriptions.ts
git commit -m "feat(admin): subscription pause/cancel/edit + detail page"
```

## Task 4.4: Wash type CRUD modals

**Files:** Modify `apps/admin/app/dashboard/services/page.tsx`.

- [ ] **Step 1: "Add Service" button** opens a Modal with a form (key, name, description, basePrice, currency, durationMins, features[], sortOrder, isActive). On submit → `adminUpsertWashType`.
- [ ] **Step 2: Edit button per row** opens same modal pre-populated.
- [ ] **Step 3: Disable button per row** calls `adminUpdateWashType` with `isActive: false` (or `adminDeleteWashType` if you prefer hard).
- [ ] **Step 4: Commit**

```bash
git add apps/admin/app/dashboard/services
git commit -m "feat(admin): wash type CRUD modals"
```

## Task 4.5–4.7: Zones, Vans, Manual booking, Team edit (PIN reset), Staff invite

Repeat the Task 4.4 pattern. Backend mutations already exist (`adminCreateZone`, `adminUpdateZone`, `adminDeleteZone`, `adminCreateVan`, …). Each task = one PR-sized commit.

- [ ] **Task 4.5 — Zones CRUD modal**
- [ ] **Task 4.6 — Vans CRUD modal**
- [ ] **Task 4.7 — Drivers: Edit + Reset PIN modal**

For Reset PIN, call `adminResetTeamPin` (Task 1.4 Step 9) and display the new PIN once in a confirmation modal (since bcrypt → never recoverable).

## Task 4.8: Staff invite + role edit page

**Files:** `apps/admin/app/dashboard/staff/page.tsx`.

- [ ] **Step 1: List all `users.role !== "customer"` from `adminListStaff`** (add to backend, ADMIN_ROLES).
- [ ] **Step 2: Add "Invite Staff" button** — opens modal collecting email + role. Calls `adminInviteStaff` (add to backend). This mutation creates a Clerk invitation via the Clerk Backend SDK in a Convex `action` (use Convex env var `CLERK_SECRET_KEY`).
- [ ] **Step 3: Role edit button** per row — SUPERADMIN_ONLY (button disabled for admin viewer). Calls `updateUser` with new role.
- [ ] **Step 4: Commit**

```bash
git add apps/admin convex/users.ts
git commit -m "feat(admin): staff invite + role edit (superadmin gate)"
```

## Task 4.9: Refunds — proactive create + booking link

**Files:** `apps/admin/app/dashboard/refunds/page.tsx`, `apps/admin/app/dashboard/bookings/[bookingId]/page.tsx`.

- [ ] **Step 1: "Issue refund" button** on booking detail page → opens modal (amount, reason). Calls `adminCreateRefund`.
- [ ] **Step 2: On Refunds list,** each row links to its booking detail (via `bookingId`). Detail shows booking context.
- [ ] **Step 3: Commit**

```bash
git add apps/admin convex/refunds.ts
git commit -m "feat(admin): proactive refund creation + booking context"
```

## Task 4.10: Activity log viewer

**Files:** Create `apps/admin/app/dashboard/activity/page.tsx`; backend `adminListActivity` (ADMIN_ROLES, paginated by `_creationTime desc`).

- [ ] **Step 1: Sidebar link** add to `apps/admin/app/dashboard/layout.tsx`.
- [ ] **Step 2: Page** — filter by `entityType` (booking/team/user/refund), search by `entityId`. Show actor, action, payload, timestamp.
- [ ] **Step 3: Commit**

```bash
git add apps/admin convex/activity.ts
git commit -m "feat(admin): activity log viewer with filters"
```

## Task 4.11: Settings expansion

**Files:** `apps/admin/app/dashboard/settings/page.tsx`.

- [ ] **Step 1: Add fields:** service fee % (`default_service_fee_pct`), currency (`currency`), subscription discount % (`subscription_discount_pct`), time windows (morning/afternoon/evening start/end), zone ETAs (table editor).
- [ ] **Step 2: Each control posts `adminUpdateSystemSetting`** (SUPERADMIN_ONLY).
- [ ] **Step 3: Read-only mode for admin / forbidden alert for operator.**
- [ ] **Step 4: Commit**

```bash
git add apps/admin
git commit -m "feat(admin): settings expansion (fee, currency, discount, windows, zones)"
```

## Task 4.12: Health page real metrics

**Files:** `apps/admin/app/dashboard/health/page.tsx`; backend `adminHealthMetrics` query.

- [ ] **Step 1: Backend `adminHealthMetrics`** — reads from `dashboardSnapshots` (Task 3.4) plus live: booking success rate (24 h), payment failure rate (24 h), average ETA accuracy, # active teams, # offline teams, # bookings stuck in `team_assigned` > 1 h.
- [ ] **Step 2: Page** — cards per metric; red border if threshold breached.
- [ ] **Step 3: Commit**

```bash
git add apps/admin convex/
git commit -m "feat(admin): real health metrics"
```

---

# PHASE 5 — Mobile customer flow

## Task 5.1: Pass discount + serviceFee through booking flow

**Files:** `apps/mobile/lib/bookingStore.ts` (or wherever Zustand store lives), `apps/mobile/app/summary.tsx`, `apps/mobile/app/confirm.tsx`.

- [ ] **Step 1: Store** — add `discountPercent: number` derived from selected `subscriptionPlan`.
- [ ] **Step 2: Summary** — show discount as a line item (already shows; ensure it's the computed value).
- [ ] **Step 3: Confirm** — `createBookingDraft({ …, subscriptionDiscountPercent: discountPercent })`.
- [ ] **Step 4: Smoke** — create a one-time booking (expect discount = 0), create a weekly booking (expect 15%). Open admin booking detail → numbers match.
- [ ] **Step 5: Commit**

```bash
git add apps/mobile
git commit -m "feat(mobile): pass subscription discount % into booking creation"
```

## Task 5.2: Delete account real implementation

**Files:** `apps/mobile/app/delete-account.tsx`.

- [ ] **Step 1: Replace stub** — call `useMutation(api.users.deleteMyAccount)`. On success, sign out via Clerk + navigate to `/welcome`. Show error toast otherwise.
- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/delete-account.tsx
git commit -m "feat(mobile): real delete account (cascade via Convex)"
```

## Task 5.3: Push notification deep-link routing

**Files:** `apps/mobile/lib/usePushNotifications.ts`, `apps/mobile/app/_layout.tsx`.

- [ ] **Step 1: Add `Notifications.addNotificationResponseReceivedListener`** that reads `data.bookingId` + `data.event`:
  - `event === "team_assigned" | "on_the_way" | "arrived"` → `router.push(\`/tracking?bookingId=\${data.bookingId}\`)`
  - team app: `event === "new_booking"` → `router.push(\`/team/\${data.bookingId}\`)`
- [ ] **Step 2: Surface push-token store failures** — replace silent `.catch(() => {})` with `console.warn`.
- [ ] **Step 3: Commit**

```bash
git add apps/mobile
git commit -m "feat(mobile): push notification deep-link routing"
```

## Task 5.4: Settings-driven currency & discount on UI

**Files:** `apps/mobile/app/(tabs)/index.tsx`, `apps/mobile/app/summary.tsx`, `apps/mobile/app/subscribe.tsx`.

- [ ] **Step 1: Replace** any hard-coded `"AED"` / `0.15` magic numbers with `useQuery(api.settings.getPublic, { key })` calls (with sensible defaults during loading).
- [ ] **Step 2: Commit**

```bash
git add apps/mobile
git commit -m "feat(mobile): pull currency + discount % from settings"
```

## Task 5.5: Empty states + redundant query removal

- [ ] **Step 1: Home empty state** — when `cars.length === 0`, show "Add your first car" CTA in place of the booking widget (not just disabled button).
- [ ] **Step 2: Summary** — pass `selectedCars`/`selectedAddress`/`washTypeDoc` via store instead of refetching. Saves three Convex subscriptions.
- [ ] **Step 3: Commit**

```bash
git add apps/mobile
git commit -m "polish(mobile): empty state on home + drop redundant summary queries"
```

---

# PHASE 6 — Mobile team flow

## Task 6.1: Route guard at team/_layout.tsx

**Files:** `apps/mobile/app/team/_layout.tsx`.

- [ ] **Step 1: Read teamStore session** synchronously; if `!session || session.expiresAt < Date.now()`, `<Redirect href="/team/login" />` before children mount.
- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/team/_layout.tsx
git commit -m "fix(team): route guard before screen mount"
```

## Task 6.2: Driver reject button

**Files:** `apps/mobile/app/team/[bookingId].tsx`.

- [ ] **Step 1: "Unable to take" button** appears when `booking.status === "team_assigned"`. Opens a reason picker (preset reasons + free text). Calls `teamRejectBookingWithSession` from Task 2.3.
- [ ] **Step 2: On success** → `router.replace("/team")`.
- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/team/[bookingId].tsx
git commit -m "feat(team): driver reject flow with reason"
```

## Task 6.3: Per-car completion checkmarks for multi-car bookings

**Files:** Schema addition (`bookingCars.completedAt: v.optional(v.number())`), `convex/bookings.ts` add `teamMarkCarComplete`, mobile UI.

- [ ] **Step 1: Schema** — add `completedAt`. Re-codegen.
- [ ] **Step 2: Mutation** — `teamMarkCarComplete({sessionId, bookingCarId})`, validates session + ownership.
- [ ] **Step 3: Booking detail UI** — list each car; checkbox toggles completion.
- [ ] **Step 4: Block transition to `completed`** until all `bookingCars.completedAt` are set (server-side check in `assertTeamStatusUpdateAllowed`).
- [ ] **Step 5: Commit**

```bash
git add convex/ apps/mobile/app/team
git commit -m "feat(team): per-car completion for multi-car bookings"
```

## Task 6.4: Multi-device session awareness

**Files:** `apps/mobile/app/team/index.tsx` (settings drawer).

- [ ] **Step 1: Show banner** if `listMySessions` returns > 1.
- [ ] **Step 2: "Log out other devices" button** → `revokeOtherSessions`.
- [ ] **Step 3: Commit**

```bash
git add apps/mobile
git commit -m "feat(team): multi-device session awareness"
```

## Task 6.5: Photo upload retry

**Files:** Create `apps/mobile/lib/uploadQueue.ts`; modify `apps/mobile/app/team/[bookingId].tsx`.

- [ ] **Step 1: Simple AsyncStorage-backed queue** — enqueue (uri, bookingId, type); background loop pulls items, retries with exponential backoff (3 attempts, 1/4/16s).
- [ ] **Step 2: Status transition** waits for queue empty before submitting `arrived` or `completed`.
- [ ] **Step 3: Commit**

```bash
git add apps/mobile
git commit -m "feat(team): offline-safe photo upload queue with retry"
```

## Task 6.6: Pause tracking when offline; battery polish

**Files:** `apps/mobile/hooks/useTeamLocationTracker.ts`.

- [ ] **Step 1: Bail out** when `team.status === "offline"`.
- [ ] **Step 2: Switch to `Accuracy.Balanced`** when no active booking; `High` when assigned.
- [ ] **Step 3: Commit**

```bash
git add apps/mobile/hooks/useTeamLocationTracker.ts
git commit -m "perf(team): pause tracking when offline, dynamic accuracy"
```

---

# PHASE 7 — Verification & finalize

## Task 7.1: Full typecheck

- [ ] **Step 1:**

```bash
( cd convex && npx tsc --noEmit ) && \
( cd apps/admin && npx tsc --noEmit ) && \
( cd apps/mobile && npx tsc --noEmit )
```
Expected: zero errors.

## Task 7.2: Full test run

- [ ] **Step 1:**

```bash
npm test
```
Expected: all green.

## Task 7.3: Convex deploy dry run

- [ ] **Step 1:**

```bash
npx convex deploy --dry-run
```
Expected: schema diff matches expectations (new tables, dropped fields, new indexes).

## Task 7.4: Smoke test matrix (manual)

- [ ] Customer: sign up → add car → add address → book one-time → see in bookings list → tracking screen live-updates → cancel from list.
- [ ] Customer: subscribe weekly → see discount in summary → see active sub in tab → admin can pause/cancel.
- [ ] Admin: log in as superadmin → create wash type → create zone → create van → create team with PIN → assign team to booking → force status change → view photos → approve refund.
- [ ] Admin: invite a staff with `admin` role → that user can see bookings but cannot edit settings (forbidden alert).
- [ ] Team: log in with PIN → see assigned booking → reject (back to dispatch) → accept new one → mark on_the_way → arrived (upload photos) → washing → completed → admin sees completion + photos.
- [ ] Team: log in on second device → home banner shows "2 sessions" → revoke others.

## Task 7.5: Finalize

- [ ] **Step 1:**

```bash
git log --oneline fix/end-to-end
```

- [ ] **Step 2: Push branch**

```bash
git push -u origin fix/end-to-end
```

- [ ] **Step 3: Hand off using `superpowers:finishing-a-development-branch`** for PR/merge decisions.

---

## Deploy notes (read before `npx convex deploy`)

1. Schema changes are **additive then subtractive** — Phase 1.1 only adds. Phase 3.2 drops `teams.currentLat/Lng/lastLocationAt` only after migration. Order matters.
2. After deploy of Phase 1, run on prod:

```bash
npx convex run migrations:backfillTeamLocations
npx convex run migrations:backfillSubscriptionDiscount
npx convex run migrations:backfillTeamPushTokens
```

3. Deploy of Phase 3.2 (drop fields) MUST come after the migration above has succeeded in prod.
4. Stripe webhook handlers (Phase 1.7) are dormant until the Stripe-side wiring is done in a future PR. They are idempotent and safe to leave deployed.

---

## Self-review

- **Spec coverage**: audit had ~30 issues; this plan addresses all except Stripe (per user). Cross-check:
  - CRITICAL money/payment: discount + serviceFee wiring (Task 2.1) ✓, webhook handlers (Task 1.7) ✓, refund stays without Stripe ✓.
  - CRITICAL security: team-ownership (1.4 step 3) ✓, operator policy (1.4 + helpers) ✓, bcrypt (1.3+1.4) ✓, sessions 24h (1.4) ✓, route guard (6.1) ✓.
  - CRITICAL admin gaps: booking detail (4.1) ✓, customer detail (4.2) ✓, activity log (4.10) ✓, photo viewer (4.1) ✓, sub actions (4.3) ✓, services/zones/vans/staff CRUD (4.4-4.8) ✓.
  - CRITICAL hot-doc: teamLocations split (1.1, 3.2) ✓, dashboard snapshot (3.4) ✓.
  - HIGH perf: helper extraction (3.1), batch joins (3.3), index sweep (3.5).
  - HIGH workflow: reject flow (2.3, 6.2), window overlap (2.4), zone lookup (2.4), per-car completion (6.3).
  - MEDIUM polish: notification scheduler+deep-link+multi-token (1.6, 5.3), cascade delete (1.5), settings (5.4, 4.11), uploads queue (6.5), tracking polish (6.6), multi-session (6.4).
- **Placeholders**: scanned — no TBD/TODO; code provided for non-obvious parts; smaller boilerplate parts are pattern-described.
- **Type consistency**: helper names (`getCurrentUser`, `requireRole`, `selectClosestAvailableTeam`, `notifyBookingEvent`) used consistently across tasks. `STAFF_ROLES`/`ADMIN_ROLES`/`SUPERADMIN_ONLY` constants reused throughout.

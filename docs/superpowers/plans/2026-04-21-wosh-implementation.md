# WOSH Full Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a complete end-to-end car wash booking platform (WOSH) with customer mobile app, team mobile app, and admin dashboard - no payment integration yet.

**Architecture:** Monorepo with shared Convex backend. Customer and Team apps are Expo React Native (same project, different route groups). Admin is Next.js. Real-time sync via Convex subscriptions throughout.

**Tech Stack:** Expo React Native, Next.js 16, Convex (real-time DB), Clerk (auth), Google Maps + Places API, Zustand (mobile state)

---

## Implementation Phases

```
Phase 1: Customer Flow Completion (auto-confirm, subscriptions, Google Maps search)
Phase 2: Admin Panel Completion (dispatch map, settings, enhanced management)
Phase 3: Team Mobile App (team role login, booking list, status updates)
Phase 4: Backend Enhancements (cron jobs, team location, notifications hooks)
Phase 5: WOSH Brand Rename (across all files)
```

---

## Phase 1: Customer Flow Completion

### Task 1.1: Auto-Confirm Booking Flow

**Goal:** Change payment.tsx to instant booking confirmation (no fake payment)

**Files:**
- Modify: `apps/mobile/app/payment.tsx` → rename to `confirm.tsx`
- Modify: `apps/mobile/app/summary.tsx` (update redirect)
- Modify: `convex/bookings.ts` - add auto-confirm logic in `createBookingDraft`

**Changes:**

1. `summary.tsx` - Update `handleConfirm` to redirect to `/confirm` instead of `/payment`
2. Create new `apps/mobile/app/confirm.tsx`:
   - On mount: call `bookings:createBookingDraft` which auto-confirms
   - Show success animation
   - Redirect to `/tracking?bookingId={bookingId}`

3. `convex/bookings.ts` - Modify `createBookingDraft`:
```typescript
// Change status from "booked" to "confirmed" immediately
handler: async (ctx, args) => {
  // ... existing validation ...
  await ctx.db.insert("bookings", {
    // ... existing fields ...
    status: "confirmed",  // AUTO-CONFIRM
    paymentStatus: "succeeded",  // Mark as paid (for now)
  });
  // ... rest unchanged ...
}
```

---

### Task 1.2: Google Maps Location Search with Draggable Pin

**Goal:** Enhance location.tsx with Places autocomplete and better UX

**Files:**
- Modify: `apps/mobile/app/location.tsx`
- Modify: `apps/mobile/app/_layout.tsx` (add Google Maps API key prop)
- Modify: `.env.example` (document API key)

**Changes:**

1. Install `@react-google-maps/api` and `react-google-places-autocomplete` (or similar)
2. `location.tsx` redesign:
   - Add SearchBar at top with Google Places autocomplete
   - Map below with draggable marker
   - "Use current location" FAB button
   - Address form below map
   - When user searches/selects place → map centers and pin drops there
   - When user drags pin → reverse geocode to update address field

3. Environment: `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in mobile `.env`

---

### Task 1.3: Subscription Management Screen

**Goal:** Allow customers to view, pause, and cancel their subscriptions

**Files:**
- Create: `apps/mobile/app/(tabs)/subscriptions.tsx`
- Modify: `apps/mobile/app/(tabs)/_layout.tsx` (add subscriptions tab)
- Modify: `convex/subscriptions.ts` (ensure mutations work)

**Changes:**

1. New tab `Subscriptions` in bottom nav
2. `subscriptions.tsx`:
   - List active subscriptions from `subscriptions:listMySubscriptions`
   - Show: wash type, frequency, next run date, price
   - "Pause" toggle - calls `subscriptions:pauseSubscription`
   - "Cancel" button with confirmation modal - calls `subscriptions:cancelSubscription`
   - Show past/cancelled subscriptions separately

---

### Task 1.4: Fix Home Subscription Toggle

**Goal:** Wire up the subscription toggle on home screen to actually save selection

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Modify: `apps/mobile/lib/store.ts` (add subscriptionPlan to store)
- Modify: `apps/mobile/app/summary.tsx` (use subscriptionPlan from store)

**Changes:**

1. `store.ts` - Add `subscriptionPlan` field (null | "weekly" | "biweekly" | "monthly")
2. `index.tsx` - When user toggles subscription or selects plan:
   - Save to `useBookingStore`
   - Show discount badge on wash cards
3. `summary.tsx` - Read `subscriptionPlan` from store, calculate 15% discount

---

### Task 1.5: Test Customer Flow End-to-End

**Goal:** Verify full flow works: welcome → auth → add car → book → track

**Testing:**
- [ ] Create account (Apple/Google/Email)
- [ ] Add a car
- [ ] Book a wash (auto-confirm)
- [ ] Verify booking appears in tracking immediately as "confirmed"
- [ ] Test location search with Google Places
- [ ] Test subscription toggle and discount
- [ ] View booking in history

---

## Phase 2: Admin Panel Completion

### Task 2.1: Dispatch Map Page

**Goal:** Real-time map showing active bookings and team locations

**Files:**
- Create: `apps/admin/app/dashboard/dispatch/page.tsx`
- Modify: `apps/admin/app/dashboard/layout.tsx` (add Dispatch link in nav)

**Changes:**

1. `dispatch/page.tsx`:
   - Google Maps integration (`@react-google-maps/api`)
   - Query `adminListBookings` filtered for active statuses
   - Query `teams:adminListTeams`
   - Render booking markers (purple) and team markers (green)
   - Click marker → info popup with booking/team details
   - Auto-refresh via Convex subscriptions

---

### Task 2.2: Settings Page - Wash Types CRUD

**Goal:** Allow admin to manage wash types (add/edit/delete)

**Files:**
- Modify: `apps/admin/app/dashboard/settings/page.tsx` (main settings hub)
- Create: `apps/admin/app/dashboard/settings/wash-types/page.tsx`
- Modify: `convex/washTypes.ts` (ensure CRUD functions exist)

**Changes:**

1. `settings/page.tsx` - Hub page with links to sub-settings
2. `settings/wash-types/page.tsx`:
   - List all wash types in table
   - "Add Wash Type" button → modal form
   - Edit/Delete actions per row
   - Form: key, name, description, basePrice, currency, durationMins, sortOrder

---

### Task 2.3: Settings Page - Pricing Rules

**Goal:** Allow admin to manage service fees and discounts

**Files:**
- Create: `apps/admin/app/dashboard/settings/pricing/page.tsx`
- Modify: `convex/settings.ts`

**Changes:**

1. `settings/pricing/page.tsx`:
   - Service fee toggle (enable/disable)
   - Service fee amount input (AED)
   - Subscription discount percentage (default 15%)
   - Save to `systemSettings` table

---

### Task 2.4: Settings Page - ETA Configuration

**Goal:** Allow admin to set zone-based ETA rules

**Files:**
- Create: `apps/admin/app/dashboard/settings/zones/page.tsx`
- Modify: `convex/settings.ts`

**Changes:**

1. `settings/zones/page.tsx`:
   - Default ETA range (min/max minutes)
   - Zone list with custom ETA overrides
   - Zone = polygon areas or radius from center
   - For MVP: simple list of zone names with ETA overrides

---

### Task 2.5: Enhanced Teams Management

**Goal:** Full CRUD for teams with status management

**Files:**
- Modify: `apps/admin/app/dashboard/teams/page.tsx`
- Modify: `convex/teams.ts`

**Changes:**

1. `teams/page.tsx`:
   - Table: Name, Status, Current Location, Assigned Bookings
   - Add Team modal (name input)
   - Edit team inline (name, status dropdown)
   - "View on Map" button per team (opens map focused on team location)
   - Delete team (soft delete - set isActive: false)

---

### Task 2.6: Enhanced Users Management

**Goal:** User detail panel with full booking/car/address history

**Files:**
- Modify: `apps/admin/app/dashboard/users/page.tsx`

**Changes:**

1. `users/page.tsx`:
   - Click user row → slide-over panel (right side)
   - Panel shows:
     - User details (name, email, phone, created date)
     - All bookings (table with status badges)
     - All cars (list)
     - All addresses (list with map preview)
     - Deactivate/Activate toggle button

---

### Task 2.7: Enhanced Bookings Page

**Goal:** Add "booked" status is gone, update filtering and UI

**Files:**
- Modify: `apps/admin/app/dashboard/bookings/page.tsx`

**Changes:**

1. Remove "booked" from status filter (bookings auto-confirm now)
2. Update booking detail modal:
   - Remove "Confirm" button (not needed)
   - Keep "Reject" for edge cases? Or remove entirely
   - Keep status update dropdown
   - Keep team assignment
3. Add map preview in detail modal

---

### Task 2.8: Admin Dashboard Enhancements

**Goal:** Better dashboard with revenue tracking and quick actions

**Files:**
- Modify: `apps/admin/app/dashboard/page.tsx`

**Changes:**

1. Add revenue card (today, this week, this month)
2. Add booking trend mini chart (last 7 days)
3. Fix "Quick Actions" buttons to actually navigate
4. Add "Active Bookings on Map" preview (small map widget)

---

### Task 2.9: Test Admin Flow End-to-End

**Goal:** Verify full admin workflow

**Testing:**
- [ ] Login as admin
- [ ] See dashboard metrics
- [ ] View all bookings with filters
- [ ] Assign team to booking
- [ ] Update booking status
- [ ] Open dispatch map
- [ ] Manage teams
- [ ] Manage wash types in settings
- [ ] Manage pricing in settings

---

## Phase 3: Team Mobile App

### Task 3.1: Team Route Group Setup

**Goal:** Create `/team/*` route structure in Expo app

**Files:**
- Create: `apps/mobile/app/team/_layout.tsx`
- Create: `apps/mobile/app/team/login.tsx`
- Create: `apps/mobile/app/team/index.tsx` (my bookings)
- Create: `apps/mobile/app/team/[bookingId].tsx` (booking detail)
- Modify: `apps/mobile/app/_layout.tsx` (add team route group)

**Changes:**

1. `team/_layout.tsx`:
   - Auth guard: check Clerk user has `role === "team"` or `"operator"`
   - If not team role, redirect to customer app
   - Different nav bar: "My Jobs" tab only

---

### Task 3.2: Team Login Screen

**Goal:** Simple login flow for team members

**Files:**
- Modify: `apps/mobile/app/team/login.tsx`

**Changes:**

1. Use Clerk `<SignIn>` component
2. After sign in, verify role via `users:getCurrentUserProfile`
3. If role is team/operator, go to `/team/index`
4. If not authorized, show "Not authorized as team member" and sign out

---

### Task 3.3: Team My Bookings List

**Goal:** List all bookings assigned to the logged-in team

**Files:**
- Modify: `apps/mobile/app/team/index.tsx`
- Create/Modify: `convex/bookings.ts` (add `listMyAssignedBookings` query)

**Changes:**

1. `convex/bookings.ts` - New query:
```typescript
export const listMyAssignedBookings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db.query("users").withIndex("by_clerk_id", ...).first();
    if (!user || (user.role !== "team" && user.role !== "operator")) return [];
    // Find teams owned by this user
    const teams = await ctx.db.query("teams").collect();
    const myTeams = teams.filter(t => /* team lead or member */);
    // Get bookings assigned to these teams
    const bookings = await ctx.db.query("bookings").collect();
    return bookings.filter(b => myTeams.some(t => b.assignedTeamId === t._id));
  }
});
```

2. `team/index.tsx`:
   - Query `bookings:listMyAssignedBookings`
   - Filter for active statuses (team_assigned, on_the_way, arrived, washing_in_progress)
   - Cards showing: customer name, address, wash type, car count, time
   - Tap → navigate to `/team/[bookingId]`

---

### Task 3.4: Team Booking Detail with Status Updates

**Goal:** Booking detail screen with one-tap status updates and navigation

**Files:**
- Modify: `apps/mobile/app/team/[bookingId].tsx`
- Modify: `convex/bookings.ts` (add `teamUpdateStatus` mutation)

**Changes:**

1. `team/[bookingId].tsx`:
   - Show full booking details
   - Address with "Navigate" button → opens Apple Maps / Google Maps with address
   - Status timeline (visual)
   - Status action buttons based on current status:
     - If "team_assigned": [Start Route] → sets status "on_the_way"
     - If "on_the_way": [I've Arrived] → sets status "arrived"
     - If "arrived": [Start Washing] → sets status "washing_in_progress"
     - If "washing_in_progress": [Complete] → sets status "completed"
   - Each tap calls mutation and shows success

2. New mutation `teamUpdateStatus`:
```typescript
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
    // Verify user is on the assigned team
    // Update booking status
    // If completed, set team status back to "available"
  }
});
```

---

### Task 3.5: Team Location Updates

**Goal:** Allow team to share GPS location with admin

**Files:**
- Modify: `apps/mobile/app/team/[bookingId].tsx`
- Modify: `convex/teams.ts` (add `updateMyLocation` action)

**Changes:**

1. `convex/teams.ts` - New action:
```typescript
export const updateMyLocation = action({
  args: {
    lat: v.number(),
    lng: v.number(),
  },
  handler: async (ctx, args) => {
    // Get user from auth
    // Find their team
    // Update team currentLat, currentLng, lastLocationAt
  }
});
```

2. `team/[bookingId].tsx`:
   - On mount, start location tracking
   - Every 30 seconds, call `teams:updateMyLocation`
   - Stop tracking when leaving screen
   - Or: "Share Location" toggle button

---

### Task 3.6: Test Team App End-to-End

**Goal:** Verify full team workflow

**Testing:**
- [ ] Login as team member
- [ ] See assigned bookings
- [ ] Tap booking → see detail
- [ ] Tap "Start Route" → status updates, admin sees it
- [ ] Navigate to customer address
- [ ] Tap "I've Arrived" → status updates
- [ ] Tap "Start Washing" → status updates
- [ ] Tap "Complete" → booking done, team available again

---

## Phase 4: Backend Enhancements

### Task 4.1: Recurring Bookings Cron Job

**Goal:** Automatically generate bookings from active subscriptions

**Files:**
- Create: `convex/crons.ts`
- Modify: `convex/subscriptions.ts` (add `generateRecurringBookings` internal mutation)

**Changes:**

1. `convex/crons.ts`:
```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "generateRecurringBookings",
  { hours: 6 },  // Run every 6 hours
  internal.subscriptions.generateRecurringBookings,
  {}
);

export default crons;
```

2. `convex/subscriptions.ts` - New internal mutation:
```typescript
export const generateRecurringBookings = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    for (const sub of subscriptions) {
      if (sub.nextRunAt && sub.nextRunAt <= now) {
        // Create booking
        // Calculate next run date based on frequency
        // Update subscription lastRunAt and nextRunAt
      }
    }
  }
});
```

---

### Task 4.2: Notification Placeholder Actions

**Goal:** Create stub notification actions (hooks ready for Expo Push later)

**Files:**
- Create: `convex/notifications.ts`

**Changes:**

1. `convex/notifications.ts`:
```typescript
export const sendBookingConfirmedPush = action({
  args: { userId: v.id("users"), bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    // TODO: Implement with Expo Push when ready
    // For now: log activity
    console.log(`[Push Stub] Booking ${args.bookingId} confirmed for user ${args.userId}`);
  }
});

export const sendTeamAssignedPush = action({
  args: { userId: v.id("users"), bookingId: v.id("bookings"), teamName: v.string() },
  handler: async (ctx, args) => {
    console.log(`[Push Stub] Team ${args.teamName} assigned to booking ${args.bookingId}`);
  }
});

export const sendStatusUpdatePush = action({
  args: { userId: v.id("users"), bookingId: v.id("bookings"), status: v.string() },
  handler: async (ctx, args) => {
    console.log(`[Push Stub] Booking ${args.bookingId} status: ${args.status}`);
  }
});
```

2. Wire these into `bookings.ts` mutations where status changes

---

### Task 4.3: ETA Calculation Enhancement

**Goal:** Zone-based ETA lookup

**Files:**
- Modify: `convex/bookings.ts` (modify `createBookingDraft`)
- Modify: `convex/settings.ts`

**Changes:**

1. In `createBookingDraft`, after creating booking:
   - Get address latitude/longitude
   - Query systemSettings for zone overrides
   - Calculate ETA based on zone or default
   - Update booking with `etaMin` and `etaMax`

2. For MVP: Simple zone check (zone name matches address string contains)

---

## Phase 5: WOSH Brand Rename

### Task 5.1: Rename in Documentation

**Files:**
- Modify: `README.md` (title, description)
- Modify: `prd.md` (name references)
- Modify: `DESIGN.md` (name references)

**Changes:**
- "Midnight Velocity" → "WOSH" everywhere

---

### Task 5.2: Rename in Mobile App

**Files:**
- Modify: `apps/mobile/app/_layout.tsx` (app name)
- Modify: `apps/mobile/app/welcome.tsx` (branding images/text)
- Modify: `apps/mobile/constants/theme.ts` (if brand colors referenced)

**Changes:**
- Update app display name
- Update welcome screen branding

---

### Task 5.3: Rename in Admin App

**Files:**
- Modify: `apps/admin/app/page.tsx` (if title)
- Modify: `apps/admin/app/dashboard/layout.tsx` (if brand in sidebar)

---

### Task 5.4: Environment Variables Documentation

**Files:**
- Modify: `.env.example`

**Changes:**
- Add `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` to mobile env
- Update deployment URLs if renamed

---

### Task 5.5: Final End-to-End Test

**Goal:** Full system test with all pieces connected

**Testing:**
- [ ] Customer: Sign up → Add car → Book wash → See confirmed → Team updates status → Completed
- [ ] Team: See job → Update statuses through to completion
- [ ] Admin: See all updates real-time → Dispatch map accurate → Manage everything
- [ ] Subscriptions: Create subscription → Cron generates recurring booking
- [ ] Branding: App shows WOSH everywhere

---

## File Summary

### New Files to Create
```
apps/mobile/app/(tabs)/subscriptions.tsx
apps/mobile/app/confirm.tsx
apps/mobile/app/team/_layout.tsx
apps/mobile/app/team/login.tsx
apps/mobile/app/team/index.tsx
apps/mobile/app/team/[bookingId].tsx
apps/admin/app/dashboard/dispatch/page.tsx
apps/admin/app/dashboard/settings/wash-types/page.tsx
apps/admin/app/dashboard/settings/pricing/page.tsx
apps/admin/app/dashboard/settings/zones/page.tsx
convex/crons.ts
convex/notifications.ts
docs/superpowers/plans/YYYY-MM-DD-wosh-implementation.md (this file)
```

### Major File Modifications
```
apps/mobile/app/payment.tsx → confirm.tsx
apps/mobile/app/location.tsx (Google Maps search)
apps/mobile/app/summary.tsx (subscription from store)
apps/mobile/app/(tabs)/index.tsx (subscription toggle)
apps/mobile/app/(tabs)/_layout.tsx (add subscriptions tab)
apps/mobile/lib/store.ts (add subscriptionPlan)
apps/admin/app/dashboard/page.tsx (enhancements)
apps/admin/app/dashboard/bookings/page.tsx (remove booked status)
apps/admin/app/dashboard/teams/page.tsx (full CRUD)
apps/admin/app/dashboard/users/page.tsx (detail panel)
apps/admin/app/dashboard/settings/page.tsx (hub page)
convex/bookings.ts (auto-confirm, ETA, notifications)
convex/teams.ts (updateMyLocation action)
convex/subscriptions.ts (generateRecurringBookings)
README.md, prd.md, DESIGN.md (WOSH rename)
.env.example (document Google Maps key)
```

---

## Implementation Order

```
Week 1:
- Task 1.1: Auto-confirm booking
- Task 1.2: Google Maps location search
- Task 1.3: Subscription management screen
- Task 1.4: Fix subscription toggle

Week 2:
- Task 2.1: Dispatch map
- Task 2.2: Settings - wash types
- Task 2.3: Settings - pricing
- Task 2.4: Settings - zones

Week 3:
- Task 2.5-2.9: Enhanced admin pages
- Task 3.1-3.3: Team app setup and login

Week 4:
- Task 3.4-3.5: Team booking detail and status updates
- Task 4.1: Cron for subscriptions
- Task 4.2-4.3: Notifications and ETA

Week 5:
- Task 5.1-5.4: WOSH rename
- Task 5.5: Final testing
```

---

*Plan created from spec: `docs/superpowers/specs/2026-04-21-wosh-full-platform-audit.md`*
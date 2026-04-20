# WOSH - Full Stack Car Wash Platform

## Spec Version: 2026-04-21

---

## 1. Overview

### Project Name Change
- **From:** Midnight Velocity
- **To:** WOSH

### What This Spec Covers

Complete audit and implementation plan for a production-ready car wash booking platform consisting of:

1. **Customer Mobile App** (Expo React Native)
2. **Team Mobile App** (Expo React Native - separate entry point)
3. **Admin Web Dashboard** (Next.js)
4. **Shared Backend** (Convex real-time database)

### What's Excluded
- Stripe/payment integration (deferred for later phase)
- Push notifications (hooks in place, implementation deferred)

---

## 2. User Flows - Complete End-to-End

### 2.1 Customer Flow (No Payment - Confirm & Book)

```
[STEP 1] Welcome Screen
        │
        ▼
[STEP 2] Auth (Clerk - Apple/Google/Email)
        │
        ▼
[STEP 3] Home Screen
        ├── Select 1+ cars from saved cars
        ├── Select wash type (Basic 35AED / Premium 55AED / Full Detail 95AED)
        ├── View default address
        ├── Toggle subscription option (weekly 15% off / biweekly / monthly)
        └── "Book Now" → Summary
        │
        ▼
[STEP 4] Location Screen
        ├── Map with draggable pin (auto-get current location)
        ├── Save address form (address, apt/villa, building, street, notes)
        └── Save & Continue → Summary
        │
        ▼
[STEP 5] Summary Screen
        ├── Edit wash type (modal picker)
        ├── Edit cars (modal picker)
        ├── Edit address (modal picker)
        ├── View price breakdown (subtotal, discount, total)
        ├── Subscription label shown
        └── "Confirm Booking" → Tracking
        │
        ▼
[STEP 6] Tracking Screen
        ├── Booking confirmed immediately (status: "booked" → "confirmed")
        ├── Timeline: Confirmed → Team Assigned → On the Way → Arrived → Washing → Completed
        ├── Rejection handling with reason shown
        └── "Awaiting admin confirmation" banner if in "booked" state
```

### 2.2 Admin Flow

```
[STEP 1] Login (Clerk auth with admin/operator role)
        │
        ▼
[STEP 2] Dashboard
        ├── KPI cards: Today's Bookings, Active Bookings, Total Users, Available Teams
        ├── Revenue (today/month)
        ├── Recent bookings table
        └── Quick actions sidebar
        │
        ▼
[STEP 3] Bookings Management
        ├── Filter by status (All / Booked / Confirmed / Team Assigned / etc.)
        ├── Search by booking number, customer name, plate
        ├── Click row → Detail modal
        │   ├── Customer info + contact
        │   ├── Service + cars
        │   ├── Address with map preview
        │   ├── Price breakdown
        │   └── Actions:
        │       ├── If "booked": [Confirm] [Reject + reason]
        │       ├── If "confirmed"+: [Update Status dropdown]
        │       └── [Assign Team] (dropdown of available teams)
        │
        ▼
[STEP 4] Dispatch Map (NEW)
        ├── Map showing all active booking locations (markers)
        ├── Map showing team locations (when implemented)
        └── Click marker → booking details popup
        │
        ▼
[STEP 5] Teams Management
        ├── List all teams
        ├── Add/Edit team (name, status: available/busy/offline)
        ├── View assigned bookings per team
        └── (Future) GPS location tracking
        │
        ▼
[STEP 6] Users Management
        ├── List all customers
        ├── Search by name/email
        ├── View user details + all their bookings
        ├── View user's cars + addresses
        └── Deactivate/activate user
        │
        ▼
[STEP 7] Settings (NEW)
        ├── Wash Types: Add/Edit/Delete wash types (key, name, description, price, duration)
        ├── Pricing: Service fee toggle, zone-based pricing
        ├── ETA Rules: Default ETA ranges, zone overrides
        └── System: Feature flags, maintenance mode
        │
        ▼
[STEP 8] Activity Log
        └── All system events (booking created, status changed, team assigned, etc.)
```

### 2.3 Team Flow

```
[STEP 1] Login (Clerk auth - team role)
        │
        ▼
[STEP 2] My Bookings
        ├── List of assigned bookings (status: team_assigned, on_the_way, arrived, washing)
        ├── Each card shows: Customer name, address, wash type, car count, time
        └── Tap → Booking Detail
        │
        ▼
[STEP 3] Booking Detail
        ├── Full address with "Navigate" button (opens Apple Maps / Google Maps)
        ├── Car details (make, model, plate)
        ├── Status timeline
        └── Status Update Buttons:
            └── [On the Way] → [Arrived] → [Washing] → [Completed]
        │
        ▼
[STEP 4] Status Updates
        ├── Tapping updates Convex status
        ├── Admin sees real-time update
        ├── Customer tracking page updates
        └── Team status auto-set to "busy" when assigned, "available" when completed
```

---

## 3. Architecture

### 3.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          CONVEX                                  │
│                    (Real-time Database)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  users   │  │ bookings │  │  cars    │  │addresses │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ washTypes│  │ teams    │  │subscriptions│ │activityLogs│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│  ┌──────────┐  ┌──────────┐                                      │
│  │systemSettings│ │bookingAssignments│                         │
│  └──────────┘  └──────────┘                                      │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Customer App   │  │   Team App      │  │   Admin Panel   │
│  (Expo Mobile)   │  │  (Expo Mobile)  │  │   (Next.js)     │
│                 │  │                 │  │                 │
│ / (tabs)        │  │ /team/*         │  │ /dashboard/*    │
│  ├── index      │  │  ├── _layout    │  │  ├── page       │
│  ├── cars       │  │  ├── login      │  │  ├── bookings   │
│  ├── bookings   │  │  ├── index      │  │  ├── teams      │
│  └── profile    │  │  └── detail     │  │  ├── users     │
│ /welcome        │  │                 │  │  ├── dispatch   │
│ /auth           │  │                 │  │  ├── settings  │
│ /summary        │  │                 │  │  └── activity  │
│ /tracking       │  │                 │  │                 │
│ /location       │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### 3.2 Database Schema (Convex)

**Tables already exist:** users, cars, addresses, washTypes, bookings, bookingCars, subscriptions, teams, bookingAssignments, activityLogs, systemSettings

**Additions needed:**
- `teamLocations` table for GPS tracking (future, not in MVP)
- Push tokens storage (user field or separate table)

---

## 4. Feature Implementation Details

### 4.1 Customer App Changes

#### Screen: Payment → Confirm
**File:** `apps/mobile/app/payment.tsx`

**Change:** Rename to `confirm.tsx` or keep payment but make it instant confirmation (no fake Stripe)

**Logic:**
1. On mount, create booking via `bookings:createBookingDraft`
2. Immediately confirm via `bookings:adminConfirmBooking` (or allow booking to stay in "booked" state requiring admin confirm)
3. Redirect to tracking with booking ID

**Decision:** Use "booked" state requiring admin confirm for now (realistic workflow). When Stripe added, auto-confirm.

#### Screen: Subscription Management (NEW)
**File:** `apps/mobile/app/(tabs)/subscriptions.tsx`

**Features:**
- List active subscriptions
- Show next run date
- Pause subscription (toggle)
- Cancel subscription (with confirmation)
- "Resubscribe" option for cancelled

**Backend:** mutations for pause/cancel already exist in `subscriptions.ts`

#### Screen: Home Subscription Toggle
**File:** `apps/mobile/app/(tabs)/index.tsx`

**Current:** Subscription toggle exists in UI
**Fix:** Actually save subscription selection to booking store, pass to summary

### 4.2 Admin Panel Changes

#### Page: Dispatch/Map (NEW)
**File:** `apps/admin/app/dashboard/dispatch/page.tsx`

**Features:**
- Google Maps / Mapbox integration
- Show markers for all active bookings (confirmed → washing_in_progress)
- Show markers for teams with current location
- Click marker → popup with booking/team details
- Color code: bookings (purple), teams (green)

**Technical:** Use `@react-google-maps/api` or similar

#### Page: Settings (NEW)
**File:** `apps/admin/app/dashboard/settings/page.tsx`

**Sub-pages:**
- `/wash-types` - CRUD for wash types
- `/pricing` - Service fee, discounts
- `/zones` - Zone-based ETA configuration
- `/system` - Feature flags

**Backend:** Use existing `systemSettings` table + `settings.ts`

#### Page: Teams Enhancement
**File:** `apps/admin/app/dashboard/teams/page.tsx`

**Add:**
- Add Team modal (name, status)
- Edit team inline
- View on map button (if team has location)

#### Page: Users Enhancement
**File:** `apps/admin/app/dashboard/users/page.tsx`

**Add:**
- Click user → slide-over panel with:
  - User details
  - All bookings (linked)
  - All cars
  - All addresses
  - Deactivate/Activate toggle

### 4.3 Team App (NEW)

**Structure:**
- Same Expo project, different entry point or route group
- `/team/*` route group
- Separate Clerk authentication for team role

**Files to create:**
```
apps/mobile/
├── app/team/
│   ├── _layout.tsx
│   ├── login.tsx
│   ├── index.tsx (my bookings list)
│   └── [bookingId].tsx (booking detail + status updates)
```

**Features:**
- Simple login (just email/password or PIN for speed)
- List assigned bookings (from `bookingAssignments` + `bookings` with team_id match)
- Status update buttons (on_the_way, arrived, washing_in_progress, completed)
- Navigate button (opens maps app with address)
- Real-time updates via Convex subscriptions

### 4.4 Backend Changes (Convex)

#### Subscriptions - Cron for Recurring (NEW)
**File:** `convex/crons.ts`

```typescript
// Run daily to generate recurring bookings
crons.interval("generateRecurringBookings", { hours: 24 }, internal.subscriptions.generateRecurringBookings, {});
```

**Logic:**
1. Query all active subscriptions where `nextRunAt <= now`
2. For each subscription:
   - Create booking with same cars, wash type, address
   - Set `scheduledFor` to next run time
   - Update `lastRunAt` and calculate `nextRunAt` based on frequency
   - Charge stored Stripe payment method (when Stripe added)

#### Team Location Updates (NEW)
**File:** `convex/teams.ts`

```typescript
export const updateMyLocation = action({
  args: {
    teamId: v.id("teams"),
    lat: v.number(),
    lng: v.number(),
  },
  handler: async (ctx, args) => {
    // Update team currentLat/currentLng
    // Update lastLocationAt timestamp
    // Log activity
  }
});
```

#### Notification Hooks (Placeholders)
**File:** `convex/notifications.ts`

```typescript
// These will be implemented when push notifications are added
export const sendBookingConfirmedPush = action({...});
export const sendTeamAssignedPush = action({...});
export const sendStatusUpdatePush = action({...});
```

#### Settings Admin Functions
**File:** `convex/settings.ts`

Already exists: `adminListSystemSettings`, `adminUpdateSystemSetting`

Need: Add wash types CRUD functions or extend existing ones

### 4.5 Brand Rename - WOSH

**Files to update:**

| File | Changes |
|------|---------|
| `README.md` | Title, description, "Midnight Velocity" → "WOSH" |
| `apps/mobile/app/_layout.tsx` | App name/numbering info |
| `apps/mobile/app/welcome.tsx` | Branding images/text |
| `package.json` (root) | Name reference |
| Clerk Dashboard | Rename application to "WOSH" |
| Convex Dashboard | Rename deployment to "wosh" |

**Design tokens:** Keep existing "Obsidian Fluidity" - dark theme with purple accents. Just rename.

---

## 5. Implementation Order

### Phase 1: Fix & Complete Customer Flow
1. Fix payment → confirm flow
2. Add subscription management screen
3. Fix home subscription toggle logic
4. Test full flow end-to-end (no Stripe)

### Phase 2: Complete Admin Panel
1. Build Dispatch/Map page
2. Build Settings pages (wash types, pricing)
3. Enhance Teams page
4. Enhance Users page with detail panel
5. Fix Dashboard with proper metrics

### Phase 3: Team App
1. Create team route group
2. Build team login
3. Build my bookings list
4. Build booking detail + status updates
5. Test with admin assignment

### Phase 4: Backend Enhancements
1. Implement cron for recurring bookings
2. Add team location update action
3. Add notification placeholder actions
4. Test all Convex functions

### Phase 5: Polish & Rename
1. Rename all files/references from Midnight Velocity → WOSH
2. Update Clerk app name
3. Update Convex deployment name
4. Test everything works

---

## 6. Testing Checklist

### Customer Flow
- [ ] Welcome → Auth works
- [ ] Add car (make, model, plate, region)
- [ ] Select car(s) on home
- [ ] Select wash type
- [ ] Add/save address with map
- [ ] Summary shows correct price
- [ ] Confirm booking creates in Convex
- [ ] Tracking shows correct status
- [ ] View booking history

### Admin Flow
- [ ] Login as admin
- [ ] Dashboard shows metrics
- [ ] View all bookings with filters
- [ ] Confirm a booking (status → confirmed)
- [ ] Reject a booking (with reason)
- [ ] Assign team to booking
- [ ] Update booking status manually
- [ ] Manage teams (add/edit)
- [ ] Manage wash types in settings

### Team Flow
- [ ] Login as team member
- [ ] See assigned bookings
- [ ] Update status (on_the_way → arrived → washing → completed)
- [ ] Status updates reflect in admin and customer tracking

### Integration
- [ ] Real-time sync between all apps (Convex subscriptions)
- [ ] Activity logs being created
- [ ] All roles respected (customer vs team vs admin vs operator)

---

## 7. Dependencies Already in Place

**Schema:** Complete with all major tables
**Auth:** Clerk integrated in both mobile and admin
**Design System:** Obsidian Fluidity theme in place
**Convex Functions:** Bookings, users, cars, addresses, teams all partially implemented

**Need to add:**
- Team app routes and screens
- Admin dispatch map
- Admin settings pages
- Subscription management
- Cron for recurring bookings

---

## 8. Open Questions / Decisions Needed

1. **Team app auth:** Use Clerk like customer app, or simpler PIN-based for speed?
2. **Booking confirm:** Auto-confirm on creation or require admin approval? (Current: requires approval - keeping that)
3. **Map provider:** Google Maps or Mapbox for dispatch map?
4. **Subscription charging:** For now subscriptions create bookings but don't charge. Is this acceptable until Stripe added?
5. **Team location:** GPS tracking - implement now or later?

---

*This spec will be used to generate the implementation plan.*
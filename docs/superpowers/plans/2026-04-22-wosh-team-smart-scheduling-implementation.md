# WOSH Team & Smart Scheduling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement team app with PIN auth, photo uploads, 4-hour time windows, smart auto-assignment, and full notifications.

**Architecture:**
- Team mobile app at `/team` route group with PIN + phone authentication
- Time window selection added to customer booking flow
- Photos stored in Convex file storage, SHA256 PIN hashing
- Auto-assignment checks team availability against time windows
- Push notifications via Expo Push, in-app via Convex realtime

---

## Phase 1: Team Authentication

### Task 1.1: Update Teams Schema
**Files:** Modify `convex/schema.ts:133-144`
- Add `phone: v.optional(v.string())` and `pinHash: v.optional(v.string())` to teams table

### Task 1.2: Create Team Auth Mutations
**Files:** Create `convex/teamAuth.ts`
- `teamLogin` - validates phone + PIN (SHA256), returns session token
- `teamLogout` - invalidates session
- `getMyTeam` - returns team info for valid session

### Task 1.3: Create Team Login Screen
**Files:** Create `apps/mobile/app/team/login.tsx`
- Phone + PIN inputs
- Login button → calls teamLogin mutation
- Navigate to team index on success

### Task 1.4: Seed 3 Teams with PINs
**Files:** Modify `convex/teams.ts`
- Add `seedTeams` mutation (admin only)
- Creates 3 teams: Alpha (+971501234567/1234), Beta (+971502345678/5678), Gamma (+971503456789/9012)
- Default Dubai location (25.2048, 55.2708)

### Task 1.5: Admin PIN Management
**Files:** Modify `convex/teams.ts`, `apps/admin/app/dashboard/teams/page.tsx`
- Add `adminResetTeamPin` mutation
- Show phone in team list, add Reset PIN button

---

## Phase 2: Time Window Selection

### Task 2.1: Update Bookings Schema
**Files:** Modify `convex/schema.ts`
- Add `scheduledDate: v.optional(v.string())` and `scheduledWindow: v.optional(v.union(...))` to bookings

### Task 2.2: Create Time Windows Table
**Files:** Modify `convex/schema.ts`
- New table `bookingTimeWindows`: date, window, teamId, maxBookings, currentBookings

### Task 2.3: Create Time Window Mutations
**Files:** Create `convex/timeWindows.ts`
- `getAvailableWindows` - list windows for a date
- `reserveWindow` - increment currentBookings
- `releaseWindow` - decrement currentBookings

### Task 2.4: Create Time Window Selection UI
**Files:** Create `apps/mobile/app/time.tsx`
- Date picker (next 7 days)
- 4-hour window selector (Morning 8-12, Afternoon 12-4, Evening 4-8)
- Updates store and navigates to summary

### Task 2.5: Update Booking Flow
**Files:** Modify `convex/bookings.ts`, `apps/mobile/app/summary.tsx`
- Pass scheduledDate/scheduledWindow to createBookingDraft
- If scheduled: reserve time window and skip immediate auto-assignment

---

## Phase 3: Photo Upload

### Task 3.1: Create Booking Photos Table
**Files:** Modify `convex/schema.ts`
- New table `bookingPhotos`: bookingId, stage, photoType, storageId, uploadedAt, uploadedByTeamId

### Task 3.2: Create Photo Upload Mutations
**Files:** Create `convex/photos.ts`
- `uploadArrivalPhotos` - stores car_at_location + before photos
- `uploadCompletionPhoto` - stores after photo
- `getBookingPhotos` - returns photos with URLs

### Task 3.3: Add Photo Upload to Team Job Detail
**Files:** Modify `apps/mobile/app/team/job/[bookingId].tsx`
- When status=arrived: show camera buttons for car_at_location + before
- When status=washing_in_progress: show camera button for after
- Upload to Convex storage on submit

### Task 3.4: Add Photo Viewer to Admin
**Files:** Modify `apps/admin/app/dashboard/bookings/page.tsx`
- In booking detail modal: show all photos with type labels
- Admin sees all photos, customer only sees after photo

---

## Phase 4: Smart Auto-Assignment

### Task 4.1: Update Assignment Logic for Time Windows
**Files:** Modify `convex/bookings.ts`
- `findClosestAvailableTeam` checks:
  - Team isActive, has GPS, status=available
  - Team has capacity in the time window (bookingTimeWindows)
- If no team available: status = "pending_assignment"

### Task 4.2: Add Pending Assignments View
**Files:** Create `apps/admin/app/dashboard/pending/page.tsx`
- List bookings with status pending_assignment
- Dropdown to manually assign team

---

## Phase 5: Notifications

### Task 5.1: Update Notifications with Expo Push
**Files:** Modify `convex/notifications.ts`
- `sendPushToUser` - sends Expo Push to user
- `sendTeamPush` - sends Expo Push to team
- Wire up triggers in createBookingDraft, teamUpdateStatus, uploadCompletionPhoto

---

## Seed Command for Teams

```bash
npx convex run teams:seedTeams
# Output: 3 teams created with PINs: 1234, 5678, 9012
```

## Test Credentials

| Team | Phone | PIN |
|------|-------|-----|
| Team Alpha | +971501234567 | 1234 |
| Team Beta | +971502345678 | 5678 |
| Team Gamma | +971503456789 | 9012 |

# WOSH Team & Smart Scheduling Design

**Date:** 2026-04-22
**Status:** Draft

## Overview

Enhance WOSH platform with:
1. Team mobile app with PIN + phone authentication
2. Photo upload workflow (arrival + before + after)
3. Smart scheduling with 4-hour time windows
4. Auto-assignment based on team location and job duration
5. Full notifications (push + in-app for users, email for admin)

---

## 1. Team Authentication

### Flow
1. Team member opens team app → enters phone + 4-digit PIN
2. Convex validates against `teams` table
3. Success → returns session token, stored locally
4. All API calls include session token in header

### Convex: `teamAuth.ts`

```typescript
// mutations
teamLogin({ phone: string, pin: string }) → { token: string, team: Team }
teamLogout() → void

// Team table fields (add to existing)
phone: string
pinHash: string  // bcrypt hash
```

### Seed Teams
```bash
npx convex run teams:seedTeams -- '[{
  "name": "Team Alpha",
  "phone": "+971501234567",
  "pin": "1234",
  "status": "available"
}, ...]'
```

### Admin: Add/Edit Team
- Admin dashboard → Teams → Add Team
- Enter: Name, Phone, PIN
- PIN shown once, team member should change it

---

## 2. Time Window Selection

### Customer Flow
```
Home → Location → Time Window → Summary → Confirm → Tracking
```

### UI
- Date picker (calendar)
- 4-hour time windows for selected date:
  - Morning: 8:00 AM - 12:00 PM
  - Afternoon: 12:00 PM - 4:00 PM
  - Evening: 4:00 PM - 8:00 PM

### Data Model: `bookingTimeWindows`
```typescript
date: string  // "2026-04-25"
window: "morning" | "afternoon" | "evening"
teamIds: Id<"teams">[]  // assigned teams for this window
maxBookings: number  // capacity
```

### Convex: `timeWindows.ts`
```typescript
listAvailableWindows({ date: string }) → TimeWindow[]
reserveWindow({ date, window, teamId }) → void
releaseWindow({ date, window, teamId }) → void
```

---

## 3. Smart Auto-Assignment

### Logic (on booking confirm)

```
1. Get booking time window (date + window)
2. For each team:
   a. If status == "available":
      - Calculate distance from current location to customer
      - ETA = distance / avg_speed (20 km/h in city)
   b. If status == "busy":
      - Get current job estimated completion
      - If current job started_at + 35min < window_start:
        - Team can make it
        - Calculate ETA from job location
3. Filter teams where ETA < window duration (4 hours)
4. Sort by ETA ascending
5. Assign closest team
6. If no team available → status "pending_assignment"
```

### Job Duration Assumption
- Average job: **35 minutes**
- Stored in system settings: `avg_job_duration_mins`

### Convex: Enhancement to `createBookingDraft`
```typescript
// Add args
scheduledDate: string  // "2026-04-25"
scheduledWindow: "morning" | "afternoon" | "evening"

// After booking created:
if (autoAssignAvailable({ bookingId, scheduledDate, scheduledWindow })) {
  assignClosestTeam({ bookingId })
} else {
  setStatus("pending_assignment")
}
```

---

## 4. Photo Upload Workflow

### Photo Stages

| Stage | Trigger | Photos Required | Status After |
|-------|---------|----------------|-------------|
| **Arrival** | Team taps "I've Arrived" | 1. Car at location<br>2. Before (dirty) | `arrived` |
| **Complete** | Team taps "Complete" | 3. After (clean) | `completed` |

### Photo Storage
- Convex file storage: `doc.storage.store()`
- Or base64 in document field (simpler for MVP)

### Schema: `bookingPhotos`
```typescript
bookingId: Id<"bookings">
stage: "arrival" | "complete"
photoType: "car_at_location" | "before" | "after"
url: string
uploadedAt: number
uploadedByTeamId: Id<"teams">
```

### Convex: `photos.ts`
```typescript
uploadArrivalPhotos({ bookingId, carAtLocation, before }) → void
uploadCompletionPhoto({ bookingId, after }) → void
getBookingPhotos({ bookingId }) → BookingPhoto[]
```

### Photo Visibility

| Photo | Customer | Admin |
|-------|----------|-------|
| Car at location | ❌ | ✅ |
| Before (dirty) | ❌ | ✅ |
| After (clean) | ✅ | ✅ |

---

## 5. Team App Screens

### `team/login.tsx`
- Phone input (+971...)
- PIN input (4 digits, masked)
- "Login" button
- Error display for invalid credentials

### `team/(tabs)/index.tsx` - My Jobs
- List of assigned bookings (status: `team_assigned`, `on_the_way`, `arrived`, `washing_in_progress`)
- Card shows: booking number, customer name, address, wash type, time window
- Tap → go to job detail

### `team/job/[id].tsx` - Job Detail

**Header:**
- Booking number, status badge

**Customer Info:**
- Name, phone (tap to call), address
- "Navigate" button → opens Apple Maps

**Cars:**
- List with plate numbers

**Service:**
- Wash type, duration, price

**Action Buttons (based on status):**

| Status | Actions |
|--------|---------|
| `team_assigned` | "Start Route" |
| `on_the_way` | "I've Arrived" |
| `arrived` | "Upload Photos" → shows 2 camera/gallery pickers |
| `washing_in_progress` | "Complete Job" |
| `completed` | (show completion summary) |

**Photo Upload UI (arrived stage):**
- "Take photo: Car at location"
- "Take photo: Before (show dirty car)"
- Preview thumbnails
- "Submit" button

**Completion UI (washing stage):**
- "Take photo: After (show clean car)"
- Preview
- "Complete Job" button

---

## 6. Notifications

### Customer Notifications

| Event | Channel | Content |
|-------|---------|---------|
| Booking confirmed | Push + In-App | "Your wash is booked for [date] [window]!" |
| Team assigned | Push + In-App | "[Team name] will be handling your wash" |
| Team arrived | Push + In-App | "[Team name] has arrived at your location" |
| Job completed | Push + In-App | "Your wash is complete! + after photo" |

### Team Notifications

| Event | Channel | Content |
|-------|---------|---------|
| New job assigned | Push + In-App | "New booking: [address] - Tap to view" |

### Admin Notifications

| Event | Channel | Content |
|-------|---------|---------|
| New booking | Email | New booking from [customer] - [address] |
| Job completed | Email | Job [booking#] completed - Photo attached |
| Pending assignment | Email + Dashboard | "X bookings need team assignment" |

### Convex: `notifications.ts` (enhanced)

```typescript
// Push notifications (Expo Push)
sendPush({ userId, title, body, data }) → void

// Email (admin)
sendAdminEmail({ subject, body }) → void

// In-app (Convex realtime - client subscribes)
notifyUser({ userId, type, payload }) → void
```

---

## 7. Admin Dashboard Enhancements

### Dispatch Map (`/dashboard/dispatch`)
- Already exists
- Add: click team → see current job progress
- Add: click booking → photo preview if any

### Booking Detail Modal
- Show all photos in timeline
- Photo thumbnails expandable
- Manual "Assign Team" dropdown
- Override ETA

### Teams Management (`/dashboard/teams`)
- Add: Phone, PIN display/reset
- Status: available / busy / offline
- Current location if available

### New: Pending Assignments View (`/dashboard/pending`)
- List bookings with status `pending_assignment`
- Show suggested teams based on location
- One-tap assign button

---

## 8. Implementation Order

### Phase 1: Team Auth
- [ ] Add phone + pinHash to teams schema
- [ ] Create `team/login.tsx`
- [ ] Create `teamAuth.ts` mutations
- [ ] Seed 3 teams with PINs
- [ ] Admin: Add/Edit team form

### Phase 2: Time Windows
- [ ] Add `bookingTimeWindows` table
- [ ] Create time window selection UI
- [ ] Update booking flow
- [ ] Update `createBookingDraft` with scheduling

### Phase 3: Photo Upload
- [ ] Add `bookingPhotos` table
- [ ] Create `photos.ts` mutations
- [ ] Team: Camera/gallery picker
- [ ] Photo preview + submit
- [ ] View photos in admin

### Phase 4: Notifications
- [ ] Expo Push setup
- [ ] In-app notification center
- [ ] Email for admin (optional, can use console.log for MVP)

### Phase 5: Smart Assignment
- [ ] Job duration setting
- [ ] Time window availability check
- [ ] Auto-assignment enhancement
- [ ] Pending assignments view

---

## 9. Schema Changes

### Teams Table (additions)
```typescript
phone: string
pinHash: string
```

### Bookings Table (additions)
```typescript
scheduledDate: optional(string)
scheduledWindow: optional("morning" | "afternoon" | "evening")
arrivedAt: optional(number)
completedAt: optional(number)
```

### New: `bookingPhotos`
```typescript
bookingId: Id<"bookings">
stage: "arrival" | "complete"
photoType: "car_at_location" | "before" | "after"
url: string
uploadedAt: number
uploadedByTeamId: Id<"teams">
```

### New: `bookingTimeWindows`
```typescript
date: string
window: "morning" | "afternoon" | "evening"
teamId: Id<"teams">
maxBookings: number
currentBookings: number
```

### New: `teamSessions`
```typescript
teamId: Id<"teams">
token: string
createdAt: number
expiresAt: number
```

---

## 10. File Structure

```
apps/mobile/
├── app/
│   ├── team/
│   │   ├── login.tsx
│   │   ├── _layout.tsx
│   │   ├── (tabs)/
│   │   │   ├── index.tsx        # My Jobs
│   │   │   └── _layout.tsx
│   │   └── job/
│   │       └── [bookingId].tsx # Job Detail + Photos
│   └── ...

convex/
├── teamAuth.ts          # PIN validation, session
├── photos.ts            # Photo upload/storage
├── notifications.ts     # Push + email
├── timeWindows.ts       # Window management
└── ...

apps/admin/
├── app/dashboard/
│   ├── pending/page.tsx       # Pending assignments
│   ├── teams/page.tsx         # Enhanced with PIN
│   └── ...
```

---

## Open Questions / TODOs

- [ ] Photo storage: Convex file storage vs base64 in document?
- [ ] Expo Push: Need Expo project setup + permissions
- [ ] Email for admin: SMTP or service like SendGrid?
- [ ] PIN hashing: bcrypt or simpler hash for MVP?

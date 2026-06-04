# WOSH - Testing Checklist

## Overview

This document covers testing for the three main flows in the WOSH car wash booking platform:

1. **Customer Flow** - End user booking a car wash
2. **Team Flow** - Car wash team members managing jobs
3. **Admin Flow** - Dashboard for managing bookings, teams, and users

---

## 1. Customer Flow

### 1.1 Authentication

| Feature | Test Steps | Expected Result |
|---------|------------|-----------------|
| Google Sign-In | Tap "Continue with Google", complete OAuth | User redirected to app, logged in |
| Apple Sign-In | Tap "Continue with Apple", complete OAuth | User redirected to app, logged in |
| Email Sign-In | Enter email, complete magic link | User redirected to app, logged in |
| Session Persistence | Close and reopen app | User remains logged in |
| Logout | Go to Profile, tap Logout | User logged out, redirected to welcome |

### 1.2 Address Selection

| Feature | Test Steps | Expected Result |
|---------|------------|-----------------|
| Search Address | Type address in search box | Google Places autocomplete shows results |
| Select Address | Tap on autocomplete result | Address populated in form |
| Manual Entry | Fill building, apartment, notes | All fields saved to booking |
| Use Current Location | Tap "Use Current Location" | Current location fetched and populated |
| Map Selection | Tap map icon, move pin | Address updates based on pin location |

### 1.3 Time Window Selection

| Feature | Test Steps | Expected Result |
|---------|------------|-----------------|
| Date Picker | Tap date field, select date | Available windows shown for date |
| Time Slot Selection | Tap available time slot | Slot highlighted as selected |
| Slot Availability | Check full vs available slots | Shows "X spots left" indicator |
| Next Day Booking | Select date in future | Same slots available |

### 1.4 Service Selection

| Feature | Test Steps | Expected Result |
|---------|------------|-----------------|
| View Wash Types | Scroll through wash options | All wash types displayed with prices |
| Select Wash Type | Tap on wash type | Wash type selected, price updated |
| Select Car Count | Tap +/- for car count | Count updates, price recalculates |
| View Car Details | Add car to booking | Car details shown in summary |

### 1.5 Booking Summary & Confirmation

| Feature | Test Steps | Expected Result |
|---------|------------|-----------------|
| Summary Display | Complete all steps, reach summary | All booking details displayed correctly |
| Edit from Summary | Tap edit on any section | Navigate back to that section |
| Price Calculation | Check breakdown | Subtotal, discount, total correct |
| Confirm Booking | Tap "Confirm Booking" | Booking created, confirmation shown |
| Booking Number | Check confirmation | Unique booking number displayed |

### 1.6 Booking Tracking

| Feature | Test Steps | Expected Result |
|---------|------------|-----------------|
| View Active Bookings | Go to bookings tab | Active bookings listed |
| View Booking Timeline | Tap on booking | Status timeline displayed |
| Status Updates | Wait for team to update status | Real-time status changes |

---

## 2. Team Flow

### 2.1 Team Authentication

| Feature | Test Steps | Expected Result |
|---------|------------|-----------------|
| Login Screen | Navigate to /team/login | Phone + PIN fields displayed |
| Valid Login | Enter correct phone + PIN | Logged in, redirected to team dashboard |
| Invalid PIN | Enter wrong PIN | Error message shown |
| Invalid Phone | Enter unregistered phone | Error message shown |
| Session Persistence | Close and reopen app | Team remains logged in |
| Logout | Tap logout button | Team logged out |

**Test Credentials:**
- Alpha Team: `+1234567001` / `1234`
- Beta Team: `+1234567002` / `5678`
- Gamma Team: `+1234567003` / `9012`

### 2.2 Booking List

| Feature | Test Steps | Expected Result |
|---------|------------|-----------------|
| View Assigned Jobs | Login as team | List of assigned bookings shown |
| Pull to Refresh | Pull down on list | Bookings refresh |
| Filter by Status | Use status filter | Only bookings with status shown |
| Tap Booking | Tap on booking item | Navigate to booking detail |

### 2.3 Booking Detail - Status Updates

| Feature | Test Steps | Expected Result |
|---------|------------|-----------------|
| View Customer Info | Open booking detail | Customer name, phone, email shown |
| View Location | Open booking detail | Address with directions link |
| View Service Details | Open booking detail | Wash type, car count, price shown |
| Update to "On The Way" | Tap "Start heading to location" | Status updated to `on_the_way` |
| Update to "Arrived" | Tap "Mark as arrived" | Status updated to `arrived` |
| Update to "Washing" | Tap "Start washing" | Status updated to `washing_in_progress` |
| Update to "Completed" | Tap "Complete job" | Status updated to `completed` |

**Status Flow:**
```
team_assigned → on_the_way → arrived → washing_in_progress → completed
```

### 2.4 Photo Capture - Arrival

| Feature | Test Steps | Expected Result |
|---------|------------|-----------------|
| Camera Opens | Tap "Car Photo" button | Camera opens for photo capture |
| Take Photo | Take photo, tap confirm | Photo captured and displayed |
| Upload Photo | After taking photo | Photo uploads to Convex Storage |
| Photo Required for Arrival | Try to mark arrived with < 2 photos | Blocked with error message |
| 2 Photos Required | Take both car + location photos | Can proceed to mark arrived |
| View Uploaded Photos | Check photo thumbnails | Photos displayed in app |

### 2.5 Photo Capture - Completion

| Feature | Test Steps | Expected Result |
|---------|------------|-----------------|
| Camera Opens | Tap "Take Completion Photo" | Camera opens |
| Photo Required | Try to complete without photo | Blocked with error message |
| Complete with Photo | Take completion photo | Can mark as completed |

### 2.6 Push Notifications (Optional)

| Feature | Test Steps | Expected Result |
|---------|------------|-----------------|
| New Booking Notification | Assign booking to team | Push notification received |
| Status Update Notification | Customer cancels booking | Push notification received |

---

## 3. Admin Flow

### 3.1 Authentication

| Feature | Test Steps | Expected Result |
|---------|------------|-----------------|
| Login | Go to admin URL, sign in with Clerk | Redirected to dashboard |
| Protected Routes | Access /dashboard without auth | Redirected to sign-in |
| Role-Based Access | Login as non-admin user | Limited access based on role |

### 3.2 Dashboard Overview

| Feature | Test Steps | Expected Result |
|---------|------------|-----------------|
| View Metrics | Go to dashboard | Revenue, bookings, customers shown |
| View Recent Activity | Check activity feed | Recent bookings displayed |

### 3.3 Booking Management

| Feature | Test Steps | Expected Result |
|---------|------------|-----------------|
| List All Bookings | Go to bookings page | All bookings displayed |
| Filter by Status | Use status filter | Only matching bookings shown |
| Search Bookings | Search by number/phone | Booking found |
| View Booking Detail | Click on booking | Full booking details shown |
| Update Booking Status | Change status manually | Status updated |
| Assign Team | Assign team to booking | Team assigned, team notified |

### 3.4 Team Management

| Feature | Test Steps | Expected Result |
|---------|------------|-----------------|
| List Teams | Go to teams page | All teams displayed |
| Add New Team | Click add team, fill form | Team created with PIN |
| Edit Team | Click edit on team | Team details updated |
| Reset Team PIN | Click reset PIN | New PIN generated |
| Set Team Active/Inactive | Toggle team status | Team can/cannot login |

**Team Phone Numbers:**
- Admin can view and manage team phone numbers
- Admin can reset PINs for teams

### 3.5 User Management

| Feature | Test Steps | Expected Result |
|---------|------------|-----------------|
| List Users | Go to users page | All users displayed |
| View User Details | Click on user | User details and bookings shown |
| Disable User | Toggle user status | User cannot login |

---

## 4. End-to-End Flow Tests

### 4.1 Complete Customer Journey

```
1. Customer signs up (Google/Apple/Email)
2. Customer searches and selects address
3. Customer selects date and time window
4. Customer selects wash type and car count
5. Customer reviews summary
6. Customer confirms booking
7. Booking auto-assigned to team
8. Team receives notification (if enabled)
9. Team views booking in their list
10. Team marks "on the way"
11. Team arrives, takes arrival photos (2 required)
12. Team marks "arrived"
13. Team starts washing
14. Team completes washing, takes completion photo
15. Team marks "completed"
16. Customer sees completed status
```

### 4.2 Team PIN Recovery Flow

```
1. Team member forgets PIN
2. Admin goes to /dashboard/teams
3. Admin finds team member
4. Admin clicks "Reset PIN"
5. Admin provides new PIN to team member
6. Team member logs in with new PIN
```

---

## 5. Pre-Production Checklist

### 5.1 Configuration

| Item | Status | Notes |
|------|--------|-------|
| Convex deployed to production | ⬜ | Run `npx convex deploy` |
| Google Maps API key configured | ⬜ | Add to app.json / .env |
| Clerk keys configured for production | ⬜ | Update publishable key |
| Push notification certificates | ⬜ | APNs (iOS), FCM (Android) |

### 5.2 Store Listing

| Item | Status | Notes |
|------|--------|-------|
| App icons created | ⬜ | 1024x1024 for iOS, adaptive for Android |
| Splash screen configured | ⬜ | Branded splash with logo |
| Privacy Policy URL | ⬜ | Required for stores |
| Terms of Service URL | ⬜ | Required for stores |
| App Store screenshots | ⬜ | 5-10 screenshots per device |
| Play Store screenshots | ⬜ | 2-8 screenshots |
| App description | ⬜ | Marketing copy |

### 5.3 Build Verification

| Item | Status | Notes |
|------|--------|-------|
| iOS build succeeds | ⬜ | `npx expo run:ios` |
| Android build succeeds | ⬜ | `npx expo run:android` |
| TestFlight upload works | ⬜ | Via EAS or Xcode |
| Internal testing (Android) | ⬜ | Via internal testing |

---

## 6. Known Limitations (MVP)

- **No payment integration** - Bookings auto-confirm without payment
- **Mock photos in test** - Before fix: used picsum.photos (NOW FIXED)
- **Push notifications** - Schema in place, need certificate setup for full functionality

---

## 7. Bug Reporting Template

When reporting issues, include:

```
**Environment:**
- App version:
- Device:
- OS version:

**Flow:**
- What were you trying to do?

**Steps to Reproduce:**
1.
2.
3.

**Expected Result:**

**Actual Result:**

**Screenshots/Logs:**
```

---

## 8. Test Accounts

### Clerk Users (Customer/Admin)
Create via Clerk dashboard or sign up flow.

### Teams
| Team | Phone | PIN |
|------|-------|-----|
| Alpha | +1234567001 | 1234 |
| Beta | +1234567002 | 5678 |
| Gamma | +1234567003 | 9012 |

---

*Last Updated: April 2026*

# Smoke Test Checklist - WASH Mobile App

## Pre-Test Setup
1. Clear cache: `cd /Users/suhayl/Downloads/Carwash/apps/mobile && watchman watch-del-all && rm -rf node_modules/.cache && npx expo start --clear`
2. Start Convex dev: `cd /Users/suhayl/Downloads/Carwash && npx convex dev`
3. Ensure `.env` uses production: `EXPO_PUBLIC_CONVEX_URL=https://wooden-moose-958.convex.cloud`

## 1. App Launch ✅
- [ ] App loads without fast-reloading
- [ ] No "Maximum update depth exceeded" errors
- [ ] Splash screen shows, then home screen appears
- [ ] No constant WebSocket reconnect messages

## 2. Clerk Authentication ✅
- [ ] Customer sign-up works (email + password)
- [ ] Google OAuth works
- [ ] Apple OAuth works
- [ ] User stays signed in after app restart

## 3. Home Screen ✅
- [ ] Cars list loads (no oscillation between 0/1)
- [ ] Addresses load
- [ ] Wash types display
- [ ] Can select cars and wash type
- [ ] "Continue" button works → goes to summary

## 4. Booking Flow ✅
- [ ] Summary screen shows correct total
- [ ] Time selection works
- [ ] Location selection works
- [ ] Confirm booking creates booking
- [ ] Tracking screen shows booking status

## 5. Team Login ✅
- [ ] Go to team section
- [ ] Login with phone: `+971501234567`, PIN: `1234`
- [ ] Auto-creates team if not exists
- [ ] Redirects to team dashboard
- [ ] Team dashboard shows assigned bookings
- [ ] Logout works, returns to login

## 6. Team Booking Management ✅
- [ ] Can view booking details
- [ ] Can update booking status
- [ ] Status changes reflect in real-time

## 7. Navigation ✅
- [ ] No infinite loops
- [ ] Back button works correctly
- [ ] No "Cannot find module" errors

## 8. Production Readiness ✅
- [ ] Clerk JWT template "convex" configured
- [ ] Convex deployed to production
- [ ] No debug `console.log` statements
- [ ] All errors handled gracefully

## Run This Test
```bash
# Terminal 1: Convex
cd /Users/suhayl/Downloads/Carwash
npx convex dev

# Terminal 2: Expo
cd /Users/suhayl/Downloads/Carwash/apps/mobile
npx expo start --clear

# Terminal 3: Check for errors
# Watch the logs for:
# - "Unauthorized" errors
# - "Invalid phone or PIN"
# - WebSocket reconnect loops
# - "Cannot find module" errors
```

## Quick Fixes
- **Fast reloading**: Clear cache, use production Convex URL
- **Team login fails**: Create team in Convex dashboard
- **Unauthorized errors**: Configure Clerk JWT template named "convex"
- **Import errors**: Run `npx convex codegen` in project root

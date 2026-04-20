# CarWash - Premium Mobile Car Wash Booking Platform

A full-stack car wash booking system with a mobile customer app and web admin dashboard. Built with Expo React Native, Convex, Clerk, Stripe, and Google Maps.

## Architecture

```
├── apps/
│   ├── mobile/          # Expo React Native mobile app
│   └── admin/          # Next.js admin dashboard
├── convex/             # Convex backend (shared)
└── packages/           # Shared packages
```

## Tech Stack

### Mobile App (Expo React Native)
- **Framework**: Expo with Expo Router
- **Language**: TypeScript
- **Auth**: Clerk (Apple, Google, Email)
- **Database**: Convex (real-time)
- **Payments**: Stripe PaymentSheet
- **Maps**: Google Maps / react-native-maps
- **State**: Zustand

### Admin Dashboard (Next.js)
- **Framework**: Next.js 16 App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Auth**: Clerk
- **Database**: Convex (shared with mobile)

### Backend (Convex)
- **Database**: Convex with typed schema
- **Auth**: Clerk integration
- **Real-time**: Convex subscriptions

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- Convex account
- Clerk account
- Stripe account
- Google Cloud account (for Maps)

### Environment Variables

Create `.env` files in both `apps/mobile` and `apps/admin`:

**apps/mobile/.env**
```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
EXPO_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

**apps/admin/.env.local**
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

**Root `.env`** (for Convex)
```
CLERK_SECRET_KEY=sk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
GOOGLE_MAPS_API_KEY=AI...
CONVEX_DEPLOYMENT=your-project
```

### Installation

```bash
# Install dependencies
npm install --workspaces

# Start Convex backend
npx convex dev

# Start mobile app
cd apps/mobile
npm start

# Start admin dashboard
cd apps/admin
npm run dev
```

## Features

### Customer Mobile App
- [ ] Welcome/onboarding screen with carousel
- [ ] Sign in with Apple, Google, or Email (Clerk)
- [ ] Add and manage multiple cars
- [ ] Select cars for booking
- [ ] Choose wash type (Basic, Premium, Full Detail)
- [ ] View pricing with dynamic calculation
- [ ] Select/save address with Google Maps
- [ ] One-time or subscription booking
- [ ] Payment with Apple Pay, Google Pay, or Card (Stripe)
- [ ] Real-time booking status tracking
- [ ] Booking history
- [ ] Profile management

### Admin Dashboard
- [ ] Dashboard with KPIs and metrics
- [ ] Real-time bookings list with filters
- [ ] Booking detail modal with status updates
- [ ] Team assignment and dispatch
- [ ] User management
- [ ] Cars overview
- [ ] Subscription management
- [ ] Settings (pricing, ETA, zones)
- [ ] Activity logs

### Backend (Convex)
- [ ] Full schema with all tables
- [ ] Queries and mutations for all entities
- [ ] Role-based access control
- [ ] Stripe payment integration
- [ ] Webhook handling
- [ ] Activity logging

## Design System

Colors:
- Background: `#0A0A0F`
- Surface: `#14141C`
- Surface 2: `#1A1A24`
- Primary: `#7C3AED` (Purple)
- Primary 2: `#A855F7`
- Text Primary: `#FFFFFF`
- Text Secondary: `#B9B9C9`
- Border: `#2A2A38`
- Success: `#22C55E`
- Warning: `#F59E0B`
- Danger: `#EF4444`

## Wash Types

| Name | Price | Duration |
|------|-------|----------|
| Basic Wash | 35 AED | 30 mins |
| Premium Wash | 55 AED | 45 mins |
| Full Detail | 95 AED | 75 mins |

## Subscription Options

- One-time
- Weekly
- Biweekly
- Monthly

## Booking Status Flow

```
draft → awaiting_payment → confirmed → team_assigned → on_the_way → arrived → washing_in_progress → completed
                                         ↓
                                     canceled
```

## Deployment

### Mobile App (EAS)
```bash
cd apps/mobile
eas build --platform ios
eas build --platform android
```

### Admin Dashboard (Vercel)
```bash
cd apps/admin
vercel deploy
```

### Convex
Convex deploys automatically when you push to git or run `npx convex deploy`.

## Data Model

See `convex/schema.ts` for complete schema.

Main tables:
- `users` - Customer and admin accounts
- `cars` - User vehicles
- `addresses` - Saved locations
- `washTypes` - Service options
- `bookings` - Order records
- `bookingCars` - Many-to-many booking-car relation
- `subscriptions` - Recurring bookings
- `teams` - Wash teams
- `bookingAssignments` - Team-booking assignments
- `activityLogs` - Audit trail
- `systemSettings` - Configuration

## License

Private - All rights reserved

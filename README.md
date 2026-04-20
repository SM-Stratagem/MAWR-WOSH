# Midnight Velocity - Premium Car Wash Booking Platform

A full-stack car wash booking system with admin approval workflow, real-time tracking, and team management. Built with Expo React Native, Next.js, Convex, and Clerk.

## 🏗️ Architecture

```
monorepo/
├── apps/
│   ├── mobile/          # Expo React Native app (Customer)
│   └── admin/           # Next.js admin dashboard
├── convex/              # Backend & real-time database
│   ├── schema.ts       # Database schema
│   ├── bookings.ts     # Booking mutations/queries
│   ├── users.ts        # User management
│   ├── cars.ts         # Car management
│   ├── addresses.ts    # Address management
│   └── teams.ts        # Team management
└── package.json        # Root workspace config
```

## ⚡ Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Convex account (convex.dev)
- Clerk account (clerk.dev)

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd midnight-velocity
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

**Root `.env.local`:**
```env
# Convex
CONVEX_URL=https://your-deployment.convex.cloud
CLERK_JWT_ISSUER_DOMAIN=https://your-domain.clerk.accounts.dev

# Clerk
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

**apps/mobile/.env:**
```env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

**apps/admin/.env.local:**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

### 3. Setup Convex

```bash
# Login and deploy
npx convex login
npx convex dev
```

### 4. Create Admin User

After logging into the admin panel once (to get your Clerk ID):

```bash
npx convex run users:createAdminWithClerkId -- '{
  "clerkId": "user_xxx",
  "email": "admin@yourdomain.com",
  "name": "Admin Name",
  "role": "superadmin"
}'
```

### 5. Run the Apps

```bash
# Run both mobile and admin
npm run dev

# Or individually:
npm run dev:mobile    # Mobile app (Expo)
npm run dev:admin     # Admin panel (Next.js)
```

## 🎯 Key Features

### Customer Mobile App

- **4-Click Booking Flow**: Home → Wash Selection → Summary → Confirm
- **Multi-Car Support**: Add multiple cars with nicknames, license plates, and city registration
- **Wash Types**: Basic (35 AED), Premium (55 AED), Full Detail (95 AED)
- **Subscription Plans**: 15% discount for weekly/biweekly/monthly plans
- **Real-Time Tracking**: Live status updates from booking to completion
- **Dark Mode UI**: Obsidian Fluidity design theme

### Admin Dashboard

- **Booking Approval Workflow**: Confirm or Reject bookings with reason
- **Team Assignment**: Assign wash teams and track location
- **Dashboard Metrics**: Bookings, revenue, active teams, users
- **User Management**: View and manage all customers
- **Real-Time Updates**: All data syncs instantly via Convex

## 📋 Booking Workflow

The system implements an admin approval flow for live tracking:

### 1. Customer Creates Booking
- Selects cars, address, wash type
- Status: `"booked"` (orange badge)
- Sees: "Awaiting admin confirmation..."

### 2. Admin Reviews
- Opens Dashboard → Bookings
- Sees "Confirm" (green) and "Reject" (red) buttons
- **Confirm**: Status → `"confirmed"` (purple)
- **Reject**: Enters reason → Status → `"rejected"` (red)

### 3. After Confirmation
```
confirmed → team_assigned → on_the_way → arrived → 
washing_in_progress → completed
```

### 4. Customer Sees Result
- **Confirmed**: Tracking timeline appears
- **Rejected**: Red banner shows rejection reason
- **In Progress**: Live team location (if implemented)

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Mobile** | Expo, React Native, TypeScript |
| **Admin** | Next.js 16, React, Tailwind CSS |
| **Backend** | Convex (real-time database) |
| **Auth** | Clerk (JWT-based) |
| **State** | Zustand (mobile) |
| **Maps** | React Native Maps |
| **UI** | Obsidian Fluidity Design System |

## 🗄️ Database Schema

### Core Tables

**users**
```typescript
clerkId: string      // Clerk authentication ID
email, name, phone
role: "customer" | "operator" | "admin" | "superadmin"
```

**bookings**
```typescript
bookingNumber: string  // Unique: CW-xxx
userId, addressId, washTypeId
status: booked | confirmed | team_assigned | on_the_way | 
       arrived | washing_in_progress | completed | rejected
rejectionReason?: string  // Admin rejection message
subtotal, serviceFee, discount, total, currency
assignedTeamId?: string
```

**cars**
```typescript
userId, make, model, year
plateNumber, plateRegion (city), color
nickname?: string  // Custom car name
isActive: boolean
```

**addresses**
```typescript
userId, formattedAddress
apartmentOrVilla, buildingOrCommunity
latitude, longitude
isDefault: boolean
```

**teams**
```typescript
name, status: "available" | "busy" | "offline"
currentLat?, currentLng?  // Real-time location
isActive: boolean
```

## 🔐 Authentication

Uses Clerk with JWT tokens:

1. User signs in (Clerk handles OAuth/Email)
2. Clerk syncs user to Convex via `users:syncUserFromClerk`
3. JWT tokens authenticate all Convex requests
4. Admin functions check `role` field for authorization

**Admin Authorization:**
- Must have role: `"admin"`, `"superadmin"`, or `"operator"`
- Verified in every admin query/mutation

## 🎨 Design System

**Obsidian Fluidity Theme:**
- **Background**: `#0e0e0e` (dark)
- **Surface**: `#1a1919` (elevated)
- **Primary**: `#cc97ff` (purple accent)
- **Buttons**: Pill-shaped, full border-radius
- **Cards**: No borders, tonal elevation through shadows
- **Status Colors**:
  - Booked: Orange (#F59E0B)
  - Confirmed: Purple (#7C3AED)
  - In Progress: Violet (#A855F7)
  - Completed: Green (#22C55E)
  - Rejected: Pink (#FF6E84)

## 📱 Project Structure

### Mobile App (`apps/mobile/`)
```
app/
├── (tabs)/
│   ├── index.tsx       # Home with wash selection modal
│   ├── cars.tsx        # Car management (add/edit/delete)
│   ├── bookings.tsx    # Booking history with status badges
│   └── profile.tsx     # User profile
├── summary.tsx         # Booking summary + confirmation
├── tracking.tsx        # Live tracking with status timeline
components/
├── WashDetailModal.tsx # Wash popup with subscription toggle
└── SearchableSelect.tsx # Dropdown component
```

### Admin Panel (`apps/admin/`)
```
app/dashboard/
├── page.tsx            # Dashboard metrics
├── bookings/
│   └── page.tsx        # Booking management with confirm/reject
├── users/
│   └── page.tsx        # User management
├── cars/
│   └── page.tsx        # Cars overview
└── teams/
    └── page.tsx        # Team management
```

## 🔄 Convex Functions

### Key Mutations

```typescript
// Customer
createBookingDraft({ addressId, washTypeId, carIds })
cancelBooking({ bookingId })

// Admin
adminConfirmBooking({ bookingId })           // Approve
adminRejectBooking({ bookingId, reason })    // Reject with reason
adminUpdateBookingStatus({ bookingId, status })
adminAssignTeam({ bookingId, teamId })
```

### Key Queries

```typescript
// Customer
listMyBookings() → Booking[]
getMyBookingDetail({ bookingId }) → Booking + details

// Admin
adminListBookings({ status?, searchQuery? }) → Booking[]
adminDashboardMetrics() → Metrics
adminListUsers() → User[]
```

## 📝 Environment Variables Reference

| Variable | Location | Description |
|----------|----------|-------------|
| `CONVEX_URL` | Root | Convex deployment URL |
| `CLERK_PUBLISHABLE_KEY` | All apps | Clerk public key |
| `CLERK_SECRET_KEY` | Root | Clerk secret key |
| `CLERK_JWT_ISSUER_DOMAIN` | Root | Clerk JWT issuer |
| `EXPO_PUBLIC_*` | Mobile | Expo public vars |
| `NEXT_PUBLIC_*` | Admin | Next.js public vars |

## 🚀 Deployment

### Mobile (Expo EAS)
```bash
cd apps/mobile
eas build --platform ios
eas build --platform android
```

### Admin (Vercel)
```bash
cd apps/admin
vercel deploy
```

### Convex
```bash
npx convex deploy  # Automatic on git push
```

## 📊 Status Workflow

```
[Customer]          [Admin]
   |                    |
   |── Creates ──→ [Booked] (Orange)
   |                    │
   |              [Review]
   |              /      \
   |        [Confirm]  [Reject + Reason]
   |             │            │
   |             ↓            ↓
   |←──── [Confirmed]    [Rejected] (Red)
   |        (Purple)
   |             │
   |             ↓
   |←──── [Team Assigned]
   |             │
   |             ↓
   |←──── [On the Way]
   |             │
   |             ↓
   |←──── [Arrived]
   |             │
   |             ↓
   |←──── [Washing]
   |             │
   |             ↓
   |←──── [Completed] (Green)
```

## 🛠️ Development Commands

```bash
# Development
npm run dev              # Start all apps
npm run dev:mobile       # Mobile only
npm run dev:admin        # Admin only

# Convex
npx convex dev           # Start Convex dev server
npx convex deploy        # Deploy to production
npx convex codegen       # Generate TypeScript types

# Utilities
npx convex run users:createAdminWithClerkId -- '{...}'
```

## 🐛 Troubleshooting

**Admin panel shows "Forbidden" errors:**
```bash
# Your Clerk user needs admin role
npx convex run users:createAdminWithClerkId -- '{
  "clerkId": "your-clerk-id",
  "email": "your-email",
  "name": "Your Name",
  "role": "superadmin"
}'
```

**Convex deployment mismatch:**
Ensure `.env.local` in admin uses the same Convex URL as mobile.

## 👥 Team

- **Mohammed Suhayl** - Lead Developer & Designer

---

Built with ❤️ using Expo, Next.js, Convex, and Clerk

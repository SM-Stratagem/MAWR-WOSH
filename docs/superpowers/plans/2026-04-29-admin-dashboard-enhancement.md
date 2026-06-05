# Admin Dashboard Enhancement Plan

**Goal:** Transform the admin dashboard into a comprehensive, intuitive analytics hub with user tracking, conversion funnels, service popularity, subscription breakdowns, and rich data visualizations.

**Architecture:** Extend the existing Convex backend with new analytics queries, then rebuild the dashboard frontend with modular components. The dashboard is in `apps/admin/` (Next.js + Convex + Clerk auth). Backend queries live in the shared `convex/` directory.

**Tech Stack:** Next.js 16, Convex, Clerk, Tailwind CSS 4, Lucide icons, Recharts (for charts)

---

### Task 1: Install Recharts for data visualization

**Files:**
- Modify: `apps/admin/package.json`

- [ ] **Step 1: Install recharts**

Run: `cd apps/admin && npm install recharts`

- [ ] **Step 2: Verify install**

Run: `cd apps/admin && npm ls recharts`

---

### Task 2: Add advanced analytics backend query

**Files:**
- Modify: `convex/bookings.ts` — add `adminAdvancedAnalytics` query

- [ ] **Step 1: Add the advanced analytics query to convex/bookings.ts**

Append a new exported query `adminAdvancedAnalytics` after the existing `adminDashboardMetrics` function. This query will compute:

- Booking funnel: draft → awaiting_payment → confirmed → completed → canceled
- Abandoned bookings count (draft/awaiting_payment that were never completed)
- User segmentation: one-time bookers, repeat bookers, subscription users
- Most popular services (wash types) with booking counts and revenue
- Subscription breakdown by frequency (weekly/biweekly/monthly)
- Revenue by service type
- Average booking value
- Customer lifetime value buckets
- Last 30 days trend data (daily bookings + revenue)

---

### Task 3: Rebuild the dashboard page with all new sections

**Files:**
- Modify: `apps/admin/app/dashboard/page.tsx` — complete rewrite with new sections

The new dashboard will have these sections in order:

1. **KPI Cards Row** (top) — Bookings Today, Active Bookings, Total Users, Revenue Today, Conversion Rate, Avg Booking Value
2. **Revenue Trend Chart** — 30-day line/area chart using Recharts
3. **Booking Funnel** — Visual funnel showing draft → confirmed → completed → canceled
4. **Popular Services Table** — Wash type name, booking count, revenue, percentage
5. **User Segmentation** — Cards showing: One-time users, Repeat users, Subscription users, Abandoned
6. **Subscription Breakdown** — Donut/pie chart by frequency
7. **Recent Bookings Table** — Enhanced with wash type, amount, time ago
8. **Quick Actions** — Redesigned with icons

---

### Task 4: Add sidebar Analytics nav item

**Files:**
- Modify: `apps/admin/app/dashboard/layout.tsx`

Add an "Analytics" nav item to the sidebar navigation.

---

### Task 5: Build standalone Analytics page

**Files:**
- Create: `apps/admin/app/dashboard/analytics/page.tsx`

Dedicated analytics page with deeper insights:
- Full 30-day/90-day revenue trend with period selector
- Booking status distribution pie chart
- Service popularity bar chart
- User cohort analysis table
- Subscription health metrics
- Team utilization metrics

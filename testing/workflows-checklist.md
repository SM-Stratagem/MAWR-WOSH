# Testing/Customer Driver Admin Workflow Checklists
# Simulated data for end-to-end verification

--
# 1) Customer Workflow
# Goal: New customer can sign-up, verify, log in, browse/menu, place an order, track it, and manage profile.
# Simulated account
- name: "Elena Martinez"
- email: "elena.martinso+customer@example.com"
- password: "SecurePass123!"
- username: "elena_martinso"
- phone: "+1-555-0198"
- address: "123 Oak Street, Apt 4B, Springfield, IL 62704, USA"
- payment: "Visa ending 4432 (card token: tok_visa_4432)"

# Checklist
- [ ] 1.1 Navigate to app homepage /.
- [ ] 1.2 Click "Sign Up".
- [ ] 1.3 Enter email: elena.martinso+customer@example.com.
- [ ] 1.4 Enter password: SecurePass123!.
- [ ] 1.5 Confirm password.
- [ ] 1.6 Submit sign-up form.
- [ ] 1.7 Check inbox for verification email; click verification link.
- [ ] 1.8 Log in with email + password.
- [ ] 1.9 Complete profile: full name, username (elena_martinso), phone.
- [ ] 1.10 Upload/select avatar (simulated: avatar_url="https://example.com/avatar_elena.png").
- [ ] 1.11 Save profile.
- [ ] 1.12 Confirm redirect to dashboard.
- [ ] 1.13 Verify profile data displays on dashboard.
- [ ] 2.1 Browse menu / restaurants.
- [ ] 2.2 Filter cuisine type (e.g., Italian).
- [ ] 2.3 Select a restaurant and view menu.
- [ ] 2.4 Add items to cart (simulated items: Margherita Pizza, Caesar Salad, Iced Tea).
- [ ] 2.5 Review cart; adjust quantities.
- [ ] 2.6 Proceed to checkout.
- [ ] 2.7 Confirm shipping address: 123 Oak Street, Apt 4B, Springfield, IL 62704, USA.
- [ ] 2.8 Select payment method: Visa ending 4432.
- [ ] 2.9 Place order.
- [ ] 2.10 Confirm order success and order ID (simulated: order_id="ORD-10001").
- [ ] 2.11 Track order status: placed → confirmed → preparing → out_for_delivery → delivered.
- [ ] 2.12 Open order details and verify items and totals.
- [ ] 3.1 Go to Account Settings > Profile.
- [ ] 3.2 Update phone to +1-555-0199; save.
- [ ] 3.3 Confirm update reflects on dashboard.
- [ ] 3.4 Change password: current password + new password "NewPass456!".
- [ ] 3.5 Confirm password change success and re-login works.
- [ ] 3.6 Toggle notifications: disable push, keep email; save.
- [ ] 3.7 Confirm settings persistence (reload page).
- [ ] 3.8 Validate input errors show helpful messages (simulate invalid email format).
- [ ] 4.1 Request cancellation (test flow; simulated reason: "Found better price").
- [ ] 4.2 Confirm cancellation modal with confirmation prompt.
- [ ] 4.3 Confirm cancellation success message and email receipt.

Acceptance criteria: Customer can complete end-to-end journey from sign-up to placed order, tracking, profile updates, and cancellation request.

--
# 2) Driver Workflow
# Goal: Driver can sign up, get approved, log in, accept rides, navigate, mark pickups/dropoffs, and cash out.
# Simulated account
- name: "Jordan Lee"
- email: "jordan.lee+driver@example.com"
- password: "DriverPass789!"
- username: "jordan_lee_drv"
- phone: "+1-555-0177"
- vehicle: "Toyota Corolla (ABC-1234)"
- license_plate: "XYZ 7890"

# Checklist
- [ ] 2.1 Navigate to Driver Sign Up.
- [ ] 2.2 Enter email: jordan.lee+driver@example.com.
- [ ] 2.3 Enter password: DriverPass789!.
- [ ] 2.4 Submit sign-up.
- [ ] 2.5 Complete profile: full name, username, vehicle details.
- [ ] 2.6 Upload documents: simulated license_plate="XYZ 7890" and vehicle photo placeholder.
- [ ] 2.7 Submit for approval.
- [ ] 2.8 Admin approval simulation: mark driver as approved (simulated: approved=true).
- [ ] 2.9 Log in as driver.
- [ ] 2.10 Confirm dashboard shows active status.
- [ ] 3.1 Accept simulated ride request (ride_id="RIDE-555", pickup="456 Pine St", dropoff="789 Elm St").
- [ ] 3.2 Start navigation to pickup.
- [ ] 3.3 Mark pickup complete; confirm ETA to dropoff.
- [ ] 3.4 Navigate to dropoff.
- [ ] 3.5 Mark dropoff complete; simulate passenger rating 5 stars.
- [ ] 3.6 Confirm earnings update (simulated: $18.50).
- [ ] 4.1 Go to Earnings History and verify ride entries.
- [ ] 4.2 Request payout (simulated: instant payout to card tok_visa_4432).
- [ ] 4.3 Confirm payout success message.
- [ ] 5.1 Go to Settings > Profile; update phone.
- [ ] 5.2 Save and confirm update on driver dashboard.
- [ ] 5.3 Toggle availability status; confirm reflects in ride matching.

Acceptance criteria: Driver can sign up, get approved, accept and complete rides, view earnings, and update profile.

--
# 3) Admin Workflow
# Goal: Admin can log in, review users/drivers, moderate content, view analytics, and manage support tickets.
# Simulated account
- email: "admin@example.com"
- password: "AdminPass999!"
- role: "super-admin"

# Checklist
- [ ] 3.1 Navigate to Admin Login.
- [ ] 3.2 Enter email: admin@example.com.
- [ ] 3.3 Enter password: AdminPass999!.
- [ ] 3.4 Submit and confirm admin dashboard loads.
- [ ] 4.1 View Users list; confirm filter by email/status works.
- [ ] 4.2 Search for user "elena_martinso"; open details.
- [ ] 4.3 Verify profile fields and simulated avatar_url.
- [ ] 4.4 Promote user role to "moderator"; save.
- [ ] 4.5 View Drivers list; confirm driver "jordan_lee_drv" status.
- [ ] 4.6 Approve/reject driver (simulate: mark approved=true if needed).
- [ ] 4.7 View Analytics > Signups (daily); confirm chart data presence.
- [ ] 4.8 View Analytics > Orders (weekly); confirm totals.
- [ ] 4.9 Create support ticket (simulate: subject="Can't place order", message="Checkout fails on step 3").
- [ ] 4.10 Assign ticket to support agent; set priority High.
- [ ] 4.11 View Tickets list; filter by priority and status.
- [ ] 4.12 Resolve ticket: add internal note and mark resolved.
- [ ] 4.13 Generate monthly report: export CSV (simulated download URL: "/tmp/report_june.csv").
- [ ] 4.14 Audit logs: confirm login and action logs for admin account.
- [ ] 5.1 Log out and confirm redirection to login.

Acceptance criteria: Admin can authenticate, manage users/drivers, view analytics, handle support tickets, and export reports.

--
# End-to-End Summary
- Use the simulated data above for each workflow to validate the full application.
- For UI checks, assert presence of key elements (dashboard, map, analytics charts, ticket lists).
- For API/data checks, verify simulated IDs and statuses (order_id, ride_id, approved flags).
- Repeat with edge cases (bad input, declined payments, re-routing) using the same simulated accounts.
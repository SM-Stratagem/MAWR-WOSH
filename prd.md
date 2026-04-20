{
  "name": "carwash_fullstack_master_builder_prompt",
  "type": "fullstack_app_generation_prompt",
  "stack": {
    "mobile_app": "Expo React Native with Expo Router and TypeScript",
    "backend": "Convex",
    "auth": "Clerk integrated with Convex",
    "payments": "Stripe React Native PaymentSheet",
    "maps": "Google Maps via react-native-maps and Google Places/Geocoding APIs",
    "admin_web": "Next.js App Router with TypeScript and Tailwind",
    "state": "Convex realtime queries/mutations/actions",
    "styling": "Minimal luxury black and purple design system"
  },
  "build_goal": "Build a production-style full-stack at-home car wash booking system with a mobile customer app and a web admin dashboard. The mobile app should be extremely minimal, premium, and fast. The web dashboard should allow operators/admins to view bookings, assign teams, manage users, update statuses, monitor app activity, and edit system functions. All data must update in real time using Convex.",
  "critical_build_constraints": [
    "Use Expo with Expo Router and TypeScript",
    "Target production using Expo development builds / EAS, not just plain Expo Go, because native auth, maps, and payments must work correctly",
    "Use Convex as the primary backend and realtime datastore",
    "Use Clerk for authentication with Google, Apple, and email",
    "Use Stripe PaymentSheet for Apple Pay, Google Pay, and card payments",
    "Use Google Maps for exact user location, map previews, geocoding, and address handling",
    "Use a single shared Convex backend for both the app and admin web dashboard",
    "Admin web dashboard and admin panel should live in the same Next.js app and route structure",
    "Keep the mobile experience to the fewest screens possible",
    "Cash is not allowed anywhere in the system"
  ],
  "product_summary": {
    "customer_app_flow": [
      "User opens app",
      "User sees premium car wash service images and simple call to action",
      "User signs in with Apple, Google, or email",
      "User adds one or more cars",
      "User selects one or more saved cars for a booking",
      "User selects one of 3 wash types",
      "App shows exact location on Google Map",
      "User confirms address details and saves them for future bookings",
      "App shows ETA / average arrival time before confirming",
      "User can choose one-time booking or subscription frequency",
      "User pays with Apple Pay, Google Pay, or card",
      "Booking is confirmed",
      "User sees live tracking / status updates until completion"
    ],
    "admin_flow": [
      "Admin signs into web dashboard",
      "Admin views all bookings in real time",
      "Admin assigns teams/agents to bookings",
      "Admin updates booking statuses",
      "Admin sees booking locations and customer details",
      "Admin manages users, cars, subscriptions, pricing, wash types, zones, ETA rules, and activity logs",
      "All changes update instantly through Convex"
    ]
  },
  "design_system": {
    "brand_style": "Luxury minimal",
    "colors": {
      "background": "#0A0A0F",
      "surface": "#14141C",
      "surface_2": "#1A1A24",
      "primary": "#7C3AED",
      "primary_2": "#A855F7",
      "text_primary": "#FFFFFF",
      "text_secondary": "#B9B9C9",
      "border": "#2A2A38",
      "success": "#22C55E",
      "warning": "#F59E0B",
      "danger": "#EF4444"
    },
    "ui_rules": [
      "Very clean spacing",
      "Large rounded cards",
      "Large visuals",
      "Minimal copy",
      "Sticky bottom CTA on mobile",
      "No clutter",
      "Premium app-store quality feel",
      "Dark mode by default",
      "Purple accent used sparingly and elegantly"
    ],
    "typography": {
      "style": "Modern premium sans-serif",
      "rules": [
        "Big headings",
        "Clear hierarchy",
        "Short descriptive labels",
        "Never overcrowd a screen"
      ]
    }
  },
  "mobile_information_architecture": {
    "screens": [
      {
        "name": "welcome",
        "purpose": "Premium landing page",
        "features": [
          "Hero image carousel of car wash service",
          "Short headline",
          "Short subheadline",
          "Continue with Apple",
          "Continue with Google",
          "Continue with Email"
        ]
      },
      {
        "name": "auth",
        "purpose": "Authentication and session setup",
        "features": [
          "Clerk auth",
          "Apple sign-in",
          "Google sign-in",
          "Email sign-in/sign-up",
          "Forgot password or magic-link capable email flow if implementing passwordless"
        ]
      },
      {
        "name": "cars",
        "purpose": "Add and manage saved cars",
        "features": [
          "List saved cars",
          "Add car form",
          "Edit/delete car",
          "Required fields: make, model, plate number",
          "Optional fields: nickname, year, color, emirate"
        ]
      },
      {
        "name": "home_booking",
        "purpose": "Primary booking screen",
        "features": [
          "Saved cars displayed as selectable cards",
          "Allow selecting one or multiple cars",
          "3 wash type cards",
          "Map preview of user location or saved address",
          "Dynamic price summary",
          "ETA / average arrival estimate",
          "One-time vs subscription selector",
          "Continue CTA"
        ]
      },
      {
        "name": "location_confirm",
        "purpose": "Confirm exact wash location",
        "features": [
          "Google Map with current location",
          "Pin placement or fixed-center marker UX",
          "Reverse geocoding into readable address",
          "Fields for apartment/villa, building/community, street, notes",
          "Save as default address"
        ]
      },
      {
        "name": "review_booking",
        "purpose": "Order confirmation before payment",
        "features": [
          "Selected cars",
          "Wash type",
          "Address",
          "ETA estimate",
          "Subscription frequency if chosen",
          "Price breakdown",
          "Terms acceptance",
          "Proceed to payment"
        ]
      },
      {
        "name": "payment",
        "purpose": "Digital checkout",
        "features": [
          "Stripe PaymentSheet",
          "Apple Pay",
          "Google Pay",
          "Card payment",
          "Save payment method for future subscription charges if user consents"
        ]
      },
      {
        "name": "tracking",
        "purpose": "Live order status",
        "features": [
          "Booking confirmed",
          "Status timeline",
          "Estimated arrival",
          "Map view for assigned team if enabled",
          "Support/contact button",
          "Booking details"
        ]
      },
      {
        "name": "profile",
        "purpose": "Manage account",
        "features": [
          "Saved cars",
          "Saved addresses",
          "Payment methods summary",
          "Booking history",
          "Active subscriptions",
          "Sign out"
        ]
      }
    ]
  },
  "minimum_booking_logic": {
    "wash_types": [
      {
        "key": "basic",
        "name": "Basic Wash",
        "description": "Quick exterior clean",
        "base_price": 35,
        "currency": "AED",
        "duration_mins": 30
      },
      {
        "key": "premium",
        "name": "Premium Wash",
        "description": "More thorough exterior and finishing",
        "base_price": 55,
        "currency": "AED",
        "duration_mins": 45
      },
      {
        "key": "full_detail",
        "name": "Full Detail",
        "description": "High-end full service package",
        "base_price": 95,
        "currency": "AED",
        "duration_mins": 75
      }
    ],
    "pricing_rules": [
      "Total booking price = selected wash base price x number of selected cars",
      "Show single car price and multiplied total clearly",
      "No hidden fees in MVP",
      "Optionally support future service fee, zone fee, promo code, or subscription discount later"
    ],
    "subscription_rules": [
      "One-time",
      "Weekly",
      "Biweekly",
      "Monthly"
    ],
    "subscription_behavior": [
      "Subscription reuses same cars, wash type, address, and payment method",
      "Allow pause, skip next, cancel",
      "Store consent for future charges",
      "Generate recurring bookings automatically"
    ]
  },
  "required_integrations": {
    "auth": {
      "provider": "Clerk",
      "requirements": [
        "Use Clerk Expo SDK for mobile app",
        "Use Clerk Next.js SDK for admin web",
        "Support sign in with Apple, Google, and email",
        "Use secure session storage",
        "Sync authenticated identity into Convex",
        "Protect both customer and admin routes"
      ]
    },
    "convex": {
      "requirements": [
        "Use Convex schema.ts with typed tables",
        "Use Convex queries, mutations, and actions",
        "Use realtime subscriptions for bookings, statuses, assignments, and admin dashboard updates",
        "Use role-aware access control in Convex functions",
        "All business logic should run through Convex"
      ]
    },
    "maps": {
      "provider": "Google Maps Platform",
      "requirements": [
        "Use react-native-maps for mobile map rendering",
        "Use Google Geocoding API or Places API for converting lat/lng to address and vice versa",
        "Store latitude and longitude on addresses and bookings",
        "Allow exact location confirmation",
        "Show booking locations on admin map"
      ]
    },
    "payments": {
      "provider": "Stripe",
      "requirements": [
        "Use Stripe React Native PaymentSheet",
        "Support Apple Pay, Google Pay, and cards",
        "No cash option",
        "Use PaymentIntent for one-time bookings",
        "Use SetupIntent or equivalent saved-payment flow for subscriptions / future charges",
        "Store Stripe customer id and payment method references securely in backend metadata",
        "Handle successful, failed, canceled, and pending payments"
      ]
    },
    "notifications": {
      "requirements": [
        "Implement push notifications for booking created, team assigned, on the way, arrived, completed",
        "Optional email confirmations for receipts and subscription notices"
      ]
    }
  },
  "convex_data_model": {
    "tables": [
      {
        "name": "users",
        "fields": [
          "clerkId",
          "email",
          "name",
          "phone",
          "role",
          "defaultAddressId",
          "isActive",
          "createdAt",
          "lastSeenAt"
        ]
      },
      {
        "name": "cars",
        "fields": [
          "userId",
          "nickname",
          "make",
          "model",
          "year",
          "plateNumber",
          "plateRegion",
          "color",
          "isActive",
          "createdAt"
        ]
      },
      {
        "name": "addresses",
        "fields": [
          "userId",
          "label",
          "formattedAddress",
          "apartmentOrVilla",
          "buildingOrCommunity",
          "street",
          "notes",
          "latitude",
          "longitude",
          "isDefault",
          "createdAt",
          "updatedAt"
        ]
      },
      {
        "name": "washTypes",
        "fields": [
          "key",
          "name",
          "description",
          "basePrice",
          "currency",
          "durationMins",
          "isActive",
          "sortOrder"
        ]
      },
      {
        "name": "bookings",
        "fields": [
          "bookingNumber",
          "userId",
          "addressId",
          "washTypeId",
          "status",
          "selectedCarCount",
          "subtotal",
          "serviceFee",
          "discount",
          "total",
          "currency",
          "paymentStatus",
          "paymentIntentId",
          "setupIntentId",
          "subscriptionId",
          "etaMin",
          "etaMax",
          "scheduledFor",
          "assignedTeamId",
          "createdAt",
          "updatedAt"
        ]
      },
      {
        "name": "bookingCars",
        "fields": [
          "bookingId",
          "carId"
        ]
      },
      {
        "name": "subscriptions",
        "fields": [
          "userId",
          "addressId",
          "washTypeId",
          "frequency",
          "status",
          "nextRunAt",
          "lastRunAt",
          "stripeCustomerId",
          "defaultPaymentMethodId",
          "selectedCarIds",
          "createdAt",
          "updatedAt"
        ]
      },
      {
        "name": "teams",
        "fields": [
          "name",
          "status",
          "currentLat",
          "currentLng",
          "lastLocationAt",
          "isActive"
        ]
      },
      {
        "name": "bookingAssignments",
        "fields": [
          "bookingId",
          "teamId",
          "assignedByUserId",
          "assignedAt",
          "acceptedAt",
          "arrivedAt",
          "completedAt"
        ]
      },
      {
        "name": "activityLogs",
        "fields": [
          "actorUserId",
          "actorRole",
          "entityType",
          "entityId",
          "action",
          "payload",
          "createdAt"
        ]
      },
      {
        "name": "systemSettings",
        "fields": [
          "key",
          "value",
          "updatedBy",
          "updatedAt"
        ]
      }
    ]
  },
  "roles_and_permissions": {
    "roles": [
      "customer",
      "operator",
      "admin",
      "superadmin"
    ],
    "rules": [
      "Customers can manage only their own profile, cars, addresses, bookings, and subscriptions",
      "Operators can view bookings, assign teams if allowed, update statuses, and view customer booking info",
      "Admins can manage users, wash types, pricing, teams, subscriptions, bookings, and settings",
      "Superadmins can access everything including system settings and privileged logs"
    ]
  },
  "booking_status_machine": {
    "statuses": [
      "draft",
      "awaiting_payment",
      "confirmed",
      "team_assigned",
      "on_the_way",
      "arrived",
      "washing_in_progress",
      "completed",
      "canceled",
      "payment_failed"
    ],
    "rules": [
      "Create booking draft before payment",
      "Only mark confirmed after successful payment or successful subscription charge setup",
      "Allow admin/operator transitions with server validation",
      "Track timestamps for each major status change"
    ]
  },
  "eta_logic": {
    "customer_visible": [
      "Show estimated arrival range before booking",
      "Show updated ETA after team assignment"
    ],
    "backend_rules": [
      "Calculate ETA using simple configurable rule engine for MVP",
      "Allow zone-based average ETA or team proximity based ETA",
      "Store etaMin and etaMax on booking",
      "Allow admins to override ETA"
    ]
  },
  "admin_web_requirements": {
    "framework": "Next.js App Router with TypeScript and Tailwind",
    "route_structure": [
      "/login",
      "/dashboard",
      "/dashboard/bookings",
      "/dashboard/bookings/[id]",
      "/dashboard/dispatch",
      "/dashboard/users",
      "/dashboard/cars",
      "/dashboard/subscriptions",
      "/dashboard/teams",
      "/dashboard/payments",
      "/dashboard/settings",
      "/dashboard/activity"
    ],
    "shared_admin_panel_behavior": [
      "Everything is under one dashboard route structure",
      "Sidebar navigation",
      "Realtime badges and counts from Convex",
      "Server/client auth guard with Clerk",
      "Role-based route protection"
    ],
    "core_pages": [
      {
        "name": "dashboard",
        "features": [
          "KPIs: total bookings today, active bookings, subscriptions, revenue, failed payments",
          "Recent bookings feed",
          "Realtime status widgets"
        ]
      },
      {
        "name": "bookings_list",
        "features": [
          "Filter by status",
          "Search by booking number, user, plate, address",
          "Realtime updates",
          "Bulk actions where safe"
        ]
      },
      {
        "name": "booking_detail",
        "features": [
          "Customer details",
          "Cars included",
          "Address with map",
          "Timeline",
          "Payment status",
          "Assign team",
          "Change status",
          "Internal notes"
        ]
      },
      {
        "name": "dispatch",
        "features": [
          "Map of all live bookings",
          "Map of teams",
          "Assign nearest team",
          "Realtime movement if team location updates are enabled"
        ]
      },
      {
        "name": "users",
        "features": [
          "User search",
          "View bookings and subscriptions per user",
          "Activate/deactivate",
          "Role management for internal users"
        ]
      },
      {
        "name": "subscriptions",
        "features": [
          "List active, paused, canceled subscriptions",
          "Edit frequency",
          "Pause/cancel",
          "View upcoming generated bookings"
        ]
      },
      {
        "name": "settings",
        "features": [
          "Manage wash types",
          "Pricing",
          "ETA settings",
          "Service zones",
          "Feature toggles"
        ]
      },
      {
        "name": "activity",
        "features": [
          "System audit logs",
          "Admin action logs",
          "App activity events"
        ]
      }
    ]
  },
  "mobile_user_stories": [
    "As a user, I want to sign in quickly with Apple, Google, or email so I can start booking immediately.",
    "As a user, I want to save multiple cars so I do not need to type details every time.",
    "As a user, I want to choose however many of my cars I want washed so one booking can cover all of them.",
    "As a user, I want to see the total price update instantly based on the number of cars selected.",
    "As a user, I want to see my exact location on a map and save my address details for future bookings.",
    "As a user, I want to know the expected arrival time before I pay.",
    "As a user, I want to choose a recurring subscription so the same wash can be rebooked automatically.",
    "As a user, I want to pay digitally and never deal with cash.",
    "As a user, I want live booking status updates after paying."
  ],
  "admin_user_stories": [
    "As an operator, I want to see all new bookings in real time so I can manage dispatch quickly.",
    "As an operator, I want to assign teams to bookings and update statuses from one interface.",
    "As an admin, I want to manage wash types, pricing, ETA rules, users, and subscriptions.",
    "As an admin, I want all actions to be logged and reflected live in Convex.",
    "As an admin, I want to track app activity and booking lifecycle events centrally."
  ],
  "required_backend_functions": {
    "convex_queries": [
      "getCurrentUserProfile",
      "listMyCars",
      "listMyAddresses",
      "listWashTypes",
      "getBookingPricePreview",
      "listMyBookings",
      "getMyBookingDetail",
      "listMySubscriptions",
      "adminListBookings",
      "adminGetBookingDetail",
      "adminDashboardMetrics",
      "adminListUsers",
      "adminListSubscriptions",
      "adminListTeams",
      "adminListActivityLogs"
    ],
    "convex_mutations": [
      "syncUserFromClerk",
      "createCar",
      "updateCar",
      "deleteCar",
      "createAddress",
      "updateAddress",
      "setDefaultAddress",
      "createBookingDraft",
      "attachCarsToBooking",
      "setBookingLocation",
      "setBookingSubscriptionOption",
      "confirmBookingAfterPayment",
      "cancelBooking",
      "createSubscription",
      "pauseSubscription",
      "cancelSubscription",
      "adminAssignTeam",
      "adminUpdateBookingStatus",
      "adminUpsertWashType",
      "adminUpdatePricingRules",
      "adminUpsertTeam",
      "adminUpdateSystemSetting"
    ],
    "convex_actions": [
      "createStripePaymentIntent",
      "createStripeSetupIntent",
      "handleStripeWebhook",
      "reverseGeocodeAddress",
      "forwardGeocodeAddress",
      "calculateBookingEta",
      "generateRecurringBookings",
      "sendNotifications",
      "recordTeamLocationUpdate"
    ]
  },
  "security_requirements": [
    "All privileged routes and functions must be role-protected",
    "Never trust client-sent prices; server computes totals",
    "Payment confirmation must be server-verified before booking becomes confirmed",
    "All user-owned resources must be scoped by authenticated identity",
    "Store only required payment metadata, never raw card details",
    "Log sensitive admin actions",
    "Use environment variables for Clerk, Convex, Google Maps, and Stripe secrets"
  ],
  "developer_experience_requirements": [
    "Use a monorepo or clearly structured app with shared types where reasonable",
    "Use strict TypeScript",
    "Use reusable UI primitives",
    "Use clean folder structure",
    "Use sample seed data for wash types and test users",
    "Use linting and formatting",
    "Add clear README setup steps"
  ],
  "folder_structure_preference": {
    "mobile_app": [
      "app/",
      "components/",
      "features/",
      "lib/",
      "hooks/",
      "constants/",
      "types/"
    ],
    "convex_backend": [
      "convex/schema.ts",
      "convex/auth.config.ts",
      "convex/users.ts",
      "convex/cars.ts",
      "convex/addresses.ts",
      "convex/washTypes.ts",
      "convex/bookings.ts",
      "convex/subscriptions.ts",
      "convex/teams.ts",
      "convex/payments.ts",
      "convex/activity.ts",
      "convex/http.ts"
    ],
    "admin_web": [
      "app/dashboard/",
      "components/dashboard/",
      "lib/",
      "hooks/",
      "types/"
    ]
  },
  "must_build_now": [
    "Customer mobile app with polished UI",
    "Clerk auth integrated into Expo and Next.js",
    "Convex schema and server functions",
    "Google Maps location capture",
    "Stripe payment setup",
    "Booking flow end to end",
    "Subscription flow end to end",
    "Admin dashboard with live booking management",
    "Realtime syncing between app and admin via Convex"
  ],
  "implementation_notes": [
    "For Apple sign-in, support native iOS behavior correctly",
    "For Google sign-in, implement proper OAuth flow compatible with Expo app setup",
    "For email auth, provide clean sign-in/sign-up flow",
    "Use Clerk session token with Convex auth integration",
    "Use a realistic admin panel instead of placeholder tables",
    "Use modern cards, sheets, map panels, and bottom CTAs",
    "Seed app with 3 wash types and realistic fake booking data",
    "Include loading, error, empty, and success states",
    "Include form validation and defensive backend validation"
  ],
  "mvp_plus_features": [
    "Book again shortcut from history",
    "Default address auto-selection",
    "Nearest-team ETA logic placeholder upgrade path",
    "Push notification hooks",
    "Activity log viewer",
    "Search/filter/sort on admin tables",
    "Feature flags in settings",
    "Manual team location updates from admin for testing"
  ],
  "do_not_do": [
    "Do not build a marketplace with multiple vendors",
    "Do not add unnecessary gamification",
    "Do not overcomplicate wash customization",
    "Do not build cash handling",
    "Do not create too many screens",
    "Do not leave major flows as TODO stubs"
  ],
  "final_output_expected_from_builder": [
    "Complete Expo mobile app code",
    "Complete Convex backend code",
    "Complete Next.js admin dashboard code",
    "Working auth integration scaffolding",
    "Working payment integration scaffolding",
    "Working maps integration scaffolding",
    "Working schema, mutations, queries, actions, and route protection",
    "README with environment variables and setup instructions",
    "Seed data and example admin account logic"
  ],
  "final_instruction_to_builder": "Generate the full project as a serious MVP, not a mockup. Build it as if it is going to be deployed. Make the UX premium, black and purple, very minimal, and focused on the fewest possible screens. Ensure the app and admin panel are connected through Convex in real time. Use Clerk for Apple, Google, and email auth. Use Google Maps for location and address flows. Use Stripe PaymentSheet for Apple Pay, Google Pay, and card. Build the customer booking flow, subscription flow, and admin dispatch/management flow end to end."
}
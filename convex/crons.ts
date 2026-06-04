import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "generateRecurringBookings",
  { hours: 6 },
  internal.subscriptions.generateRecurringBookings,
  {}
);

crons.interval(
  "recomputeActiveBookingEtas",
  { minutes: 1 },
  internal.bookings.recomputeActiveBookingEtas,
  {}
);

export default crons;
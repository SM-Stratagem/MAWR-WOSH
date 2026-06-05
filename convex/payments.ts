import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

export const createStripePaymentIntent = action({
  args: {
    bookingId: v.id("bookings"),
    amount: v.number(),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const stripe = (await import("stripe")).default;
    const stripeClient = new stripe(stripeKey);

    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: Math.round(args.amount * 100),
      currency: args.currency.toLowerCase(),
      metadata: {
        bookingId: args.bookingId,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  },
});

export const createStripeSetupIntent = action({
  args: {
    customerId: v.string(),
  },
  handler: async (ctx, args) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const stripe = (await import("stripe")).default;
    const stripeClient = new stripe(stripeKey);

    const setupIntent = await stripeClient.setupIntents.create({
      customer: args.customerId,
      payment_method_types: ["card", "apple_pay", "google_pay"],
    });

    return {
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    };
  },
});

export const createStripeCustomer = action({
  args: {
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const stripe = (await import("stripe")).default;
    const stripeClient = new stripe(stripeKey);

    const customer = await stripeClient.customers.create({
      email: args.email,
      name: args.name,
    });

    return {
      customerId: customer.id,
    };
  },
});

export const handleStripeWebhook = action({
  args: {
    body: v.bytes(),
    headers: v.record(v.string(), v.string()),
  },
  handler: async (ctx, args) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!stripeKey || !webhookSecret) {
      throw new Error("Stripe not configured");
    }

    const stripe = (await import("stripe")).default;
    const stripeClient = new stripe(stripeKey);
    const sig = args.headers["stripe-signature"];

    if (!sig) {
      throw new Error("No stripe signature");
    }

    let event;
    try {
      const body = new Uint8Array(args.body);
      event = stripeClient.webhooks.constructEvent(
        body,
        sig,
        webhookSecret
      );
    } catch (err) {
      throw new Error(`Webhook Error: ${err}`);
    }

    console.log(`Received webhook: ${event.type}`);

    // Idempotent branches — Stripe may retry. We re-cast the bookingId from
    // metadata as Id<"bookings"> because Stripe stores it as a string; the
    // internal mutations gracefully no-op on a missing booking.
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as any;
        const bookingId = pi.metadata?.bookingId;
        if (bookingId) {
          try {
            await ctx.runMutation(internal.bookings.internalConfirmBookingAfterPayment, {
              bookingId: bookingId as Id<"bookings">,
              paymentIntentId: pi.id,
            });
          } catch (e) {
            console.error("[Stripe Webhook] confirmBookingAfterPayment failed:", e);
          }
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as any;
        const bookingId = pi.metadata?.bookingId;
        if (bookingId) {
          try {
            await ctx.runMutation(internal.bookings.markBookingPaymentFailed, {
              bookingId: bookingId as Id<"bookings">,
              reason: pi.last_payment_error?.message,
            });
          } catch (e) {
            console.error("[Stripe Webhook] markBookingPaymentFailed failed:", e);
          }
        }
        break;
      }
      case "charge.refunded": {
        const ch = event.data.object as any;
        const bookingId = ch.metadata?.bookingId;
        if (bookingId) {
          try {
            await ctx.runMutation(internal.bookings.markBookingRefunded, {
              bookingId: bookingId as Id<"bookings">,
              reason: "stripe_refund",
            });
          } catch (e) {
            console.error("[Stripe Webhook] markBookingRefunded failed:", e);
          }
        }
        break;
      }
      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return { received: true };
  },
});

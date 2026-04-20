import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.arrayBuffer();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    await ctx.runAction(require("./payments").handleStripeWebhook, {
      body: new Uint8Array(body),
      headers,
    });

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    console.log("[Clerk Webhook] Received webhook");
    
    const svix_id = request.headers.get("svix-id");
    const svix_timestamp = request.headers.get("svix-timestamp");
    const svix_signature = request.headers.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.log("[Clerk Webhook] Missing required Svix headers");
      return new Response("Error occurred -- no svix headers", {
        status: 400,
      });
    }

    const payload = await request.json();
    const eventType = payload.type;
    const data = payload.data;

    console.log("[Clerk Webhook] Event type:", eventType);

    try {
      switch (eventType) {
        case "user.created":
        case "user.updated": {
          const clerkId = data.id;
          const email = data.email_addresses?.[0]?.email_address;
          const name = `${data.first_name || ""} ${data.last_name || ""}`.trim() || data.username || email;
          const phone = data.phone_numbers?.[0]?.phone_number;

          console.log("[Clerk Webhook] Syncing user:", { clerkId, email, name });

          await ctx.runMutation(require("./users").syncUserFromClerk, {
            clerkId,
            email,
            name,
            phone,
          });

          console.log("[Clerk Webhook] User synced successfully");
          break;
        }
        case "user.deleted": {
          const clerkId = data.id;
          console.log("[Clerk Webhook] User deleted:", clerkId);
          break;
        }
        default:
          console.log("[Clerk Webhook] Unhandled event type:", eventType);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[Clerk Webhook] Error:", error);
      return new Response(JSON.stringify({ error: "Webhook handler failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;

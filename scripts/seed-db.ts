import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient("https://wooden-moose-958.convex.cloud");

async function seedDatabase() {
  console.log("🌱 Starting database seeding...\n");

  try {
    // 1. Seed wash types
    console.log("🚗 Seeding wash types...");
    await convex.mutation("washTypes:seedWashTypes");
    console.log("✅ Wash types seeded successfully\n");

    // 2. Seed default settings
    console.log("⚙️  Seeding default settings...");
    await convex.mutation("settings:seedDefaultSettings");
    console.log("✅ Default settings seeded successfully\n");

    // 3. Seed admin user (you'll need to update your email)
    console.log("👤 Seeding admin user...");
    // Update this to your actual email address
    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";

    try {
      await convex.mutation("users:seedAdmin", {
        email: adminEmail,
        name: "Admin User",
        role: "admin",
      });
      console.log(`✅ Admin user created for: ${adminEmail}\n`);
    } catch (error) {
      console.log(`ℹ️  Admin user may already exist for: ${adminEmail}\n`);
    }

    console.log("🎉 Database seeding completed successfully!");
    console.log("\n📋 Next steps:");
    console.log("1. Sign in to your Clerk account with your admin email");
    console.log("2. Go to admin dashboard");
    console.log("3. The user sync function will link your Clerk account to the admin user");

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seedDatabase();
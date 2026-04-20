// apps/mobile/constants/washImages.ts

export interface WashTypeDetail {
  key: string;
  imageUrl: string;
  fullDescription: string;
  features: string[];
}

export const washTypeDetails: Record<string, WashTypeDetail> = {
  basic: {
    key: "basic",
    imageUrl: "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=800&auto=format&fit=crop",
    fullDescription: "Our Basic Wash includes exterior hand wash, wheel cleaning, and tire dressing. Perfect for maintaining your car's shine between deep cleans.",
    features: ["Hand wash exterior", "Wheel & tire cleaning", "Window cleaning", "Tire dressing"]
  },
  premium: {
    key: "premium",
    imageUrl: "https://images.unsplash.com/photo-1552930294-6b595f4c2974?w=800&auto=format&fit=crop",
    fullDescription: "Premium Wash adds interior vacuuming, dashboard wipe-down, and air freshener. The complete refresh your car deserves.",
    features: ["Everything in Basic", "Interior vacuuming", "Dashboard & console wipe", "Air freshener", "Door jam cleaning"]
  },
  detail: {
    key: "detail",
    imageUrl: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=800&auto=format&fit=crop",
    fullDescription: "Full Detail is our comprehensive service including leather conditioning, deep interior cleaning, wax protection, and engine bay detail.",
    features: ["Everything in Premium", "Leather conditioning", "Deep interior cleaning", "Wax protection", "Engine bay detail", "Paint protection"]
  }
};

export interface SubscriptionPlan {
  key: "weekly" | "biweekly" | "monthly" | "one_time";
  label: string;
  washesPerMonth: number;
  discountPercent: number;
  description: string;
}

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    key: "weekly",
    label: "Weekly",
    washesPerMonth: 8,
    discountPercent: 15,
    description: "8 washes/month"
  },
  {
    key: "biweekly",
    label: "Bi-Weekly",
    washesPerMonth: 4,
    discountPercent: 15,
    description: "4 washes/month"
  },
  {
    key: "monthly",
    label: "Monthly",
    washesPerMonth: 2,
    discountPercent: 15,
    description: "2 washes/month"
  },
  {
    key: "one_time",
    label: "One Time",
    washesPerMonth: 1,
    discountPercent: 0,
    description: "Single wash"
  }
];

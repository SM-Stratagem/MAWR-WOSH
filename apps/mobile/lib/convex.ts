import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

export { convex };

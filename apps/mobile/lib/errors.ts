const AUTH_PATTERNS = [
  "unauthorized",
  "unauthenticated",
  "session expired",
  "jwt",
  "token",
];

const NETWORK_PATTERNS = [
  "network request failed",
  "failed to fetch",
  "request timed out",
  "timeout",
  "offline",
];

function extractErrorMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;

  const candidate = error as {
    message?: unknown;
    errors?: Array<{ message?: unknown }>;
    data?: { message?: unknown };
  };

  const clerkMessage = candidate.errors?.[0]?.message;
  if (typeof clerkMessage === "string") return clerkMessage;
  if (typeof candidate.data?.message === "string") return candidate.data.message;
  if (typeof candidate.message === "string") return candidate.message;
  return "";
}

export function getUserFacingErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  const rawMessage = extractErrorMessage(error).trim();
  if (!rawMessage) return fallback;

  const lower = rawMessage.toLowerCase();

  if (lower.includes("convex dev server") || lower.includes("npx convex dev")) {
    return "Service is temporarily unavailable. Please try again in a moment.";
  }

  if (NETWORK_PATTERNS.some((pattern) => lower.includes(pattern))) {
    return "Connection issue. Check your internet connection and try again.";
  }

  if (AUTH_PATTERNS.some((pattern) => lower.includes(pattern))) {
    return "Your session needs to be refreshed. Please sign in again if this continues.";
  }

  if (lower.includes("user not found")) {
    return "Your account is still being prepared. Wait a moment and try again.";
  }

  return rawMessage || fallback;
}

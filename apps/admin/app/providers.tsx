"use client";

import { ReactNode, useEffect, useRef } from "react";
import { ConvexReactClient, useMutation } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ClerkProvider, useAuth, useUser } from "@clerk/nextjs";
import { api } from "../convex/_generated/api";

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("Missing NEXT_PUBLIC_CONVEX_URL in your .env file");
}

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL, {
  unsavedChangesWarning: false,
});

function UserSync() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser);
  const syncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) return;
    if (!user.primaryEmailAddress?.emailAddress) return;
    if (syncedUserIdRef.current === user.id) return;

    let cancelled = false;

    void ensureCurrentUser({
      email: user.primaryEmailAddress.emailAddress,
      name: user.fullName || user.firstName || user.username || user.primaryEmailAddress.emailAddress,
      phone: user.primaryPhoneNumber?.phoneNumber,
    }).then(() => {
      if (!cancelled) {
        syncedUserIdRef.current = user.id;
      }
    }).catch((error) => {
      console.warn("[Auth Sync] Failed to sync admin user", error);
    });

    return () => {
      cancelled = true;
    };
  }, [ensureCurrentUser, isLoaded, isSignedIn, user]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <UserSync />
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

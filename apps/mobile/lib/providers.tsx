import { ConvexProviderWithAuth, ConvexReactClient, useMutation, useQuery } from "convex/react";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { ReactNode, useEffect, useRef, useCallback } from "react";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  verbose: false, // Disable verbose logging
});

function ConvexAuthWrapper({ children }: { children: ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  // Memoize the auth functions to prevent constant re-initialization
  const fetchAccessToken = useCallback(async () => {
    const token = await getToken({ template: "convex" });
    return token ?? null;
  }, [getToken]);

  const authState = {
    fetchAccessToken,
    isAuthenticated: !!isSignedIn,
    isLoading: !isLoaded,
  };

  return (
    <ConvexProviderWithAuth
      client={convex}
      useAuth={() => authState}
    >
      {children}
    </ConvexProviderWithAuth>
  );
}

function UserSync({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const syncMutation = useMutation("users:syncUserFromClerk" as any);
  const hasSynced = useRef(false);
  const retryCount = useRef(0);
  const isSyncing = useRef(false);

  useEffect(() => {
    // Prevent concurrent syncs
    if (isSyncing.current) return;
    
    if (isLoaded && isSignedIn && user && !hasSynced.current) {
      isSyncing.current = true;
      const email = user.emailAddresses?.[0]?.emailAddress || "";
      const name = user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || email;
      const phone = user.phoneNumbers?.[0]?.phoneNumber;
      
      syncMutation({ clerkId: user.id, email, name, phone })
        .then(() => {
          hasSynced.current = true;
          isSyncing.current = false;
        })
        .catch(() => {
          retryCount.current += 1;
          isSyncing.current = false;
          if (retryCount.current >= 3) {
            hasSynced.current = true; // Stop retrying after 3 attempts
          }
        });
    }
    if (!isSignedIn) {
      hasSynced.current = false;
      retryCount.current = 0;
    }
  // Only re-run when auth state changes, not when syncMutation reference changes
  }, [isLoaded, isSignedIn, user?.id]);

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <ConvexAuthWrapper>
        <UserSync>{children}</UserSync>
      </ConvexAuthWrapper>
    </ClerkProvider>
  );
}

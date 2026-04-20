import { ConvexProviderWithAuth, ConvexReactClient, useMutation, useQuery } from "convex/react";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { ReactNode, useEffect, useRef } from "react";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  verbose: false,
});

function ConvexAuthWrapper({ children }: { children: ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  return (
    <ConvexProviderWithAuth
      client={convex}
      useAuth={() => ({
        fetchAccessToken: async () => {
          const token = await getToken({ template: "convex" });
          return token ?? null;
        },
        isAuthenticated: !!isSignedIn,
        isLoading: !isLoaded,
      })}
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

  useEffect(() => {
    if (isLoaded && isSignedIn && user && !hasSynced.current) {
      const email = user.emailAddresses?.[0]?.emailAddress || "";
      const name = user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || email;
      const phone = user.phoneNumbers?.[0]?.phoneNumber;
      
      console.log("[UserSync] Syncing user:", { clerkId: user.id, email, name });
      
      syncMutation({ clerkId: user.id, email, name, phone })
        .then(() => {
          console.log("[UserSync] Success");
          hasSynced.current = true;
        })
        .catch((err: any) => {
          console.error("[UserSync] Failed:", err?.message || err);
          retryCount.current += 1;
          if (retryCount.current >= 3) {
            hasSynced.current = true; // Stop retrying after 3 attempts
          }
        });
    }
    if (!isSignedIn) {
      hasSynced.current = false;
      retryCount.current = 0;
    }
  }, [isLoaded, isSignedIn, user, syncMutation]);

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

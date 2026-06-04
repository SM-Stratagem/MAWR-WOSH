import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { ReactNode, useRef, useCallback, useMemo, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

function useClerkAuth() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const tokenRef = useRef<{ token: string | null; expires: number }>({ token: null, expires: 0 });
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const fetchAccessToken = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return null;
    const now = Date.now();
    if (tokenRef.current.token && now < tokenRef.current.expires) {
      return tokenRef.current.token;
    }
    const token = await getTokenRef.current({ template: "convex" }).catch(() => null);
    if (token) {
      tokenRef.current = { token, expires: now + 5 * 60 * 1000 };
    }
    return token;
  }, [isLoaded, isSignedIn]);

  return useMemo(() => ({
    isLoading: !isLoaded,
    isAuthenticated: isLoaded && isSignedIn === true,
    fetchAccessToken,
  }), [isLoaded, isSignedIn, fetchAccessToken]);
}

function UserSync() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser);
  const syncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      syncedUserIdRef.current = null;
      return;
    }
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
      console.warn("[Auth Sync] Failed to sync mobile user", error);
    });

    return () => {
      cancelled = true;
    };
  }, [ensureCurrentUser, isLoaded, isSignedIn, user]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <ConvexProviderWithAuth client={convex} useAuth={useClerkAuth}>
        <UserSync />
        {children}
      </ConvexProviderWithAuth>
    </ClerkProvider>
  );
}

import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import { api } from "../convex/_generated/api";
import { useTeamStore } from "./teamStore";

// Push events that should deep-link the customer to their booking tracking page.
const CUSTOMER_EVENTS = new Set([
  "team_assigned",
  "on_the_way",
  "arrived",
  "washing_started",
  "completed",
]);

// Push events targeted at team members — open the team booking detail.
const TEAM_EVENTS = new Set([
  "new_booking",
  "team_reassigned",
]);

function routeFromNotificationData(data: unknown) {
  if (!data || typeof data !== "object") return;
  const payload = data as Record<string, unknown>;
  const event = typeof payload.event === "string" ? payload.event : undefined;
  const bookingId =
    typeof payload.bookingId === "string" ? payload.bookingId : undefined;
  if (!event || !bookingId) return;

  if (CUSTOMER_EVENTS.has(event)) {
    router.push({ pathname: "/tracking", params: { bookingId } });
  } else if (TEAM_EVENTS.has(event)) {
    router.push(`/team/${bookingId}` as any);
  }
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  const storePushToken = useMutation(api.notifications.storePushToken);
  const storeTeamToken = useMutation(api.notifications.storeTeamPushTokenBySession);
  const teamSession = useTeamStore((s) => s.session);
  const teamSessionId = teamSession?.sessionId;

  useEffect(() => {
    let notificationListener: Notifications.Subscription;
    let responseListener: Notifications.Subscription;

    registerForPushNotifications().then((token) => {
      if (!token) return;
      // Customer (Clerk-authed) — will fail silently for team-only sessions
      storePushToken({ token }).catch((err) => {
        console.warn("Failed to store customer push token:", err);
      });
      // Team (session-based) — only fires when a valid team session exists
      if (teamSessionId) {
        storeTeamToken({ sessionId: teamSessionId, token }).catch((err) => {
          console.warn("Failed to store team push token:", err);
        });
      }
    });

    notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("Notification received:", notification);
      }
    );

    // Tap on a push -> deep-link to the right screen.
    responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        routeFromNotificationData(data);
      }
    );

    // Cold-start: app launched FROM tapping a notification — handle that too.
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          routeFromNotificationData(
            response.notification.request.content.data,
          );
        }
      })
      .catch(() => {});

    return () => {
      notificationListener?.remove();
      responseListener?.remove();
    };
  }, [teamSessionId, storePushToken, storeTeamToken]);
}

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#1976ff",
    });
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission denied");
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    console.log("Push token:", tokenData.data);
    return tokenData.data;
  } catch (error) {
    console.error("Failed to get push token:", error);
    return null;
  }
}

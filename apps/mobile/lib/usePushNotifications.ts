import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useTeamStore } from "./teamStore";

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
      storePushToken({ token }).catch(() => {});
      // Team (session-based) — only fires when a valid team session exists
      if (teamSessionId) {
        storeTeamToken({ sessionId: teamSessionId, token }).catch(() => {});
      }
    });

    notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("Notification received:", notification);
      }
    );

    responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        console.log("Notification response:", data);
      }
    );

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

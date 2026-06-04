import { useEffect, useRef } from "react";
import * as Location from "expo-location";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

const UPDATE_INTERVAL_MS = 30_000;
const MIN_DISTANCE_M = 25;

export function useTeamLocationTracker(
  sessionId: string | undefined,
  enabled: boolean,
) {
  const updateLocation = useMutation(api.teams.teamUpdateLocation);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let mounted = true;

    async function start() {
      if (!enabled || !sessionId) return;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      try {
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (mounted) {
          await updateLocation({
            sessionId,
            latitude: initial.coords.latitude,
            longitude: initial.coords.longitude,
          }).catch(() => {});
        }
      } catch {}

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: UPDATE_INTERVAL_MS,
          distanceInterval: MIN_DISTANCE_M,
        },
        (loc) => {
          if (!mounted) return;
          updateLocation({
            sessionId,
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          }).catch(() => {});
        },
      );
      subscriptionRef.current = sub;
    }

    start();

    return () => {
      mounted = false;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [sessionId, enabled, updateLocation]);
}

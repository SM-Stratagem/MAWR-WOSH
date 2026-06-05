import { useEffect, useRef } from "react";
import * as Location from "expo-location";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

const UPDATE_INTERVAL_MS = 30_000;
const MIN_DISTANCE_M = 25;

// Sample less often / coarser when the driver is idle to save battery; switch
// to high accuracy + tighter cadence once they have an active booking so the
// customer's live tracking map stays responsive.
const IDLE_INTERVAL_MS = 60_000;
const IDLE_DISTANCE_M = 100;

export function useTeamLocationTracker(
  sessionId: string | undefined,
  enabled: boolean,
  hasActiveBooking: boolean = false,
) {
  const updateLocation = useMutation(api.teams.teamUpdateLocation);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let mounted = true;

    async function start() {
      // Bail out entirely when disabled (e.g. team is offline) — no permission
      // prompt, no watcher, no GPS drain.
      if (!enabled || !sessionId) return;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const accuracy = hasActiveBooking
        ? Location.Accuracy.High
        : Location.Accuracy.Balanced;
      const timeInterval = hasActiveBooking ? UPDATE_INTERVAL_MS : IDLE_INTERVAL_MS;
      const distanceInterval = hasActiveBooking ? MIN_DISTANCE_M : IDLE_DISTANCE_M;

      try {
        const initial = await Location.getCurrentPositionAsync({ accuracy });
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
          accuracy,
          timeInterval,
          distanceInterval,
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
  }, [sessionId, enabled, hasActiveBooking, updateLocation]);
}

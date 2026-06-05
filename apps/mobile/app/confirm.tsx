import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius } from "../constants/theme";
import { useBookingStore } from "../lib/store";
import { getUserFacingErrorMessage } from "../lib/errors";

export default function ConfirmScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const { reset } = useBookingStore();
  const createBooking = useMutation(api.bookings.createBookingDraft);
  const confirmBooking = useMutation(api.bookings.confirmBookingAfterPayment);
  const discountPctSetting = useQuery(api.settings.getPublic, { key: "subscription_discount_pct" });
  const subscriptionDiscountPct = discountPctSetting ? Number(discountPctSetting) : 15;

  useEffect(() => {
    // Wait for settings query to resolve so discount % isn't a stale default
    // (discountPctSetting === undefined while in-flight, null/string once resolved).
    if (discountPctSetting === undefined) return;
    const doBooking = async () => {
      const booking = useBookingStore.getState();

      if (!booking.selectedCarIds?.length) {
        setStatus("error");
        setErrorMessage("No cars selected");
        return;
      }

      if (!booking.selectedAddressId) {
        setStatus("error");
        setErrorMessage("No location selected");
        return;
      }

      if (!booking.selectedWashType?.washTypeId) {
        setStatus("error");
        setErrorMessage("No wash type selected");
        return;
      }

    try {
      const isSubscription =
        booking.subscriptionPlan && booking.subscriptionPlan !== "one_time";
      const discountPercent = isSubscription ? subscriptionDiscountPct : 0;
      const id = await createBooking({
        carIds: booking.selectedCarIds as any,
        washTypeId: booking.selectedWashType?.washTypeId as any,
        addressId: booking.selectedAddressId as any,
        scheduledWindow: booking.scheduledWindow as any,
        scheduledDate: booking.scheduledDate as any,
        subscriptionDiscountPercent: discountPercent,
      });

      reset();
      setStatus("success");

      setTimeout(() => {
        router.replace(`/tracking?bookingId=${id}`);
      }, 1500);
    } catch (error: any) {
      setStatus("error");
      setErrorMessage(getUserFacingErrorMessage(error, "Failed to create booking. Please try again."));
    }
    };

    doBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discountPctSetting]);

  if (status === "loading") {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.title}>Confirming Your Booking</Text>
          <Text style={styles.subtitle}>Please wait while we process your booking...</Text>
        </View>
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={[styles.iconContainer, styles.errorIcon]}>
            <Ionicons name="close-circle" size={64} color={colors.danger} />
          </View>
          <Text style={styles.title}>Booking Failed</Text>
          <Text style={styles.subtitle}>{errorMessage}</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, styles.successIcon]}>
          <Ionicons name="checkmark-circle" size={64} color={colors.success} />
        </View>
        <Text style={styles.title}>Booking Confirmed!</Text>
        <Text style={styles.subtitle}>Your booking has been confirmed. Redirecting...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    marginBottom: spacing.xl,
  },
  successIcon: {},
  errorIcon: {},
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text_primary,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: colors.text_secondary,
    textAlign: "center",
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
  },
  buttonText: {
    color: colors.on_primary,
    fontSize: 16,
    fontWeight: "600",
  },
});

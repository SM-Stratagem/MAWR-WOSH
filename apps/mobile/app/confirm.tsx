import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius } from "../constants/theme";
import { useBookingStore } from "../lib/store";

export default function ConfirmScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  
  const booking = useBookingStore();
  const { selectedCarIds, selectedAddressId, selectedWashType, reset } = booking;
  
  const createBooking = useMutation("bookings:createBookingDraft" as any);

  useEffect(() => {
    const confirmBooking = async () => {
      // Validate required data
      if (!selectedCarIds || selectedCarIds.length === 0) {
        setStatus("error");
        setErrorMessage("No cars selected");
        return;
      }
      
      if (!selectedAddressId) {
        setStatus("error");
        setErrorMessage("No location selected");
        return;
      }
      
      if (!selectedWashType?.washTypeId) {
        setStatus("error");
        setErrorMessage("No wash type selected");
        return;
      }

      try {
        // Create booking - it will be auto-confirmed by the backend
        const bookingId = await createBooking({
          addressId: selectedAddressId,
          washTypeId: selectedWashType.washTypeId as any,
          carIds: selectedCarIds as any,
        });

        console.log("[Confirm] Booking created and confirmed:", bookingId);
        
        // Show success state briefly
        setStatus("success");
        
        // Reset booking store
        reset();
        
        // Redirect to tracking after a short delay
        setTimeout(() => {
          router.replace(`/tracking?bookingId=${bookingId}`);
        }, 1500);
        
      } catch (error: any) {
        console.error("[Confirm] Error creating booking:", error);
        setStatus("error");
        setErrorMessage(error.message || "Failed to create booking");
      }
    };

    confirmBooking();
  }, []);

  if (status === "loading") {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
          <Text style={styles.title}>Confirming Your Booking</Text>
          <Text style={styles.subtitle}>
            Please wait while we process your booking...
          </Text>
        </View>
      </View>
    );
  }

  if (status === "success") {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={[styles.iconContainer, styles.successIcon]}>
            <Ionicons name="checkmark-circle" size={64} color={colors.success} />
          </View>
          <Text style={styles.title}>Booking Confirmed!</Text>
          <Text style={styles.subtitle}>
            Your car wash has been booked successfully.
          </Text>
          <Text style={styles.redirectText}>
            Redirecting to tracking...
          </Text>
        </View>
      </View>
    );
  }

  // Error state
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, styles.errorIcon]}>
          <Ionicons name="close-circle" size={64} color={colors.danger} />
        </View>
        <Text style={styles.title}>Booking Failed</Text>
        <Text style={styles.subtitle}>{errorMessage}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface_container_low,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  successIcon: {
    backgroundColor: colors.success + "20",
  },
  errorIcon: {
    backgroundColor: colors.danger + "20",
  },
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
    lineHeight: 22,
  },
  redirectText: {
    fontSize: 14,
    color: colors.text_secondary,
    marginTop: spacing.lg,
    fontStyle: "italic",
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    marginTop: spacing.xl,
  },
  retryButtonText: {
    color: colors.on_primary,
    fontSize: 16,
    fontWeight: "600",
  },
});

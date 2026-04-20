import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { colors, spacing, borderRadius } from "../constants/theme";
import { useBookingStore } from "../lib/store";

export default function PaymentScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const booking = useBookingStore();
  const { total, bookingId } = booking;

  const confirmBooking = useMutation("bookings:confirmBookingAfterPayment" as any);

  const handlePayment = async () => {
    if (!bookingId) {
      Alert.alert("Error", "No booking found");
      return;
    }

    setLoading(true);
    try {
      await confirmBooking({
        bookingId,
        paymentIntentId: `pi_demo_${Date.now()}`,
      });

      booking.reset();
      router.replace(`/tracking?bookingId=${bookingId}`);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Payment</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount</Text>
            <Text style={styles.summaryValue}>{total} AED</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{total} AED</Text>
          </View>
        </View>

        <View style={styles.paymentMethods}>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>

          <TouchableOpacity style={styles.paymentOption}>
            <View style={styles.paymentIcon}>
              <Text style={styles.paymentIconText}>A</Text>
            </View>
            <Text style={styles.paymentOptionText}>Apple Pay</Text>
            <View style={styles.radio}>
              <View style={styles.radioSelected} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.paymentOption}>
            <View style={styles.paymentIcon}>
              <Text style={styles.paymentIconText}>G</Text>
            </View>
            <Text style={styles.paymentOptionText}>Google Pay</Text>
            <View style={styles.radio}>
              <View style={styles.radioSelected} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.paymentOption}>
            <View style={styles.paymentIcon}>
              <Text style={styles.paymentIconText}>C</Text>
            </View>
            <Text style={styles.paymentOptionText}>Card Payment</Text>
            <View style={styles.radio}>
              <View style={styles.radioSelected} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.secureNote}>
          <Text style={styles.secureNoteText}>
            Your payment is secured with industry-standard encryption
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payButton, loading && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.text_primary} />
          ) : (
            <Text style={styles.payButtonText}>Pay {total} AED</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + 20,
    paddingBottom: spacing.md,
  },
  backButton: {
    color: colors.primary,
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text_primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text_primary,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.text_secondary,
  },
  summaryValue: {
    fontSize: 14,
    color: colors.text_primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surface_container_high,
    marginVertical: spacing.md,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text_primary,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
  },
  paymentMethods: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text_secondary,
    marginBottom: spacing.md,
    textTransform: "uppercase",
  },
  paymentOption: {
    backgroundColor: colors.surface_container_low,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  paymentIconText: {
    color: colors.text_primary,
    fontSize: 18,
    fontWeight: "700",
  },
  paymentOptionText: {
    flex: 1,
    fontSize: 16,
    color: colors.text_primary,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  radioSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  secureNote: {
    alignItems: "center",
  },
  secureNoteText: {
    fontSize: 12,
    color: colors.text_secondary,
    textAlign: "center",
  },
  footer: {
    backgroundColor: colors.surface_container_low,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  payButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: "center",
  },
  payButtonDisabled: {
    opacity: 0.5,
  },
  payButtonText: {
    color: colors.on_primary,
    fontSize: 16,
    fontWeight: "600",
  },
});

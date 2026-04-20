import { useRouter } from "expo-router";
import { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useQuery } from "convex/react";
import { colors, spacing, borderRadius, bookingStatuses } from "../../constants/theme";

export default function BookingsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const bookings = useQuery("bookings:listMyBookings" as any) || [];

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // The query will automatically refetch
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    return bookingStatuses[status as keyof typeof bookingStatuses]?.color || colors.text_secondary;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {bookings.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No bookings yet</Text>
            <Text style={styles.emptySubtext}>
              Your booking history will appear here
            </Text>
          </View>
        )}

        {bookings.map((booking: any) => (
          <TouchableOpacity
            key={booking._id}
            style={styles.bookingCard}
            onPress={() => router.push(`/tracking?bookingId=${booking._id}`)}
          >
            <View style={styles.bookingHeader}>
              <Text style={styles.bookingNumber}>{booking.bookingNumber}</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(booking.status) + "20" },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(booking.status) },
                  ]}
                >
                  {bookingStatuses[booking.status as keyof typeof bookingStatuses]?.label || booking.status}
                </Text>
              </View>
            </View>

            <View style={styles.bookingDetails}>
              <Text style={styles.bookingWash}>
                {booking.selectedCarCount} car{booking.selectedCarCount > 1 ? "s" : ""} - {booking.currency} {booking.total}
              </Text>
              <Text style={styles.bookingDate}>{formatDate(booking.createdAt)}</Text>
            </View>

            {/* Show rejection reason prominently */}
            {booking.status === "rejected" && booking.rejectionReason && (
              <View style={styles.rejectionBanner}>
                <Text style={styles.rejectionLabel}>Rejection Reason:</Text>
                <Text style={styles.rejectionText}>{booking.rejectionReason}</Text>
              </View>
            )}

            {/* Show awaiting confirmation message */}
            {booking.status === "booked" && (
              <View style={styles.pendingBanner}>
                <Text style={styles.pendingText}>Awaiting admin confirmation...</Text>
              </View>
            )}

            {booking.status !== "completed" && booking.status !== "canceled" && booking.status !== "rejected" && (
              <View style={styles.trackButton}>
                <Text style={styles.trackButtonText}>Track Order</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + 20,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text_primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text_primary,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text_secondary,
    marginTop: spacing.sm,
  },
  bookingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  bookingNumber: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text_secondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  bookingDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bookingWash: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text_primary,
  },
  bookingDate: {
    fontSize: 14,
    color: colors.text_secondary,
  },
  trackButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary + "20",
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  trackButtonText: {
    color: colors.primary,
    fontWeight: "600",
  },
  rejectionBanner: {
    marginTop: spacing.md,
    backgroundColor: colors.error + "15",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  rejectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.error,
    marginBottom: spacing.xs,
  },
  rejectionText: {
    fontSize: 14,
    color: colors.text_primary,
    lineHeight: 20,
  },
  pendingBanner: {
    marginTop: spacing.md,
    backgroundColor: colors.warning + "15",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: "center",
  },
  pendingText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.warning,
  },
});

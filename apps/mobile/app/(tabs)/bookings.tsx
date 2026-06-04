import { useRouter } from "expo-router";
import { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { colors, spacing, borderRadius, bookingStatuses } from "../../constants/theme";

export default function BookingsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const bookings = useQuery(api.bookings.listMyBookings) || [];

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }).toUpperCase();
  };

  const getStatusColor = (status: string) => {
    return bookingStatuses[status as keyof typeof bookingStatuses]?.color || colors.ink_dim;
  };

  const getStatusLabel = (status: string) => {
    return bookingStatuses[status as keyof typeof bookingStatuses]?.label || status;
  };

  const activeBookings = bookings.filter((b: any) =>
    !["completed", "canceled", "rejected"].includes(b.status)
  );
  const completedBookings = bookings.filter((b: any) =>
    ["completed", "canceled", "rejected"].includes(b.status)
  );

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.brand}>WOSH</Text>
        <Text style={styles.sectionLabel}>BOOKINGS</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Active Section */}
        {activeBookings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>ACTIVE</Text>
              <View style={styles.livePill}>
                <Text style={styles.livePillText}>TRACKING LIVE</Text>
              </View>
            </View>

            {activeBookings.map((booking: any) => (
              <TouchableOpacity
                key={booking._id}
                style={styles.activeCard}
                onPress={() => router.push(`/tracking?bookingId=${booking._id}`)}
              >
                <View style={styles.activeCardHeader}>
                  <View>
                    <Text style={styles.activeCardLabel}>SERVICE</Text>
                    <Text style={styles.activeCardTitle}>
                      {booking.washType?.name?.toUpperCase() || "WASH"}
                    </Text>
                  </View>
                  <View style={styles.etaBlock}>
                    <Text style={styles.etaLabel}>ETA</Text>
                    <Text style={styles.etaValue}>
                      {booking.etaMin && booking.etaMax
                        ? `${booking.etaMin}–${booking.etaMax}`
                        : booking.etaMin || "—"}
                    </Text>
                    <Text style={styles.etaUnit}>MIN</Text>
                  </View>
                </View>

                {/* Map placeholder */}
                <View style={styles.mapPlaceholder}>
                  <View style={styles.mapPin}>
                    <Text style={styles.mapPinText}>G</Text>
                  </View>
                </View>

                <View style={styles.activeCardFooter}>
                  <TouchableOpacity
                    style={styles.trackButton}
                    onPress={() => router.push(`/tracking?bookingId=${booking._id}`)}
                  >
                    <Text style={styles.trackButtonText}>TRACK WASHER</Text>
                  </TouchableOpacity>
                  <Text style={styles.detailsLink}>DETAILS</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Rejected bookings */}
        {bookings.filter((b: any) => b.status === "rejected").map((booking: any) => (
          <View key={booking._id} style={styles.rejectionCard}>
            <Text style={styles.rejectionLabel}>REJECTED</Text>
            {booking.rejectionReason && (
              <Text style={styles.rejectionText}>{booking.rejectionReason}</Text>
            )}
          </View>
        ))}

        {/* Recent History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RECENT HISTORY</Text>

          {bookings.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>NO ACTIVE BOOKINGS</Text>
              <Text style={styles.emptySubtext}>Your booking history will appear here.</Text>
            </View>
          )}

          <View style={styles.historyCard}>
            {completedBookings.map((booking: any, index: number) => (
              <TouchableOpacity
                key={booking._id}
                style={[
                  styles.historyItem,
                  index < completedBookings.length - 1 && styles.historyItemBorder,
                ]}
                onPress={() => router.push(`/tracking?bookingId=${booking._id}`)}
              >
                <View style={styles.historyLeft}>
                  <View style={styles.historyIcon}>
                    <Text style={styles.historyIconText}>G</Text>
                  </View>
                  <View>
                    <Text style={styles.historyName}>
                      {booking.selectedCarCount > 1
                        ? `${booking.selectedCarCount} CARS`
                        : booking.washType?.name?.toUpperCase() || "WASH"}
                    </Text>
                    <Text style={styles.historyDate}>
                      {formatDate(booking.createdAt)} — {booking.washType?.name?.toUpperCase() || "WASH"}
                    </Text>
                  </View>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyPrice}>
                    {booking.total}
                    <Text style={styles.historyPriceUnit}> AED</Text>
                  </Text>
                  <View style={[styles.statusPill, { borderColor: getStatusColor(booking.status) }]}>
                    <Text style={[styles.statusPillText, { color: getStatusColor(booking.status) }]}>
                      {getStatusLabel(booking.status)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: spacing.xxl }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + 20,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line_soft,
    backgroundColor: colors.paper,
  },
  brand: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -1,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.ink_dim,
    letterSpacing: 1.4,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.ink_dim,
    letterSpacing: 1.4,
  },
  livePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: borderRadius.sm,
  },
  livePillText: {
    fontSize: 9,
    fontWeight: "500",
    color: colors.accent,
    letterSpacing: 1.4,
  },
  activeCard: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line_soft,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  activeCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  activeCardLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.ink_dim,
    letterSpacing: 1.4,
    marginBottom: spacing.xs,
  },
  activeCardTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.5,
  },
  etaBlock: {
    alignItems: "flex-end",
  },
  etaLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.ink_dim,
    letterSpacing: 1.4,
    marginBottom: spacing.xs,
  },
  etaValue: {
    fontSize: 48,
    fontWeight: "700",
    color: colors.accent,
    lineHeight: 48,
  },
  etaUnit: {
    fontSize: 22,
    fontWeight: "500",
    color: colors.accent,
  },
  mapPlaceholder: {
    height: 160,
    backgroundColor: colors.bg_soft,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.line_soft,
    alignItems: "center",
    justifyContent: "center",
  },
  mapPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  mapPinText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.on_accent,
  },
  activeCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  trackButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  trackButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.on_accent,
  },
  detailsLink: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.ink_dim,
    letterSpacing: 1.4,
  },
  rejectionCard: {
    backgroundColor: "rgba(255,90,90,0.12)",
    borderWidth: 1,
    borderColor: colors.hot,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  rejectionLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.hot,
    letterSpacing: 1.4,
    marginBottom: spacing.xs,
  },
  rejectionText: {
    fontSize: 13,
    color: colors.ink,
  },
  emptyCard: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line_soft,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.ink_dim,
    textAlign: "center",
  },
  historyCard: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line_soft,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
  },
  historyItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line_soft,
    borderStyle: "dotted",
  },
  historyLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  historyIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bg_soft,
    borderWidth: 1,
    borderColor: colors.line_soft,
    alignItems: "center",
    justifyContent: "center",
  },
  historyIconText: {
    fontSize: 18,
    fontWeight: "500",
    color: colors.ink_dim,
  },
  historyName: {
    fontSize: 22,
    fontWeight: "500",
    color: colors.ink,
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 9,
    fontWeight: "500",
    color: colors.ink_dim,
    letterSpacing: 1.4,
  },
  historyRight: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  historyPrice: {
    fontSize: 22,
    fontWeight: "500",
    color: colors.ink,
  },
  historyPriceUnit: {
    fontSize: 12,
    fontWeight: "500",
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: "500",
    letterSpacing: 1.4,
  },
  endLabel: {
    fontSize: 9,
    fontWeight: "500",
    color: colors.ink_dim,
    letterSpacing: 2,
    textAlign: "center",
    marginTop: spacing.xl,
  },
});

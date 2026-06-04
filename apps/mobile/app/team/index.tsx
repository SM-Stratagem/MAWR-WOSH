import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { colors, spacing, borderRadius } from "../../constants/theme";
import { useTeamStore } from "../../lib/teamStore";
import { useTeamLocationTracker } from "../../lib/useTeamLocationTracker";
import { useEffect } from "react";
import { getUserFacingErrorMessage } from "../../lib/errors";

const STATUS_COLORS: Record<string, string> = {
  confirmed: colors.primary,
  team_assigned: colors.warning,
  on_the_way: colors.primary,
  arrived: colors.success,
  washing_in_progress: colors.warning,
  completed: colors.success,
  canceled: colors.danger,
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  team_assigned: "Assigned",
  on_the_way: "On the Way",
  arrived: "Arrived",
  washing_in_progress: "Washing",
  completed: "Completed",
  canceled: "Canceled",
};

export default function TeamIndexScreen() {
  const router = useRouter();
  const { session, clearTeamSession } = useTeamStore();
  const isSessionValid = useTeamStore((s) => s.isSessionValid);
  const logout = useMutation(api.teamAuth.logout);
  const setAvailability = useMutation(api.teams.teamSetAvailability);

  const hasValidSession = session?.sessionId && isSessionValid();

  useEffect(() => {
    if (!hasValidSession) {
      router.replace("/team/login");
    }
  }, [hasValidSession]);

  const bookings = useQuery(
    api.bookings.teamListMyBookings,
    hasValidSession ? { sessionId: session!.sessionId } : "skip"
  );

  const teamProfile = useQuery(
    api.teams.teamGetProfile,
    hasValidSession ? { sessionId: session!.sessionId } : "skip"
  );

  useTeamLocationTracker(
    session?.sessionId,
    Boolean(hasValidSession && teamProfile && teamProfile.status !== "offline")
  );

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            if (session?.sessionId) {
              await logout({ sessionId: session.sessionId });
            }
            clearTeamSession();
          },
        },
      ]
    );
  };

  const handleToggleAvailability = async () => {
    if (!teamProfile || !session?.sessionId) return;

    const newStatus = teamProfile.status === "available" ? "offline" : "available";
    const actionText = newStatus === "offline" ? "go offline" : "go online";

    Alert.alert(
      "Change Status",
      `Are you sure you want to ${actionText}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await setAvailability({
                sessionId: session.sessionId,
                status: newStatus,
              });
            } catch (error: any) {
              Alert.alert("Could not update status", getUserFacingErrorMessage(error, "Failed to update status. Please try again."));
            }
          },
        },
      ]
    );
  };

  if (bookings === undefined || teamProfile === undefined) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Team Dashboard</Text>
          <Text style={styles.name}>{session?.teamName || "Team Member"}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.statusToggle,
              teamProfile?.status === "available" ? styles.statusAvailable : styles.statusOffline,
            ]}
            onPress={handleToggleAvailability}
          >
            <View style={[
              styles.statusDot,
              teamProfile?.status === "available" ? styles.statusDotAvailable : styles.statusDotOffline,
            ]} />
            <Text style={[
              styles.statusToggleText,
              teamProfile?.status === "available" ? styles.statusToggleTextAvailable : styles.statusToggleTextOffline,
            ]}>
              {teamProfile?.status === "available" ? "ONLINE" : "OFFLINE"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Assigned Bookings ({bookings.length})</Text>

        <FlatList
          data={bookings}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.bookingCard}
              onPress={() => router.push(`/team/${item._id}` as any)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.bookingNumber}>{item.bookingNumber}</Text>
                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[item.status] || colors.text_secondary) + "20" }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] || colors.text_secondary }]}>
                    {STATUS_LABELS[item.status] || item.status}
                  </Text>
                </View>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Customer</Text>
                  <Text style={styles.value}>{item.customer?.name || "N/A"}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Location</Text>
                  <Text style={[styles.value, styles.addressText]} numberOfLines={1}>
                    {item.address?.formattedAddress || "N/A"}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Wash Type</Text>
                  <Text style={styles.value}>{item.washType?.name || "N/A"}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Cars</Text>
                  <Text style={styles.value}>{item.selectedCarCount}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Total</Text>
                  <Text style={styles.priceValue}>{item.total} {item.currency}</Text>
                </View>
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.viewDetails}>Tap to view details →</Text>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No Active Bookings</Text>
              <Text style={styles.emptySubtitle}>You don't have any bookings assigned to your team yet.</Text>
            </View>
          )}
        />
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
  greeting: {
    fontSize: 14,
    color: colors.text_secondary,
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text_primary,
  },
  logoutButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface_container_high,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.danger,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text_primary,
    marginBottom: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  bookingCard: {
    backgroundColor: colors.surface_container_low,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  bookingNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text_primary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardBody: {
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 14,
    color: colors.text_secondary,
  },
  value: {
    fontSize: 14,
    color: colors.text_primary,
    fontWeight: "500",
    maxWidth: "60%",
    textAlign: "right",
  },
  addressText: {
    maxWidth: "60%",
  },
  priceValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
  cardFooter: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surface_container_high,
  },
  viewDetails: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "500",
    textAlign: "center",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text_primary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.text_secondary,
    textAlign: "center",
    lineHeight: 24,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  statusToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    gap: spacing.xs,
  },
  statusAvailable: {
    backgroundColor: colors.success + "20",
    borderColor: colors.success,
  },
  statusOffline: {
    backgroundColor: colors.surface_container_high,
    borderColor: colors.text_secondary,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotAvailable: {
    backgroundColor: colors.success,
  },
  statusDotOffline: {
    backgroundColor: colors.text_secondary,
  },
  statusToggleText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  statusToggleTextAvailable: {
    color: colors.success,
  },
  statusToggleTextOffline: {
    color: colors.text_secondary,
  },
});

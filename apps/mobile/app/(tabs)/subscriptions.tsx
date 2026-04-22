import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { colors, spacing, borderRadius } from "../../constants/theme";

interface SubscriptionCardProps {
  subscription: any;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

function SubscriptionCard({ subscription, onPause, onResume, onCancel }: SubscriptionCardProps) {
  const isActive = subscription.status === "active";
  const isPaused = subscription.status === "paused";
  const isCanceled = subscription.status === "canceled";

  const nextRunDate = subscription.nextRunAt
    ? new Date(subscription.nextRunAt).toLocaleDateString("en-AE", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.washTypeInfo}>
          <Ionicons name="water" size={24} color={colors.primary} />
          <View style={styles.washTypeText}>
            <Text style={styles.washTypeName}>{subscription.washType?.name || "Wash Service"}</Text>
            <Text style={styles.frequency}>
              {subscription.frequency === "weekly" && "Weekly"}
              {subscription.frequency === "biweekly" && "Bi-weekly"}
              {subscription.frequency === "monthly" && "Monthly"}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            isActive && styles.statusActive,
            isPaused && styles.statusPaused,
            isCanceled && styles.statusCanceled,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              isActive && styles.statusTextActive,
              isPaused && styles.statusTextPaused,
              isCanceled && styles.statusTextCanceled,
            ]}
          >
            {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
          </Text>
        </View>
      </View>

      {nextRunDate && isActive && (
        <View style={styles.nextRunRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.text_secondary} />
          <Text style={styles.nextRunText}>Next run: {nextRunDate}</Text>
        </View>
      )}

      <View style={styles.carCountRow}>
        <Ionicons name="car" size={16} color={colors.text_secondary} />
        <Text style={styles.carCountText}>
          {subscription.selectedCarIds?.length || 0} car(s) covered
        </Text>
      </View>

      <View style={styles.cardActions}>
        {isActive && (
          <TouchableOpacity style={styles.pauseButton} onPress={onPause}>
            <Ionicons name="pause-circle-outline" size={20} color={colors.warning} />
            <Text style={styles.pauseButtonText}>Pause</Text>
          </TouchableOpacity>
        )}

        {isPaused && (
          <TouchableOpacity style={styles.resumeButton} onPress={onResume}>
            <Ionicons name="play-circle-outline" size={20} color={colors.success} />
            <Text style={styles.resumeButtonText}>Resume</Text>
          </TouchableOpacity>
        )}

        {!isCanceled && (
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function SubscriptionsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const subscriptions = useQuery("subscriptions:listMySubscriptions" as any) || [];

  const pauseSubscription = useMutation("subscriptions:pauseSubscription" as any);
  const resumeSubscription = useMutation("subscriptions:adminUpdateSubscription" as any);
  const cancelSubscription = useMutation("subscriptions:cancelSubscription" as any);

  const handlePause = async (subscriptionId: string) => {
    Alert.alert(
      "Pause Subscription",
      "Are you sure you want to pause this subscription? You won't be charged until you resume it.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Pause",
          style: "destructive",
          onPress: async () => {
            try {
              await pauseSubscription({ subscriptionId: subscriptionId as any });
              Alert.alert("Success", "Subscription paused");
            } catch (error: any) {
              Alert.alert("Error", error.message);
            }
          },
        },
      ]
    );
  };

  const handleResume = async (subscriptionId: string) => {
    try {
      await resumeSubscription({
        subscriptionId: subscriptionId as any,
        status: "active",
      });
      Alert.alert("Success", "Subscription resumed");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const handleCancel = async (subscriptionId: string) => {
    Alert.alert(
      "Cancel Subscription",
      "Are you sure you want to cancel this subscription? This cannot be undone.",
      [
        { text: "Don't Cancel", style: "cancel" },
        {
          text: "Cancel Subscription",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelSubscription({ subscriptionId: subscriptionId as any });
              Alert.alert("Success", "Subscription canceled");
            } catch (error: any) {
              Alert.alert("Error", error.message);
            }
          },
        },
      ]
    );
  };

  const activeSubscriptions = subscriptions.filter((s: any) => s.status === "active" || s.status === "paused");
  const canceledSubscriptions = subscriptions.filter((s: any) => s.status === "canceled");

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Subscriptions</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {subscriptions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="repeat" size={64} color={colors.surface_container_high} />
            <Text style={styles.emptyTitle}>No Subscriptions Yet</Text>
            <Text style={styles.emptyText}>
              Subscribe to a wash service to get 15% off every wash with automatic
              recurring bookings.
            </Text>
            <TouchableOpacity
              style={styles.subscribeButton}
              onPress={() => router.push("/")}
            >
              <Text style={styles.subscribeButtonText}>Book a Wash</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {activeSubscriptions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Active Subscriptions</Text>
                {activeSubscriptions.map((subscription: any) => (
                  <SubscriptionCard
                    key={subscription._id}
                    subscription={subscription}
                    onPause={() => handlePause(subscription._id)}
                    onResume={() => handleResume(subscription._id)}
                    onCancel={() => handleCancel(subscription._id)}
                  />
                ))}
              </View>
            )}

            {canceledSubscriptions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Canceled</Text>
                {canceledSubscriptions.map((subscription: any) => (
                  <View key={subscription._id} style={[styles.card, styles.cardCanceled]}>
                    <View style={styles.cardHeader}>
                      <View style={styles.washTypeInfo}>
                        <Ionicons name="water" size={24} color={colors.text_secondary} />
                        <View style={styles.washTypeText}>
                          <Text style={[styles.washTypeName, styles.textCanceled]}>
                            {subscription.washType?.name || "Wash Service"}
                          </Text>
                          <Text style={styles.canceledDate}>
                            Canceled on{" "}
                            {new Date(subscription.updatedAt).toLocaleDateString("en-AE", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.resubscribeButton}
                      onPress={() => router.push("/")}
                    >
                      <Text style={styles.resubscribeText}>Resubscribe</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
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
    fontSize: 24,
    fontWeight: "700",
    color: colors.text_primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text_secondary,
    textTransform: "uppercase",
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardCanceled: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  washTypeInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  washTypeText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  washTypeName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text_primary,
  },
  frequency: {
    fontSize: 14,
    color: colors.text_secondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusActive: {
    backgroundColor: colors.success + "20",
  },
  statusPaused: {
    backgroundColor: colors.warning + "20",
  },
  statusCanceled: {
    backgroundColor: colors.danger + "20",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextPaused: {
    color: colors.warning,
  },
  statusTextCanceled: {
    color: colors.danger,
  },
  nextRunRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  nextRunText: {
    fontSize: 14,
    color: colors.text_secondary,
    marginLeft: spacing.xs,
  },
  carCountRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  carCountText: {
    fontSize: 14,
    color: colors.text_secondary,
    marginLeft: spacing.xs,
  },
  cardActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.surface_container_high,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  pauseButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.warning + "10",
    marginRight: spacing.sm,
  },
  pauseButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.warning,
    marginLeft: spacing.xs,
  },
  resumeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.success + "10",
    marginRight: spacing.sm,
  },
  resumeButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.success,
    marginLeft: spacing.xs,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.danger + "10",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.danger,
    marginLeft: spacing.xs,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text_primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text_secondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  subscribeButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
  },
  subscribeButtonText: {
    color: colors.on_primary,
    fontSize: 16,
    fontWeight: "600",
  },
  textCanceled: {
    color: colors.text_secondary,
  },
  canceledDate: {
    fontSize: 14,
    color: colors.text_secondary,
    marginTop: 2,
  },
  resubscribeButton: {
    backgroundColor: colors.primary + "20",
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: "center",
    marginTop: spacing.md,
  },
  resubscribeText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
});
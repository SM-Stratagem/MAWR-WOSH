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
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { colors, spacing, borderRadius } from "../../constants/theme";

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "WEEK",
  biweekly: "2 WEEKS",
  monthly: "MONTH",
};

export default function SubscriptionsScreen() {
  const router = useRouter();
  const subscriptions = useQuery(api.subscriptions.listMySubscriptions) || [];
  const currencySetting = useQuery(api.settings.getPublic, { key: "currency" });
  const currency = currencySetting ?? "AED";
  const pauseSubscription = useMutation(api.subscriptions.pauseSubscription);
  const resumeSubscription = useMutation(api.subscriptions.resumeMySubscription);
  const cancelSubscription = useMutation(api.subscriptions.cancelSubscription);

  const activePlan = subscriptions.find((s: any) => s.status === "active");
  const otherSubs = subscriptions.filter((s: any) => s !== activePlan);

  const handlePause = async (id: string) => {
    Alert.alert("Pause Subscription", "Pause this subscription?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Pause",
        style: "destructive",
        onPress: async () => {
          try {
            await pauseSubscription({ subscriptionId: id as any });
          } catch (e: any) {
            Alert.alert("Error", e.message);
          }
        },
      },
    ]);
  };

  const handleResume = async (id: string) => {
    try {
      await resumeSubscription({ subscriptionId: id as any });
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handleCancel = async (id: string) => {
    Alert.alert("Cancel Subscription", "This cannot be undone.", [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelSubscription({ subscriptionId: id as any });
          } catch (e: any) {
            Alert.alert("Error", e.message);
          }
        },
      },
    ]);
  };

  const nextBillingDate = activePlan?.nextRunAt
    ? new Date(activePlan.nextRunAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).toUpperCase()
    : null;

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.brand}>WOSH</Text>
        <Text style={styles.sectionLabel}>MY PLAN</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          {activePlan && (
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>ACTIVE</Text>
            </View>
          )}
          <Text style={styles.planName}>
            {activePlan?.washType?.name?.toUpperCase() || "NO PLAN"}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceValue}>
              {activePlan?.pricePerRun || 0}
            </Text>
            <Text style={styles.priceUnit}> {currency} / {activePlan ? (FREQUENCY_LABELS[activePlan.frequency] || "PLAN") : "PLAN"}</Text>
          </View>
        </View>

        <View style={styles.dottedDivider} />

        {/* Section 01: Benefits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SECTION 01: BENEFITS</Text>
          <View style={styles.benefitsList}>
            {["Weekly wash", "Priority booking", "Interior detail"].map((benefit, i) => (
              <View key={i} style={styles.benefitRow}>
                <View style={styles.benefitLeft}>
                  <Text style={styles.benefitIndex}>{String(i + 1).padStart(2, "0")}</Text>
                  <Text style={styles.benefitText}>{benefit.toUpperCase()}</Text>
                </View>
                <Text style={styles.checkmark}>✓</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Section 02: Payment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SECTION 02: PAYMENT</Text>
          <View style={styles.paymentCard}>
            <View style={styles.cardInfo}>
              <View style={styles.cardIcon}>
                <View style={styles.cardDot} />
                <View style={styles.cardDot} />
              </View>
              <View>
                <Text style={styles.paymentLabel}>PRIMARY METHOD</Text>
                <Text style={styles.cardNumber}>•••• ****</Text>
              </View>
            </View>
            <Text style={styles.editLink}>EDIT</Text>
          </View>
        </View>

        {/* Manage */}
        <TouchableOpacity
          style={styles.manageButton}
          onPress={() =>
            activePlan
              ? handleCancel(activePlan._id)
              : router.push("/subscribe" as any)
          }
        >
          <Text style={styles.manageButtonText}>
            {activePlan ? "CANCEL PLAN" : "START SUBSCRIPTION"}
          </Text>
        </TouchableOpacity>

        {nextBillingDate && (
          <Text style={styles.billingNote}>
            Your next billing cycle starts on {nextBillingDate}. Cancel anytime through the app.
          </Text>
        )}

        {/* Other subscriptions */}
        {otherSubs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>OTHER SUBSCRIPTIONS</Text>
            {otherSubs.map((sub: any) => (
              <View key={sub._id} style={styles.subCard}>
                <View style={styles.subHeader}>
                  <Text style={styles.subName}>{sub.washType?.name || "Wash"}</Text>
                  <View style={[styles.statusPill, { borderColor: sub.status === "active" ? colors.good : colors.warn }]}>
                    <Text style={[styles.statusPillText, { color: sub.status === "active" ? colors.good : colors.warn }]}>
                      {sub.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.subFrequency}>
                  {(FREQUENCY_LABELS[sub.frequency] || sub.frequency).toUpperCase()} · {sub.pricePerRun || 0} {currency} / RUN
                </Text>
                <View style={styles.subActions}>
                  {sub.status === "active" && (
                    <TouchableOpacity onPress={() => handlePause(sub._id)}>
                      <Text style={styles.actionLink}>PAUSE</Text>
                    </TouchableOpacity>
                  )}
                  {sub.status === "paused" && (
                    <TouchableOpacity onPress={() => handleResume(sub._id)}>
                      <Text style={styles.actionLink}>RESUME</Text>
                    </TouchableOpacity>
                  )}
                  {sub.status !== "canceled" && (
                    <TouchableOpacity onPress={() => handleCancel(sub._id)}>
                      <Text style={[styles.actionLink, { color: colors.hot }]}>CANCEL</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Empty state */}
        {subscriptions.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>NO ACTIVE PLAN</Text>
            <Text style={styles.emptySubtext}>Subscribe to save on regular washes.</Text>
            <TouchableOpacity style={styles.exploreButton} onPress={() => router.push("/subscribe" as any)}>
              <Text style={styles.exploreButtonText}>START SUBSCRIPTION</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
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
    paddingTop: spacing.xl,
  },
  hero: {
    marginBottom: spacing.lg,
  },
  activePill: {
    alignSelf: "flex-start",
    backgroundColor: colors.bg_soft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.ink_soft,
    letterSpacing: 1.4,
  },
  planName: {
    fontSize: 42,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -1,
    lineHeight: 44,
    marginBottom: spacing.xs,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  priceValue: {
    fontSize: 120,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -3,
    lineHeight: 108,
  },
  priceUnit: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.ink_dim,
    letterSpacing: 1.4,
  },
  dottedDivider: {
    height: 1,
    borderTopWidth: 1,
    borderTopColor: colors.line_soft,
    borderStyle: "dotted",
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.ink_soft,
    letterSpacing: 1.4,
    marginBottom: spacing.lg,
  },
  benefitsList: {
    gap: spacing.md,
  },
  benefitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.line_soft,
    paddingBottom: spacing.md,
  },
  benefitLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  benefitIndex: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.ink_dim,
    letterSpacing: 1.4,
  },
  benefitText: {
    fontSize: 22,
    fontWeight: "500",
    color: colors.ink,
  },
  checkmark: {
    fontSize: 18,
    color: colors.accent,
    fontWeight: "700",
  },
  paymentCard: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  cardIcon: {
    width: 48,
    height: 32,
    backgroundColor: colors.ink,
    borderRadius: borderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  cardDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.hot,
    opacity: 0.8,
  },
  paymentLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.ink_soft,
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  cardNumber: {
    fontSize: 22,
    fontWeight: "500",
    color: colors.ink,
    letterSpacing: 2,
  },
  editLink: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 1.4,
  },
  manageButton: {
    backgroundColor: colors.ink,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.full,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  manageButtonText: {
    fontSize: 22,
    fontWeight: "500",
    color: colors.on_ink,
    letterSpacing: -0.3,
  },
  billingNote: {
    fontSize: 13,
    color: colors.ink_dim,
    textAlign: "center",
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  subCard: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line_soft,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  subHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  subName: {
    fontSize: 22,
    fontWeight: "500",
    color: colors.ink,
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
  subFrequency: {
    fontSize: 13,
    color: colors.ink_soft,
    marginBottom: spacing.md,
  },
  subActions: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  actionLink: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 1.4,
  },
  emptyCard: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line_soft,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.ink_dim,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  exploreButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  exploreButtonText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.on_accent,
    letterSpacing: 1.4,
  },
});

import { useRouter } from "expo-router";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { colors, spacing, borderRadius } from "../../constants/theme";

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "WEEKLY",
  biweekly: "BIWEEKLY",
  monthly: "MONTHLY",
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useAuth();

  const subscriptions = useQuery(api.subscriptions.listMySubscriptions) || [];
  const addresses = useQuery(api.addresses.listMyAddresses) || [];
  const activePlan = subscriptions.find((sub: any) => sub.status === "active");

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/welcome");
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.brand}>WOSH</Text>
        <Text style={styles.sectionLabel}>PROFILE</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 01 PROFILE */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIndex}>01 PROFILE</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.userName}>{(user?.fullName || "USER").toUpperCase()}</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>EMAIL</Text>
              <Text style={styles.infoValue}>{user?.emailAddresses[0]?.emailAddress}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>PHONE</Text>
              <Text style={styles.infoValue}>{user?.phoneNumbers[0]?.phoneNumber || "—"}</Text>
            </View>
          </View>
        </View>

        {/* 02 ADDRESSES */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIndex}>02 ADDRESSES</Text>
            <TouchableOpacity onPress={() => router.push("/location")}>
              <Text style={styles.addLink}>+ ADD</Text>
            </TouchableOpacity>
          </View>
          {addresses.length === 0 ? (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push("/location")}
            >
              <Text style={styles.emptyText}>No addresses saved</Text>
              <Text style={styles.emptySubtext}>Add your first location</Text>
            </TouchableOpacity>
          ) : (
            addresses.map((addr: any) => (
              <TouchableOpacity
                key={addr._id}
                style={styles.addressRow}
                onPress={() => router.push("/location")}
              >
                <View style={styles.addressIcon}>
                  <Text style={styles.addressIconText}>{addr.isDefault ? "H" : "W"}</Text>
                </View>
                <View style={styles.addressInfo}>
                  <Text style={styles.addressName}>
                    {addr.label?.toUpperCase() || "ADDRESS"}
                  </Text>
                  <Text style={styles.addressDetail} numberOfLines={1}>
                    {addr.formattedAddress}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* 03 ACTIVE PLAN */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIndex}>03 ACTIVE PLAN</Text>
            {activePlan && <Text style={styles.activeLabel}>ACTIVE</Text>}
          </View>
          {activePlan ? (
            <View style={styles.planCard}>
              <Text style={styles.planLevel}>MEMBERSHIP LEVEL</Text>
              <Text style={styles.planName}>
                {activePlan.washType?.name?.toUpperCase() || "STANDARD"}
              </Text>
            <View style={styles.planPriceRow}>
                <Text style={styles.planPrice}>{activePlan.pricePerRun || 0}</Text>
                <Text style={styles.planPriceUnit}> AED / {FREQUENCY_LABELS[activePlan.frequency] || "PLAN"}</Text>
              </View>
              <TouchableOpacity
                style={styles.manageButton}
                onPress={() => router.push("/(tabs)/subscriptions")}
              >
                <Text style={styles.manageButtonText}>MANAGE SUBSCRIPTION</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push("/(tabs)/subscriptions")}
            >
              <Text style={styles.emptyText}>No active plan</Text>
              <Text style={styles.emptySubtext}>Explore subscription options</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 04 & 05 Grid */}
        <View style={styles.gridRow}>
          <View style={styles.gridSection}>
            <Text style={styles.sectionIndex}>04 HISTORY</Text>
            <TouchableOpacity
              style={styles.gridCard}
              onPress={() => router.push("/(tabs)/bookings")}
            >
              <Text style={styles.gridCardIcon}>B</Text>
              <View style={styles.gridCardFooter}>
                <Text style={styles.gridCardLabel}>VIEW ALL{"\n"}ORDERS</Text>
                <Text style={styles.gridCardArrow}>→</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.gridSection}>
            <Text style={styles.sectionIndex}>05 LEGAL</Text>
            <View style={styles.gridCard}>
              <TouchableOpacity onPress={() => router.push("/privacy-policy" as any)}>
                <Text style={styles.legalLink}>PRIVACY POLICY</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push("/terms-of-use" as any)}>
                <Text style={styles.legalLink}>TERMS OF SERVICE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 06 ACCOUNT */}
        <View style={styles.section}>
          <Text style={styles.sectionIndex}>06 ACCOUNT</Text>
          <View style={styles.accountActions}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => router.push("/delete-account" as any)}
            >
              <Text style={styles.deleteButtonText}>DELETE ACCOUNT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
              <Text style={styles.logoutButtonText}>LOGOUT</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
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
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.ink,
    paddingBottom: spacing.xs,
    marginBottom: spacing.md,
  },
  sectionIndex: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.ink_dim,
    letterSpacing: 1.4,
    marginBottom: spacing.md,
  },
  addLink: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 1.4,
  },
  activeLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.good,
    letterSpacing: 1.4,
  },
  card: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line_soft,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  userName: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line_soft,
    borderStyle: "dotted",
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.ink_dim,
    letterSpacing: 1.4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.ink,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line_soft,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  addressIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bg_soft,
    alignItems: "center",
    justifyContent: "center",
  },
  addressIconText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.ink_dim,
  },
  addressInfo: {
    flex: 1,
  },
  addressName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  addressDetail: {
    fontSize: 13,
    color: colors.ink_soft,
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: colors.ink_dim,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.ink_dim,
    marginTop: 2,
  },
  planCard: {
    backgroundColor: colors.ink,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    overflow: "hidden",
  },
  planLevel: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.ink_dim,
    letterSpacing: 1.4,
    marginBottom: spacing.xs,
  },
  planName: {
    fontSize: 42,
    fontWeight: "700",
    color: colors.paper,
    letterSpacing: -1,
    lineHeight: 44,
    marginBottom: spacing.md,
  },
  planPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: spacing.lg,
  },
  planPrice: {
    fontSize: 48,
    fontWeight: "700",
    color: colors.paper,
    letterSpacing: -1.5,
  },
  planPriceUnit: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.ink_dim,
    letterSpacing: 1.4,
  },
  manageButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: "center",
  },
  manageButtonText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.on_accent,
    letterSpacing: 1.4,
  },
  gridRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  gridSection: {
    flex: 1,
  },
  gridCard: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line_soft,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    aspectRatio: 1,
    justifyContent: "space-between",
  },
  gridCardIcon: {
    fontSize: 32,
    fontWeight: "500",
    color: colors.ink,
  },
  gridCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  gridCardLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: 1.4,
    lineHeight: 14,
  },
  gridCardArrow: {
    fontSize: 18,
    color: colors.ink,
  },
  legalLink: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.ink,
    letterSpacing: 1.4,
    textDecorationLine: "underline",
    marginBottom: spacing.md,
  },
  accountActions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  deleteButton: {
    borderWidth: 1.5,
    borderColor: colors.hot,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  deleteButtonText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.hot,
    letterSpacing: 1.4,
  },
  logoutButton: {
    backgroundColor: colors.ink,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  logoutButtonText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.on_ink,
    letterSpacing: 1.4,
  },
  teamLink: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  teamLinkText: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.ink_dim,
    letterSpacing: 2,
  },
  footer: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  footerText: {
    fontSize: 9,
    fontWeight: "500",
    color: "rgba(152,160,166,0.3)",
    letterSpacing: 2,
  },
});

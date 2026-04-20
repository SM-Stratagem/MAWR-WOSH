import { useRouter } from "expo-router";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { colors, spacing, borderRadius } from "../../constants/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useAuth();

  const subscriptions = useQuery("subscriptions:listMySubscriptions" as any) || [];
  const addresses = useQuery("addresses:listMyAddresses" as any) || [];
  const cars = useQuery("cars:listMyCars" as any) || [];

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
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress?.[0] || "U"}
            </Text>
          </View>
          <Text style={styles.name}>
            {user?.fullName || "User"}
          </Text>
          <Text style={styles.email}>
            {user?.emailAddresses[0]?.emailAddress}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{cars.length}</Text>
            <Text style={styles.statLabel}>Cars</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{addresses.length}</Text>
            <Text style={styles.statLabel}>Addresses</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{subscriptions.length}</Text>
            <Text style={styles.statLabel}>Subscriptions</Text>
          </View>
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/(tabs)/cars")}
          >
            <Text style={styles.menuText}>My Cars</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/location")}
          >
            <Text style={styles.menuText}>Saved Addresses</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/(tabs)/bookings")}
          >
            <Text style={styles.menuText}>Booking History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/(tabs)/bookings")}
          >
            <Text style={styles.menuText}>Active Subscriptions</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
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
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.text_primary,
  },
  name: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text_primary,
  },
  email: {
    fontSize: 14,
    color: colors.text_secondary,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text_secondary,
    marginTop: 4,
  },
  menuSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  menuItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  menuText: {
    fontSize: 16,
    color: colors.text_primary,
  },
  signOutButton: {
    backgroundColor: colors.danger + "20",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: "auto",
    marginBottom: spacing.xl,
  },
  signOutText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: "600",
  },
});

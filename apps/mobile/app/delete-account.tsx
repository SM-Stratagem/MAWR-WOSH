import { useRouter } from "expo-router";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing } from "../constants/theme";
import { useState } from "react";
import { getUserFacingErrorMessage } from "../lib/errors";

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const deleteMyAccount = useMutation(api.users.deleteMyAccount);
  const [loading, setLoading] = useState(false);

  const performDelete = async () => {
    setLoading(true);
    try {
      await deleteMyAccount({});
      await signOut();
      router.replace("/welcome");
    } catch (error: any) {
      Alert.alert(
        "Couldn't delete account",
        getUserFacingErrorMessage(error, "Please try again."),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete account?",
      "This permanently deletes your account, cars, addresses, and cancels any active subscriptions. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void performDelete();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Delete Account</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.warningCard}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningTitle}>This action cannot be undone</Text>
          <Text style={styles.warningText}>
            Deleting your account will permanently remove all your data, including:
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What will be deleted:</Text>
          <Text style={styles.bullet}>• Your profile information</Text>
          <Text style={styles.bullet}>• All saved vehicles</Text>
          <Text style={styles.bullet}>• All saved addresses</Text>
          <Text style={styles.bullet}>• Booking history</Text>
          <Text style={styles.bullet}>• Subscription plans</Text>
          <Text style={styles.bullet}>• Push notification preferences</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What will be retained:</Text>
          <Text style={styles.bullet}>• Anonymized booking records (no personal data)</Text>
          <Text style={styles.bullet}>• Financial records for tax compliance (as required by law)</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How to delete your account:</Text>
          <Text style={styles.paragraph}>
            1. Tap the button below to initiate account deletion{'\n'}
            2. Confirm your decision when prompted{'\n'}
            3. You will be signed out immediately{'\n'}
            4. Your data will be permanently deleted within 30 days
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alternative options:</Text>
          <Text style={styles.paragraph}>
            If you&apos;re experiencing issues with our service, consider:
          </Text>
          <Text style={styles.bullet}>• Contacting our support team at support@wosh.ae</Text>
          <Text style={styles.bullet}>• Pausing your subscription instead of deleting</Text>
          <Text style={styles.bullet}>• Updating your profile information</Text>
        </View>

        <TouchableOpacity
          style={[styles.deleteButton, loading && styles.deleteButtonDisabled]}
          onPress={handleDeleteAccount}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.on_primary} />
          ) : (
            <Text style={styles.deleteButtonText}>Delete My Account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <View style={styles.spacer} />
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "500",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text_primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  warningCard: {
    backgroundColor: colors.danger + "20",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: "center",
  },
  warningIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.danger,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: colors.text_secondary,
    textAlign: "center",
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text_primary,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    color: colors.text_secondary,
    lineHeight: 22,
  },
  bullet: {
    fontSize: 14,
    color: colors.text_secondary,
    lineHeight: 22,
    marginLeft: 16,
    marginBottom: 4,
  },
  deleteButton: {
    backgroundColor: colors.danger,
    paddingVertical: 16,
    borderRadius: 9999,
    alignItems: "center",
    marginBottom: 12,
  },
  deleteButtonDisabled: {
    opacity: 0.7,
  },
  deleteButtonText: {
    color: colors.on_primary,
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "500",
  },
  spacer: {
    height: 40,
  },
});

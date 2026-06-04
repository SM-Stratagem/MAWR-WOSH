import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing, borderRadius } from "../constants/theme";
import { getUserFacingErrorMessage } from "../lib/errors";

const FREQUENCIES = [
  { key: "weekly", label: "WEEKLY", period: "Every week" },
  { key: "biweekly", label: "BI-WEEKLY", period: "Every 2 weeks" },
  { key: "monthly", label: "MONTHLY", period: "Every month" },
] as const;

const DISCOUNT_RATE = 0.15;

export default function SubscribeScreen() {
  const router = useRouter();
  const cars = useQuery(api.cars.listMyCars) || [];
  const addresses = useQuery(api.addresses.listMyAddresses) || [];
  const washTypes = useQuery(api.washTypes.listWashTypes) || [];
  const createSubscription = useMutation(api.subscriptions.createSubscription);

  const [selectedCars, setSelectedCars] = useState<string[]>([]);
  const [selectedWashId, setSelectedWashId] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<"weekly" | "biweekly" | "monthly">("weekly");
  const [submitting, setSubmitting] = useState(false);

  const defaultAddress =
    selectedAddressId ||
    (addresses.find((a: any) => a.isDefault)?._id ?? addresses[0]?._id);
  const wash = (washTypes as any[]).find((w: any) => w._id === selectedWashId);
  const carCount = selectedCars.length;
  const basePrice = wash ? wash.basePrice * carCount : 0;
  const pricePerRun = Math.round(basePrice * (1 - DISCOUNT_RATE));

  const canSubmit =
    !!wash && carCount > 0 && !!defaultAddress && !submitting;

  const toggleCar = (id: string) => {
    setSelectedCars((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const handleSubscribe = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await createSubscription({
        addressId: defaultAddress as any,
        washTypeId: wash._id,
        carIds: selectedCars as any[],
        frequency,
      });
      Alert.alert("Subscribed!", "Your subscription is now active.", [
        { text: "OK", onPress: () => router.replace("/(tabs)/subscriptions" as any) },
      ]);
    } catch (e: any) {
      Alert.alert("Could not create subscription", getUserFacingErrorMessage(e, "Failed to create subscription. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  if (cars.length === 0 || washTypes.length === 0 || addresses.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.title}>NEW SUBSCRIPTION</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionLabel}>SELECT WASH</Text>
        {(washTypes as any[])
          .filter((w: any) => w.isActive !== false)
          .map((w: any) => (
            <TouchableOpacity
              key={w._id}
              style={[
                styles.optionCard,
                selectedWashId === w._id && styles.optionCardSelected,
              ]}
              onPress={() => setSelectedWashId(w._id)}
            >
              <View>
                <Text style={styles.optionTitle}>{w.name?.toUpperCase()}</Text>
                <Text style={styles.optionDesc}>{w.description}</Text>
              </View>
              <Text style={styles.optionPrice}>{w.basePrice} AED</Text>
            </TouchableOpacity>
          ))}

        <Text style={styles.sectionLabel}>SELECT CARS</Text>
        {cars.map((c: any) => (
          <TouchableOpacity
            key={c._id}
            style={[
              styles.optionCard,
              selectedCars.includes(c._id) && styles.optionCardSelected,
            ]}
            onPress={() => toggleCar(c._id)}
          >
            <Text style={styles.optionTitle}>
              {c.make?.toUpperCase()} {c.model}
            </Text>
            <Text style={styles.optionDesc}>{c.plateNumber}</Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionLabel}>SELECT ADDRESS</Text>
        {addresses.map((a: any) => (
          <TouchableOpacity
            key={a._id}
            style={[
              styles.optionCard,
              (selectedAddressId || defaultAddress) === a._id &&
                styles.optionCardSelected,
            ]}
            onPress={() => setSelectedAddressId(a._id)}
          >
            <Text style={styles.optionDesc}>{a.formattedAddress}</Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionLabel}>FREQUENCY</Text>
        <View style={styles.freqRow}>
          {FREQUENCIES.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.freqChip,
                frequency === f.key && styles.freqChipSelected,
              ]}
              onPress={() => setFrequency(f.key)}
            >
              <Text
                style={[
                  styles.freqChipText,
                  frequency === f.key && styles.freqChipTextSelected,
                ]}
              >
                {f.label}
              </Text>
              <Text style={styles.freqPeriod}>{f.period}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {wash && carCount > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>PER RUN</Text>
            <View style={styles.summaryPriceRow}>
              <Text style={styles.summaryStrike}>{basePrice} AED</Text>
              <Text style={styles.summaryPrice}>{pricePerRun} AED</Text>
            </View>
            <Text style={styles.summaryHint}>Save 15% with a subscription.</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={handleSubscribe}
          disabled={!canSubmit}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? "CREATING..." : "START SUBSCRIPTION"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          You can pause, resume, or cancel anytime from the Subscriptions tab.
        </Text>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper || colors.background },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  loadingText: { color: colors.text_secondary, marginTop: spacing.md },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + 20,
    paddingBottom: spacing.md,
  },
  backLink: { fontSize: 12, fontWeight: "700", color: colors.accent, letterSpacing: 1.4 },
  title: { fontSize: 16, fontWeight: "700", color: colors.ink || colors.text_primary, letterSpacing: 1.4 },
  content: { flex: 1, paddingHorizontal: spacing.lg },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.ink_dim || colors.text_secondary,
    letterSpacing: 1.4,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  optionCard: {
    backgroundColor: colors.paper || colors.surface,
    borderWidth: 1,
    borderColor: colors.line_soft || colors.surface_container,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionCardSelected: {
    borderColor: colors.accent,
    backgroundColor: (colors.accent || "#000") + "10",
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink || colors.text_primary,
  },
  optionDesc: {
    fontSize: 13,
    color: colors.ink_soft || colors.text_secondary,
    marginTop: 2,
  },
  optionPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink || colors.text_primary,
  },
  freqRow: { flexDirection: "row", gap: spacing.sm },
  freqChip: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.line_soft || colors.surface_container,
    alignItems: "center",
  },
  freqChipSelected: {
    backgroundColor: colors.ink || colors.primary,
    borderColor: colors.ink || colors.primary,
  },
  freqChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink || colors.text_primary,
    letterSpacing: 1.4,
  },
  freqChipTextSelected: { color: colors.on_ink || colors.on_primary || "#fff" },
  freqPeriod: { fontSize: 10, color: colors.ink_dim || colors.text_secondary, marginTop: 4 },
  summaryCard: {
    marginTop: spacing.xl,
    backgroundColor: (colors.accent || "#1976ff") + "12",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 1.4,
  },
  summaryPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  summaryStrike: {
    fontSize: 14,
    color: colors.ink_dim || colors.text_secondary,
    textDecorationLine: "line-through",
  },
  summaryPrice: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.ink || colors.text_primary,
  },
  summaryHint: {
    fontSize: 12,
    color: colors.ink_dim || colors.text_secondary,
    marginTop: 4,
  },
  submitButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.accent,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.full,
    alignItems: "center",
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: {
    color: colors.on_accent || "#fff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  note: {
    fontSize: 12,
    color: colors.ink_dim || colors.text_secondary,
    textAlign: "center",
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
});

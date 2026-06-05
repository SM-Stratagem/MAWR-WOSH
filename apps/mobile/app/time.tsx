"use client";

import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { colors, spacing, borderRadius } from "../constants/theme";
import { useBookingStore } from "../lib/store";

const WINDOW_LABELS = {
  morning: "Morning (8 AM - 12 PM)",
  afternoon: "Afternoon (12 PM - 4 PM)",
  evening: "Evening (4 PM - 8 PM)",
};

const WINDOW_TIMES = {
  morning: "8:00",
  afternoon: "12:00",
  evening: "16:00",
};

export default function TimeScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<number>(Date.now());
  const [loading, setLoading] = useState(false);

  const { scheduledWindow, scheduledDate, setBookingData } = useBookingStore();

  const startOfDay = new Date(selectedDate);
  startOfDay.setHours(0, 0, 0, 0);

  const windows = useQuery(
    api.timeWindows.getAvailableWindows,
    { date: startOfDay.getTime() }
  ) as Record<string, { available: boolean; bookingsCount: number; label: string }> | undefined;

  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    date.setHours(0, 0, 0, 0);
    return date;
  });

  const handleSelectWindow = (window: "morning" | "afternoon" | "evening") => {
    setBookingData({
      scheduledWindow: window,
      scheduledDate: selectedDate,
    });
  };

  const handleContinue = () => {
    if (!scheduledWindow) {
      return;
    }
    router.push("/summary");
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.getTime() === today.getTime()) return "Today";
    if (date.getTime() === tomorrow.getTime()) return "Tomorrow";

    return date.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
  };

  const isDateSelected = (date: Date) => {
    const d = new Date(selectedDate);
    d.setHours(0, 0, 0, 0);
    return date.getTime() === d.getTime();
  };

  const isWindowSelected = (window: "morning" | "afternoon" | "evening") => {
    return (
      scheduledWindow === window &&
      scheduledDate &&
      new Date(scheduledDate).setHours(0, 0, 0, 0) === new Date(selectedDate).setHours(0, 0, 0, 0)
    );
  };

  if (windows === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading availability...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Select Time</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Select Date</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dateScroll}
          contentContainerStyle={styles.dateScrollContent}
        >
          {dates.map((date, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.dateCard,
                isDateSelected(date) && styles.dateCardSelected,
              ]}
              onPress={() => setSelectedDate(date.getTime())}
            >
              <Text
                style={[
                  styles.dateDay,
                  isDateSelected(date) && styles.dateDaySelected,
                ]}
              >
                {date.toLocaleDateString("en-US", { weekday: "short" })}
              </Text>
              <Text
                style={[
                  styles.dateNum,
                  isDateSelected(date) && styles.dateNumSelected,
                ]}
              >
                {date.getDate()}
              </Text>
              <Text
                style={[
                  styles.dateMonth,
                  isDateSelected(date) && styles.dateMonthSelected,
                ]}
              >
                {date.toLocaleDateString("en-US", { month: "short" })}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Select Time Window</Text>
        <Text style={styles.sectionSubtitle}>
          {new Date(selectedDate).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </Text>

        <View style={styles.windowsContainer}>
          {(Object.keys(WINDOW_LABELS) as Array<keyof typeof WINDOW_LABELS>).map((window) => {
            const windowData = windows?.[window];
            const available = windowData?.available ?? true;
            const count = windowData?.bookingsCount ?? 0;

            return (
              <TouchableOpacity
                key={window}
                style={[
                  styles.windowCard,
                  isWindowSelected(window) ? styles.windowCardSelected : null,
                  !available ? styles.windowCardUnavailable : null,
                ]}
                onPress={() => available && handleSelectWindow(window)}
                disabled={!available}
              >
                <View style={styles.windowHeader}>
                  <Text
                    style={[
                      styles.windowTime,
                      isWindowSelected(window) ? styles.windowTimeSelected : null,
                    ]}
                  >
                    {WINDOW_TIMES[window]}
                  </Text>
                  {!available && (
                    <View style={styles.fullBadge}>
                      <Text style={styles.fullBadgeText}>FULL</Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.windowLabel,
                    isWindowSelected(window) ? styles.windowLabelSelected : null,
                  ]}
                >
                  {WINDOW_LABELS[window]}
                </Text>
                <Text style={styles.windowCount}>
                  {available
                    ? `${3 - count} slot${3 - count !== 1 ? "s" : ""} available`
                    : `${count} booking${count !== 1 ? "s" : ""}`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {scheduledWindow && (
          <View style={styles.selectionSummary}>
            <Text style={styles.selectionText}>
              Selected: {formatDate(new Date(selectedDate))} at{" "}
              {WINDOW_LABELS[scheduledWindow]}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !scheduledWindow && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!scheduledWindow}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: colors.text_secondary,
    fontSize: 16,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + 20,
    paddingBottom: spacing.md,
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
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text_primary,
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.text_secondary,
    marginBottom: spacing.md,
  },
  dateScroll: {
    marginBottom: spacing.xl,
  },
  dateScrollContent: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  dateCard: {
    width: 70,
    height: 90,
    backgroundColor: colors.surface_container_low,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  dateCardSelected: {
    backgroundColor: colors.primary + "20",
    borderColor: colors.primary,
  },
  dateDay: {
    fontSize: 12,
    color: colors.text_secondary,
    marginBottom: spacing.xs,
  },
  dateDaySelected: {
    color: colors.primary,
    fontWeight: "600",
  },
  dateNum: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text_primary,
    marginBottom: spacing.xs,
  },
  dateNumSelected: {
    color: colors.primary,
  },
  dateMonth: {
    fontSize: 12,
    color: colors.text_secondary,
  },
  dateMonthSelected: {
    color: colors.primary,
  },
  windowsContainer: {
    gap: spacing.md,
  },
  windowCard: {
    backgroundColor: colors.surface_container_low,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: "transparent",
  },
  windowCardSelected: {
    backgroundColor: colors.primary + "20",
    borderColor: colors.primary,
  },
  windowCardUnavailable: {
    opacity: 0.5,
  },
  windowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  windowTime: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text_primary,
  },
  windowTimeSelected: {
    color: colors.primary,
  },
  fullBadge: {
    backgroundColor: colors.danger + "20",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  fullBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.danger,
  },
  windowLabel: {
    fontSize: 16,
    color: colors.text_secondary,
    marginBottom: spacing.xs,
  },
  windowLabelSelected: {
    color: colors.primary,
  },
  windowCount: {
    fontSize: 14,
    color: colors.text_secondary,
  },
  selectionSummary: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.primary + "15",
    borderRadius: borderRadius.lg,
  },
  selectionText: {
    fontSize: 14,
    color: colors.primary,
    textAlign: "center",
    fontWeight: "500",
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.surface_container_high,
  },
  continueButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: "center",
  },
  continueButtonDisabled: {
    backgroundColor: colors.surface_container_high,
  },
  continueButtonText: {
    color: colors.on_primary,
    fontSize: 16,
    fontWeight: "600",
  },
});

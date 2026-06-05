import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Linking,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";
import MapView, { Marker } from "react-native-maps";
import { api } from "../convex/_generated/api";
import { colors, spacing, borderRadius, bookingStatuses } from "../constants/theme";

const STATUS_STEPS = [
  { key: "confirmed", label: "Confirmed" },
  { key: "team_assigned", label: "Team Assigned" },
  { key: "on_the_way", label: "On the Way" },
  { key: "arrived", label: "Arrived" },
  { key: "washing_in_progress", label: "Washing" },
  { key: "completed", label: "Completed" },
];

export default function TrackingScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams();

  const booking = useQuery(
    api.bookings.getMyBookingDetail,
    bookingId ? { bookingId: bookingId as any } : "skip"
  );

  const liveTracking = useQuery(
    api.bookings.getLiveTracking,
    bookingId ? { bookingId: bookingId as any } : "skip"
  );

  if (booking === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (booking === null) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: colors.text_secondary }}>Booking not found</Text>
      </View>
    );
  }

  const statusIndex = STATUS_STEPS.findIndex((s) => s.key === booking.status);
  const isCompleted = booking.status === "completed";
  const isCanceled = booking.status === "canceled";
  const isRejected = booking.status === "rejected";
  const isBooked = booking.status === "booked";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Track Booking</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.bookingCard}>
          <Text style={styles.bookingNumber}>{booking.bookingNumber}</Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  bookingStatuses[booking.status as keyof typeof bookingStatuses]
                    ?.color + "20",
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    bookingStatuses[booking.status as keyof typeof bookingStatuses]
                      ?.color,
                },
              ]}
            >
              {bookingStatuses[booking.status as keyof typeof bookingStatuses]?.label ||
                booking.status}
            </Text>
          </View>
        </View>

        {!isCanceled && !isCompleted && !isRejected && !isBooked && liveTracking && (
          <LiveTrackingMap data={liveTracking} />
        )}

        {!isCanceled && !isCompleted && !isRejected && !isBooked && (
          <View style={styles.timeline}>
            <Text style={styles.sectionTitle}>Status</Text>
            {STATUS_STEPS.map((step, index) => {
              const isActive = index <= statusIndex;
              const isCurrent = index === statusIndex;

              return (
                <View key={step.key} style={styles.timelineItem}>
                  <View
                    style={[
                      styles.timelineDot,
                      isActive && styles.timelineDotActive,
                      isCurrent && styles.timelineDotCurrent,
                    ]}
                  >
                    {isActive && (
                      <View style={styles.timelineDotInner} />
                    )}
                  </View>
                  {index < STATUS_STEPS.length - 1 && (
                    <View
                      style={[
                        styles.timelineLine,
                        isActive && styles.timelineLineActive,
                      ]}
                    />
                  )}
                  <Text
                    style={[
                      styles.timelineLabel,
                      isActive && styles.timelineLabelActive,
                      isCurrent && styles.timelineLabelCurrent,
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {isBooked && (
          <View style={styles.pendingCard}>
            <Text style={styles.pendingTitle}>Booking Received</Text>
            <Text style={styles.pendingText}>
              Your booking has been received and will move to dispatch once the team is ready.
            </Text>
          </View>
        )}

        {isRejected && (
          <View style={styles.rejectedCard}>
            <Text style={styles.rejectedTitle}>Booking Rejected</Text>
            {booking.rejectionReason ? (
              <>
                <Text style={styles.rejectedLabel}>Reason:</Text>
                <Text style={styles.rejectedText}>{booking.rejectionReason}</Text>
              </>
            ) : (
              <Text style={styles.rejectedText}>
                This booking has been rejected by admin
              </Text>
            )}
          </View>
        )}

        {isCanceled && (
          <View style={styles.canceledCard}>
            <Text style={styles.canceledTitle}>Booking Canceled</Text>
            <Text style={styles.canceledText}>
              This booking has been canceled
            </Text>
          </View>
        )}

        {isCompleted && (
          <View style={styles.completedCard}>
            <Text style={styles.completedTitle}>Booking Completed</Text>
            <Text style={styles.completedText}>
              Thank you for using our service!
            </Text>
            {booking.photos && booking.photos.filter((p: any) => p.type === "completion").length > 0 && (
              <View style={styles.completionPhotosSection}>
                <Text style={styles.completionPhotosLabel}>Wash Photos</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {booking.photos
                    .filter((p: any) => p.type === "completion")
                    .map((photo: any, i: number) => (
                      <Image key={i} source={{ uri: photo.url }} style={styles.completionPhoto} />
                    ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Booking Details</Text>

          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Service</Text>
              <Text style={styles.detailValue}>
                {booking.washType?.name || "N/A"}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Cars</Text>
              <Text style={styles.detailValue}>
                {booking.cars?.length || 0}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total</Text>
              <Text style={styles.detailValuePrimary}>
                {booking.currency} {booking.total}
              </Text>
            </View>
            {booking.team && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Team</Text>
                <Text style={styles.detailValue}>{booking.team.name}</Text>
              </View>
            )}
          </View>
        </View>

        {booking.address && (
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.detailCard}>
              <Text style={styles.addressText}>
                {booking.address.formattedAddress}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.supportSection}>
          <TouchableOpacity style={styles.supportButton}>
            <Text style={styles.supportButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function LiveTrackingMap({ data }: { data: any }) {
  const dest = data.destination;
  const team = data.team;
  const hasTeamLocation =
    team && typeof team.currentLat === "number" && typeof team.currentLng === "number";

  const initialRegion = hasTeamLocation
    ? {
        latitude: (team.currentLat + dest.latitude) / 2,
        longitude: (team.currentLng + dest.longitude) / 2,
        latitudeDelta: Math.max(0.02, Math.abs(team.currentLat - dest.latitude) * 2.5),
        longitudeDelta: Math.max(0.02, Math.abs(team.currentLng - dest.longitude) * 2.5),
      }
    : {
        latitude: dest.latitude,
        longitude: dest.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      };

  const lastSeenSec = team?.lastLocationAt
    ? Math.round((Date.now() - team.lastLocationAt) / 1000)
    : null;

  const etaText =
    data.liveEtaMin && data.liveEtaMax
      ? `${data.liveEtaMin}–${data.liveEtaMax} min`
      : data.storedEtaMin && data.storedEtaMax
        ? `${data.storedEtaMin}–${data.storedEtaMax} min`
        : "—";

  return (
    <View style={mapStyles.wrap}>
      <View style={mapStyles.headerRow}>
        <View>
          <Text style={mapStyles.label}>LIVE ETA</Text>
          <Text style={mapStyles.eta}>{etaText}</Text>
        </View>
        {hasTeamLocation && data.distanceKm != null && (
          <View style={mapStyles.distBlock}>
            <Text style={mapStyles.label}>DISTANCE</Text>
            <Text style={mapStyles.dist}>{data.distanceKm.toFixed(1)} KM</Text>
          </View>
        )}
      </View>
      <MapView
        style={mapStyles.map}
        initialRegion={initialRegion}
        region={initialRegion}
        showsUserLocation={false}
        scrollEnabled
        zoomEnabled
      >
        <Marker
          coordinate={{ latitude: dest.latitude, longitude: dest.longitude }}
          title="Your location"
          description={dest.formattedAddress}
          pinColor="red"
        />
        {hasTeamLocation && (
          <Marker
            coordinate={{ latitude: team.currentLat, longitude: team.currentLng }}
            title={team.name}
            description={team.status}
            pinColor="green"
          />
        )}
      </MapView>
      {!hasTeamLocation && (
        <Text style={mapStyles.noGps}>
          Waiting for team to share location...
        </Text>
      )}
      {hasTeamLocation && lastSeenSec != null && (
        <Text style={mapStyles.lastSeen}>
          {team.name} · updated {lastSeenSec}s ago
        </Text>
      )}
    </View>
  );
}

const mapStyles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.text_secondary,
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  eta: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.primary,
  },
  distBlock: { alignItems: "flex-end" },
  dist: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text_primary,
  },
  map: {
    width: "100%",
    height: 220,
    borderRadius: borderRadius.md,
  },
  noGps: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.text_secondary,
    textAlign: "center",
  },
  lastSeen: {
    marginTop: spacing.sm,
    fontSize: 11,
    color: colors.text_secondary,
    textAlign: "center",
  },
});

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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + 20,
    paddingBottom: spacing.md,
  },
  backButton: {
    color: colors.primary,
    fontSize: 16,
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
  bookingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  bookingNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text_primary,
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
  timeline: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text_secondary,
    marginBottom: spacing.md,
    textTransform: "uppercase",
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.md,
    position: "relative",
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface_container_high,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  timelineDotActive: {
    backgroundColor: colors.primary + "30",
  },
  timelineDotCurrent: {
    backgroundColor: colors.primary,
  },
  timelineDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text_primary,
  },
  timelineLine: {
    position: "absolute",
    left: 11,
    top: 24,
    width: 2,
    height: 20,
    backgroundColor: colors.surface_container_high,
  },
  timelineLineActive: {
    backgroundColor: colors.primary,
  },
  timelineLabel: {
    fontSize: 16,
    color: colors.text_secondary,
    paddingTop: 2,
  },
  timelineLabelActive: {
    color: colors.text_primary,
  },
  timelineLabelCurrent: {
    fontWeight: "600",
    color: colors.primary,
  },
  canceledCard: {
    backgroundColor: colors.danger + "20",
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  canceledTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  canceledText: {
    fontSize: 14,
    color: colors.text_secondary,
    textAlign: "center",
  },
  completedCard: {
    backgroundColor: colors.success + "20",
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  completedTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.success,
    marginBottom: spacing.sm,
  },
  completedText: {
    fontSize: 14,
    color: colors.text_secondary,
    textAlign: "center",
  },
  detailsSection: {
    marginBottom: spacing.xl,
  },
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.text_secondary,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text_primary,
  },
  detailValuePrimary: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  addressText: {
    fontSize: 14,
    color: colors.text_primary,
    lineHeight: 20,
  },
  supportSection: {
    marginBottom: spacing.xxl,
  },
  supportButton: {
    backgroundColor: colors.surface_container_high,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  supportButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "500",
  },
  pendingCard: {
    backgroundColor: colors.warning + "20",
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  pendingTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.warning,
    marginBottom: spacing.sm,
  },
  pendingText: {
    fontSize: 14,
    color: colors.text_secondary,
    textAlign: "center",
  },
  rejectedCard: {
    backgroundColor: colors.error + "20",
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  rejectedTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.error,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  rejectedLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.error,
    marginBottom: spacing.xs,
  },
  rejectedText: {
    fontSize: 14,
    color: colors.text_primary,
    textAlign: "center",
    lineHeight: 20,
  },
  completionPhotosSection: {
    marginTop: spacing.lg,
  },
  completionPhotosLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.success,
    marginBottom: spacing.sm,
  },
  completionPhoto: {
    width: 200,
    height: 150,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
    resizeMode: "cover",
  },
});

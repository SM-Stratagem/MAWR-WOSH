import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, Linking, Platform } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useEffect, useState, useCallback } from "react";
import { colors, spacing, borderRadius } from "../../constants/theme";
import { useTeamStore } from "../../lib/teamStore";
import * as ImagePicker from "expo-image-picker";
import { convex } from "../../lib/convex";
import UAELicensePlate from "../../components/UAELicensePlate";
import { getUserFacingErrorMessage } from "../../lib/errors";
import {
  enqueue as enqueueUpload,
  dequeue as dequeueUpload,
  bumpAttempts,
  loadQueue,
  makeQueueItemId,
  queueForBooking,
  MAX_ATTEMPTS,
  type QueueItem,
} from "../../lib/uploadQueue";

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
  team_assigned: "Team Assigned",
  on_the_way: "On the way",
  arrived: "Arrived",
  washing_in_progress: "Washing in progress",
  completed: "Completed",
  canceled: "Canceled",
};

const NEXT_STATUSES: Record<string, { status: string; label: string }[]> = {
  team_assigned: [
    { status: "on_the_way", label: "Start heading to location" },
  ],
  on_the_way: [
    { status: "arrived", label: "Mark as arrived" },
  ],
  arrived: [
    { status: "washing_in_progress", label: "Start washing" },
  ],
  washing_in_progress: [
    { status: "completed", label: "Complete job" },
  ],
};

export default function TeamBookingDetailScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const router = useRouter();

  const { session } = useTeamStore();
  const isValidId = bookingId && bookingId !== "index" && bookingId !== "login";
  const typedBookingId = isValidId ? (bookingId as Id<"bookings">) : null;
  const booking = useQuery(api.bookings.teamGetBookingDetail,
    typedBookingId && session?.sessionId ? { bookingId: typedBookingId, sessionId: session.sessionId } : "skip"
  ) as any;
  const arrivalPhotos = useQuery(api.photos.getArrivalPhotos, typedBookingId ? { bookingId: typedBookingId } : "skip") as any[] || [];
  const completionPhotos = useQuery(api.photos.getCompletionPhotos, typedBookingId ? { bookingId: typedBookingId } : "skip") as any[] || [];

  const updateStatus = useMutation(api.bookings.teamUpdateStatusWithSession);
  const addPhoto = useMutation(api.photos.addPhotoUrl);
  const rejectBooking = useMutation(api.bookings.teamRejectBookingWithSession);
  const markCarComplete = useMutation(api.bookings.teamMarkCarComplete);
  const unmarkCarComplete = useMutation(api.bookings.teamUnmarkCarComplete);

  const [takingPhoto, setTakingPhoto] = useState<string | null>(null);
  const [pendingUploads, setPendingUploads] = useState<QueueItem[]>([]);

  // Try to upload a queued item directly via convex storage. Returns true on success.
  const tryUploadItem = useCallback(async (item: QueueItem): Promise<boolean> => {
    try {
      const response = await fetch(item.uri);
      const blob = await response.blob();
      const uploadUrl: string = await convex.mutation(api.photos.generateUploadUrl as any);
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": item.mimeType || "image/jpeg" },
        body: blob,
      });
      if (!uploadResult.ok) return false;
      const { storageId } = await uploadResult.json();
      await convex.mutation(api.photos.savePhoto as any, {
        bookingId: item.bookingId as Id<"bookings">,
        type: item.type,
        storageId,
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  // Periodic retry: every 30s, walk the queue and try each item. Drop on success
  // or after MAX_ATTEMPTS. Updates local state so the UI banner reflects reality.
  useEffect(() => {
    let stopped = false;

    const refresh = async () => {
      if (typedBookingId) {
        const items = await queueForBooking(typedBookingId);
        if (!stopped) setPendingUploads(items);
      }
    };

    const runOnce = async () => {
      const all = await loadQueue();
      for (const item of all) {
        const ok = await tryUploadItem(item);
        if (ok) {
          await dequeueUpload(item.id);
        } else {
          const attempts = await bumpAttempts(item.id);
          if (attempts >= MAX_ATTEMPTS) {
            await dequeueUpload(item.id);
          }
        }
      }
      await refresh();
    };

    void refresh();
    const interval = setInterval(() => {
      void runOnce();
    }, 30000);

    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [typedBookingId, tryUploadItem]);

  const isLoading = booking === undefined;

  const handleTakePhoto = async (type: "arrival_car" | "arrival_location" | "completion") => {
    setTakingPhoto(type);
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Camera permission is required to take photos");
        setTakingPhoto(null);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) {
        setTakingPhoto(null);
        return;
      }

      const asset = result.assets[0];

      // Try upload directly first. On any failure, enqueue for background retry
      // so the driver can keep working even when the network is flaky.
      try {
        const response = await fetch(asset.uri);
        const blob = await response.blob();

        const uploadUrl: string = await convex.mutation(api.photos.generateUploadUrl as any);

        const uploadResult = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Content-Type": asset.mimeType || "image/jpeg",
          },
          body: blob,
        });

        if (!uploadResult.ok) throw new Error(`Upload failed (${uploadResult.status})`);
        const { storageId } = await uploadResult.json();

        await convex.mutation(api.photos.savePhoto as any, {
          bookingId: typedBookingId!,
          type,
          storageId,
        });

        Alert.alert("Success", "Photo uploaded successfully");
      } catch (uploadErr) {
        // Persist to retry queue. The 30s interval effect will keep trying.
        await enqueueUpload({
          id: makeQueueItemId(),
          uri: asset.uri,
          bookingId: typedBookingId!,
          type,
          mimeType: asset.mimeType,
        });
        if (typedBookingId) {
          setPendingUploads(await queueForBooking(typedBookingId));
        }
        Alert.alert(
          "Upload queued",
          "We couldn't reach the server. The photo will be uploaded automatically when you're back online.",
        );
      }
    } catch (error: any) {
      Alert.alert("Could not upload photo", getUserFacingErrorMessage(error, "Failed to upload photo. Please try again."));
    } finally {
      setTakingPhoto(null);
    }
  };

  const presetRejectReasons = ["Vehicle issue", "Address unreachable", "Personal emergency"];

  const performReject = async (reason: string) => {
    if (!session?.sessionId || !typedBookingId) return;
    try {
      await rejectBooking({
        sessionId: session.sessionId,
        bookingId: typedBookingId,
        reason,
      });
      router.replace("/team");
    } catch (error: any) {
      Alert.alert(
        "Could not release booking",
        getUserFacingErrorMessage(error, "Failed to release booking. Please try again."),
      );
    }
  };

  const handleReject = () => {
    const buttons: any[] = [{ text: "Cancel", style: "cancel" as const }];
    for (const r of presetRejectReasons) {
      buttons.push({ text: r, onPress: () => performReject(r) });
    }
    // "Other (specify)" — iOS supports Alert.prompt for free text.
    buttons.push({
      text: "Other (specify)",
      onPress: () => {
        if (Platform.OS === "ios" && (Alert as any).prompt) {
          (Alert as any).prompt(
            "Reason",
            "Briefly describe why you cannot take this booking.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Submit",
                onPress: (text: string | undefined) => {
                  const reason = (text || "").trim();
                  if (!reason) return;
                  performReject(reason);
                },
              },
            ],
            "plain-text",
          );
        } else {
          // Android fallback — no free-text Alert primitive available without
          // a custom modal. Use a generic reason rather than blocking the flow.
          performReject("Other");
        }
      },
    });

    Alert.alert(
      "Unable to take this booking?",
      "It will go back to dispatch and we'll try another team.",
      buttons,
    );
  };

  const handleToggleCarComplete = async (bookingCarId: Id<"bookingCars">, complete: boolean) => {
    if (!session?.sessionId) return;
    try {
      if (complete) {
        await markCarComplete({ sessionId: session.sessionId, bookingCarId });
      } else {
        await unmarkCarComplete({ sessionId: session.sessionId, bookingCarId });
      }
    } catch (error: any) {
      Alert.alert(
        "Could not update car",
        getUserFacingErrorMessage(error, "Failed to update car status."),
      );
    }
  };

  const openGoogleMaps = () => {
    if (!booking?.address) return;
    const address = booking.address.formattedAddress;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not open Google Maps");
    });
  };

  const handleStatusUpdate = (newStatus: string) => {
    if (newStatus === "arrived" && arrivalPhotos.length < 2) {
      Alert.alert("Photos Required", "Please take 2 arrival photos before marking as arrived");
      return;
    }
    if (newStatus === "completed" && completionPhotos.length < 1) {
      Alert.alert("Photo Required", "Please take a completion photo before marking as completed");
      return;
    }

    // Block forward progress while photos for this booking are still in the
    // retry queue — otherwise the server-side photo-required check would fail
    // anyway, but with a less helpful error.
    if ((newStatus === "arrived" || newStatus === "completed") && pendingUploads.length > 0) {
      Alert.alert(
        "Uploads pending",
        `There are ${pendingUploads.length} photo(s) still uploading. Please wait until they finish.`,
      );
      return;
    }

    // Open Google Maps when heading to location
    if (newStatus === "on_the_way") {
      openGoogleMaps();
    }

    Alert.alert(
      "Update Status",
      `Are you sure you want to mark this booking as "${STATUS_LABELS[newStatus] || newStatus}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await updateStatus({ sessionId: session?.sessionId || "", bookingId: typedBookingId!, status: newStatus as "on_the_way" | "arrived" | "washing_in_progress" | "completed" });
              Alert.alert("Success", "Booking status updated");
            } catch (error: any) {
              Alert.alert("Could not update status", getUserFacingErrorMessage(error, "Failed to update status. Please try again."));
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading booking...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>❌</Text>
        <Text style={styles.errorTitle}>Booking Not Found</Text>
        <Text style={styles.errorSubtitle}>
          This booking doesn't exist or you don't have permission to view it.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[booking.status] || colors.text_secondary;
  const statusLabel = STATUS_LABELS[booking.status] || booking.status;
  const nextStatuses = NEXT_STATUSES[booking.status] || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backNav}>
          <Text style={styles.backNavText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.bookingCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.bookingNumber}>{booking.bookingNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{booking.customer?.name || "N/A"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{booking.customer?.email || "N/A"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Phone</Text>
              <Text style={styles.value}>{booking.customer?.phone || "N/A"}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.addressText}>{booking.address?.formattedAddress || "N/A"}</Text>
            {booking.address?.buildingOrCommunity && (
              <Text style={styles.addressDetail}>
                Building/Community: {booking.address.buildingOrCommunity}
              </Text>
            )}
            {booking.address?.apartmentOrVilla && (
              <Text style={styles.addressDetail}>
                Apt/Villa: {booking.address.apartmentOrVilla}
              </Text>
            )}
            {booking.address?.notes && (
              <Text style={styles.addressDetail}>Notes: {booking.address.notes}</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Wash Type</Text>
              <Text style={styles.value}>{booking.washType?.name || "N/A"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Cars</Text>
              <Text style={styles.value}>{booking.selectedCarCount}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Duration</Text>
              <Text style={styles.value}>~{booking.washType?.durationMins || 0} mins</Text>
            </View>
          </View>

          {booking.cars && booking.cars.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vehicle{booking.cars.length > 1 ? "s" : ""}</Text>
              {booking.cars.length > 1 && (
                <Text style={styles.photoHint}>
                  Tap each car as you finish it. All cars must be marked done before you can complete the job.
                </Text>
              )}
              {booking.cars.map((car: any, index: number) => {
                const isDone = !!car?.completedAt;
                const canToggle =
                  booking.status === "washing_in_progress" || booking.status === "arrived";
                return (
                  <View key={car?._id || index} style={[styles.carCard, isDone && styles.carCardDone]}>
                    <View style={styles.carCardHeader}>
                      <Text style={styles.carName}>
                        {car?.nickname || `${car?.make ?? ""} ${car?.model ?? ""}`} {car?.year ?? ""}
                      </Text>
                      {car?.bookingCarId && (
                        <TouchableOpacity
                          style={[styles.carDoneToggle, isDone && styles.carDoneToggleActive]}
                          disabled={!canToggle}
                          onPress={() => handleToggleCarComplete(car.bookingCarId, !isDone)}
                        >
                          <Text style={[styles.carDoneToggleText, isDone && styles.carDoneToggleTextActive]}>
                            {isDone ? "✓ Done" : canToggle ? "Mark done" : "Pending"}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {car?.plateNumber && (
                      <View style={styles.carPlateContainer}>
                        <UAELicensePlate
                          city={car.plateRegion || "dubai"}
                          code={car.plateNumber.split(' ')[0] || ""}
                          number={car.plateNumber.split(' ')[1] || car.plateNumber}
                          style={styles.carPlateComponent}
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {pendingUploads.length > 0 && (
            <View style={styles.pendingBanner}>
              <Text style={styles.pendingBannerText}>
                ⏳ {pendingUploads.length} photo upload(s) pending — we'll retry automatically.
              </Text>
            </View>
          )}

          {(booking.status === "team_assigned" || booking.status === "on_the_way" || booking.status === "arrived") && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Arrival Photos (Required)</Text>
              <Text style={styles.photoHint}>Take 2 photos when you arrive: car + location</Text>
              <View style={styles.photoRow}>
                <TouchableOpacity
                  style={[styles.photoButton, arrivalPhotos.find((p: any) => p.type === "arrival_car") && styles.photoButtonDone]}
                  onPress={() => handleTakePhoto("arrival_car")}
                  disabled={takingPhoto !== null}
                >
                  <Text style={styles.photoButtonIcon}>🚗</Text>
                  <Text style={styles.photoButtonText}>
                    {arrivalPhotos.find((p: any) => p.type === "arrival_car") ? "Car ✓" : "Car Photo"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.photoButton, arrivalPhotos.find((p: any) => p.type === "arrival_location") && styles.photoButtonDone]}
                  onPress={() => handleTakePhoto("arrival_location")}
                  disabled={takingPhoto !== null}
                >
                  <Text style={styles.photoButtonIcon}>📍</Text>
                  <Text style={styles.photoButtonText}>
                    {arrivalPhotos.find((p: any) => p.type === "arrival_location") ? "Location ✓" : "Location Photo"}
                  </Text>
                </TouchableOpacity>
              </View>
              {arrivalPhotos.length > 0 && (
                <ScrollView horizontal style={styles.photoPreviewRow} showsHorizontalScrollIndicator={false}>
                  {arrivalPhotos.map((photo: any, i: number) => (
                    <Image key={i} source={{ uri: photo.url }} style={styles.photoThumbnail} />
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {(booking.status === "arrived" || booking.status === "washing_in_progress") && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Completion Photo (Required)</Text>
              <Text style={styles.photoHint}>Take a photo after washing is complete</Text>
              <TouchableOpacity
                style={[styles.photoButton, styles.photoButtonLarge, completionPhotos.length > 0 && styles.photoButtonDone]}
                onPress={() => handleTakePhoto("completion")}
                disabled={takingPhoto !== null}
              >
                <Text style={styles.photoButtonIcon}>✨</Text>
                <Text style={styles.photoButtonText}>
                  {completionPhotos.length > 0 ? "Completion Photo ✓" : "Take Completion Photo"}
                </Text>
              </TouchableOpacity>
              {completionPhotos.length > 0 && (
                <ScrollView horizontal style={styles.photoPreviewRow} showsHorizontalScrollIndicator={false}>
                  {completionPhotos.map((photo: any, i: number) => (
                    <Image key={i} source={{ uri: photo.url }} style={styles.photoThumbnail} />
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Subtotal</Text>
              <Text style={styles.value}>{booking.subtotal} {booking.currency}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Discount</Text>
              <Text style={styles.value}>-{booking.discount} {booking.currency}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Total</Text>
              <Text style={styles.priceValue}>{booking.total} {booking.currency}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Payment</Text>
              <Text style={[styles.value, { color: booking.paymentStatus === "succeeded" ? colors.success : colors.warning }]}>
                {booking.paymentStatus === "succeeded" ? "Paid" : booking.paymentStatus}
              </Text>
            </View>
          </View>

          {booking.team && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Team</Text>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Team</Text>
                <Text style={styles.value}>{booking.team.name}</Text>
              </View>
            </View>
          )}
        </View>

        {nextStatuses.length > 0 && (
          <View style={styles.actionSection}>
            <Text style={styles.actionTitle}>Update Status</Text>
            {nextStatuses.map((next) => (
              <TouchableOpacity
                key={next.status}
                style={styles.actionButton}
                onPress={() => handleStatusUpdate(next.status)}
              >
                <Text style={styles.actionButtonText}>{next.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {booking.status === "team_assigned" && (
          <TouchableOpacity style={styles.rejectButton} onPress={handleReject}>
            <Text style={styles.rejectButtonText}>Unable to take this booking</Text>
          </TouchableOpacity>
        )}

        {booking.status === "completed" && (
          <View style={styles.completedBanner}>
            <Text style={styles.completedText}>This job has been completed</Text>
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
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text_primary,
    marginBottom: spacing.sm,
  },
  errorSubtitle: {
    fontSize: 16,
    color: colors.text_secondary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
  },
  backButtonText: {
    color: colors.on_primary,
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + 20,
    paddingBottom: spacing.md,
  },
  backNav: {
    padding: spacing.sm,
    marginLeft: -spacing.sm,
  },
  backNavText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text_primary,
  },
  headerSpacer: {
    width: 60,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  bookingCard: {
    backgroundColor: colors.surface_container_low,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  bookingNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text_primary,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface_container_high,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text_primary,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 14,
    color: colors.text_secondary,
  },
  value: {
    fontSize: 14,
    color: colors.text_primary,
    fontWeight: "500",
  },
  addressText: {
    fontSize: 14,
    color: colors.text_primary,
    lineHeight: 22,
  },
  addressDetail: {
    fontSize: 13,
    color: colors.text_secondary,
    marginTop: spacing.xs,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  carCard: {
    backgroundColor: colors.surface_container_high,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  carName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text_primary,
  },
  carPlateContainer: {
    marginTop: spacing.xs,
    alignItems: "center",
  },
  carPlateComponent: {
    transform: [{ scale: 0.7 }],
    marginLeft: -20,
  },
  actionSection: {
    backgroundColor: colors.surface_container_low,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text_primary,
    marginBottom: spacing.md,
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  actionButtonText: {
    color: colors.on_primary,
    fontSize: 16,
    fontWeight: "600",
  },
  completedBanner: {
    backgroundColor: colors.success + "20",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
  },
  completedText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.success,
  },
  photoHint: {
    fontSize: 13,
    color: colors.text_secondary,
    marginBottom: spacing.md,
  },
  photoRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  photoButton: {
    flex: 1,
    backgroundColor: colors.surface_container_high,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  photoButtonDone: {
    borderColor: colors.success,
    backgroundColor: colors.success + "15",
  },
  photoButtonLarge: {
    paddingVertical: spacing.xl,
  },
  photoButtonIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  photoButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text_primary,
    textAlign: "center",
  },
  photoPreviewRow: {
    marginTop: spacing.md,
    flexDirection: "row",
  },
  photoThumbnail: {
    width: 80,
    height: 60,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
  },
  carCardDone: {
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: colors.success + "10",
  },
  carCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  carDoneToggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface_container_low,
    borderWidth: 1,
    borderColor: colors.text_secondary,
  },
  carDoneToggleActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  carDoneToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text_secondary,
  },
  carDoneToggleTextActive: {
    color: colors.on_primary,
  },
  pendingBanner: {
    backgroundColor: colors.warning + "20",
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pendingBannerText: {
    fontSize: 13,
    color: colors.warning,
    fontWeight: "600",
  },
  rejectButton: {
    backgroundColor: colors.danger + "15",
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  rejectButtonText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: "600",
  },
});
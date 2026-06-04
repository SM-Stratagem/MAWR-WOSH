import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, Linking } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { colors, spacing, borderRadius } from "../../constants/theme";
import { useTeamStore } from "../../lib/teamStore";
import * as ImagePicker from "expo-image-picker";
import { convex } from "../../lib/convex";
import UAELicensePlate from "../../components/UAELicensePlate";
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

  const [takingPhoto, setTakingPhoto] = useState<string | null>(null);

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

      const { storageId } = await uploadResult.json();

      await convex.mutation(api.photos.savePhoto as any, {
        bookingId: typedBookingId!,
        type,
        storageId,
      });

      Alert.alert("Success", "Photo uploaded successfully");
    } catch (error: any) {
      Alert.alert("Could not upload photo", getUserFacingErrorMessage(error, "Failed to upload photo. Please try again."));
    } finally {
      setTakingPhoto(null);
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
              {booking.cars.map((car: any, index: number) => (
                <View key={car?._id || index} style={styles.carCard}>
                  <Text style={styles.carName}>
                    {car?.make} {car?.model} {car?.year}
                  </Text>
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
              ))}
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
});
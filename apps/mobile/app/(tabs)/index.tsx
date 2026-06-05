import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../convex/_generated/api";
import { colors, spacing, borderRadius } from "../../constants/theme";
import { useBookingStore } from "../../lib/store";
import { WashDetailModal } from "../../components/WashDetailModal";

function CarPhoto({ storageId }: { storageId: string }) {
  const photoUrl = useQuery(api.cars.getPhotoUrl, { storageId });
  if (!photoUrl) return null;
  return (
    <Image source={{ uri: photoUrl }} style={styles.carPhotoImage} />
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [selectedCars, setSelectedCars] = useState<string[]>([]);
  const [selectedWashType, setSelectedWashType] = useState<any>(null);
  const [selectedWashForModal, setSelectedWashForModal] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const { setBookingData, subscriptionPlan } = useBookingStore();

  const carsQuery = useQuery(api.cars.listMyCars);
  const addressesQuery = useQuery(api.addresses.listMyAddresses);
  const washTypesQuery = useQuery(api.washTypes.listWashTypes);
  const currencySetting = useQuery(api.settings.getPublic, { key: "currency" });
  const currency = currencySetting ?? "AED";

  const cars = carsQuery || [];
  const addresses = addressesQuery || [];
  const dbWashTypes = washTypesQuery || [];
  const defaultAddress = addresses.find((a: any) => a.isDefault) || addresses[0];
  const etaPreview = useQuery(
    api.bookings.getEtaPreview,
    defaultAddress ? { addressId: defaultAddress._id } : {}
  );
  const activeCar = cars.find((c: any) => selectedCars.includes(c._id)) || cars[0];

  // Auto-select first car when cars load
  useEffect(() => {
    if (cars.length > 0 && selectedCars.length === 0) {
      setSelectedCars([cars[0]._id]);
    }
  }, [cars]);

  const handleCarToggle = (carId: string) => {
    setSelectedCars((prev) =>
      prev.includes(carId) ? prev.filter((id) => id !== carId) : [...prev, carId]
    );
  };

  const handleSelectWashType = (wash: any) => {
    setSelectedWashType(wash);
    setBookingData({
      selectedWashType: {
        key: wash.key,
        name: wash.name,
        basePrice: wash.basePrice,
        durationMins: wash.durationMins,
        washTypeId: wash._id,
      },
    });
  };

  const handleContinue = () => {
    if (!selectedWashType || selectedCars.length === 0) return;
    setBookingData({
      selectedCarIds: selectedCars,
      selectedWashType: {
        key: selectedWashType.key,
        name: selectedWashType.name,
        basePrice: selectedWashType.basePrice,
        durationMins: selectedWashType.durationMins,
        washTypeId: selectedWashType._id,
      },
      total: selectedWashType.basePrice * selectedCars.length,
      subscriptionPlan,
    });
    if (defaultAddress) setBookingData({ selectedAddressId: defaultAddress._id });
    router.push("/summary");
  };

  const selectedWash = dbWashTypes.find((w: any) => w.key === selectedWashType?.key) || dbWashTypes[0];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Welcome */}
        <View style={styles.welcomeSection}>
          <Text style={styles.greeting}>Hello, {user?.firstName || "there"}.</Text>
          <View style={styles.welcomeDivider} />
          <Text style={styles.welcomeSubtext}>Ready for your next professional wash session?</Text>
        </View>

        {/* Bento Grid */}
        <View style={styles.bentoGrid}>
          <View style={styles.etaCard}>
            <Text style={styles.etaLabel}>AVAILABILITY</Text>
            <Text style={styles.etaValue}>
              {etaPreview ? `${etaPreview.min}-${etaPreview.max}` : "—"}
            </Text>
            <Text style={styles.etaUnit}>MINUTES ETA</Text>
          </View>
        </View>

        {/* Vehicle Card */}
        {activeCar ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardLabel}>ACTIVE VEHICLE</Text>
                <Text style={styles.cardTitle}>{activeCar.make?.toUpperCase()}</Text>
                <Text style={styles.cardSubtitle}>
                  {activeCar.model} / {activeCar.year}
                </Text>
              </View>
              <View style={styles.carIcon}>
                <Text style={styles.carIconText}>G</Text>
              </View>
            </View>
            {activeCar.photoStorageId ? (
              <CarPhoto storageId={activeCar.photoStorageId} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>FIG. 01 — SELECTED</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.ghostButton}
              onPress={() => router.push("/(tabs)/cars")}
            >
              <Text style={styles.ghostButtonText}>CHANGE VEHICLE</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addCarCard}
            onPress={() => router.push("/(tabs)/cars")}
          >
            <Text style={styles.addCarText}>ADD YOUR FIRST VEHICLE</Text>
          </TouchableOpacity>
        )}

        {/* Wash Type Selection */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>SELECT WASH TYPE</Text>
          <View style={styles.washTypeList}>
            {(dbWashTypes as any[]).filter((w: any) => w.isActive !== false).map((wash: any) => (
              <TouchableOpacity
                key={wash.key}
                style={[
                  styles.washTypeItem,
                  selectedWashType?.key === wash.key && styles.washTypeItemSelected,
                ]}
                onPress={() => handleSelectWashType(wash)}
              >
                <View style={styles.washTypeRow}>
                  <View style={styles.washTypeLeft}>
                    <Text style={styles.washTypeName}>{wash.name?.toUpperCase()}</Text>
                    <TouchableOpacity
                      style={styles.infoButton}
                      onPress={() => {
                        setSelectedWashForModal(wash);
                        setModalVisible(true);
                      }}
                    >
                      <Ionicons name="information-circle-outline" size={16} color={colors.ink_dim} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.washTypePrice}>{wash.basePrice} {currency}</Text>
                </View>
                <Text style={styles.washTypeDesc}>{wash.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Book Now Button - Always visible when wash type and car selected */}
        {selectedWashType && selectedCars.length > 0 && (
          <TouchableOpacity style={styles.bookNowButton} onPress={handleContinue}>
            <Text style={styles.bookNowButtonText}>
              BOOK {selectedWashType.name?.toUpperCase()} — {selectedWashType.basePrice * selectedCars.length} {currency}
            </Text>
          </TouchableOpacity>
        )}

        {/* Car Selection */}
        {cars.length > 1 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>SELECT CARS</Text>
            <View style={styles.carGrid}>
              {cars.map((car: any) => (
                <TouchableOpacity
                  key={car._id}
                  style={[
                    styles.carChip,
                    selectedCars.includes(car._id) && styles.carChipSelected,
                  ]}
                  onPress={() => handleCarToggle(car._id)}
                >
                  <Text
                    style={[
                      styles.carChipText,
                      selectedCars.includes(car._id) && styles.carChipTextSelected,
                    ]}
                  >
                    {car.make?.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Address */}
        {defaultAddress && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>LOCATION</Text>
            <Text style={styles.addressText}>{defaultAddress.formattedAddress}</Text>
            <TouchableOpacity onPress={() => router.push("/location")}>
              <Text style={styles.changeLink}>CHANGE</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Wash Detail Modal */}
      <WashDetailModal
        visible={modalVisible}
        washType={selectedWashForModal}
        onClose={() => setModalVisible(false)}
        onBookNow={() => {
          if (selectedWashForModal) {
            handleSelectWashType(selectedWashForModal);
            setModalVisible(false);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + 20,
  },
  welcomeSection: {
    marginBottom: spacing.xl,
  },
  greeting: {
    fontSize: 42,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.5,
    lineHeight: 44,
  },
  welcomeDivider: {
    height: 1,
    backgroundColor: colors.line_soft,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  welcomeSubtext: {
    fontSize: 15,
    color: colors.ink_soft,
  },
  card: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.accent,
    letterSpacing: 1.4,
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.5,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.ink_dim,
    marginTop: 2,
  },
  carIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line_soft,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface_container_high,
  },
  carIconText: {
    fontSize: 18,
    fontWeight: "500",
    color: colors.ink,
  },
  imagePlaceholder: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bg_deep,
    marginBottom: spacing.md,
    alignItems: "flex-start",
    justifyContent: "flex-end",
    padding: spacing.sm,
    overflow: "hidden",
  },
  imagePlaceholderText: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.on_ink,
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  ghostButton: {
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  ghostButtonText: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.ink,
    letterSpacing: 1.4,
  },
  addCarCard: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  addCarText: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.accent,
    letterSpacing: 1.4,
  },
  serviceName: {
    fontSize: 22,
    fontWeight: "500",
    color: colors.ink,
    letterSpacing: -0.3,
  },
  priceBlock: {
    alignItems: "flex-end",
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.ink_dim,
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 22,
    fontWeight: "500",
    color: colors.ink,
  },
  priceUnit: {
    fontSize: 13,
    fontWeight: "400",
  },
  dottedDivider: {
    height: 1,
    backgroundColor: "transparent",
    borderTopWidth: 1,
    borderTopColor: colors.line_soft,
    borderStyle: "dotted",
    marginVertical: spacing.md,
  },
  featureList: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  featureItem: {
    fontSize: 13,
    color: colors.ink_soft,
  },
  primaryButton: {
    backgroundColor: colors.ink,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: "center",
  },
  primaryButtonText: {
    color: colors.on_ink,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  washTypeList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  washTypeItem: {
    backgroundColor: colors.bg_soft,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "transparent",
  },
  washTypeItemSelected: {
    borderColor: colors.accent,
  },
  washTypeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  washTypeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoButton: {
    padding: 2,
  },
  washTypeName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  washTypePrice: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  washTypeDesc: {
    fontSize: 13,
    color: colors.ink_soft,
  },
  carGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  carChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg_soft,
  },
  carChipSelected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  carChipText: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.ink,
    letterSpacing: 1.4,
  },
  carChipTextSelected: {
    color: colors.on_ink,
  },
  addressText: {
    fontSize: 15,
    color: colors.ink,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  changeLink: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.accent,
    letterSpacing: 1.4,
  },
  bentoGrid: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  etaCard: {
    width: 120,
    backgroundColor: colors.bg_soft,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    aspectRatio: 1,
    justifyContent: "space-between",
  },
  etaLabel: {
    fontSize: 8,
    fontWeight: "600",
    color: colors.ink_dim,
    letterSpacing: 0.8,
  },
  etaValue: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -1,
    lineHeight: 28,
  },
  etaUnit: {
    fontSize: 8,
    fontWeight: "500",
    color: colors.ink_dim,
    letterSpacing: 0.6,
  },
  promoCard: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    aspectRatio: 1,
    justifyContent: "space-between",
  },
  promoTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.on_accent,
  },
  promoSubtext: {
    fontSize: 9,
    fontWeight: "500",
    color: "rgba(17,19,21,0.6)",
    letterSpacing: 0.8,
  },
  carPhotoImage: {
    width: "100%",
    height: 160,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    resizeMode: "cover",
  },
  bookNowButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.full,
    alignItems: "center",
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  bookNowButtonText: {
    color: colors.on_accent,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});

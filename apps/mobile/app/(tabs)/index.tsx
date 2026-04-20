import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { convex } from "../../lib/convex";
import { useQuery } from "convex/react";
import { colors, spacing, borderRadius, washTypes } from "../../constants/theme";
import { useBookingStore } from "../../lib/store";
import { WashDetailModal } from "../../components/WashDetailModal";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useAuth();
  const [selectedCars, setSelectedCars] = useState<string[]>([]);
  const [selectedWashType, setSelectedWashType] = useState<typeof washTypes[0] | null>(null);
  const [isSubscription, setIsSubscription] = useState(false);
  const [selectedWashForModal, setSelectedWashForModal] = useState<typeof washTypes[0] | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const { setBookingData } = useBookingStore();

  const cars = useQuery("cars:listMyCars" as any) || [];
  const addresses = useQuery("addresses:listMyAddresses" as any) || [];
  const dbWashTypes = useQuery("washTypes:listWashTypes" as any) || [];
  const defaultAddress = addresses.find((a: any) => a.isDefault) || addresses[0];

  const handleCarToggle = (carId: string) => {
    setSelectedCars((prev) =>
      prev.includes(carId)
        ? prev.filter((id) => id !== carId)
        : [...prev, carId]
    );
  };

  const handleContinue = () => {
    if (!selectedWashType || selectedCars.length === 0) return;

    // Find the database wash type to get the actual ID
    const dbWashType = dbWashTypes.find((w: any) => w.key === selectedWashType.key);

    setBookingData({
      selectedCarIds: selectedCars,
      selectedWashType: {
        key: selectedWashType.key,
        name: selectedWashType.name,
        basePrice: selectedWashType.basePrice,
        durationMins: selectedWashType.durationMins,
        washTypeId: dbWashType?._id, // Store the database ID for later
      },
      total: selectedWashType.basePrice * selectedCars.length,
    });

    if (defaultAddress) {
      setBookingData({ selectedAddressId: defaultAddress._id });
    }
    
    // Go to summary instead of review
    router.push("/summary");
  };

  const total = selectedWashType
    ? selectedWashType.basePrice * selectedCars.length
    : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{user?.firstName || "User"}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {cars.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Cars</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carsList}
            >
              {cars.map((car: any) => (
                <TouchableOpacity
                  key={car._id}
                  style={[
                    styles.carCard,
                    selectedCars.includes(car._id) && styles.carCardSelected,
                  ]}
                  onPress={() => handleCarToggle(car._id)}
                >
                  <Text style={styles.carName}>{car.make}</Text>
                  <Text style={styles.carModel}>
                    {car.model} {car.year}
                  </Text>
                  <Text style={styles.carPlate}>{car.plateNumber}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {cars.length === 0 && (
          <TouchableOpacity
            style={styles.addCarPrompt}
            onPress={() => router.push("/(tabs)/cars")}
          >
            <Text style={styles.addCarPromptText}>Add your first car</Text>
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Wash Type</Text>
          <View style={styles.washTypesList}>
            {washTypes.map((wash) => (
              <TouchableOpacity
                key={wash.key}
                style={[
                  styles.washTypeCard,
                  selectedWashType?.key === wash.key && styles.washTypeSelected,
                ]}
                onPress={() => {
                  setSelectedWashForModal(wash);
                  setModalVisible(true);
                }}
              >
                <View style={styles.washTypeHeader}>
                  <Text style={styles.washTypeName}>{wash.name}</Text>
                  <Text style={styles.washTypePrice}>
                    {wash.basePrice} {wash.currency}
                  </Text>
                </View>
                <Text style={styles.washTypeDesc}>{wash.description}</Text>
                <Text style={styles.washTypeDuration}>
                  ~{wash.durationMins} mins
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.addressSection}>
          <Text style={styles.sectionTitle}>Location</Text>
          {defaultAddress ? (
            <View style={styles.addressCard}>
              <Text style={styles.addressText}>
                {defaultAddress.formattedAddress}
              </Text>
              <TouchableOpacity onPress={() => router.push("/location")}>
                <Text style={styles.changeText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addAddressButton}
              onPress={() => router.push("/location")}
            >
              <Text style={styles.addAddressText}>Add your location</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Total</Text>
          <Text style={styles.priceValue}>
            {total} AED
            {selectedCars.length > 1 && (
              <Text style={styles.priceBreakup}>
                {" "}
                ({selectedWashType?.basePrice} x {selectedCars.length})
              </Text>
            )}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!selectedWashType || selectedCars.length === 0 || !defaultAddress) &&
              styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedWashType || selectedCars.length === 0 || !defaultAddress}
        >
          <Text style={styles.continueButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>

      <WashDetailModal
        visible={modalVisible}
        washType={selectedWashForModal}
        onClose={() => {
          setModalVisible(false);
          setSelectedWashForModal(null);
        }}
        onBookNow={() => {
          setModalVisible(false);
          if (selectedWashForModal) {
            setSelectedWashType(selectedWashForModal);
          }
          router.push("/summary");
        }}
      />
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + 20,
    paddingBottom: spacing.md,
  },
  greeting: {
    fontSize: 14,
    color: colors.text_secondary,
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text_primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text_primary,
    marginBottom: spacing.md,
  },
  carsList: {
    gap: spacing.md,
  },
  carCard: {
    backgroundColor: colors.surface_container_low,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    minWidth: 140,
  },
  carCardSelected: {
    backgroundColor: colors.surface_container_high,
  },
  carName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text_primary,
  },
  carModel: {
    fontSize: 13,
    color: colors.text_secondary,
    marginTop: 2,
  },
  carPlate: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.primary,
    marginTop: spacing.sm,
  },
  addCarPrompt: {
    backgroundColor: colors.surface_container_low,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  addCarPromptText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "500",
  },
  washTypesList: {
    gap: spacing.md,
  },
  washTypeCard: {
    backgroundColor: colors.surface_container_low,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  washTypeSelected: {
    backgroundColor: colors.surface_container_high,
  },
  washTypeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  washTypeName: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text_primary,
  },
  washTypePrice: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  washTypeDesc: {
    fontSize: 14,
    color: colors.text_secondary,
  },
  washTypeDuration: {
    fontSize: 13,
    color: colors.text_secondary,
    marginTop: spacing.sm,
  },
  subscriptionToggle: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text_primary,
  },
  subscriptionDesc: {
    fontSize: 13,
    color: colors.text_secondary,
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface_container_high,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.text_primary,
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
  },
  addressSection: {
    marginBottom: spacing.xl,
  },
  addressCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: colors.text_primary,
    marginRight: spacing.md,
  },
  changeText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  addAddressButton: {
    backgroundColor: colors.surface_container_low,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
  },
  addAddressText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "500",
  },
  footer: {
    backgroundColor: colors.surface_container_low,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  priceLabel: {
    fontSize: 16,
    color: colors.text_secondary,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text_primary,
  },
  priceBreakup: {
    fontSize: 14,
    fontWeight: "400",
    color: colors.text_secondary,
  },
  continueButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: "center",
  },
  continueButtonDisabled: {
    backgroundColor: colors.surface_container_high,
    opacity: 0.5,
  },
  continueButtonText: {
    color: colors.on_primary,
    fontSize: 16,
    fontWeight: "600",
  },
});

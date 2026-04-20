import { useRouter } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { colors, spacing, borderRadius } from "../constants/theme";
import { useBookingStore } from "../lib/store";
import { subscriptionPlans } from "../constants/washImages";

export default function SummaryScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const booking = useBookingStore();
  const { 
    selectedWashType, 
    selectedCarIds, 
    selectedAddressId, 
    subscriptionPlan,
    getDiscountedPrice,
    setBookingData,
    reset 
  } = booking;
  
  const cars = useQuery("cars:listMyCars" as any) || [];
  const addresses = useQuery("addresses:listMyAddresses" as any) || [];
  const washTypes = useQuery("washTypes:listWashTypes" as any) || [];
  const selectedCars = cars.filter((c: any) => selectedCarIds.includes(c._id));
  const selectedAddress = addresses.find((a: any) => a._id === selectedAddressId);
  const washTypeDoc = washTypes.find((w: any) => w.key === selectedWashType?.key);
  
  const createBooking = useMutation("bookings:createBookingDraft" as any);
  
  const hasCar = selectedCars.length > 0;
  const hasLocation = !!selectedAddress;
  
  const basePrice = selectedWashType?.basePrice || 0;
  const carCount = selectedCarIds.length || 1;
  const subtotal = basePrice * carCount;
  const discountAmount = subscriptionPlan && subscriptionPlan !== "one_time" 
    ? Math.round(subtotal * 0.15) 
    : 0;
  const total = subtotal - discountAmount;
  
  const handleAddCar = () => {
    router.push("/(tabs)/cars");
  };
  
  const handleAddLocation = () => {
    router.push("/location");
  };
  
  const handleConfirm = async () => {
    if (!hasCar) {
      Alert.alert("Car Required", "Please add a car first");
      return;
    }
    if (!hasLocation) {
      Alert.alert("Location Required", "Please add a location first");
      return;
    }
    if (!selectedWashType) {
      Alert.alert("Error", "Please select a wash type");
      return;
    }
    
    setLoading(true);
    try {
      // Use stored washTypeId if available, otherwise find from query
      const washTypeIdToUse = (selectedWashType as any)?.washTypeId || washTypeDoc?._id;
      
      if (!washTypeIdToUse) {
        throw new Error("Wash type not found");
      }
      
      const bookingId = await createBooking({
        addressId: selectedAddress._id,
        washTypeId: washTypeIdToUse,
        carIds: selectedCarIds,
      });
      
      setBookingData({ bookingId: bookingId as string });
      reset();
      router.replace(`/tracking?bookingId=${bookingId}`);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create booking");
    } finally {
      setLoading(false);
    }
  };
  
  const subLabel = subscriptionPlans.find(p => p.key === subscriptionPlan)?.label || "One Time";
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Confirm Booking</Text>
        <View style={{ width: 60 }} />
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Wash Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service</Text>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.cardMainText}>{selectedWashType?.name || "No wash selected"}</Text>
              <Text style={styles.cardPrice}>{basePrice} AED</Text>
            </View>
            {subscriptionPlan && subscriptionPlan !== "one_time" && (
              <View style={styles.subscriptionBadge}>
                <Text style={styles.subscriptionText}>{subLabel} • 15% off</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Car Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Car{selectedCars.length > 1 ? "s" : ""}</Text>
          {hasCar ? (
            <View style={styles.card}>
              {selectedCars.map((car: any) => (
                <View key={car._id} style={styles.carRow}>
                  <Text style={styles.cardMainText}>
                    {car.nickname || `${car.make} ${car.model}`}
                  </Text>
                  <Text style={styles.cardSubText}>{car.plateNumber}</Text>
                </View>
              ))}
            </View>
          ) : (
            <TouchableOpacity style={styles.addCard} onPress={handleAddCar}>
              <Text style={styles.addCardText}>+ Add Car</Text>
              <Text style={styles.addCardSubtext}>Required to continue</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Location Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          {hasLocation ? (
            <View style={styles.card}>
              <Text style={styles.cardMainText}>{selectedAddress?.formattedAddress}</Text>
              {selectedAddress?.apartmentOrVilla && (
                <Text style={styles.cardSubText}>Apt/Villa: {selectedAddress.apartmentOrVilla}</Text>
              )}
            </View>
          ) : (
            <TouchableOpacity style={styles.addCard} onPress={handleAddLocation}>
              <Text style={styles.addCardText}>+ Add Location</Text>
              <Text style={styles.addCardSubtext}>Required to continue</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Pricing Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Summary</Text>
          <View style={styles.card}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{selectedWashType?.name} x {carCount}</Text>
              <Text style={styles.priceValue}>{subtotal} AED</Text>
            </View>
            {discountAmount > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.discountLabel}>Subscription Discount (15%)</Text>
                <Text style={styles.discountValue}>-{discountAmount} AED</Text>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{total} AED</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.spacer} />
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            (!hasCar || !hasLocation || loading) && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirm}
          disabled={!hasCar || !hasLocation || loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.on_primary} />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm Booking</Text>
          )}
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text_secondary,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: colors.surface_container_low,
    borderRadius: 24,
    padding: 24,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  carRow: {
    marginBottom: 8,
  },
  cardMainText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text_primary,
  },
  cardSubText: {
    fontSize: 14,
    color: colors.text_secondary,
    marginTop: 2,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  subscriptionBadge: {
    backgroundColor: colors.primary + "20",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  subscriptionText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600",
  },
  addCard: {
    backgroundColor: colors.surface_container_low,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: "dashed",
  },
  addCardText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: 4,
  },
  addCardSubtext: {
    fontSize: 12,
    color: colors.text_secondary,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: colors.text_secondary,
  },
  priceValue: {
    fontSize: 14,
    color: colors.text_primary,
  },
  discountLabel: {
    fontSize: 14,
    color: colors.success,
  },
  discountValue: {
    fontSize: 14,
    color: colors.success,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: colors.surface_container_high,
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text_primary,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
  },
  spacer: {
    height: 32,
  },
  footer: {
    backgroundColor: colors.surface_container_low,
    padding: 24,
    paddingBottom: 48,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 9999,
    alignItems: "center",
  },
  confirmButtonDisabled: {
    backgroundColor: colors.surface_container_high,
    opacity: 0.5,
  },
  confirmButtonText: {
    color: colors.on_primary,
    fontSize: 16,
    fontWeight: "700",
  },
});

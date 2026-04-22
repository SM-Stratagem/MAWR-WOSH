import { useRouter } from "expo-router";
import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Dimensions,
} from "react-native";
import { useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius } from "../constants/theme";
import { useBookingStore } from "../lib/store";
import { subscriptionPlans } from "../constants/washImages";
import { UAE_REGIONS } from "../constants/plateData";

const { height } = Dimensions.get("window");

// SUV keywords helper
const SUV_KEYWORDS = ['suv', 'truck', 'jeep', '4x4', '4wd', 'off-road', 'tank', 'defender', 'wrangler', 'bronco', 'gx', 'lx', 'land cruiser', 'prado', 'patrol', 'tahoe', 'suburban', 'escalade', 'navigator', 'range rover', 'sport', 'velar', 'discovery'];
const isSUV = (make: string, model: string) => {
  const fullName = `${make} ${model}`.toLowerCase();
  return SUV_KEYWORDS.some(keyword => fullName.includes(keyword));
};

export default function SummaryScreen() {
  const router = useRouter();
  const [showCarPicker, setShowCarPicker] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [showWashPicker, setShowWashPicker] = useState(false);
  
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
  
  // Get selected data
  const selectedCars = cars.filter((c: any) => selectedCarIds.includes(c._id));
  const selectedAddress = addresses.find((a: any) => a._id === selectedAddressId);
  const washTypeDoc = washTypes.find((w: any) => w.key === selectedWashType?.key);
  
  const hasCar = selectedCars.length > 0;
  const hasLocation = !!selectedAddress;
  
  // Car selection handler
  const toggleCarSelection = useCallback((carId: string) => {
    const newSelection = selectedCarIds.includes(carId)
      ? selectedCarIds.filter(id => id !== carId)
      : [...selectedCarIds, carId];
    setBookingData({ selectedCarIds: newSelection });
  }, [selectedCarIds, setBookingData]);
  
  // Address selection handler
  const selectAddress = useCallback((addressId: string) => {
    setBookingData({ selectedAddressId: addressId });
    setShowAddressPicker(false);
  }, [setBookingData]);
  
  // Wash type selection handler
  const selectWashType = useCallback((washType: any) => {
    setBookingData({ 
      selectedWashType: {
        key: washType.key,
        name: washType.name,
        basePrice: washType.basePrice,
        durationMins: washType.durationMins,
        washTypeId: washType._id,
      }
    });
    setShowWashPicker(false);
  }, [setBookingData]);
  
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
  
  const handleConfirm = () => {
    // Debug logging
    console.log("[Booking Debug] selectedCarIds:", selectedCarIds);
    console.log("[Booking Debug] selectedAddressId:", selectedAddressId);
    console.log("[Booking Debug] selectedWashType:", selectedWashType);
    console.log("[Booking Debug] hasCar:", hasCar, "hasLocation:", hasLocation);
    
    if (!hasCar || selectedCarIds.length === 0) {
      Alert.alert("Car Required", "Please select at least one car");
      return;
    }
    if (!hasLocation || !selectedAddressId) {
      Alert.alert("Location Required", "Please select a location");
      return;
    }
    if (!selectedWashType) {
      Alert.alert("Error", "Please select a wash type");
      return;
    }
    
    // Navigate to confirm screen - booking will be created there
    router.push("/confirm");
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
          {washTypes.length > 0 ? (
            <>
              {/* Wash Type Picker Button */}
              <TouchableOpacity 
                style={styles.pickerButton} 
                onPress={() => setShowWashPicker(true)}
              >
                {selectedWashType ? (
                  <View style={styles.pickerContent}>
                    <View style={styles.pickerHeader}>
                      <View style={styles.washTypeHeaderLeft}>
                        <Ionicons name="water" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                        <Text style={styles.pickerLabel} numberOfLines={1}>
                          {selectedWashType.name}
                        </Text>
                      </View>
                      <View style={styles.washTypeHeaderRight}>
                        <Text style={styles.pickerPrice}>{basePrice} AED</Text>
                        <Ionicons name="chevron-down" size={20} color={colors.primary} style={{ marginLeft: 8 }} />
                      </View>
                    </View>
                    {subscriptionPlan && subscriptionPlan !== "one_time" && (
                      <View style={styles.pickerSubtextRow}>
                        <View style={styles.subscriptionBadgeSmall}>
                          <Text style={styles.subscriptionTextSmall}>{subLabel} • 15% off</Text>
                        </View>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.pickerHeader}>
                    <Text style={styles.pickerPlaceholder}>Select wash type</Text>
                    <Ionicons name="chevron-down" size={20} color={colors.primary} />
                  </View>
                )}
              </TouchableOpacity>
              
              {/* Wash Type Picker Modal */}
              <Modal
                visible={showWashPicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowWashPicker(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Select Wash Type</Text>
                      <TouchableOpacity onPress={() => setShowWashPicker(false)}>
                        <Ionicons name="close" size={24} color={colors.text_primary} />
                      </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalScroll}>
                      {washTypes.map((washType: any) => {
                        const isSelected = selectedWashType?.key === washType.key;
                        return (
                          <TouchableOpacity
                            key={washType.key}
                            style={[
                              styles.washTypeOption,
                              isSelected && styles.washTypeOptionSelected
                            ]}
                            onPress={() => selectWashType(washType)}
                          >
                            <View style={styles.washTypeOptionIcon}>
                              <Ionicons 
                                name="water" 
                                size={24} 
                                color={isSelected ? colors.on_primary : colors.primary}
                              />
                            </View>
                            <View style={styles.washTypeOptionInfo}>
                              <Text style={[
                                styles.washTypeOptionName,
                                isSelected && styles.washTypeOptionTextSelected
                              ]}>
                                {washType.name}
                              </Text>
                              <Text style={[
                                styles.washTypeOptionDesc,
                                isSelected && styles.washTypeOptionTextSelected
                              ]}>
                                {washType.description || `${washType.durationMins} mins`}
                              </Text>
                            </View>
                            <View style={styles.washTypeOptionPrice}>
                              <Text style={[
                                styles.washTypeOptionPriceText,
                                isSelected && styles.washTypeOptionTextSelected
                              ]}>
                                {washType.basePrice} AED
                              </Text>
                              {isSelected && (
                                <Ionicons name="checkmark-circle" size={20} color={colors.on_primary} style={{ marginLeft: 8 }} />
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>
              </Modal>
            </>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardMainText}>Loading wash types...</Text>
            </View>
          )}
        </View>
        
        {/* Car Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Car{selectedCars.length > 1 ? "s" : ""}</Text>
          {cars.length > 0 ? (
            <>
              {/* Car Picker Button */}
              <TouchableOpacity 
                style={styles.pickerButton} 
                onPress={() => setShowCarPicker(true)}
              >
                {hasCar ? (
                  <View style={styles.pickerContent}>
                    <View style={styles.pickerHeader}>
                      <Text style={styles.pickerLabel}>
                        {selectedCars.length} {selectedCars.length === 1 ? 'car' : 'cars'} selected
                      </Text>
                      <Ionicons name="chevron-down" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.selectedItemsList}>
                      {selectedCars.map((car: any) => (
                        <View key={car._id} style={styles.selectedItemChip}>
                          <Ionicons 
                            name={isSUV(car.make, car.model) ? "car-sport" : "car"} 
                            size={14} 
                            color={colors.primary}
                            style={{ marginRight: 4 }}
                          />
                          <Text style={styles.selectedItemText}>
                            {car.nickname || `${car.make} ${car.model}`}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : (
                  <View style={styles.pickerHeader}>
                    <Text style={styles.pickerPlaceholder}>Select cars</Text>
                    <Ionicons name="chevron-down" size={20} color={colors.primary} />
                  </View>
                )}
              </TouchableOpacity>
              
              {/* Car Picker Modal */}
              <Modal
                visible={showCarPicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowCarPicker(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Select Cars</Text>
                      <TouchableOpacity onPress={() => setShowCarPicker(false)}>
                        <Ionicons name="close" size={24} color={colors.text_primary} />
                      </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalScroll}>
                      {cars.map((car: any) => {
                        const isSelected = selectedCarIds.includes(car._id);
                        return (
                          <TouchableOpacity
                            key={car._id}
                            style={[
                              styles.carOption,
                              isSelected && styles.carOptionSelected
                            ]}
                            onPress={() => toggleCarSelection(car._id)}
                          >
                            <View style={styles.carOptionIcon}>
                              <Ionicons 
                                name={isSUV(car.make, car.model) ? "car-sport" : "car"} 
                                size={24} 
                                color={isSelected ? colors.on_primary : colors.primary}
                              />
                            </View>
                            <View style={styles.carOptionInfo}>
                              <Text style={[
                                styles.carOptionName,
                                isSelected && styles.carOptionTextSelected
                              ]}>
                                {car.nickname || `${car.make} ${car.model}`}
                              </Text>
                              <Text style={[
                                styles.carOptionPlate,
                                isSelected && styles.carOptionTextSelected
                              ]}>
                                {UAE_REGIONS.find(r => r.key === car.plateRegion)?.label || 'Dubai'} • {car.plateNumber}
                              </Text>
                            </View>
                            {isSelected && (
                              <Ionicons name="checkmark-circle" size={24} color={colors.on_primary} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                    <TouchableOpacity 
                      style={styles.modalDoneButton}
                      onPress={() => setShowCarPicker(false)}
                    >
                      <Text style={styles.modalDoneButtonText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            </>
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
          {addresses.length > 0 ? (
            <>
              {/* Address Picker Button */}
              <TouchableOpacity 
                style={styles.pickerButton} 
                onPress={() => setShowAddressPicker(true)}
              >
                {hasLocation ? (
                  <View style={styles.pickerContent}>
                    <View style={styles.pickerHeader}>
                      <Ionicons name="location" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                      <Text style={styles.pickerLabel} numberOfLines={1}>
                        {selectedAddress?.formattedAddress}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color={colors.primary} />
                    </View>
                    {selectedAddress?.apartmentOrVilla && (
                      <Text style={styles.pickerSubtext}>
                        Apt/Villa: {selectedAddress.apartmentOrVilla}
                      </Text>
                    )}
                  </View>
                ) : (
                  <View style={styles.pickerHeader}>
                    <Text style={styles.pickerPlaceholder}>Select location</Text>
                    <Ionicons name="chevron-down" size={20} color={colors.primary} />
                  </View>
                )}
              </TouchableOpacity>
              
              {/* Address Picker Modal */}
              <Modal
                visible={showAddressPicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowAddressPicker(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Select Location</Text>
                      <TouchableOpacity onPress={() => setShowAddressPicker(false)}>
                        <Ionicons name="close" size={24} color={colors.text_primary} />
                      </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalScroll}>
                      {addresses.map((address: any) => {
                        const isSelected = selectedAddressId === address._id;
                        return (
                          <TouchableOpacity
                            key={address._id}
                            style={[
                              styles.addressOption,
                              isSelected && styles.addressOptionSelected
                            ]}
                            onPress={() => selectAddress(address._id)}
                          >
                            <View style={styles.addressOptionIcon}>
                              <Ionicons 
                                name="location" 
                                size={24} 
                                color={isSelected ? colors.on_primary : colors.primary}
                              />
                            </View>
                            <View style={styles.addressOptionInfo}>
                              <Text style={[
                                styles.addressOptionText,
                                isSelected && styles.addressOptionTextSelected
                              ]} numberOfLines={2}>
                                {address.formattedAddress}
                              </Text>
                              {address.apartmentOrVilla && (
                                <Text style={[
                                  styles.addressOptionSubtext,
                                  isSelected && styles.addressOptionTextSelected
                                ]}>
                                  Apt/Villa: {address.apartmentOrVilla}
                                </Text>
                              )}
                              {address.isDefault && (
                                <View style={styles.defaultBadge}>
                                  <Text style={styles.defaultBadgeText}>Default</Text>
                                </View>
                              )}
                            </View>
                            {isSelected && (
                              <Ionicons name="checkmark-circle" size={24} color={colors.on_primary} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                    <TouchableOpacity 
                      style={styles.modalAddButton}
                      onPress={() => {
                        setShowAddressPicker(false);
                        handleAddLocation();
                      }}
                    >
                      <Ionicons name="add" size={20} color={colors.primary} />
                      <Text style={styles.modalAddButtonText}>Add New Location</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            </>
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
            (!hasCar || !hasLocation) && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirm}
          disabled={!hasCar || !hasLocation}
        >
          <Text style={styles.confirmButtonText}>Confirm Booking</Text>
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
  
  // Picker Styles
  pickerButton: {
    backgroundColor: colors.surface_container_low,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surface_container_high,
  },
  pickerContent: {
    width: '100%',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text_primary,
    flex: 1,
  },
  pickerPlaceholder: {
    fontSize: 16,
    color: colors.text_secondary,
    flex: 1,
  },
  pickerSubtext: {
    fontSize: 14,
    color: colors.text_secondary,
    marginTop: spacing.xs,
    marginLeft: 28,
  },
  selectedItemsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginLeft: 0,
  },
  selectedItemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  selectedItemText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: height * 0.7,
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface_container_high,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text_primary,
  },
  modalScroll: {
    maxHeight: height * 0.5,
  },
  modalDoneButton: {
    backgroundColor: colors.primary,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  modalDoneButtonText: {
    color: colors.on_primary,
    fontSize: 16,
    fontWeight: '700',
  },
  modalAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  modalAddButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  
  // Car Option Styles
  carOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface_container_high,
  },
  carOptionSelected: {
    backgroundColor: colors.primary,
  },
  carOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface_container_high,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  carOptionInfo: {
    flex: 1,
  },
  carOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text_primary,
  },
  carOptionPlate: {
    fontSize: 14,
    color: colors.text_secondary,
    marginTop: 2,
  },
  carOptionTextSelected: {
    color: colors.on_primary,
  },
  
  // Address Option Styles
  addressOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface_container_high,
  },
  addressOptionSelected: {
    backgroundColor: colors.primary,
  },
  addressOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface_container_high,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  addressOptionInfo: {
    flex: 1,
  },
  addressOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text_primary,
  },
  addressOptionSubtext: {
    fontSize: 14,
    color: colors.text_secondary,
    marginTop: 2,
  },
  addressOptionTextSelected: {
    color: colors.on_primary,
  },
  defaultBadge: {
    backgroundColor: colors.success + '30',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  defaultBadgeText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '600',
  },
  
  // Wash Type Picker Specific Styles
  washTypeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  washTypeHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  pickerSubtextRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    marginLeft: 28,
  },
  subscriptionBadgeSmall: {
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  subscriptionTextSmall: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  
  // Wash Type Option Styles
  washTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface_container_high,
  },
  washTypeOptionSelected: {
    backgroundColor: colors.primary,
  },
  washTypeOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface_container_high,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  washTypeOptionInfo: {
    flex: 1,
  },
  washTypeOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text_primary,
  },
  washTypeOptionDesc: {
    fontSize: 14,
    color: colors.text_secondary,
    marginTop: 2,
  },
  washTypeOptionPrice: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  washTypeOptionPriceText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  washTypeOptionTextSelected: {
    color: colors.on_primary,
  },
});

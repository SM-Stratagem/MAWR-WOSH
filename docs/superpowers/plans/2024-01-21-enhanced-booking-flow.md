# Enhanced Booking Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the car wash booking flow into a 4-click process with wash detail popups, subscription options (15% discount), and summary screen.

**Architecture:** 
- New `WashDetailModal` component shows wash image, description, and subscription toggle
- Enhanced booking store manages subscription state (weekly/bi-weekly/monthly/one-time with 15% discount)
- New `SummaryScreen` displays selected items and handles conditional car/location flow
- Swipe gesture navigation added to all screens using React Native's PanResponder

**Tech Stack:** React Native, Expo Router, Zustand, Convex, React Native Gesture Handler

---

## File Structure

### New Files
- `apps/mobile/components/WashDetailModal.tsx` - Wash detail popup with image, description, subscription toggle
- `apps/mobile/app/summary.tsx` - Summary screen for booking confirmation
- `apps/mobile/constants/washImages.ts` - Wash type image URLs/descriptions mapping

### Modified Files
- `apps/mobile/app/(tabs)/index.tsx` - Add wash popup trigger, update wash card interactions
- `apps/mobile/lib/store.ts` - Add subscription options and pricing logic
- `apps/mobile/constants/theme.ts` - Add subscription colors if needed
- `apps/mobile/app/_layout.tsx` - Add swipe gesture provider (if needed)

---

## Task 1: Add Wash Type Images and Descriptions

**Files:**
- Create: `apps/mobile/constants/washImages.ts`
- Read: `apps/mobile/constants/theme.ts` (to check existing wash types)
- Read: `convex/washTypes.ts` (to understand backend wash types)

**Context:** 
Wash types in the app are: Basic Wash, Premium Wash, Full Detail. Each needs an image URL and description.

- [ ] **Step 1: Read current wash types from convex and frontend**

Read files:
- `/Users/suhayl/Downloads/Carwash/convex/washTypes.ts`
- `/Users/suhayl/Downloads/Carwash/apps/mobile/constants/theme.ts` (check washTypes export)

- [ ] **Step 2: Create washImages.ts with image URLs and descriptions**

```typescript
// apps/mobile/constants/washImages.ts

export interface WashTypeDetail {
  key: string;
  imageUrl: string;
  fullDescription: string;
  features: string[];
}

export const washTypeDetails: Record<string, WashTypeDetail> = {
  basic: {
    key: "basic",
    imageUrl: "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=800&auto=format&fit=crop",
    fullDescription: "Our Basic Wash includes exterior hand wash, wheel cleaning, and tire dressing. Perfect for maintaining your car's shine between deep cleans.",
    features: ["Hand wash exterior", "Wheel & tire cleaning", "Window cleaning", "Tire dressing"]
  },
  premium: {
    key: "premium",
    imageUrl: "https://images.unsplash.com/photo-1552930294-6b595f4c2974?w=800&auto=format&fit=crop",
    fullDescription: "Premium Wash adds interior vacuuming, dashboard wipe-down, and air freshener. The complete refresh your car deserves.",
    features: ["Everything in Basic", "Interior vacuuming", "Dashboard & console wipe", "Air freshener", "Door jam cleaning"]
  },
  detail: {
    key: "detail",
    imageUrl: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=800&auto=format&fit=crop",
    fullDescription: "Full Detail is our comprehensive service including leather conditioning, deep interior cleaning, wax protection, and engine bay detail.",
    features: ["Everything in Premium", "Leather conditioning", "Deep interior cleaning", "Wax protection", "Engine bay detail", "Paint protection"]
  }
};

// Subscription options
export interface SubscriptionPlan {
  key: "weekly" | "biweekly" | "monthly" | "one_time";
  label: string;
  washesPerMonth: number;
  discountPercent: number;
  description: string;
}

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    key: "weekly",
    label: "Weekly",
    washesPerMonth: 8,
    discountPercent: 15,
    description: "8 washes/month"
  },
  {
    key: "biweekly",
    label: "Bi-Weekly",
    washesPerMonth: 4,
    discountPercent: 15,
    description: "4 washes/month"
  },
  {
    key: "monthly",
    label: "Monthly",
    washesPerMonth: 2,
    discountPercent: 15,
    description: "2 washes/month"
  },
  {
    key: "one_time",
    label: "One Time",
    washesPerMonth: 1,
    discountPercent: 0,
    description: "Single wash"
  }
];
```

- [ ] **Step 3: Verify constants/theme.ts exports washTypes for compatibility**

Check that theme.ts has compatible washTypes structure. If different, note the difference for Task 4.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/constants/washImages.ts
git commit -m "feat: add wash type images and subscription plans"
```

---

## Task 2: Update Booking Store with Subscription State

**Files:**
- Modify: `apps/mobile/lib/store.ts`

- [ ] **Step 1: Read current store.ts to understand structure**

Read: `/Users/suhayl/Downloads/Carwash/apps/mobile/lib/store.ts`

- [ ] **Step 2: Add subscription state to BookingState interface**

Add to interface:
```typescript
subscriptionPlan: "weekly" | "biweekly" | "monthly" | "one_time" | null;
setSubscriptionPlan: (plan: "weekly" | "biweekly" | "monthly" | "one_time" | null) => void;
getDiscountedPrice: (basePrice: number) => number;
```

- [ ] **Step 3: Add subscription implementation to store**

```typescript
subscriptionPlan: null,
setSubscriptionPlan: (plan) => set({ subscriptionPlan: plan }),
getDiscountedPrice: (basePrice) => {
  const plan = get().subscriptionPlan;
  if (!plan || plan === "one_time") return basePrice;
  return Math.round(basePrice * 0.85); // 15% discount
},
```

- [ ] **Step 4: Update reset function to clear subscription**

Ensure `reset()` also clears `subscriptionPlan: null`.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/store.ts
git commit -m "feat: add subscription state to booking store"
```

---

## Task 3: Create WashDetailModal Component

**Files:**
- Create: `apps/mobile/components/WashDetailModal.tsx`

- [ ] **Step 1: Read theme.ts for color reference**

Quick check: `/Users/suhayl/Downloads/Carwash/apps/mobile/constants/theme.ts`

- [ ] **Step 2: Create WashDetailModal component**

```typescript
// apps/mobile/components/WashDetailModal.tsx
import React from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from "react-native";
import { colors, spacing, borderRadius } from "../constants/theme";
import { WashTypeDetail, SubscriptionPlan, washTypeDetails, subscriptionPlans } from "../constants/washImages";
import { useBookingStore } from "../lib/store";

const { width } = Dimensions.get("window");

interface WashDetailModalProps {
  visible: boolean;
  washType: { key: string; name: string; basePrice: number } | null;
  onClose: () => void;
  onBookNow: () => void;
}

export function WashDetailModal({ visible, washType, onClose, onBookNow }: WashDetailModalProps) {
  const { subscriptionPlan, setSubscriptionPlan, getDiscountedPrice } = useBookingStore();
  
  if (!washType) return null;
  
  const details = washTypeDetails[washType.key];
  if (!details) return null;
  
  const displayPrice = getDiscountedPrice(washType.basePrice);
  const hasDiscount = subscriptionPlan && subscriptionPlan !== "one_time";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            <Image source={{ uri: details.imageUrl }} style={styles.image} />
            
            <View style={styles.content}>
              <Text style={styles.title}>{washType.name}</Text>
              <Text style={styles.description}>{details.fullDescription}</Text>
              
              <View style={styles.featuresSection}>
                <Text style={styles.sectionTitle}>What's Included</Text>
                {details.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Text style={styles.checkmark}>✓</Text>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
              
              <View style={styles.subscriptionSection}>
                <Text style={styles.sectionTitle}>Subscribe & Save (15% Off)</Text>
                <View style={styles.plansContainer}>
                  {subscriptionPlans.map((plan) => (
                    <TouchableOpacity
                      key={plan.key}
                      style={[
                        styles.planOption,
                        subscriptionPlan === plan.key && styles.planOptionSelected,
                      ]}
                      onPress={() => setSubscriptionPlan(plan.key)}
                    >
                      <Text style={[
                        styles.planLabel,
                        subscriptionPlan === plan.key && styles.planLabelSelected,
                      ]}>
                        {plan.label}
                      </Text>
                      <Text style={[
                        styles.planDescription,
                        subscriptionPlan === plan.key && styles.planDescriptionSelected,
                      ]}>
                        {plan.description}
                      </Text>
                      {plan.discountPercent > 0 && (
                        <View style={styles.discountBadge}>
                          <Text style={styles.discountText}>-{plan.discountPercent}%</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={styles.priceSection}>
                {hasDiscount && (
                  <Text style={styles.originalPrice}>{washType.basePrice} AED</Text>
                )}
                <Text style={styles.price}>{displayPrice} AED</Text>
                {hasDiscount && (
                  <Text style={styles.savings}>Save {Math.round(washType.basePrice * 0.15)} AED</Text>
                )}
              </View>
            </View>
          </ScrollView>
          
          <View style={styles.footer}>
            <TouchableOpacity style={styles.bookButton} onPress={onBookNow}>
              <Text style={styles.bookButtonText}>Book Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: "90%",
    paddingTop: spacing.md,
  },
  closeButton: {
    position: "absolute",
    top: spacing.lg,
    right: spacing.lg,
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: borderRadius.full,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: colors.text_primary,
    fontSize: 18,
    fontWeight: "600",
  },
  image: {
    width: width,
    height: 240,
    resizeMode: "cover",
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text_primary,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: 14,
    color: colors.text_secondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  featuresSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text_primary,
    marginBottom: spacing.md,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  checkmark: {
    color: colors.success,
    fontSize: 16,
    fontWeight: "700",
    marginRight: spacing.sm,
  },
  featureText: {
    fontSize: 14,
    color: colors.text_primary,
  },
  subscriptionSection: {
    marginBottom: spacing.lg,
  },
  plansContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  planOption: {
    backgroundColor: colors.surface_container_low,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minWidth: (width - spacing.lg * 2 - spacing.sm * 3) / 2,
    alignItems: "center",
  },
  planOptionSelected: {
    backgroundColor: colors.primary,
  },
  planLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text_primary,
    marginBottom: 2,
  },
  planLabelSelected: {
    color: colors.on_primary,
  },
  planDescription: {
    fontSize: 12,
    color: colors.text_secondary,
  },
  planDescriptionSelected: {
    color: colors.on_primary,
    opacity: 0.8,
  },
  discountBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: colors.success,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: {
    color: colors.text_primary,
    fontSize: 10,
    fontWeight: "700",
  },
  priceSection: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  originalPrice: {
    fontSize: 16,
    color: colors.text_secondary,
    textDecorationLine: "line-through",
    marginBottom: spacing.xs,
  },
  price: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.primary,
  },
  savings: {
    fontSize: 14,
    color: colors.success,
    marginTop: spacing.xs,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface_container_low,
  },
  bookButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: "center",
  },
  bookButtonText: {
    color: colors.on_primary,
    fontSize: 16,
    fontWeight: "700",
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/WashDetailModal.tsx
git commit -m "feat: create WashDetailModal with subscription options"
```

---

## Task 4: Create Summary Screen

**Files:**
- Create: `apps/mobile/app/summary.tsx`
- Read: `apps/mobile/app/review.tsx` (reference structure)
- Read: `apps/mobile/app/(tabs)/cars.tsx` (reference car handling)

- [ ] **Step 1: Read reference files**

Read:
- `/Users/suhayl/Downloads/Carwash/apps/mobile/app/review.tsx`
- `/Users/suhayl/Downloads/Carwash/apps/mobile/app/(tabs)/cars.tsx`

- [ ] **Step 2: Create summary.tsx screen**

```typescript
// apps/mobile/app/summary.tsx
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
import { subscriptionPlans, washTypeDetails } from "../constants/washImages";

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
  
  const cars = useQuery("cars:listMyCars") || [];
  const addresses = useQuery("addresses:listMyAddresses") || [];
  const selectedCars = cars.filter((c: any) => selectedCarIds.includes(c._id));
  const selectedAddress = addresses.find((a: any) => a._id === selectedAddressId);
  
  const createBooking = useMutation("bookings:createBookingDraft");
  
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
      const bookingId = await createBooking({
        addressId: selectedAddress._id,
        washTypeId: selectedWashType.key, // Backend needs to resolve this
        carIds: selectedCarIds,
        isSubscription: subscriptionPlan !== "one_time" && !!subscriptionPlan,
        frequency: subscriptionPlan || "one_time",
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
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
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
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text_secondary,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: colors.surface_container_low,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  carRow: {
    marginBottom: spacing.sm,
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
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginTop: spacing.sm,
    alignSelf: "flex-start",
  },
  subscriptionText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600",
  },
  addCard: {
    backgroundColor: colors.surface_container_low,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: "dashed",
  },
  addCardText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  addCardSubtext: {
    fontSize: 12,
    color: colors.text_secondary,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
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
    marginVertical: spacing.sm,
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
    height: spacing.xl,
  },
  footer: {
    backgroundColor: colors.surface_container_low,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
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
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/summary.tsx
git commit -m "feat: create summary screen for booking confirmation"
```

---

## Task 5: Update Home Screen with Wash Popup

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`

- [ ] **Step 1: Read current index.tsx**

Read: `/Users/suhayl/Downloads/Carwash/apps/mobile/app/(tabs)/index.tsx`

- [ ] **Step 2: Add WashDetailModal import and state**

Add imports:
```typescript
import { WashDetailModal } from "../../components/WashDetailModal";
```

Add state:
```typescript
const [selectedWashForModal, setSelectedWashForModal] = useState<any>(null);
const [modalVisible, setModalVisible] = useState(false);
```

- [ ] **Step 3: Update wash type card onPress handler**

Change wash type card onPress from `selectWashType(wash)` to:
```typescript
onPress={() => {
  setSelectedWashForModal(wash);
  setModalVisible(true);
}}
```

- [ ] **Step 4: Add WashDetailModal component**

Add modal component at end of return:
```typescript
<WashDetailModal
  visible={modalVisible}
  washType={selectedWashForModal}
  onClose={() => {
    setModalVisible(false);
    setSelectedWashForModal(null);
  }}
  onBookNow={() => {
    setModalVisible(false);
    selectWashType(selectedWashForModal);
    router.push("/summary");
  }}
/>
```

- [ ] **Step 5: Update subscription frequency section removal**

Since subscription is now in the modal, remove the subscription frequency section from the home screen.

- [ ] **Step 6: Update "Continue" button logic**

If wash type is selected, "Continue" goes directly to summary:
```typescript
onPress={() => {
  if (selectedWashType && selectedCarIds.length > 0 && selectedAddressId) {
    router.push("/summary");
  } else {
    // Show what needs to be done
    if (!selectedWashType) Alert.alert("Select a wash type");
    else if (selectedCarIds.length === 0) router.push("/(tabs)/cars");
    else if (!selectedAddressId) router.push("/location");
  }
}}
```

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/app/(tabs)/index.tsx
git commit -m "feat: integrate WashDetailModal into home screen"
```

---

## Task 6: Add Swipe Gesture Navigation

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Read current _layout.tsx**

Read: `/Users/suhayl/Downloads/Carwash/apps/mobile/app/_layout.tsx`

- [ ] **Step 2: Install react-native-gesture-handler if needed**

```bash
cd /Users/suhayl/Downloads/Carwash/apps/mobile && npm install react-native-gesture-handler
```

- [ ] **Step 3: Create SwipeBackWrapper component**

Add to `_layout.tsx` or create separate component:
```typescript
import { useRouter, usePathname } from "expo-router";
import { PanGestureHandler, GestureHandlerRootView } from "react-native-gesture-handler";
import { Animated } from "react-native";

function SwipeBackProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const translateX = useRef(new Animated.Value(0)).current;
  
  const onGestureEvent = useCallback(
    Animated.event(
      [{ nativeEvent: { translationX: translateX } }],
      { useNativeDriver: true }
    ),
    []
  );
  
  const onHandlerStateChange = useCallback(
    (event: any) => {
      if (event.nativeEvent.translationX > 100 && event.nativeEvent.state === 5) {
        // Swiped right more than 100px, go back
        if (pathname !== "/(tabs)" && pathname !== "/") {
          router.back();
        }
      }
      // Reset animation
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    },
    [pathname, router, translateX]
  );
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={[-20, 20]}
      >
        <Animated.View style={{ flex: 1, transform: [{ translateX }] }}>
          {children}
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 4: Wrap the app in SwipeBackProvider**

Update `_layout.tsx` to wrap the Stack in SwipeBackProvider.

- [ ] **Step 5: Alternative simpler approach**

If gesture handler is complex, use screen options in router:
```typescript
<Stack.Screen
  name="summary"
  options={{
    gestureEnabled: true,
    gestureDirection: "horizontal",
  }}
/>
```

- [ ] **Step 6: Test swipe on summary screen**

Run app and test swiping right goes back.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/app/_layout.tsx
git commit -m "feat: add swipe gesture navigation"
```

---

## Task 7: Update Review Screen (Deprecate or Redirect)

**Files:**
- Modify: `apps/mobile/app/review.tsx`

- [ ] **Step 1: Update review.tsx to redirect to summary**

Since summary is the new review screen, either:
Option A: Delete review.tsx and update all references
Option B: Make review.tsx redirect to summary

Recommended Option B for safety:
```typescript
import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function ReviewScreen() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/summary");
  }, []);
  
  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/review.tsx
git commit -m "feat: redirect review screen to new summary screen"
```

---

## Task 8: End-to-End Testing

**Files:**
- Test all: Home, Summary, Car addition, Location addition

- [ ] **Step 1: Test wash popup flow**

1. Open app → Home
2. Tap wash type → Modal opens with image
3. Select subscription → Price updates
4. Tap Book Now → Goes to summary

- [ ] **Step 2: Test summary screen car flow**

1. Summary shows "Add Car" button
2. Tap → Goes to cars screen
3. Add car → Returns to summary
4. Car now shows in summary

- [ ] **Step 3: Test summary screen location flow**

1. Summary shows "Add Location" button
2. Tap → Goes to location screen
3. Add location → Returns to summary
4. Location now shows in summary

- [ ] **Step 4: Test complete booking**

1. Summary has car and location
2. Tap Confirm Booking
3. Booking created in backend
4. Redirected to tracking screen
5. Booking appears in bookings list

- [ ] **Step 5: Test swipe gestures**

1. Swipe right on summary → Goes back
2. Swipe right on location → Goes back
3. Swipe right on car screen → Goes back

- [ ] **Step 6: Run TypeScript check**

```bash
cd /Users/suhayl/Downloads/Carwash/apps/mobile && npx tsc --noEmit 2>&1 | grep -v "Argument of type 'string'" | head -20
```

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete enhanced booking flow with subscription and summary"
```

---

## Summary of Changes

### New Files:
1. `apps/mobile/constants/washImages.ts` - Wash images, descriptions, subscription plans
2. `apps/mobile/components/WashDetailModal.tsx` - Wash detail popup with subscription toggle
3. `apps/mobile/app/summary.tsx` - Summary screen for 4-click booking flow

### Modified Files:
1. `apps/mobile/lib/store.ts` - Add subscription state and pricing logic
2. `apps/mobile/app/(tabs)/index.tsx` - Add wash popup, update continue button
3. `apps/mobile/app/_layout.tsx` - Add swipe gesture navigation
4. `apps/mobile/app/review.tsx` - Redirect to summary

### Dependencies:
- `react-native-gesture-handler` (if not already installed)

---

**Next Steps After Implementation:**
- Verify Convex backend handles subscription frequency correctly
- Add subscription management screen (for viewing active subscriptions)
- Add push notifications for subscription reminders

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
import { washTypeDetails, subscriptionPlans } from "../constants/washImages";
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

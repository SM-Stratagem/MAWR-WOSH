import React, { useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius } from "../constants/theme";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

export interface NavItem {
  label: string;
  icon: IoniconsName;
  activeIcon: IoniconsName;
  route: string;
}

interface ModernBottomNavProps {
  items: NavItem[];
  activeRoute: string;
  onNavigate: (route: string) => void;
  accentColor?: string;
}

const NavItemComponent = ({
  item,
  isActive,
  onPress,
  accentColor,
}: {
  item: NavItem;
  isActive: boolean;
  onPress: () => void;
  accentColor: string;
}) => {
  const widthAnim = useRef(new Animated.Value(44)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(widthAnim, {
        toValue: isActive ? 110 : 44,
        useNativeDriver: false,
        friction: 8,
      }),
      Animated.timing(textOpacity, {
        toValue: isActive ? 1 : 0,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isActive]);

  const activeColor = accentColor || colors.accent;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Animated.View
        style={[
          styles.navItem,
          { width: widthAnim },
        ]}
      >
        <Ionicons
          name={isActive ? item.activeIcon : item.icon}
          size={20}
          color={isActive ? activeColor : colors.ink_dim}
        />
        <Animated.Text
          style={[
            styles.navLabel,
            { opacity: textOpacity, color: activeColor },
          ]}
          numberOfLines={1}
        >
          {item.label}
        </Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export function ModernBottomNav({
  items,
  activeRoute,
  onNavigate,
  accentColor = colors.accent,
}: ModernBottomNavProps) {
  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        {items.map((item) => (
          <NavItemComponent
            key={item.route}
            item={item}
            isActive={activeRoute === item.route}
            onPress={() => onNavigate(item.route)}
            accentColor={accentColor}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    alignItems: "center",
  },
  navBar: {
    flexDirection: "row",
    backgroundColor: colors.paper,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 1,
    borderColor: colors.line_soft + "50",
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 12,
    gap: 6,
  },
  navLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});

export const colors = {
  background: "#0e0e0e",
  surface: "#1a1919",
  surface_container_low: "#131313",
  surface_container: "#1a1919",
  surface_container_high: "#201f1f",
  surface_container_highest: "#262626",
  surface_bright: "#2c2c2c",
  surface_dim: "#0e0e0e",
  primary: "#cc97ff",
  primary_dim: "#9c48ea",
  primary_container: "#c284ff",
  on_primary: "#47007c",
  secondary: "#ba9ff9",
  tertiary: "#ff97b2",
  text_primary: "#ffffff",
  text_secondary: "#adaaaa",
  outline_variant: "#494847",
  ghost_border: "rgba(73, 72, 71, 0.15)",
  error: "#ff6e84",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
  shadow_primary: "rgba(132, 44, 211, 0.12)",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const washTypes = [
  {
    key: "basic",
    name: "Basic Wash",
    description: "Quick exterior clean",
    basePrice: 35,
    currency: "AED",
    durationMins: 30,
  },
  {
    key: "premium",
    name: "Premium Wash",
    description: "More thorough exterior and finishing",
    basePrice: 55,
    currency: "AED",
    durationMins: 45,
  },
  {
    key: "full_detail",
    name: "Full Detail",
    description: "High-end full service package",
    basePrice: 95,
    currency: "AED",
    durationMins: 75,
  },
];

export const subscriptionFrequencies = [
  { key: "one_time", label: "One-time" },
  { key: "weekly", label: "Weekly" },
  { key: "biweekly", label: "Biweekly" },
  { key: "monthly", label: "Monthly" },
];

export const bookingStatuses = {
  draft: { label: "Draft", color: colors.text_secondary },
  awaiting_payment: { label: "Awaiting Payment", color: colors.warning },
  confirmed: { label: "Confirmed", color: colors.primary },
  team_assigned: { label: "Team Assigned", color: colors.primary_container },
  on_the_way: { label: "On the Way", color: colors.primary_container },
  arrived: { label: "Arrived", color: colors.success },
  washing_in_progress: { label: "Washing", color: colors.success },
  completed: { label: "Completed", color: colors.success },
  canceled: { label: "Canceled", color: colors.danger },
  payment_failed: { label: "Payment Failed", color: colors.danger },
};

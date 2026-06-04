export const colors = {
  // Surface hierarchy — dark graphite
  background: "#242629",
  surface: "#2E3136",
  surface_container_low: "#2A2D31",
  surface_container: "#2E3136",
  surface_container_high: "#353940",
  surface_container_highest: "#3A3F45",
  surface_bright: "#353940",
  surface_dim: "#2A2D31",

  // Stitch aliases — dark
  bg: "#242629",
  bg_soft: "#2A2D31",
  bg_deep: "#353940",
  paper: "#2E3136",
  line: "#3A3F45",
  line_soft: "#353940",

  // Ink (text) — light on dark
  ink: "#F7F8F4",
  ink_soft: "#98A0A6",
  ink_dim: "#6B7280",
  on_ink: "#111315",

  // Accent — neon green
  accent: "#B8FF38",
  accent_deep: "#A6EA2F",
  accent_soft: "rgba(184,255,56,0.14)",
  on_accent: "#111315",

  // Legacy mappings
  primary: "#B8FF38",
  primary_dim: "#A6EA2F",
  primary_container: "rgba(184,255,56,0.14)",
  on_primary: "#111315",
  secondary: "#98A0A6",
  tertiary: "#6B7280",
  text_primary: "#F7F8F4",
  text_secondary: "#98A0A6",
  outline_variant: "#3A3F45",
  ghost_border: "rgba(58,63,69,0.4)",

  // Semantic — brighter for dark backgrounds
  error: "#FF5A5A",
  success: "#34D399",
  warning: "#FBBF24",
  danger: "#FF5A5A",
  good: "#34D399",
  warn: "#FBBF24",
  hot: "#FF5A5A",

  shadow_primary: "rgba(184,255,56,0.12)",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 48,
  xxl: 64,
};

export const borderRadius = {
  sm: 2,
  md: 4,
  lg: 12,
  xl: 24,
  full: 9999,
};

export const subscriptionFrequencies = [
  { key: "one_time", label: "One-time" },
  { key: "weekly", label: "Weekly" },
  { key: "biweekly", label: "Biweekly" },
  { key: "monthly", label: "Monthly" },
];

export const bookingStatuses = {
  draft: { label: "Draft", color: colors.ink_dim },
  booked: { label: "Booked", color: colors.warn },
  awaiting_payment: { label: "Awaiting Payment", color: colors.warn },
  confirmed: { label: "Confirmed", color: colors.accent },
  team_assigned: { label: "Team Assigned", color: colors.accent_soft },
  on_the_way: { label: "On the Way", color: colors.accent },
  arrived: { label: "Arrived", color: colors.good },
  washing_in_progress: { label: "Washing", color: colors.accent },
  completed: { label: "Completed", color: colors.good },
  canceled: { label: "Canceled", color: colors.hot },
  rejected: { label: "Rejected", color: colors.hot },
  payment_failed: { label: "Payment Failed", color: colors.hot },
};

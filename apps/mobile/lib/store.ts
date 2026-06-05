import { create } from "zustand";

interface BookingState {
  selectedCarIds: string[];
  selectedWashType: {
    key: string;
    name: string;
    basePrice: number;
    durationMins: number;
    washTypeId?: string;
  } | null;
  selectedAddressId: string | null;
  subscriptionPlan: "weekly" | "biweekly" | "monthly" | "one_time" | null;
  isSubscription: boolean; // keep for backward compat
  frequency: string; // keep for backward compat
  total: number;
  bookingId: string | null;
  scheduledWindow: "morning" | "afternoon" | "evening" | null;
  scheduledDate: number | null;
  setBookingData: (data: Partial<Omit<BookingState, 'setBookingData' | 'getDiscountedPrice'>>) => void;
  setSubscriptionPlan: (plan: "weekly" | "biweekly" | "monthly" | "one_time" | null) => void;
  getDiscountedPrice: (basePrice: number) => number;
  reset: () => void;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  selectedCarIds: [],
  selectedWashType: null,
  selectedAddressId: null,
  subscriptionPlan: null,
  isSubscription: false,
  frequency: "one_time",
  total: 0,
  bookingId: null,
  scheduledWindow: null,
  scheduledDate: null,

  setBookingData: (data) => set((state) => ({ ...state, ...data })),

  setSubscriptionPlan: (plan) => set({
    subscriptionPlan: plan,
    isSubscription: plan !== null && plan !== "one_time",
    frequency: plan || "one_time"
  }),

  getDiscountedPrice: (basePrice) => {
    const plan = get().subscriptionPlan;
    if (!plan || plan === "one_time") return basePrice;
    return Math.round(basePrice * 0.85); // 15% discount
  },

  reset: () =>
    set({
      selectedCarIds: [],
      selectedWashType: null,
      selectedAddressId: null,
      subscriptionPlan: null,
      isSubscription: false,
      frequency: "one_time",
      total: 0,
      bookingId: null,
      scheduledWindow: null,
      scheduledDate: null,
    }),
}));

interface AppState {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
}));

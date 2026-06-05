import { Tabs, usePathname, useRouter } from "expo-router";
import { View } from "react-native";
import { colors } from "../../constants/theme";
import { ModernBottomNav, NavItem } from "../../components/ModernBottomNav";

const navItems: NavItem[] = [
  { label: "Home", icon: "home-outline", activeIcon: "home", route: "index" },
  { label: "Garage", icon: "car-outline", activeIcon: "car", route: "cars" },
  { label: "Bookings", icon: "calendar-outline", activeIcon: "calendar", route: "bookings" },
  { label: "My Plan", icon: "card-outline", activeIcon: "card", route: "subscriptions" },
  { label: "Profile", icon: "person-outline", activeIcon: "person", route: "profile" },
];

export default function TabLayout() {
  const pathname = usePathname();
  const router = useRouter();

  const currentRoute = pathname.split("/").pop() || "index";

  const handleNavigate = (route: string) => {
    router.push("/" + route as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: "none" },
          tabBarButton: () => null,
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="cars" />
        <Tabs.Screen name="bookings" />
        <Tabs.Screen name="subscriptions" />
        <Tabs.Screen name="profile" />
      </Tabs>

      <ModernBottomNav
        items={navItems}
        activeRoute={currentRoute}
        onNavigate={handleNavigate}
        accentColor={colors.accent}
      />
    </View>
  );
}

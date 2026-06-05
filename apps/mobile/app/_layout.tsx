import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAuth } from "@clerk/clerk-expo";
import { Providers } from "../lib/providers";
import { colors } from "../constants/theme";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { usePushNotifications } from "../lib/usePushNotifications";

SplashScreen.preventAutoHideAsync();

const customTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text_primary,
    border: colors.surface_container,
    notification: colors.primary,
  },
};

function InitialLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  usePushNotifications();

  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
      setReady(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoaded || !ready) return;

    const inAuthGroup = segments[0] === "(tabs)" || segments[0] === "time" || segments[0] === "summary" || segments[0] === "confirm" || segments[0] === "tracking" || segments[0] === "location" || segments[0] === "review";

    if (isSignedIn && !inAuthGroup && segments[0] !== "team") {
      router.replace("/(tabs)");
    } else if (!isSignedIn && inAuthGroup) {
      router.replace("/welcome");
    }
  }, [isLoaded, isSignedIn, segments, ready]);

  if (!ready || !isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading WOSH...</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="time" />
      <Stack.Screen name="summary" />
      <Stack.Screen name="confirm" />
      <Stack.Screen name="tracking" />
      <Stack.Screen name="location" />
      <Stack.Screen name="review" />
      <Stack.Screen name="team" />
      <Stack.Screen name="privacy-policy" />
      <Stack.Screen name="terms-of-use" />
      <Stack.Screen name="delete-account" />
      <Stack.Screen name="subscribe" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <Providers>
          <ThemeProvider value={customTheme}>
            <StatusBar style="light" />
            <InitialLayout />
          </ThemeProvider>
        </Providers>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.text_secondary,
    marginTop: 16,
    fontSize: 16,
  },
});

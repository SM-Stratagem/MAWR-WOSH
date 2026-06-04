import { Stack } from "expo-router";

export default function TeamLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="index" />
      <Stack.Screen name="[bookingId]" />
    </Stack>
  );
}

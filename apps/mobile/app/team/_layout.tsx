import { Redirect, Stack, useSegments } from "expo-router";
import { useTeamStore } from "../../lib/teamStore";

export default function TeamLayout() {
  const session = useTeamStore((s) => s.session);
  const segments = useSegments();

  // Last segment under /team — e.g. ['team', 'login'] or ['team', '[bookingId]'].
  const last = segments[segments.length - 1];
  const isLoginRoute = last === "login";

  const sessionValid = !!session && session.expiresAt > Date.now();

  if (!sessionValid && !isLoginRoute) {
    return <Redirect href="/team/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="index" />
      <Stack.Screen name="[bookingId]" />
    </Stack>
  );
}

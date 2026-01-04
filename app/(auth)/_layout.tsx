import { Stack, Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Stack>
      <Stack.Screen name="auth" options={{ headerShown: false }} />
    </Stack>
  );
}

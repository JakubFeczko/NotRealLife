import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { AuthProvider } from "../lib/auth-context";
import { HabitProvider } from "../lib/habit-context";
import { RoadmapProvider } from "../lib/roadmap-context";

export default function RootLayout() {
  return (
    <AuthProvider>
      <HabitProvider>
        <RoadmapProvider>
          <StatusBar barStyle="dark-content" />
          <Stack screenOptions={{ headerShown: false }} />
        </RoadmapProvider>
      </HabitProvider>
    </AuthProvider>
  );
}

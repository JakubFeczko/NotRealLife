import { Stack, Redirect } from "expo-router";
import { StatusBar } from "react-native";
import { AuthProvider, useAuth } from "../lib/auth-context";

function RootNavigation() {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return <Redirect href="/(auth)/auth" />;
  }

  return <Redirect href="/(tabs)" />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar barStyle="dark-content" />
      <Stack screenOptions={{ headerShown: false }} />
      <RootNavigation />
    </AuthProvider>
  );
}
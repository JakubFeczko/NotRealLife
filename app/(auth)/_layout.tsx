import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/lib/auth-context";

export default function AuthLayout() {
  const { isLoggedIn } = useAuth();

  if (isLoggedIn) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}

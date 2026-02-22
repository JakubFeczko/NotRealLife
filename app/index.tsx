import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth-context";

function Index() {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return <Redirect href="/(tabs)" />;
}

export default Index;

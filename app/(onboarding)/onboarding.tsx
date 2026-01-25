import React from "react";
import { StyleSheet, Text, View, Dimensions } from "react-native";
import Onboarding from "react-native-onboarding-swiper";
import Lottie from "lottie-react-native";
import { useAuth } from "@/lib/auth-context";

const { width, height } = Dimensions.get("window");

export default function OnboardingScreen() {
  const { completeOnboarding } = useAuth();

  const handleDone = () => {
    completeOnboarding();
  };
  return (
    <View style={styles.container}>
      <Onboarding
        onDone={handleDone}
        onSkip={handleDone}
        containerStyles={{ paddingHorizontal: 15 }}
        pages={[
          {
            backgroundColor: "#fff",
            image: (
              <View style={styles.lottie}>
                <Lottie
                  source={require("../../assets/animations/Business_Analytics.json")}
                  autoPlay
                  loop
                  style={styles.lottieAnimation}
                />
              </View>
            ),
            title: "Bost Productivity",
            subtitle: "Everyday try to be more productive",
          },
          {
            backgroundColor: "#fff",
            image: (
              <View>
                <View style={styles.lottie}>
                  <Lottie
                    source={require("../../assets/animations/Metrics.json")}
                    autoPlay
                    loop
                    style={styles.lottieAnimation}
                  />
                </View>
              </View>
            ),
            title: "Welcome to the App",
            subtitle: "This is the first onboarding screen",
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  lottie: {
    width: width * 0.9,
    height: height * 0.5,
  },
  lottieAnimation: {
    width: "100%",
    height: "100%",
  },
});

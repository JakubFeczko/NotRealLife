import {
  Platform,
  StatusBar,
  StyleSheet,
} from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";
import { ScreenWrapperProps } from "@/types";

const ScreenWrapper = ({ style, children }: ScreenWrapperProps) => {
  return (
    <SafeAreaView
      style={[
        styles.container,
        style,
      ]}
      edges={["top", "bottom"]} // 🔥 kluczowe
    >
      <StatusBar barStyle="light-content" />
      {children}
    </SafeAreaView>
  );
};

export default ScreenWrapper;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral900,
  },
});
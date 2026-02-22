import { StyleSheet, TouchableOpacity, ViewStyle } from "react-native";
import React from "react";
import { useRouter } from "expo-router";
//import { Ionicons } from "@expo/vector-icons";
import { colors, radius } from "@/constants/theme";

type BackButtonProps = {
  style?: ViewStyle;
  iconSize?: number;
};

const BackButton = ({ style, iconSize = 22 }: BackButtonProps) => {
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => router.back()}
      activeOpacity={0.7}
      style={[styles.button, style]}
    >
      {/* <Ionicons
        name="chevron-back"
        size={iconSize}
        color={colors.text}
      /> */}
    </TouchableOpacity>
  );
};

export default BackButton;

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: radius._12,
    borderCurve: "continuous",

    backgroundColor: "rgba(255,255,255,0.06)", // 🔥 soft glass
    alignItems: "center",
    justifyContent: "center",

    // iOS shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,

    // Android
    elevation: 3,
  },
});
import React from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Pressable,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";

export default function Welcome() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bgAuraOne} />
      <View style={styles.bgAuraTwo} />
      <View style={styles.bgAuraThree} />

      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.brand}>NOT REAL LIFE</Text>
          <TouchableOpacity
            style={styles.signInChip}
            onPress={() => router.push("/(auth)/login")}
            activeOpacity={0.85}
          >
            <Text style={styles.signInText}>Mam konto</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.centerPanel}>
          <Text style={styles.systemBadge}>SYSTEM DASHBOARD</Text>
          <Text style={styles.mainTitle}>Cel. Plan. Progres.</Text>
          <Text style={styles.mainSubtitle}>
            Rozwijaj cele i nawyki w jednym systemie dziennych działań.
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Poziom</Text>
              <Text style={styles.statValue}>LV. 01</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Status</Text>
              <Text style={styles.statValue}>Aktywny</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Animated.View
            entering={FadeInDown.springify().damping(26).stiffness(80).mass(1.1).delay(140)}
            style={styles.ctaWrap}
          >
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push("/(auth)/register")}
            >
              <Text style={styles.primaryButtonText}>Rozpocznij progres</Text>
            </Pressable>
          </Animated.View>

          <Text style={styles.note}>Każdy dzień buduje Twój wynik.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#060B14" },
  bgAuraOne: {
    position: "absolute",
    top: -130,
    right: -70,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "#152B50",
    opacity: 0.65,
  },
  bgAuraTwo: {
    position: "absolute",
    bottom: -160,
    left: -80,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "#0E223F",
    opacity: 0.65,
  },
  bgAuraThree: {
    position: "absolute",
    top: 280,
    left: 140,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#1B4A76",
    opacity: 0.2,
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingTop: 14,
    paddingBottom: 26,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#8DD8FF",
    backgroundColor: "rgba(26,55,86,0.45)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  signInChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(8,16,28,0.88)",
    borderWidth: 1,
    borderColor: "#1D3554",
  },
  signInText: { color: "#E7F0FF", fontWeight: "700", fontSize: 13 },
  centerPanel: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: "rgba(10,20,36,0.86)",
    borderWidth: 1,
    borderColor: "#1F3A61",
  },
  systemBadge: {
    alignSelf: "flex-start",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    color: "#8DD8FF",
    backgroundColor: "rgba(26,55,86,0.45)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  mainTitle: {
    marginTop: 12,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900",
    color: "#F2F7FF",
  },
  mainSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#A8B9D7",
  },
  statsRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#0B1729",
    borderWidth: 1,
    borderColor: "#1F3A61",
  },
  statLabel: { fontSize: 12, color: "#8CA9D3", fontWeight: "700" },
  statValue: { marginTop: 3, fontSize: 16, color: "#EAF3FF", fontWeight: "900" },
  footer: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: "rgba(10,20,36,0.9)",
    borderWidth: 1,
    borderColor: "#1F3A61",
  },
  ctaWrap: { width: "100%" },
  primaryButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#6FD1FF",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { color: "#062038", fontWeight: "900", fontSize: 16 },
  note: {
    marginTop: 10,
    textAlign: "center",
    color: "#7992BA",
    fontSize: 12,
  },
});

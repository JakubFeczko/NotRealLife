import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function StatisticsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <View style={styles.bgTop} />
      <View style={styles.bgBottom} />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: 20,
          gap: 12,
        }}
      >
        <Text style={styles.brand}>Not Real Life</Text>
        <Text style={styles.title}>Statystyki</Text>
        <Text style={styles.subtitle}>Tu będziesz śledzić trend realizacji celów i nawyków.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Wkrótce dostępne</Text>
          <Text style={styles.cardText}>Planowane metryki:</Text>
          <Text style={styles.bullet}>• skuteczność dzienna i tygodniowa</Text>
          <Text style={styles.bullet}>• serie wykonanych nawyków</Text>
          <Text style={styles.bullet}>• postęp celów w czasie</Text>

          <View style={styles.buttonsWrap}>
            <Pressable style={styles.primaryBtn} onPress={() => router.push("/(tabs)/habbits")}> 
              <Text style={styles.primaryBtnText}>Pracuj na nawykach</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={() => router.push("/(tabs)/roadmap")}> 
              <Text style={styles.secondaryBtnText}>Przejdź do roadmap</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#060B14" },
  bgTop: {
    position: "absolute",
    top: -120,
    right: -40,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#152B50",
  },
  bgBottom: {
    position: "absolute",
    bottom: -140,
    left: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#0E223F",
  },
  brand: {
    alignSelf: "flex-start",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#8DD8FF",
    backgroundColor: "rgba(26,55,86,0.45)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  title: { fontSize: 30, lineHeight: 34, fontWeight: "900", color: "#F2F7FF" },
  subtitle: { fontSize: 14, lineHeight: 20, color: "#A8B9D7" },
  card: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#0A1424",
    borderWidth: 1,
    borderColor: "#1F3A61",
    gap: 8,
  },
  cardTitle: { fontSize: 20, fontWeight: "900", color: "#F2F7FF" },
  cardText: { fontSize: 13, color: "#A8B9D7", fontWeight: "700", marginTop: 4 },
  bullet: { fontSize: 14, color: "#E7F0FF", lineHeight: 20 },
  buttonsWrap: { gap: 10, marginTop: 8 },
  primaryBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#22354A",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  secondaryBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#0B1729",
    borderWidth: 1,
    borderColor: "#1F3A61",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { color: "#E7F0FF", fontWeight: "800", fontSize: 14 },
});

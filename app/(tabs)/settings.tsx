import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../lib/auth-context";
import { useRouter } from "expo-router";

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleSignOut = () => {
    Alert.alert(
      "Wylogować się?",
      "Będziesz musiał zalogować się ponownie.",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Wyloguj",
          style: "destructive",
          onPress: logOut,
        },
      ],
    );
  };

  const logOut = async () => {
    const err = await signOut();
    if (err) {
      Alert.alert("Wylogowano lokalnie", err);
    }
    router.replace("/(auth)/welcome");
  };

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
        <Text style={styles.title}>Ustawienia</Text>
        <Text style={styles.subtitle}>Ustaw preferencje i zarządzaj kontem.</Text>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Konto</Text>
          <SettingsRow label="Profil" meta="Wkrótce" />
          <Divider />
          <SettingsRow label="Powiadomienia" meta="Wkrótce" />
          <Divider />
          <SettingsRow label="Prywatność" meta="Wkrótce" />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Aplikacja</Text>
          <SettingsRow label="O aplikacji" meta="v1.0.0" />
          <Divider />
          <SettingsRow label="Wsparcie" meta="Wkrótce" />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Rozwój</Text>
          <SettingsRow
            label="Weekly Boss Review"
            meta="Test"
            onPress={() => router.push("/(tabs)/weekly-review" as never)}
          />
        </View>

        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
          onPress={handleSignOut}
        >
          <Text style={styles.logoutText}>Wyloguj się</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function SettingsRow({
  label,
  meta,
  onPress,
}: {
  label: string;
  meta?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <Text style={styles.rowText}>{label}</Text>
      <View style={styles.rowRight}>
        {meta ? <Text style={styles.metaText}>{meta}</Text> : null}
        <Text style={styles.rowArrow}>›</Text>
      </View>
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
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
  sectionCard: {
    borderRadius: 20,
    backgroundColor: "#0A1424",
    borderWidth: 1,
    borderColor: "#1F3A61",
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#F2F7FF",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowPressed: { backgroundColor: "#0F1B2E" },
  rowText: { fontSize: 15, fontWeight: "700", color: "#EAF3FF" },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  metaText: { fontSize: 12, color: "#7992BA", fontWeight: "700" },
  rowArrow: { fontSize: 20, color: "#8CA9D3", fontWeight: "800" },
  divider: {
    height: 1,
    backgroundColor: "#1F3A61",
    marginLeft: 16,
  },
  logoutBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#2A1320",
    borderWidth: 1,
    borderColor: "#6A2A3F",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutBtnPressed: { backgroundColor: "#341827" },
  logoutText: { color: "#FFB0C2", fontWeight: "900", fontSize: 15 },
});

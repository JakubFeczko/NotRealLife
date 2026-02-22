import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth-context";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [loginOrEmail, setLoginOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!loginOrEmail || !password) {
      setError("Uzupełnij login/e-mail i hasło.");
      return;
    }

    setLoading(true);
    setError(null);

    const err = await signIn(loginOrEmail.trim(), password);
    setLoading(false);

    if (err) {
      setError(err);
      return;
    }

    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bgAuraOne} />
      <View style={styles.bgAuraTwo} />
      <View style={styles.bgAuraThree} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Powrót</Text>
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.systemBadge}>SYSTEM INTERFACE</Text>
            <Text style={styles.title}>Aktywuj panel celów</Text>
            <Text style={styles.subtitle}>
              Zaloguj się, aby odblokować cele, nawyki i progres poziomu.
            </Text>
          </View>

          <View style={styles.levelPanel}>
            <Text style={styles.levelLabel}>Twoj poziom startowy</Text>
            <Text style={styles.levelValue}>LV. 01</Text>
            <View style={styles.levelTrack}>
              <View style={styles.levelFill} />
            </View>
            <Text style={styles.levelHint}>Nastepny level po serii wykonanych zadan</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>LOGIN LUB E-MAIL</Text>
            <TextInput
              style={styles.input}
              placeholder="login / email"
              placeholderTextColor="#7A87A6"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={loginOrEmail}
              onChangeText={setLoginOrEmail}
            />

            <Text style={styles.label}>HASLO</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Twoje haslo"
                placeholderTextColor="#7A87A6"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable onPress={() => setShowPassword((prev) => !prev)}>
                <Text style={styles.passwordToggle}>
                  {showPassword ? "Ukryj" : "Pokaz"}
                </Text>
              </Pressable>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.primaryBtnText}>
                {loading ? "Logowanie..." : "Wejdz do systemu"}
              </Text>
            </Pressable>

            <Text style={styles.supportText}>Kazde wykonane zadanie zwieksza twoj poziom.</Text>

            <Pressable onPress={() => router.push("/(auth)/register")}>
              <Text style={styles.link}>Nie masz konta? Rozpocznij progres</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: "#060B14" },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 12,
  },
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
    top: 220,
    left: 180,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#1B4A76",
    opacity: 0.25,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(8,16,28,0.88)",
    borderWidth: 1,
    borderColor: "#1D3554",
  },
  backText: { color: "#E7F0FF", fontWeight: "700", fontSize: 13 },
  header: { gap: 6 },
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
  title: {
    fontSize: 31,
    lineHeight: 36,
    fontWeight: "900",
    color: "#F2F7FF",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#A8B9D7",
    maxWidth: 330,
  },
  levelPanel: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1B3659",
    backgroundColor: "rgba(9,18,32,0.82)",
    padding: 14,
  },
  levelLabel: { fontSize: 12, color: "#8CA9D3", fontWeight: "700" },
  levelValue: {
    marginTop: 2,
    fontSize: 24,
    fontWeight: "900",
    color: "#BEE6FF",
    letterSpacing: 0.5,
  },
  levelTrack: {
    marginTop: 8,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#11233E",
    overflow: "hidden",
  },
  levelFill: {
    width: "24%",
    height: "100%",
    backgroundColor: "#6FD1FF",
  },
  levelHint: { marginTop: 7, color: "#7D93BB", fontSize: 12 },
  card: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: "rgba(10,20,36,0.9)",
    borderWidth: 1,
    borderColor: "#1F3A61",
    shadowColor: "#5FAEF0",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  label: {
    marginTop: 8,
    marginBottom: 6,
    fontSize: 11,
    letterSpacing: 0.9,
    fontWeight: "700",
    color: "#7D93BB",
  },
  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1F3A61",
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#EAF3FF",
    backgroundColor: "#0B1729",
  },
  passwordRow: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1F3A61",
    paddingHorizontal: 14,
    backgroundColor: "#0B1729",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  passwordInput: {
    flex: 1,
    color: "#EAF3FF",
    fontSize: 14,
    paddingRight: 8,
  },
  passwordToggle: {
    color: "#8DD8FF",
    fontWeight: "700",
    fontSize: 12,
  },
  error: {
    color: "#FF7A7A",
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
  },
  primaryBtn: {
    marginTop: 18,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#6FD1FF",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: "#062038", fontWeight: "900", fontSize: 16 },
  supportText: {
    marginTop: 12,
    textAlign: "center",
    color: "#7992BA",
    fontSize: 12,
  },
  link: {
    marginTop: 10,
    textAlign: "center",
    color: "#BEE6FF",
    fontSize: 13,
    fontWeight: "800",
  },
});

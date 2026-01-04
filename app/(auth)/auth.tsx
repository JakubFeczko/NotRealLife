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

import { useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignInScreen() {

  const [isSignUp, setIsiSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>("");

  const theme = useTheme();

  const handleAuth = async () => {
    if(!email || !password){
      setError("Proszę wypełnić wszystkie pola.");
      return;
    };

    if(password.length < 6){
      setError("Hasło musi mieć co najmniej 6 znaków.");
      return;
    };
    
    setError(null);
  };

  const handleSwitchMode = () => {
    setIsiSignUp((prev) => !prev);
  };

  

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Text style={styles.logoMark}>〰</Text>
            </View>

            <Text style={styles.brand}>Not Real Life</Text>
            <Text style={styles.subtitle}>
              Zaloguj się i zacznij zyc na 100%.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{isSignUp ? "Rejestracja" : "Logowanie"}</Text>

            <Text style={styles.label}>E-mail</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="np. example@gmail.com"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={styles.input}
            />

            <Text style={[styles.label, { marginTop: 14 }]}>Hasło</Text>
            <View style={styles.passwordRow}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Minimum 6 znaków"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                style={[styles.input, styles.passwordInput]}
              />
              <Pressable style={styles.showBtn} onPress={() => {}}>
                <Text style={styles.showText}>Pokaż</Text>
              </Pressable>
              {error ? <Text style={{ color: theme.colors.error, marginTop: 8 }}>{error}</Text> : null}
            </View>

            <Pressable style={styles.primaryBtn} onPress={() => {handleAuth();}}>
              <Text style={styles.primaryBtnText}>{isSignUp ? "Utwórz konto" : "Zaloguj się"}</Text>
            </Pressable>

            <View style={styles.linksRow}>
              <Pressable onPress={() => {}}>
                <Text style={styles.link}>{isSignUp ? "" : "Nie pamiętasz hasła?"}</Text>
              </Pressable>
              <Pressable onPress={() => { handleSwitchMode(); }}>
                <Text style={styles.link}>{isSignUp ? "Zaloguj się" : "Utwórz konto"}</Text>
              </Pressable>
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>lub</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable style={styles.socialBtn} onPress={() => {}}>
              <Text style={styles.socialIcon}>G</Text>
              <Text style={styles.socialText}>Kontynuuj z Google</Text>
            </Pressable>

            <Pressable style={styles.socialBtn} onPress={() => {}}>
              <Text style={styles.socialIcon}></Text>
              <Text style={styles.socialText}>Kontynuuj z Apple</Text>
            </Pressable>

            <Text style={styles.disclaimer}>
              {isSignUp ? "Rejestrując " : "Logując "}się akceptujesz regulamin i politykę prywatności.
            </Text>
          </View>

          <Text style={styles.tip}>
            Tip: zapisuj swoje działania codziennie o tej samej porze — łatwiej zobaczysz
            trend.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: "#FFFFFF" },

  container: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 26,
  },

  header: {
    alignItems: "center",
    marginTop: 6,
    marginBottom: 16,
  },
  logoBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  logoMark: { fontSize: 22, color: "#0B0B0F" },

  brand: {
    marginTop: 10,
    fontSize: 30,
    fontWeight: "800",
    color: "#0B0B0F",
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },

  card: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0B0B0F",
    marginBottom: 12,
  },

  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },

  input: {
    height: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
    color: "#0B0B0F",
  },

  passwordRow: { position: "relative" },
  passwordInput: { paddingRight: 74 },
  showBtn: {
    position: "absolute",
    right: 10,
    top: 7,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B0B0F",
  },
  showText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },

  primaryBtn: {
    marginTop: 18,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#0B0B0F",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 0.2,
  },

  linksRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  link: {
    color: "#111827",
    fontWeight: "800",
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
  },

  socialBtn: {
    height: 50,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 10,
  },
  socialIcon: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0B0B0F",
    width: 22,
    textAlign: "center",
  },
  socialText: { fontSize: 14, fontWeight: "900", color: "#0B0B0F" },

  disclaimer: {
    marginTop: 8,
    fontSize: 11,
    color: "#6B7280",
    lineHeight: 16,
    textAlign: "center",
  },

  tip: {
    marginTop: 14,
    textAlign: "center",
    color: "#6B7280",
    lineHeight: 18,
    paddingHorizontal: 10,
  },
});
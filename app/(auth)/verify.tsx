import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/lib/auth-context";

const CODE_LENGTH = 5;
const RESEND_SECONDS = 60;

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyEmail } = useAuth();
  const router = useRouter();

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [error, setError] = useState<string | null>(null);

  const inputs = useRef<TextInput[]>([]);

  useEffect(() => {
    if (seconds === 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const handleChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;

    const next = [...code];
    next[index] = value;
    setCode(next);

    if (value && index < CODE_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    if (!code.every(Boolean)) {
      setError("Wpisz pełny kod");
      return;
    }

    const finalCode = code.join("");
    const err = await verifyEmail(email!, finalCode);
    if (err) {
      setError(err);
      return;
    }

    Alert.alert("Konto zweryfikowane", "Możesz się teraz zalogować.", [
      {
        text: "OK",
        onPress: () => {
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const handleResend = () => {
    if (seconds > 0) return;
    setSeconds(RESEND_SECONDS);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bgTop} />
      <View style={styles.bgBottom} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.brand}>Not Real Life</Text>
            <Text style={styles.title}>Potwierdź konto i działaj</Text>
            <Text style={styles.subtitle}>Wpisz kod wysłany na e-mail.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.description}>
              Wysłaliśmy 5-cyfrowy kod na <Text style={styles.email}>{email}</Text>
            </Text>

            <View style={styles.codeRow}>
              {code.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(ref) => {
                    if (ref) inputs.current[i] = ref;
                  }}
                  value={digit}
                  onChangeText={(v) => handleChange(v, i)}
                  onKeyPress={({ nativeEvent }) =>
                    handleKeyPress(nativeEvent.key, i)
                  }
                  keyboardType="number-pad"
                  maxLength={1}
                  style={[styles.codeInput, digit && styles.codeInputActive]}
                />
              ))}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable style={styles.primaryBtn} onPress={handleSubmit}>
              <Text style={styles.primaryBtnText}>Potwierdź kod</Text>
            </Pressable>

            <Pressable onPress={handleResend} style={styles.resend}>
              <Text style={styles.resendText}>
                Kod nie dotarł?{" "}
                <Text
                  style={
                    seconds === 0 ? styles.resendActive : styles.resendDisabled
                  }
                >
                  Wyślij ponownie
                  {seconds > 0 ? ` (${seconds}s)` : ""}
                </Text>
              </Text>
            </Pressable>

            <Text style={styles.supportText}>Każdy nawyk zaczyna się od jednej decyzji.</Text>
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
    paddingTop: 18,
    paddingBottom: 28,
    gap: 16,
  },
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
  header: { gap: 6 },
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
  },
  card: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: "#0A1424",
    borderWidth: 1,
    borderColor: "#1F3A61",
    shadowColor: "#606A5D",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  description: {
    fontSize: 13,
    color: "#A8B9D7",
    lineHeight: 19,
    marginBottom: 16,
  },
  email: {
    color: "#F2F7FF",
    fontWeight: "800",
  },
  codeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  codeInput: {
    width: 52,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1F3A61",
    backgroundColor: "#0B1729",
    textAlign: "center",
    fontSize: 20,
    fontWeight: "800",
    color: "#F2F7FF",
  },
  codeInputActive: {
    borderColor: "#6FD1FF",
  },
  error: {
    color: "#C63B3B",
    marginBottom: 8,
    fontSize: 12,
    fontWeight: "600",
  },
  primaryBtn: {
    marginTop: 6,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#22354A",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },
  resend: {
    marginTop: 12,
    alignItems: "center",
  },
  resendText: {
    fontSize: 13,
    color: "#A8B9D7",
    textAlign: "center",
  },
  resendActive: {
    color: "#E7F0FF",
    fontWeight: "800",
  },
  resendDisabled: {
    color: "#98A398",
    fontWeight: "700",
  },
  supportText: {
    marginTop: 12,
    textAlign: "center",
    color: "#7992BA",
    fontSize: 12,
  },
});

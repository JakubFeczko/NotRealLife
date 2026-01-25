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
    console.log("VERIFY:", email, finalCode);

    const err = await verifyEmail(email!, finalCode);
    if (err) {
      setError(err);
      return;
    }
    Alert.alert(
      "Konto zweryfikowane",
      "Możesz się teraz zalogować.",
      [
        {
          text: "OK",
          onPress: () => {
            router.replace("/auth");
          },
        },
      ],
      { cancelable: false },
    );
  };

  const handleResend = () => {
    if (seconds > 0) return;
    setSeconds(RESEND_SECONDS);
    // resendVerificationCode(email!)
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
            <Text style={styles.brand}>Not Real Life</Text>
            <Text style={styles.subtitle}>Podaj kod wysłany na maila</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Weryfikacja e-maila</Text>

            <Text style={styles.description}>
              Na adres <Text style={styles.email}>{email}</Text> wysłaliśmy
              5-cyfrowy kod aktywacyjny.
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

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable style={styles.primaryBtn} onPress={handleSubmit}>
              <Text style={styles.primaryBtnText}>Dalej</Text>
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
          </View>
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
    marginBottom: 16,
  },

  brand: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0B0B0F",
  },

  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
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
    marginBottom: 8,
  },

  description: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
    marginBottom: 18,
  },

  email: {
    color: "#0B0B0F",
    fontWeight: "800",
  },

  codeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  codeInput: {
    width: 52,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
    textAlign: "center",
    fontSize: 20,
    fontWeight: "800",
    color: "#0B0B0F",
  },

  codeInputActive: {
    borderColor: "#0B0B0F",
  },

  error: {
    color: "#EF4444",
    marginBottom: 8,
    fontSize: 12,
  },

  primaryBtn: {
    marginTop: 10,
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
  },

  resend: {
    marginTop: 12,
    alignItems: "center",
  },

  resendText: {
    fontSize: 12,
    color: "#6B7280",
  },

  resendActive: {
    color: "#0B0B0F",
    fontWeight: "800",
  },

  resendDisabled: {
    color: "#9CA3AF",
  },
});

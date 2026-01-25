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
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../lib/auth-context";

export default function SignInScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <AuthLayout>
      {mode === "login" ? (
        <LoginForm onSwitch={() => setMode("register")} />
      ) : (
        <RegisterForm onSwitch={() => setMode("login")} />
      )}
    </AuthLayout>
  );
}

function AuthLayout({ children }: { children: React.ReactNode }) {
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
              Zaloguj się i zacznij żyć na 100%.
            </Text>
          </View>

          {children}

          <Text style={styles.tip}>
            Tip: zapisuj swoje działania codziennie o tej samej porze — łatwiej
            zobaczysz trend.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const { signIn } = useAuth();
  const theme = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Proszę wypełnić wszystkie pola.");
      return;
    }

    const err = await signIn(email, password);
    if (err) setError(err);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Logowanie</Text>

      <EmailOrUsernameInput value={email} onChange={setEmail} />
      <PasswordInput value={password} onChange={setPassword} />

      {error && <Text style={{ color: theme.colors.error }}>{error}</Text>}

      <Pressable style={styles.primaryBtn} onPress={handleLogin}>
        <Text style={styles.primaryBtnText}>Zaloguj się</Text>
      </Pressable>

      <View style={styles.linksRow}>
        <Text style={styles.link}>Nie pamiętasz hasła?</Text>
        <Pressable onPress={onSwitch}>
          <Text style={styles.link}>Utwórz konto</Text>
        </Pressable>
      </View>

      <AuthSocials />

      <Text style={styles.disclaimer}>
        Logując się akceptujesz regulamin i politykę prywatności.
      </Text>
    </View>
  );
}

function RegisterForm({ onSwitch }: { onSwitch: () => void }) {
  const { signUp } = useAuth();
  const router = useRouter();
  const theme = useTheme();

  const [email, setEmail] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    const errors = validatePassword(password);

    if (errors.length > 0) {
      setError(errors.join("\n"));
      return;
    }

    if (!email || !password || !login) {
      setError("Proszę wypełnić wszystkie pola.");
      return;
    }

    const err = await signUp(email, login, password);
    if (err) {
      setError(err);
      return;
    }

    router.push({
      pathname: "/verify",
      params: { email },
    });
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Rejestracja</Text>

      <EmailOnlyInput value={email} onChange={setEmail} />
      <AccountNameInput value={login} onChange={setLogin} />
      <PasswordInput value={password} onChange={setPassword} />

      {error && <Text style={{ color: theme.colors.error }}>{error}</Text>}

      <Pressable style={styles.primaryBtn} onPress={handleRegister}>
        <Text style={styles.primaryBtnText}>Utwórz konto</Text>
      </Pressable>

      <View style={styles.linksRow}>
        <Text style={styles.link} />
        <Pressable onPress={onSwitch}>
          <Text style={styles.link}>Zaloguj się</Text>
        </Pressable>
      </View>

      <AuthSocials />

      <Text style={styles.disclaimer}>
        Rejestrując się akceptujesz regulamin i politykę prywatności.
      </Text>
    </View>
  );
}

function EmailOnlyInput({ value, onChange }: any) {
  return (
    <>
      <Text style={styles.label}>E-mail</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="E-mail"
        placeholderTextColor="#9CA3AF"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        style={styles.input}
      />
    </>
  );
}

function EmailOrUsernameInput({ value, onChange }: any) {
  return (
    <>
      <Text style={styles.label}>E-mail or username</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="E-mail or username"
        placeholderTextColor="#9CA3AF"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        style={styles.input}
      />
    </>
  );
}

function AccountNameInput({ value, onChange }: any) {
  return (
    <>
      <Text style={styles.label}>Nazwa</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Username"
        placeholderTextColor="#9CA3AF"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
    </>
  );
}

function PasswordInput({ value, onChange }: any) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Text style={[styles.label, { marginTop: 14 }]}>Hasło</Text>

      <View style={styles.passwordRow}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="Password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!visible}
          style={[styles.input, styles.passwordInput]}
        />

        <Pressable style={styles.showBtn} onPress={() => setVisible((v) => !v)}>
          <Text style={styles.showText}>{visible ? "Ukryj" : "Pokaż"}</Text>
        </Pressable>
      </View>
    </>
  );
}

function AuthSocials() {
  return (
    <>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>lub</Text>
        <View style={styles.dividerLine} />
      </View>

      <Pressable style={styles.socialBtn}>
        <Text style={styles.socialIcon}>G</Text>
        <Text style={styles.socialText}>Kontynuuj z Google</Text>
      </Pressable>

      <Pressable style={styles.socialBtn}>
        <Text style={styles.socialIcon}></Text>
        <Text style={styles.socialText}>Kontynuuj z Apple</Text>
      </Pressable>
    </>
  );
}

function validatePassword(password: string) {
  const errors: string[] = [];

  if (password.length < 6) {
    errors.push("Hasło musi mieć co najmniej 6 znaków.");
    return errors;
  }

  if (/\s/.test(password)) {
    errors.push("Hasło nie może zawierać spacji.");
    return errors;
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Hasło musi zawierać przynajmniej jedną cyfrę.");
    return errors;
  }

  if (!/[a-zA-Z]/.test(password)) {
    errors.push("Hasło musi zawierać przynajmniej jedną literę.");
    return errors;
  }

  // opcjonalnie: wielka litera
  if (!/[A-Z]/.test(password)) {
    errors.push("Hasło powinno zawierać przynajmniej jedną wielką literę.");
    return errors;
  }

  // opcjonalnie: znak specjalny
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Hasło powinno zawierać przynajmniej jeden znak specjalny.");
    return errors;
  }

  return errors;
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

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../lib/auth-context";

export default function SettingsScreen() {
  const { signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert(
      "Wylogować się?",
      "Będziesz musiał zalogować się ponownie.",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Wyloguj",
          style: "destructive",
          onPress: signOut,
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Ustawienia</Text>

        <View style={styles.card}>
          <SettingsRow label="Profil" />
          <Divider />
          <SettingsRow label="Powiadomienia" />
          <Divider />
          <SettingsRow label="O aplikacji" />
          <Divider />
          <SettingsRow
            label="Wyloguj się"
            destructive
            onPress={handleSignOut}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function SettingsRow({
  label,
  onPress,
  destructive = false,
}: {
  label: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
      ]}
    >
      <Text
        style={[
          styles.rowText,
          destructive && styles.destructiveText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  container: {
    padding: 18,
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0B0B0F",
    marginBottom: 12,
  },

  card: {
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  row: {
    paddingVertical: 16,
    paddingHorizontal: 18,
  },

  rowPressed: {
    backgroundColor: "#F3F4F6",
  },

  rowText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  destructiveText: {
    color: "#DC2626",
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginLeft: 18,
  },
});
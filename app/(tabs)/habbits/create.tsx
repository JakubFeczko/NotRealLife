import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useHabits } from "@/lib/habit-context";
import { GoalDomain, GOAL_DOMAIN_LABELS, GOAL_DOMAIN_ORDER, TimeOfDay } from "@/lib/roadmap-types";
import { todayIsoDate } from "@/lib/habit-types";

export default function CreateHabitScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { createCustomHabit } = useHabits();

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(todayIsoDate());
  const [everyNDays, setEveryNDays] = useState("1");
  const [durationDays, setDurationDays] = useState("");
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay | undefined>();
  const [domain, setDomain] = useState<GoalDomain>("career");
  const [impact, setImpact] = useState(3);
  const [difficulty, setDifficulty] = useState(2);
  const [error, setError] = useState<string | null>(null);

  const saveHabit = async () => {
    if (!title.trim()) {
      setError("Podaj nazwę nawyku.");
      return;
    }

    const every = Math.max(1, Number(everyNDays.replace(/[^0-9]/g, "")) || 1);
    const durationRaw = Number(durationDays.replace(/[^0-9]/g, "")) || 0;

    await createCustomHabit({
      title: title.trim(),
      domain,
      startDate: startDate || todayIsoDate(),
      everyNDays: every,
      durationDays: durationRaw > 0 ? durationRaw : undefined,
      impact,
      difficulty,
      timeOfDay,
      completions: [],
    });

    router.replace("/(tabs)/habbits");
  };

  return (
    <View style={styles.screen}>
      <View style={styles.bgTop} />
      <View style={styles.bgBottom} />

      <View style={[styles.stickyTop, { paddingTop: insets.top + 8 }]}> 
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.ghostBtn}>
            <Text style={styles.ghostText}>← Wróć</Text>
          </Pressable>
          <Pressable onPress={saveHabit} style={styles.primaryBtnSmall}>
            <Text style={styles.primaryBtnSmallText}>Zapisz nawyk</Text>
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 86,
            paddingBottom: insets.bottom + 120,
            paddingHorizontal: 20,
            gap: 12,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.brand}>Not Real Life</Text>
          <Text style={styles.title}>Nowy nawyk</Text>
          <Text style={styles.subtitle}>
            Ustaw nawyk pod swój cel. Możesz określić cykliczność i porę dnia.
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>NAZWA</Text>
            <TextInput
              style={styles.input}
              placeholder="Np. 30 min nauki angielskiego"
              placeholderTextColor="#8A93A8"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>START (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="2026-02-16"
              placeholderTextColor="#8A93A8"
              value={startDate}
              onChangeText={setStartDate}
            />

            <Text style={styles.label}>OBSZAR</Text>
            <View style={styles.chipsRow}>
              {GOAL_DOMAIN_ORDER.map((domainItem) => (
                <FilterChip
                  key={domainItem}
                  selected={domain === domainItem}
                  onPress={() => setDomain(domainItem)}
                >
                  {GOAL_DOMAIN_LABELS[domainItem]}
                </FilterChip>
              ))}
            </View>

            <Text style={styles.label}>WPŁYW (XP)</Text>
            <View style={styles.scaleRow}>
              {[1, 2, 3, 4, 5].map((value) => (
                <FilterChip key={value} selected={impact === value} onPress={() => setImpact(value)}>
                  {value}
                </FilterChip>
              ))}
            </View>

            <Text style={styles.label}>TRUDNOŚĆ</Text>
            <View style={styles.scaleRow}>
              {[1, 2, 3].map((value) => (
                <FilterChip
                  key={value}
                  selected={difficulty === value}
                  onPress={() => setDifficulty(value)}
                >
                  {value}
                </FilterChip>
              ))}
            </View>

            <View style={styles.twoCols}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>CO ILE DNI</Text>
                <TextInput
                  style={styles.input}
                  value={everyNDays}
                  onChangeText={setEveryNDays}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor="#8A93A8"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>DŁUGOŚĆ (DNI)</Text>
                <TextInput
                  style={styles.input}
                  value={durationDays}
                  onChangeText={setDurationDays}
                  keyboardType="numeric"
                  placeholder="np. 30 (opcjonalnie)"
                  placeholderTextColor="#8A93A8"
                />
              </View>
            </View>

            <Text style={styles.label}>PORA DNIA (OPCJONALNIE)</Text>
            <View style={styles.chipsRow}>
              <FilterChip
                selected={timeOfDay === "morning"}
                onPress={() => setTimeOfDay(timeOfDay === "morning" ? undefined : "morning")}
              >
                Rano
              </FilterChip>
              <FilterChip
                selected={timeOfDay === "afternoon"}
                onPress={() => setTimeOfDay(timeOfDay === "afternoon" ? undefined : "afternoon")}
              >
                Popołudnie
              </FilterChip>
              <FilterChip
                selected={timeOfDay === "evening"}
                onPress={() => setTimeOfDay(timeOfDay === "evening" ? undefined : "evening")}
              >
                Wieczór
              </FilterChip>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function FilterChip({
  children,
  selected,
  onPress,
}: {
  children: React.ReactNode;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{children}</Text>
    </Pressable>
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
  stickyTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 20,
    paddingBottom: 8,
    backgroundColor: "rgba(6,11,20,0.95)",
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ghostBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#0A1424",
    borderWidth: 1,
    borderColor: "#DFE3D2",
  },
  ghostText: { color: "#E7F0FF", fontWeight: "700", fontSize: 13 },
  primaryBtnSmall: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#22354A",
  },
  primaryBtnSmallText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  flex: { flex: 1 },
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
    padding: 14,
    backgroundColor: "#0A1424",
    borderWidth: 1,
    borderColor: "#1F3A61",
    gap: 10,
  },
  label: {
    marginTop: 4,
    marginBottom: 2,
    fontSize: 11,
    letterSpacing: 0.9,
    fontWeight: "700",
    color: "#7D93BB",
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1F3A61",
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#F2F7FF",
    backgroundColor: "#0B1729",
  },
  twoCols: { flexDirection: "row", gap: 10 },
  chipsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  scaleRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1F3A61",
    backgroundColor: "#0A1424",
  },
  chipSelected: { backgroundColor: "#1A3556", borderColor: "#6FD1FF" },
  chipText: { color: "#A8B9D7", fontSize: 12, fontWeight: "700" },
  chipTextSelected: { color: "#EAF3FF" },
  error: { color: "#C63B3B", fontSize: 12, fontWeight: "700", marginTop: 4 },
});

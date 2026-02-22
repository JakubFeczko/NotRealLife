import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useRoadmaps } from "@/lib/roadmap-context";
import { GOAL_DOMAIN_LABELS, GOAL_DOMAIN_ORDER, GoalDomain } from "@/lib/roadmap-types";

export default function WeeklyReviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { submitWeeklyReview, getWeeklyReviewForCurrentWeek } = useRoadmaps();

  const existingReview = getWeeklyReviewForCurrentWeek();

  const [wins, setWins] = useState(existingReview?.wins ?? "");
  const [blockers, setBlockers] = useState(existingReview?.blockers ?? "");
  const [nextPlan, setNextPlan] = useState(existingReview?.nextPlan ?? "");
  const [focusDomain, setFocusDomain] = useState<GoalDomain>(existingReview?.focusDomain ?? "career");
  const [consistencyScore, setConsistencyScore] = useState<number>(
    existingReview?.consistencyScore ?? 3,
  );
  const [submitting, setSubmitting] = useState(false);

  const weekInfo = useMemo(() => {
    if (!existingReview) return "Brak wypełnionego review w tym tygodniu.";
    return `Review już zapisany w tym tygodniu (${existingReview.weekKey}). Możesz go nadpisać.`;
  }, [existingReview]);

  const handleSubmit = async () => {
    if (!wins.trim() || !blockers.trim() || !nextPlan.trim()) {
      Alert.alert("Uzupełnij ankietę", "Wypełnij wszystkie pola review.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitWeeklyReview({
        wins,
        blockers,
        nextPlan,
        focusDomain,
        consistencyScore,
      });

      if (result.alreadyAwardedForWeek) {
        Alert.alert(
          "Review zapisany",
          "W tym tygodniu XP za review był już naliczony wcześniej.",
        );
      } else {
        Alert.alert("Review zapisany", `Dodano +${result.xpAwarded} XP do obszaru ${GOAL_DOMAIN_LABELS[focusDomain]}.`);
      }

      router.back();
    } finally {
      setSubmitting(false);
    }
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
          <Pressable
            style={[styles.primaryBtnSmall, submitting && styles.primaryBtnSmallDisabled]}
            disabled={submitting}
            onPress={handleSubmit}
          >
            <Text style={styles.primaryBtnSmallText}>
              {submitting ? "Zapisywanie..." : "Zapisz review"}
            </Text>
          </Pressable>
        </View>
      </View>

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
        <Text style={styles.title}>Weekly Boss Review</Text>
        <Text style={styles.subtitle}>
          Szybki przegląd tygodnia: co działało, co blokowało i jaki plan bierzesz na następny tydzień.
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>{weekInfo}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>1. CO DOWIOZŁEŚ W TYM TYGODNIU?</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            multiline
            value={wins}
            onChangeText={setWins}
            placeholder="Najważniejsze wygrane i postęp."
            placeholderTextColor="#8A93A8"
          />

          <Text style={styles.label}>2. CO CIĘ BLOKOWAŁO?</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            multiline
            value={blockers}
            onChangeText={setBlockers}
            placeholder="Przeszkody, które spowalniały realizację."
            placeholderTextColor="#8A93A8"
          />

          <Text style={styles.label}>3. PLAN NA NASTĘPNY TYDZIEŃ</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            multiline
            value={nextPlan}
            onChangeText={setNextPlan}
            placeholder="3 konkretne priorytety."
            placeholderTextColor="#8A93A8"
          />

          <Text style={styles.label}>4. JAK OCENIASZ SWOJĄ REGULARNOŚĆ?</Text>
          <View style={styles.scaleRow}>
            {[1, 2, 3, 4, 5].map((score) => (
              <Pressable
                key={score}
                style={[styles.scaleChip, consistencyScore === score && styles.scaleChipSelected]}
                onPress={() => setConsistencyScore(score)}
              >
                <Text
                  style={[
                    styles.scaleChipText,
                    consistencyScore === score && styles.scaleChipTextSelected,
                  ]}
                >
                  {score}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>5. GŁÓWNY OBSZAR ROZWOJU</Text>
          <View style={styles.chipsRow}>
            {GOAL_DOMAIN_ORDER.map((domain) => (
              <Pressable
                key={domain}
                style={[styles.chip, focusDomain === domain && styles.chipSelected]}
                onPress={() => setFocusDomain(domain)}
              >
                <Text style={[styles.chipText, focusDomain === domain && styles.chipTextSelected]}>
                  {GOAL_DOMAIN_LABELS[domain]}
                </Text>
              </Pressable>
            ))}
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
  stickyTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
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
  primaryBtnSmallDisabled: { opacity: 0.6 },
  primaryBtnSmallText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
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
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1F3A61",
    backgroundColor: "#0A1424",
    padding: 12,
  },
  infoText: { color: "#8CA9D3", fontSize: 12, fontWeight: "700" },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1F3A61",
    backgroundColor: "#0A1424",
    padding: 14,
  },
  label: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 11,
    letterSpacing: 0.9,
    fontWeight: "700",
    color: "#7D93BB",
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1F3A61",
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#F2F7FF",
    backgroundColor: "#0B1729",
  },
  multiline: { minHeight: 84, paddingTop: 12, textAlignVertical: "top" },
  scaleRow: { flexDirection: "row", gap: 8 },
  scaleChip: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1F3A61",
    backgroundColor: "#0A1424",
    alignItems: "center",
    justifyContent: "center",
  },
  scaleChipSelected: { backgroundColor: "#1A3556", borderColor: "#6FD1FF" },
  scaleChipText: { color: "#A8B9D7", fontSize: 13, fontWeight: "800" },
  scaleChipTextSelected: { color: "#EAF3FF" },
  chipsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
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
});

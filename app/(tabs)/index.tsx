import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useRoadmaps } from "@/lib/roadmap-context";
import { useHabits } from "@/lib/habit-context";
import { flattenTasks, GOAL_DOMAIN_ORDER } from "@/lib/roadmap-types";
import { DOMAIN_COLORS } from "@/lib/progression-types";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { goals, progress } = useRoadmaps();
  const { todayTasks } = useHabits();

  const goalStats = useMemo(() => {
    const totalGoals = goals.length;
    const totalTasks = goals.reduce((acc, goal) => acc + flattenTasks(goal.tasks).length, 0);
    return { totalGoals, totalTasks };
  }, [goals]);

  const habitsToday = useMemo(
    () => ({
      due: todayTasks.totalCount,
      done: todayTasks.completedCount,
    }),
    [todayTasks.completedCount, todayTasks.totalCount],
  );

  const habitsRemaining = Math.max(habitsToday.due - habitsToday.done, 0);
  const habitsProgress = habitsToday.due === 0 ? 0 : habitsToday.done / habitsToday.due;
  const levelToNext = Math.max(progress.overall.xpToNextLevel - progress.overall.xpInLevel, 0);
  const overallPercent = Math.round(progress.overall.progress * 100);

  const dayStatus = useMemo(() => {
    if (habitsToday.due === 0) {
      return {
        label: "TRYB WOLNY",
        message: "Dziś nie masz wymaganych nawyków. Zaplanuj kolejny krok.",
        accent: "#AAC4E5",
        surface: "#11253F",
      };
    }

    if (habitsRemaining === 0) {
      return {
        label: "DZIŚ DOMKNIĘTE",
        message: "Komplet wykonany. Możesz pchnąć cele główne.",
        accent: "#A7E8B8",
        surface: "#1A3A2A",
      };
    }

    return {
      label: "MISJA AKTYWNA",
      message: `Pozostało ${habitsRemaining} ${habitsRemaining === 1 ? "nawyk" : "nawyki"} do odhaczenia.`,
      accent: "#8DD8FF",
      surface: "#173257",
    };
  }, [habitsRemaining, habitsToday.due]);

  return (
    <View style={styles.screen}>
      <View style={styles.bgTop} />
      <View style={styles.bgBottom} />
      <View style={styles.bgMid} />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: 20,
          gap: 12,
        }}
      >
        <Text style={styles.brand}>Not Real Life</Text>

        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Orbita dnia</Text>
            <Text style={styles.subtitle}>Mniej szumu. Jedna konkretna misja.</Text>
          </View>
          <View style={styles.todayChip}>
            <Text style={styles.todayChipText}>DZIŚ</Text>
          </View>
        </View>

        <View style={styles.quantumCard}>
          <View style={styles.quantumAuraA} />
          <View style={styles.quantumAuraB} />

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status operacyjny</Text>
            <View style={[styles.statusBadge, { backgroundColor: dayStatus.surface }]}> 
              <Text style={[styles.statusBadgeText, { color: dayStatus.accent }]}>{dayStatus.label}</Text>
            </View>
          </View>

          <View style={styles.coreRow}>
            <View>
              <Text style={styles.habitValue}>
                {habitsToday.done}
                <Text style={styles.habitValueMuted}>/{habitsToday.due}</Text>
              </Text>
              <Text style={styles.habitHint}>nawyków zaliczonych</Text>
            </View>

            <View style={styles.levelOrbOuter}>
              <View style={styles.levelOrbInner}>
                <Text style={styles.levelOrbValue}>LV {String(progress.overall.level).padStart(2, "0")}</Text>
                <Text style={styles.levelOrbMeta}>{overallPercent}%</Text>
              </View>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(habitsProgress * 100, 100)}%` }]} />
          </View>

          <Text style={styles.quantumHint}>{dayStatus.message}</Text>

          <Pressable style={styles.primaryMissionBtn} onPress={() => router.push("/(tabs)/habbits")}> 
            <Text style={styles.primaryMissionBtnText}>Start misji nawyków</Text>
          </Pressable>

          <View style={styles.ghostRow}>
            <Pressable style={styles.ghostBtn} onPress={() => router.push("/(tabs)/roadmap")}> 
              <Text style={styles.ghostBtnText}>Roadmap</Text>
            </Pressable>
            <Pressable style={styles.ghostBtn} onPress={() => router.push("/(tabs)/statistics")}> 
              <Text style={styles.ghostBtnText}>Statystyki</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.domainPanel}>
          <Text style={styles.sectionTitle}>Obszary poziomu</Text>
          <View style={styles.domainGrid}>
            {GOAL_DOMAIN_ORDER.map((domain) => {
              const item = progress.domains[domain];
              return (
                <View key={domain} style={styles.domainCard}>
                  <View style={styles.domainTopRow}>
                    <View style={[styles.domainDot, { backgroundColor: DOMAIN_COLORS[domain] }]} />
                    <Text style={styles.domainName}>{item.label}</Text>
                  </View>
                  <Text style={styles.domainLevel}>LV. {item.level}</Text>
                  <View style={styles.domainTrack}>
                    <View
                      style={[
                        styles.domainFill,
                        {
                          width: `${Math.min(item.progress * 100, 100)}%`,
                          backgroundColor: DOMAIN_COLORS[domain],
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.quickPanel}>
          <Text style={styles.sectionTitle}>Szybkie skoki</Text>

          <Pressable style={styles.quickAction} onPress={() => router.push("/(tabs)/roadmap/create")}> 
            <Text style={styles.quickActionTitle}>+ Nowy cel</Text>
            <Text style={styles.quickActionSub}>Rozpisz plan i zależności</Text>
          </Pressable>

          <Pressable style={styles.quickAction} onPress={() => router.push("/(tabs)/habbits/create")}> 
            <Text style={styles.quickActionTitle}>+ Nowy nawyk</Text>
            <Text style={styles.quickActionSub}>Dodaj własny rytm i XP</Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Cele</Text>
            <Text style={styles.statValue}>{goalStats.totalGoals}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Taski</Text>
            <Text style={styles.statValue}>{goalStats.totalTasks}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Do levelu</Text>
            <Text style={styles.statValueSmall}>{levelToNext} XP</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#050A13" },
  bgTop: {
    position: "absolute",
    top: -120,
    right: -50,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "#13315B",
    opacity: 0.55,
  },
  bgBottom: {
    position: "absolute",
    bottom: -170,
    left: -90,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "#0E2748",
    opacity: 0.52,
  },
  bgMid: {
    position: "absolute",
    top: 230,
    left: 180,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "#1C4F80",
    opacity: 0.18,
  },
  brand: {
    alignSelf: "flex-start",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#90DBFF",
    backgroundColor: "rgba(21,52,87,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  headerTextWrap: { flex: 1, gap: 2 },
  title: { fontSize: 31, lineHeight: 35, fontWeight: "900", color: "#F2F8FF" },
  subtitle: { fontSize: 14, lineHeight: 20, color: "#A8BDD9" },
  todayChip: {
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#2C5789",
    backgroundColor: "#0B1730",
  },
  todayChipText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.9, color: "#9BC9F3" },
  quantumCard: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#2D5A8F",
    backgroundColor: "#0B1930",
    padding: 16,
    overflow: "hidden",
  },
  quantumAuraA: {
    position: "absolute",
    top: -70,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: "rgba(120,189,255,0.35)",
  },
  quantumAuraB: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(102,173,240,0.15)",
  },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  statusLabel: { color: "#9FC0E6", fontSize: 12, fontWeight: "800" },
  statusBadge: { borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  statusBadgeText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  coreRow: { marginTop: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  habitValue: { fontSize: 46, lineHeight: 50, fontWeight: "900", color: "#F8FCFF" },
  habitValueMuted: { fontSize: 30, fontWeight: "800", color: "#87A9D0" },
  habitHint: { color: "#B9CDE8", fontSize: 13, fontWeight: "700" },
  levelOrbOuter: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1,
    borderColor: "#66AEEC",
    backgroundColor: "#102644",
    alignItems: "center",
    justifyContent: "center",
  },
  levelOrbInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: "#2D5A8F",
    backgroundColor: "#0B1730",
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  levelOrbValue: { fontSize: 14, fontWeight: "900", color: "#EAF3FF" },
  levelOrbMeta: { fontSize: 11, fontWeight: "800", color: "#8DB6DF" },
  progressTrack: {
    marginTop: 10,
    height: 9,
    borderRadius: 999,
    backgroundColor: "#133054",
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#6FD1FF" },
  quantumHint: { marginTop: 9, fontSize: 13, lineHeight: 18, color: "#A8BDD9" },
  primaryMissionBtn: {
    marginTop: 12,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#1E4A79",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryMissionBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  ghostRow: { marginTop: 8, flexDirection: "row", gap: 8 },
  ghostBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2C5789",
    backgroundColor: "#0E2038",
    alignItems: "center",
    justifyContent: "center",
  },
  ghostBtnText: { fontSize: 12, fontWeight: "800", color: "#D4E8FF" },
  sectionTitle: { fontSize: 17, fontWeight: "900", color: "#F2F8FF" },
  domainPanel: {
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1E4068",
    backgroundColor: "#0A1528",
    gap: 10,
  },
  domainGrid: { flexDirection: "row", gap: 8 },
  domainCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#244B78",
    backgroundColor: "#0E1D35",
    padding: 10,
    gap: 8,
  },
  domainTopRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  domainDot: { width: 8, height: 8, borderRadius: 999 },
  domainName: { fontSize: 11, fontWeight: "800", color: "#D8E9FF" },
  domainLevel: { fontSize: 17, fontWeight: "900", color: "#F2F8FF" },
  domainTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: "#132E4F",
    overflow: "hidden",
  },
  domainFill: { height: "100%" },
  quickPanel: {
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1E4068",
    backgroundColor: "#0A1528",
    gap: 10,
  },
  quickAction: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#2A5688",
    backgroundColor: "#0D203A",
    gap: 3,
  },
  quickActionTitle: { color: "#EAF3FF", fontWeight: "900", fontSize: 14 },
  quickActionSub: { color: "#90B1D7", fontSize: 12, lineHeight: 16 },
  statsRow: { flexDirection: "row", gap: 8 },
  statBox: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E4068",
    backgroundColor: "#0A1528",
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 3,
  },
  statLabel: { color: "#8CA9D3", fontSize: 11, fontWeight: "700" },
  statValue: { color: "#F2F8FF", fontSize: 24, fontWeight: "900" },
  statValueSmall: { color: "#F2F8FF", fontSize: 16, fontWeight: "900" },
});

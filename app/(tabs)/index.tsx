import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useRoadmaps } from "@/lib/roadmap-context";
import { useHabits } from "@/lib/habit-context";
import { buildTaskMap, flattenTasks, GOAL_DOMAIN_ORDER, isTaskBlocked } from "@/lib/roadmap-types";
import { isCompletionOnDate, isHabitDueOnDate, todayIsoDate } from "@/lib/habit-types";
import { DOMAIN_COLORS } from "@/lib/progression-types";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { goals, progress } = useRoadmaps();
  const { customHabits, loading: habitsLoading } = useHabits();

  const today = todayIsoDate();

  const goalStats = useMemo(() => {
    const totalGoals = goals.length;
    const totalTasks = goals.reduce((acc, goal) => acc + flattenTasks(goal.tasks).length, 0);
    return { totalGoals, totalTasks };
  }, [goals]);

  const habitsToday = useMemo(() => {
    let roadmapDue = 0;
    let roadmapDone = 0;

    for (const goal of goals) {
      const taskMap = buildTaskMap(goal.tasks);
      for (const task of flattenTasks(goal.tasks)) {
        if (task.kind !== "habit" || !task.habit) continue;
        if (isTaskBlocked(task, taskMap)) continue;

        const due = isHabitDueOnDate({
          startDate: task.habit.startDate,
          everyNDays: task.habit.everyNDays,
          durationDays: task.habit.durationDays,
          date: today,
        });

        if (!due) continue;
        roadmapDue += 1;
        if (isCompletionOnDate(task.habit.completions, today)) roadmapDone += 1;
      }
    }

    if (habitsLoading) {
      return { due: roadmapDue, done: roadmapDone };
    }

    const customDue = customHabits.filter((habit) =>
      isHabitDueOnDate({
        startDate: habit.startDate,
        everyNDays: habit.everyNDays,
        durationDays: habit.durationDays,
        date: today,
      }),
    );

    const customDone = customDue.filter((habit) => isCompletionOnDate(habit.completions, today));

    return {
      due: roadmapDue + customDue.length,
      done: roadmapDone + customDone.length,
    };
  }, [goals, customHabits, habitsLoading, today]);

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
        <Text style={styles.title}>Panel dnia</Text>
        <Text style={styles.subtitle}>Skup się na małych działaniach, które pchają cele do przodu.</Text>

        <View style={styles.levelCard}>
          <Text style={styles.levelLabel}>Poziom użytkownika</Text>
          <Text style={styles.levelValue}>LV. {String(progress.overall.level).padStart(2, "0")}</Text>
          <View style={styles.levelTrack}>
            <View style={[styles.levelFill, { width: `${Math.min(progress.overall.progress * 100, 100)}%` }]} />
          </View>
          <Text style={styles.levelHint}>
            XP: {progress.totalXp} • Do kolejnego poziomu: {Math.max(progress.overall.xpToNextLevel - progress.overall.xpInLevel, 0)}
          </Text>
          <View style={styles.domainList}>
            {GOAL_DOMAIN_ORDER.map((domain) => {
              const domainProgress = progress.domains[domain];
              return (
                <View key={domain} style={styles.domainItem}>
                  <View style={styles.domainHeader}>
                    <Text style={styles.domainName}>{domainProgress.label}</Text>
                    <Text style={styles.domainMeta}>LV. {domainProgress.level}</Text>
                  </View>
                  <View style={styles.domainTrack}>
                    <View
                      style={[
                        styles.domainFill,
                        {
                          width: `${Math.min(domainProgress.progress * 100, 100)}%`,
                          backgroundColor: DOMAIN_COLORS[domain],
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.domainXp}>XP: {domainProgress.xp}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Nawyki na dziś</Text>
          <Text style={styles.heroValue}>
            {habitsToday.done} / {habitsToday.due}
          </Text>
          <Text style={styles.heroHint}>zrealizowanych</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.push("/(tabs)/habbits")}> 
            <Text style={styles.primaryBtnText}>Przejdź do nawyków</Text>
          </Pressable>
        </View>

        <View style={styles.row}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Cele</Text>
            <Text style={styles.statValue}>{goalStats.totalGoals}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Taski</Text>
            <Text style={styles.statValue}>{goalStats.totalTasks}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Szybkie akcje</Text>
          <Pressable style={styles.secondaryBtn} onPress={() => router.push("/(tabs)/roadmap/create")}> 
            <Text style={styles.secondaryBtnText}>+ Dodaj nowy cel</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={() => router.push("/(tabs)/habbits/create")}> 
            <Text style={styles.secondaryBtnText}>+ Dodaj własny nawyk</Text>
          </Pressable>
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
  levelCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#0A1424",
    borderWidth: 1,
    borderColor: "#1F3A61",
  },
  levelLabel: { color: "#8CA9D3", fontSize: 12, fontWeight: "800" },
  levelValue: {
    marginTop: 4,
    color: "#EAF3FF",
    fontSize: 32,
    lineHeight: 36,
    fontWeight: "900",
  },
  levelTrack: {
    marginTop: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#11233E",
    overflow: "hidden",
  },
  levelFill: {
    width: "22%",
    height: "100%",
    backgroundColor: "#6FD1FF",
  },
  levelHint: { marginTop: 8, color: "#7992BA", fontSize: 12 },
  domainList: { marginTop: 12, gap: 8 },
  domainItem: { gap: 4 },
  domainHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  domainName: { fontSize: 12, fontWeight: "800", color: "#D6E6FF" },
  domainMeta: { fontSize: 11, fontWeight: "800", color: "#8CA9D3" },
  domainTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#11233E",
    overflow: "hidden",
  },
  domainFill: { height: "100%" },
  domainXp: { fontSize: 11, color: "#7992BA", fontWeight: "700" },
  heroCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#22354A",
    borderWidth: 1,
    borderColor: "#1C2C3D",
  },
  heroLabel: { color: "#C7D0D8", fontSize: 12, fontWeight: "800" },
  heroValue: { color: "#FFFFFF", fontSize: 34, lineHeight: 40, fontWeight: "900", marginTop: 2 },
  heroHint: { color: "#D8DFE5", fontSize: 12, marginBottom: 10 },
  row: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#0A1424",
    borderWidth: 1,
    borderColor: "#1F3A61",
  },
  statLabel: { fontSize: 12, color: "#7992BA", fontWeight: "700" },
  statValue: { fontSize: 28, lineHeight: 32, fontWeight: "900", color: "#EAF3FF", marginTop: 2 },
  sectionCard: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: "#0A1424",
    borderWidth: 1,
    borderColor: "#1F3A61",
    gap: 10,
  },
  sectionTitle: { fontSize: 17, fontWeight: "900", color: "#F2F7FF" },
  primaryBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(26,55,86,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#EAF3FF", fontWeight: "900", fontSize: 14 },
  secondaryBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#0B1729",
    borderWidth: 1,
    borderColor: "#1F3A61",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { color: "#E7F0FF", fontWeight: "800", fontSize: 14 },
});

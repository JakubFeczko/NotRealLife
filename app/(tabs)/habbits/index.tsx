import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useHabits } from "@/lib/habit-context";
import { useRoadmaps } from "@/lib/roadmap-context";
import { buildTaskMap, flattenTasks, isTaskBlocked, TimeOfDay } from "@/lib/roadmap-types";
import {
  isCompletionOnDate,
  isHabitDueOnDate,
  todayIsoDate,
  translateTimeOfDay,
} from "@/lib/habit-types";

type RoadmapHabitItem = {
  goalId: string;
  goalTitle: string;
  taskId: string;
  title: string;
  startDate: string;
  everyNDays: number;
  durationDays: number;
  timeOfDay?: TimeOfDay;
  completions: string[];
  blocked: boolean;
};

type HabitFilter = "all" | TimeOfDay;

function collectRoadmapHabits(goals: ReturnType<typeof useRoadmaps>["goals"]) {
  const result: RoadmapHabitItem[] = [];

  for (const goal of goals) {
    const taskMap = buildTaskMap(goal.tasks);
    const tasks = flattenTasks(goal.tasks);

    for (const task of tasks) {
      if (task.kind !== "habit" || !task.habit) continue;
      result.push({
        goalId: goal.id,
        goalTitle: goal.title,
        taskId: task.id,
        title: task.title,
        startDate: task.habit.startDate,
        everyNDays: task.habit.everyNDays,
        durationDays: task.habit.durationDays,
        timeOfDay: task.habit.timeOfDay,
        completions: task.habit.completions,
        blocked: isTaskBlocked(task, taskMap),
      });
    }
  }

  return result;
}

function matchesFilter(timeOfDay: TimeOfDay | undefined, filter: HabitFilter) {
  if (filter === "all") return true;
  return timeOfDay === filter;
}

export default function HabbitsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { goals, addHabitCompletion, awardCustomHabitXp } = useRoadmaps();
  const { customHabits, toggleCustomHabitDoneToday } = useHabits();

  const [filter, setFilter] = useState<HabitFilter>("all");
  const [pendingOnly, setPendingOnly] = useState(false);
  const today = todayIsoDate();

  const roadmapHabitsToday = useMemo(() => {
    return collectRoadmapHabits(goals).filter(
      (habit) =>
        !habit.blocked &&
        isHabitDueOnDate({
          startDate: habit.startDate,
          everyNDays: habit.everyNDays,
          durationDays: habit.durationDays,
          date: today,
        }),
    );
  }, [goals, today]);

  const customHabitsToday = useMemo(() => {
    return customHabits.filter((habit) =>
      isHabitDueOnDate({
        startDate: habit.startDate,
        everyNDays: habit.everyNDays,
        durationDays: habit.durationDays,
        date: today,
      }),
    );
  }, [customHabits, today]);

  const filteredRoadmapHabitsToday = useMemo(
    () =>
      roadmapHabitsToday.filter((habit) => {
        if (!matchesFilter(habit.timeOfDay, filter)) return false;
        if (!pendingOnly) return true;
        return !isCompletionOnDate(habit.completions, today);
      }),
    [roadmapHabitsToday, filter, pendingOnly, today],
  );

  const filteredCustomHabitsToday = useMemo(
    () =>
      customHabitsToday.filter((habit) => {
        if (!matchesFilter(habit.timeOfDay, filter)) return false;
        if (!pendingOnly) return true;
        return !isCompletionOnDate(habit.completions, today);
      }),
    [customHabitsToday, filter, pendingOnly, today],
  );

  const completedTodayCount = useMemo(() => {
    const roadmapDone = roadmapHabitsToday.filter((habit) =>
      isCompletionOnDate(habit.completions, today),
    ).length;
    const customDone = customHabitsToday.filter((habit) =>
      isCompletionOnDate(habit.completions, today),
    ).length;

    return roadmapDone + customDone;
  }, [roadmapHabitsToday, customHabitsToday, today]);

  const totalToday = roadmapHabitsToday.length + customHabitsToday.length;
  const totalVisibleToday = filteredRoadmapHabitsToday.length + filteredCustomHabitsToday.length;

  const handleRoadmapHabitToggle = async (goalId: string, taskId: string, doneToday: boolean) => {
    if (doneToday) return;
    const result = await addHabitCompletion(goalId, taskId);
    if (!result.ok) {
      Alert.alert("Nie można zapisać wykonania", result.reason ?? "Spróbuj ponownie.");
      return;
    }
    if (result.xpAwarded > 0) {
      Alert.alert("Nawyk zaliczony", `+${result.xpAwarded} XP`);
    }
  };

  const handleCustomHabitToggle = async (habit: (typeof customHabits)[number]) => {
    const toggle = await toggleCustomHabitDoneToday(habit.id);
    if (!toggle.ok) {
      Alert.alert("Błąd", "Nie udało się zaktualizować nawyku.");
      return;
    }

    if (!toggle.doneToday) return;

    const xpResult = await awardCustomHabitXp({
      habitId: habit.id,
      domain: habit.domain,
      impact: habit.impact,
      difficulty: habit.difficulty,
      date: toggle.date,
    });

    if (xpResult.xpAwarded > 0) {
      Alert.alert("Nawyk zaliczony", `+${xpResult.xpAwarded} XP`);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.bgTop} />
      <View style={styles.bgBottom} />

      <View style={[styles.stickyTop, { paddingTop: insets.top + 8 }]}> 
        <View style={styles.topRow}>
          <Text style={styles.brand}>Not Real Life</Text>
          <Pressable
            style={styles.primaryBtnSmall}
            onPress={() => router.push("/(tabs)/habbits/create")}
          >
            <Text style={styles.primaryBtnSmallText}>+ Nowy nawyk</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 72,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: 20,
          gap: 12,
        }}
      >
        <Text style={styles.title}>Nawyki na dziś</Text>
        <Text style={styles.subtitle}>Cele rosną, kiedy dowozisz małe działania codziennie.</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Dzisiejszy wynik</Text>
          <Text style={styles.summaryValue}>
            {completedTodayCount} / {totalToday}
          </Text>
          <Text style={styles.summaryHint}>
            zaznaczonych nawyków • widoczne teraz: {totalVisibleToday}
          </Text>
        </View>

        <SectionCard title="Filtr wyświetlania">
          <View style={styles.chipsRow}>
            <FilterChip selected={filter === "all"} onPress={() => setFilter("all")}>Dziś</FilterChip>
            <FilterChip selected={filter === "morning"} onPress={() => setFilter("morning")}>Rano</FilterChip>
            <FilterChip selected={filter === "afternoon"} onPress={() => setFilter("afternoon")}>Popołudnie</FilterChip>
            <FilterChip selected={filter === "evening"} onPress={() => setFilter("evening")}>Wieczór</FilterChip>
            <FilterChip selected={pendingOnly} onPress={() => setPendingOnly((v) => !v)}>
              Niewykonane
            </FilterChip>
          </View>
        </SectionCard>

        <SectionCard title="Z roadmapy na dziś">
          {filteredRoadmapHabitsToday.length === 0 ? (
            <Text style={styles.emptyText}>Brak nawyków z roadmapy dla wybranego filtra.</Text>
          ) : (
            filteredRoadmapHabitsToday.map((habit) => {
              const doneToday = isCompletionOnDate(habit.completions, today);

              return (
                <HabitRow
                  key={habit.taskId}
                  title={habit.title}
                  subtitle={`${habit.goalTitle} • ${translateTimeOfDay(habit.timeOfDay)}`}
                  done={doneToday}
                  onToggle={() => {
                    void handleRoadmapHabitToggle(habit.goalId, habit.taskId, doneToday);
                  }}
                  readOnlyWhenDone
                />
              );
            })
          )}
        </SectionCard>

        <SectionCard title="Twoje nawyki na dziś">
          {filteredCustomHabitsToday.length === 0 ? (
            <Text style={styles.emptyText}>Brak własnych nawyków dla wybranego filtra.</Text>
          ) : (
            filteredCustomHabitsToday.map((habit) => {
              const doneToday = isCompletionOnDate(habit.completions, today);

              return (
                <HabitRow
                  key={habit.id}
                  title={habit.title}
                  subtitle={`${translateTimeOfDay(habit.timeOfDay)} • co ${habit.everyNDays} dni`}
                  done={doneToday}
                  onToggle={() => {
                    void handleCustomHabitToggle(habit);
                  }}
                />
              );
            })
          )}
        </SectionCard>
      </ScrollView>
    </View>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function HabitRow({
  title,
  subtitle,
  done,
  onToggle,
  readOnlyWhenDone = false,
}: {
  title: string;
  subtitle: string;
  done: boolean;
  onToggle: () => void;
  readOnlyWhenDone?: boolean;
}) {
  const disabled = readOnlyWhenDone && done;

  return (
    <View style={styles.habitRow}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.habitTitle, done && styles.habitTitleDone]}>{title}</Text>
        <Text style={styles.habitSubtitle}>{subtitle}</Text>
      </View>

      <Pressable
        onPress={onToggle}
        disabled={disabled}
        style={[styles.checkCircle, done && styles.checkCircleDone, disabled && styles.checkCircleDisabled]}
      >
        <Text style={[styles.checkText, done && styles.checkTextDone]}>{done ? "✓" : ""}</Text>
      </Pressable>
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
  primaryBtnSmall: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#22354A",
  },
  primaryBtnSmallText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  title: { fontSize: 30, lineHeight: 34, fontWeight: "900", color: "#F2F7FF" },
  subtitle: { fontSize: 14, lineHeight: 20, color: "#A8B9D7" },
  summaryCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#22354A",
    borderWidth: 1,
    borderColor: "#1C2C3D",
  },
  summaryLabel: { color: "#C7D0D8", fontSize: 12, fontWeight: "800" },
  summaryValue: { color: "#FFFFFF", fontSize: 34, lineHeight: 40, fontWeight: "900", marginTop: 2 },
  summaryHint: { color: "#D8DFE5", fontSize: 12 },
  sectionCard: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: "#0A1424",
    borderWidth: 1,
    borderColor: "#1F3A61",
    gap: 10,
  },
  sectionTitle: { fontSize: 17, fontWeight: "900", color: "#F2F7FF" },
  emptyText: { color: "#7992BA", fontSize: 13 },
  habitRow: {
    borderWidth: 1,
    borderColor: "#1F3A61",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#0B1729",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  habitTitle: { fontSize: 14, fontWeight: "800", color: "#EAF3FF" },
  habitTitleDone: { textDecorationLine: "line-through", color: "#7D93BB" },
  habitSubtitle: { marginTop: 3, fontSize: 12, color: "#8CA9D3" },
  checkCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: "#9BA995",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0A1424",
  },
  checkCircleDone: {
    borderColor: "#6FD1FF",
    backgroundColor: "#1A3556",
  },
  checkCircleDisabled: { opacity: 0.8 },
  checkText: { fontSize: 18, fontWeight: "900", color: "#6FD1FF", lineHeight: 20 },
  checkTextDone: { color: "#6FD1FF" },
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

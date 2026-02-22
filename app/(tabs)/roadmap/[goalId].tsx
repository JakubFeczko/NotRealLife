import React, { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRoadmaps } from "@/lib/roadmap-context";
import {
  buildTaskMap,
  expectedHabitCompletions,
  flattenTasks,
  getBlockedByTaskIds,
  GOAL_DOMAIN_LABELS,
  isTaskBlocked,
  RoadmapTask,
  taskIsDone,
} from "@/lib/roadmap-types";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isHabitDueOnDate, todayIsoDate } from "@/lib/habit-types";

export default function RoadmapDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  const { getGoalById, markOneTimeTaskDone, addHabitCompletion, removeGoal } = useRoadmaps();

  const goal = goalId ? getGoalById(goalId) : undefined;
  const today = todayIsoDate();

  const allTasks = useMemo(() => (goal ? flattenTasks(goal.tasks) : []), [goal]);
  const taskMap = useMemo(() => (goal ? buildTaskMap(goal.tasks) : {}), [goal]);

  if (!goal) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.emptyTitle}>Nie znaleziono celu</Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.replace("/(tabs)/roadmap")}>
          <Text style={styles.primaryBtnText}>Wróć do listy</Text>
        </Pressable>
      </View>
    );
  }

  const doneCount = allTasks.filter((task) => taskIsDone(task)).length;
  const blockedCount = allTasks.filter((task) => !taskIsDone(task) && isTaskBlocked(task, taskMap)).length;
  const availableCount = allTasks.length - doneCount - blockedCount;
  const progress = allTasks.length === 0 ? 0 : doneCount / allTasks.length;

  const handleCompleteOneTime = async (taskId: string) => {
    const result = await markOneTimeTaskDone(goal.id, taskId);
    if (!result.ok) {
      Alert.alert("Nie można zaliczyć taska", result.reason ?? "Spróbuj ponownie.");
      return;
    }
    if (result.xpAwarded > 0) {
      Alert.alert("Task zaliczony", `+${result.xpAwarded} XP`);
    }
  };

  const handleAddHabitCompletion = async (taskId: string) => {
    const result = await addHabitCompletion(goal.id, taskId);
    if (!result.ok) {
      Alert.alert("Nie można dodać wykonania", result.reason ?? "Spróbuj ponownie.");
      return;
    }
    if (result.xpAwarded > 0) {
      Alert.alert("Wykonanie zapisane", `+${result.xpAwarded} XP`);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.bgTop} />
      <View style={styles.bgBottom} />

      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 120,
          },
        ]}
      >
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.ghostBtn}>
            <Text style={styles.ghostText}>← Wróć</Text>
          </Pressable>

          <Pressable
            onPress={async () => {
              await removeGoal(goal.id);
              router.replace("/(tabs)/roadmap");
            }}
            style={styles.deleteBtn}
          >
            <Text style={styles.deleteBtnText}>Usuń cel</Text>
          </Pressable>
        </View>

        <Text style={styles.brand}>Not Real Life</Text>
        <Text style={styles.title}>{goal.title}</Text>
        <Text style={styles.domainText}>Obszar: {GOAL_DOMAIN_LABELS[goal.domain]}</Text>
        {!!goal.description && <Text style={styles.subtitle}>{goal.description}</Text>}

        <View style={styles.progressCard}>
          <Text style={styles.progressLabel}>Postęp</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {doneCount} / {allTasks.length} tasków ukończonych
          </Text>
          <Text style={styles.progressMeta}>
            Dostępne: {availableCount} • Zablokowane: {blockedCount}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Struktura celu</Text>
          {goal.tasks.length === 0 ? (
            <Text style={styles.emptySub}>Brak tasków.</Text>
          ) : (
            goal.tasks.map((task) => (
              <TaskNode
                key={task.id}
                task={task}
                level={0}
                taskMap={taskMap}
                today={today}
                onCompleteOneTime={handleCompleteOneTime}
                onHabitDone={handleAddHabitCompletion}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function TaskNode({
  task,
  level,
  taskMap,
  today,
  onCompleteOneTime,
  onHabitDone,
}: {
  task: RoadmapTask;
  level: number;
  taskMap: Record<string, RoadmapTask>;
  today: string;
  onCompleteOneTime: (taskId: string) => void;
  onHabitDone: (taskId: string) => void;
}) {
  const done = taskIsDone(task);
  const blockedByIds = done ? [] : getBlockedByTaskIds(task, taskMap);
  const blockedByTitles = blockedByIds.map((dependencyId) => taskMap[dependencyId]?.title ?? dependencyId);
  const blocked = blockedByTitles.length > 0;

  const expected = task.kind === "habit" && task.habit ? expectedHabitCompletions(task.habit) : 0;
  const completions = task.kind === "habit" && task.habit ? task.habit.completions.length : 0;
  const dueToday =
    task.kind === "habit" && task.habit
      ? isHabitDueOnDate({
          startDate: task.habit.startDate,
          everyNDays: task.habit.everyNDays,
          durationDays: task.habit.durationDays,
          date: today,
        })
      : false;

  return (
    <View style={[styles.taskCard, level > 0 && styles.subtaskCard]}>
      <View style={styles.taskHeader}>
        <Text style={[styles.taskTitle, done && styles.doneTitle]}>{task.title}</Text>
        <Text
          style={[
            styles.badge,
            done && styles.doneBadge,
            blocked && !done && styles.blockedBadge,
          ]}
        >
          {done ? "ZALICZONE" : blocked ? "ZABLOKOWANE" : "DOSTĘPNE"}
        </Text>
      </View>

      {!!task.notes && <Text style={styles.taskNotes}>{task.notes}</Text>}

      <Text style={styles.taskMeta}>
        Wpływ: {task.impact}/5 • Trudność: {task.difficulty}/3
      </Text>

      {blocked ? (
        <Text style={styles.blockedHint}>Odblokuj najpierw: {blockedByTitles.join(", ")}</Text>
      ) : null}

      {task.kind === "one_time" ? (
        <View style={styles.actionRow}>
          <Text style={styles.taskMeta}>Task jednorazowy</Text>
          {!done ? (
            <Pressable
              style={[styles.primaryAction, blocked && styles.primaryActionDisabled]}
              disabled={blocked}
              onPress={() => onCompleteOneTime(task.id)}
            >
              <Text style={styles.primaryActionText}>Zalicz task</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.actionRowWrap}>
          <Text style={styles.taskMeta}>
            Nawyk: {completions}/{expected}
            {task.habit?.timeOfDay ? ` • ${translateTimeOfDay(task.habit.timeOfDay)}` : ""}
          </Text>
          {!dueToday ? <Text style={styles.taskMetaMuted}>Ten nawyk nie jest dziś wymagany.</Text> : null}
          {!done ? (
            <Pressable
              style={[
                styles.primaryAction,
                (blocked || !dueToday) && styles.primaryActionDisabled,
              ]}
              disabled={blocked || !dueToday}
              onPress={() => onHabitDone(task.id)}
            >
              <Text style={styles.primaryActionText}>Dodaj wykonanie</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {task.children.map((child) => (
        <TaskNode
          key={child.id}
          task={child}
          level={level + 1}
          taskMap={taskMap}
          today={today}
          onCompleteOneTime={onCompleteOneTime}
          onHabitDone={onHabitDone}
        />
      ))}
    </View>
  );
}

function translateTimeOfDay(value: string) {
  if (value === "morning") return "rano";
  if (value === "afternoon") return "popołudnie";
  if (value === "evening") return "wieczór";
  return "";
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#060B14" },
  center: { justifyContent: "center", alignItems: "center", padding: 20 },
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
  container: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28, gap: 12 },
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
  deleteBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#2A1320",
    borderWidth: 1,
    borderColor: "#6A2A3F",
  },
  deleteBtnText: { color: "#FFB0C2", fontWeight: "800", fontSize: 12 },
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
  title: { fontSize: 28, lineHeight: 33, fontWeight: "900", color: "#F2F7FF" },
  domainText: { fontSize: 12, color: "#8CA9D3", fontWeight: "800" },
  subtitle: { fontSize: 14, lineHeight: 20, color: "#A8B9D7" },
  progressCard: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: "#0A1424",
    borderWidth: 1,
    borderColor: "#1F3A61",
  },
  progressLabel: { fontSize: 12, color: "#8CA9D3", fontWeight: "800", marginBottom: 8 },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#11233E",
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: { height: "100%", backgroundColor: "#22354A" },
  progressText: { fontSize: 13, color: "#A8B9D7", fontWeight: "700" },
  progressMeta: { marginTop: 4, fontSize: 12, color: "#7D93BB", fontWeight: "700" },
  section: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: "#0A1424",
    borderWidth: 1,
    borderColor: "#1F3A61",
    gap: 10,
  },
  sectionTitle: { fontSize: 17, fontWeight: "900", color: "#F2F7FF" },
  emptyTitle: { fontSize: 20, fontWeight: "900", color: "#F2F7FF", marginBottom: 12 },
  emptySub: { fontSize: 13, color: "#7992BA" },
  primaryBtn: {
    height: 46,
    borderRadius: 14,
    backgroundColor: "#22354A",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "800" },
  taskCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1F3A61",
    backgroundColor: "#0B1729",
    padding: 12,
    gap: 8,
  },
  subtaskCard: {
    marginTop: 8,
    marginLeft: 8,
    borderColor: "#1F3A61",
    backgroundColor: "#0E1C2F",
  },
  taskHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  taskTitle: { flex: 1, fontSize: 14, fontWeight: "800", color: "#EAF3FF" },
  doneTitle: { textDecorationLine: "line-through", color: "#A8B9D7" },
  badge: {
    fontSize: 10,
    fontWeight: "900",
    color: "#9CC3E0",
    backgroundColor: "#11233E",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  doneBadge: { color: "#2E5E3E", backgroundColor: "#E1F3E5" },
  blockedBadge: { color: "#EAB7C1", backgroundColor: "#341827" },
  taskNotes: { fontSize: 12, color: "#A8B9D7" },
  blockedHint: { fontSize: 12, color: "#EAB7C1", fontWeight: "700" },
  actionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  actionRowWrap: { gap: 8 },
  taskMeta: { fontSize: 12, color: "#8CA9D3", fontWeight: "700" },
  taskMetaMuted: { fontSize: 12, color: "#7992BA", fontWeight: "700" },
  primaryAction: {
    alignSelf: "flex-start",
    borderRadius: 10,
    backgroundColor: "#22354A",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  primaryActionDisabled: { opacity: 0.45 },
  primaryActionText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
});

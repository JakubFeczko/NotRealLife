import React, { useEffect, useMemo, useState } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRoadmaps } from "@/lib/roadmap-context";
import {
  buildId,
  GOAL_DOMAIN_LABELS,
  GOAL_DOMAIN_ORDER,
  GoalDomain,
  HabitConfig,
  hasDependencyCycle,
  RoadmapTask,
  TimeOfDay,
} from "@/lib/roadmap-types";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type DraftTask = {
  id: string;
  title: string;
  notes: string;
  kind: "one_time" | "habit";
  status: "todo" | "done";
  impact: number;
  difficulty: number;
  dependencies: string[];
  habit: Omit<HabitConfig, "completions">;
  habitCompletions: string[];
  children: DraftTask[];
};

function createDraftTask(): DraftTask {
  return {
    id: buildId("task"),
    title: "",
    notes: "",
    kind: "one_time",
    status: "todo",
    impact: 3,
    difficulty: 2,
    dependencies: [],
    habit: {
      startDate: new Date().toISOString().slice(0, 10),
      durationDays: 14,
      everyNDays: 2,
      timeOfDay: undefined,
    },
    habitCompletions: [],
    children: [],
  };
}

function mapRoadmapTaskToDraft(task: RoadmapTask): DraftTask {
  return {
    id: task.id,
    title: task.title,
    notes: task.notes ?? "",
    kind: task.kind,
    status: task.status,
    impact: task.impact,
    difficulty: task.difficulty,
    dependencies: [...task.dependencies],
    habit: {
      startDate: task.habit?.startDate ?? new Date().toISOString().slice(0, 10),
      durationDays: task.habit?.durationDays ?? 14,
      everyNDays: task.habit?.everyNDays ?? 2,
      timeOfDay: task.habit?.timeOfDay,
    },
    habitCompletions: task.habit?.completions ?? [],
    children: task.children.map((child) => mapRoadmapTaskToDraft(child)),
  };
}

function mapRoadmapTasksToDraft(tasks: RoadmapTask[]): DraftTask[] {
  return tasks.map((task) => mapRoadmapTaskToDraft(task));
}

function sanitizeTasks(tasks: DraftTask[]): RoadmapTask[] {
  const normalizeNode = (task: DraftTask): RoadmapTask => {
    const normalizedChildren = task.children
      .filter((child) => child.title.trim().length > 0)
      .map((child) => normalizeNode(child));

    return {
      id: task.id,
      title: task.title.trim(),
      notes: task.notes.trim() || undefined,
      kind: task.kind,
      status: task.status,
      impact: Math.max(1, Math.min(5, Number(task.impact) || 3)),
      difficulty: Math.max(1, Math.min(3, Number(task.difficulty) || 2)),
      dependencies: [...new Set(task.dependencies)],
      habit:
        task.kind === "habit"
          ? {
              ...task.habit,
              durationDays: Math.max(1, Number(task.habit.durationDays) || 1),
              everyNDays: Math.max(1, Number(task.habit.everyNDays) || 1),
              startDate: task.habit.startDate || new Date().toISOString().slice(0, 10),
              completions: [...task.habitCompletions],
            }
          : undefined,
      children: normalizedChildren,
    };
  };

  const normalized = tasks
    .filter((task) => task.title.trim().length > 0)
    .map((task) => normalizeNode(task));

  const collectRoadmapTaskIds = (nodes: RoadmapTask[]): string[] =>
    nodes.flatMap((node) => [node.id, ...collectRoadmapTaskIds(node.children)]);

  const allTaskIds = new Set(collectRoadmapTaskIds(normalized));

  const sanitizeDependencies = (task: RoadmapTask): RoadmapTask => {
    return {
      ...task,
      dependencies: task.dependencies.filter(
        (depId) =>
          depId !== task.id &&
          allTaskIds.has(depId),
      ),
      children: task.children.map((child) => sanitizeDependencies(child)),
    };
  };

  return normalized.map((task) => sanitizeDependencies(task));
}

function updateTaskList(
  tasks: DraftTask[],
  taskId: string,
  updater: (task: DraftTask) => DraftTask,
): DraftTask[] {
  return tasks.map((task) => {
    if (task.id === taskId) return updater(task);
    if (task.children.length === 0) return task;
    return { ...task, children: updateTaskList(task.children, taskId, updater) };
  });
}

function removeTaskFromList(tasks: DraftTask[], taskId: string): DraftTask[] {
  return tasks
    .filter((task) => task.id !== taskId)
    .map((task) => ({ ...task, children: removeTaskFromList(task.children, taskId) }));
}

function countTasks(tasks: DraftTask[]): number {
  return tasks.reduce((acc, task) => acc + 1 + countTasks(task.children), 0);
}

export default function CreateRoadmapScreen() {
  const router = useRouter();
  const { editGoalId } = useLocalSearchParams<{ editGoalId?: string }>();
  const isEditingFlow = typeof editGoalId === "string" && editGoalId.length > 0;
  const { goalDraft, setGoalDraft } = useRoadmaps();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState(() =>
    isEditingFlow && goalDraft?.goalId === editGoalId ? goalDraft.title : "",
  );
  const [description, setDescription] = useState(() =>
    isEditingFlow && goalDraft?.goalId === editGoalId ? goalDraft.description ?? "" : "",
  );
  const [domain, setDomain] = useState<GoalDomain>(() =>
    isEditingFlow && goalDraft?.goalId === editGoalId ? goalDraft.domain : "career",
  );
  const [tasks, setTasks] = useState<DraftTask[]>(() =>
    isEditingFlow && goalDraft?.goalId === editGoalId
      ? mapRoadmapTasksToDraft(goalDraft.tasks)
      : [],
  );
  const [error, setError] = useState<string | null>(null);
  const totalDraftTasks = useMemo(() => countTasks(tasks), [tasks]);

  useEffect(() => {
    if (!goalDraft) return;

    if (isEditingFlow && goalDraft.goalId !== editGoalId) return;
    if (!isEditingFlow && goalDraft.goalId) return;

    setTitle(goalDraft.title);
    setDescription(goalDraft.description ?? "");
    setDomain(goalDraft.domain);
    setTasks(mapRoadmapTasksToDraft(goalDraft.tasks));
  }, [editGoalId, goalDraft, isEditingFlow]);

  const addMainTask = () => {
    setTasks((prev) => [createDraftTask(), ...prev]);
  };

  const updateTask = (taskId: string, updater: (task: DraftTask) => DraftTask) => {
    setTasks((prev) => updateTaskList(prev, taskId, updater));
  };

  const removeTask = (taskId: string) => {
    setTasks((prev) => removeTaskFromList(prev, taskId));
  };

  const addSubtask = (parentId: string) => {
    updateTask(parentId, (task) => ({ ...task, children: [createDraftTask(), ...task.children] }));
  };

  const goToDependenciesStep = () => {
    if (!title.trim()) {
      setError("Dodaj nazwę celu.");
      return;
    }

    const normalizedTasks = sanitizeTasks(tasks);
    if (normalizedTasks.length === 0) {
      setError("Dodaj przynajmniej jeden task.");
      return;
    }

    if (hasDependencyCycle(normalizedTasks)) {
      setError("Wykryto cykl zależności w taskach. Zmień dane i spróbuj ponownie.");
      return;
    }

    setGoalDraft({
      goalId: isEditingFlow ? editGoalId : undefined,
      title: title.trim(),
      description: description.trim() || undefined,
      domain,
      tasks: normalizedTasks,
    });

    setError(null);
    router.push("/(tabs)/roadmap/dependencies");
  };

  return (
    <View style={styles.screen}>
      <View style={styles.bgTop} />
      <View style={styles.bgBottom} />

      <View style={[styles.stickyTop, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topRow}>
          <Pressable
            onPress={() => {
              if (isEditingFlow) {
                setGoalDraft(null);
              }
              router.back();
            }}
            style={styles.ghostBtn}
          >
            <Text style={styles.ghostText}>← Wróć</Text>
          </Pressable>
          <Pressable onPress={goToDependenciesStep} style={styles.primaryBtnSmall}>
            <Text style={styles.primaryBtnSmallText}>Ustal zależności</Text>
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            {
              paddingTop: insets.top + 86,
              paddingBottom: insets.bottom + 120,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.brand}>Not Real Life</Text>
          <Text style={styles.title}>{isEditingFlow ? "Edycja celu i roadmapy" : "Nowy cel i roadmapa"}</Text>
          <Text style={styles.subtitle}>
            Krok 1 z 2: uzupełnij cel oraz taski. W kolejnym kroku ustawisz zależności i zapiszesz całość.
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>CEL</Text>
            <TextInput
              style={styles.input}
              placeholder="Np. Nauczyć się SAP BTP"
              placeholderTextColor="#8A93A8"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>OBSZAR CELU</Text>
            <View style={styles.chipsRow}>
              {GOAL_DOMAIN_ORDER.map((domainItem) => (
                <Chip
                  key={domainItem}
                  selected={domain === domainItem}
                  onPress={() => setDomain(domainItem)}
                >
                  {GOAL_DOMAIN_LABELS[domainItem]}
                </Chip>
              ))}
            </View>

            <Text style={styles.label}>OPIS (OPCJONALNIE)</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              multiline
              value={description}
              onChangeText={setDescription}
              placeholder="Co chcesz osiągnąć i dlaczego?"
              placeholderTextColor="#8A93A8"
            />

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Taski ({totalDraftTasks})</Text>
              <Pressable onPress={addMainTask} style={styles.inlineBtn}>
                <Text style={styles.inlineBtnText}>+ Dodaj task</Text>
              </Pressable>
            </View>

            {tasks.length === 0 ? (
              <Text style={styles.emptyHint}>Brak tasków. Dodaj pierwszy krok do celu.</Text>
            ) : null}

            {tasks.map((task) => (
              <TaskEditor
                key={task.id}
                task={task}
                level={0}
                onUpdate={updateTask}
                onDelete={removeTask}
                onAddSubtask={addSubtask}
              />
            ))}

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function TaskEditor({
  task,
  level,
  onUpdate,
  onDelete,
  onAddSubtask,
}: {
  task: DraftTask;
  level: number;
  onUpdate: (taskId: string, updater: (task: DraftTask) => DraftTask) => void;
  onDelete: (taskId: string) => void;
  onAddSubtask: (taskId: string) => void;
}) {
  const setTimeOfDay = (value?: TimeOfDay) => {
    onUpdate(task.id, (current) => ({
      ...current,
      habit: {
        ...current.habit,
        timeOfDay: current.habit.timeOfDay === value ? undefined : value,
      },
    }));
  };

  return (
    <View style={[styles.taskCard, level > 0 && styles.subtaskCard]}>
      <View style={styles.taskHeader}>
        <Text style={[styles.taskHeading, level > 0 && styles.subtaskHeading]}>
          {level === 0 ? "Task" : "Podtask"}
        </Text>
        <Pressable onPress={() => onDelete(task.id)}>
          <Text style={styles.deleteText}>Usuń</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.input}
        value={task.title}
        onChangeText={(value) => onUpdate(task.id, (current) => ({ ...current, title: value }))}
        placeholder={level === 0 ? "Np. Przerobić moduł podstawowy" : "Np. 3 treningi tygodniowo"}
        placeholderTextColor="#8A93A8"
      />

      <TextInput
        style={[styles.input, styles.multilineMini]}
        multiline
        value={task.notes}
        onChangeText={(value) => onUpdate(task.id, (current) => ({ ...current, notes: value }))}
        placeholder="Notatki (opcjonalnie)"
        placeholderTextColor="#8A93A8"
      />

      <Text style={styles.label}>WPŁYW (XP)</Text>
      <ScaleSelector
        max={5}
        value={task.impact}
        onSelect={(value) => onUpdate(task.id, (current) => ({ ...current, impact: value }))}
      />

      <Text style={styles.label}>TRUDNOŚĆ</Text>
      <ScaleSelector
        max={3}
        value={task.difficulty}
        onSelect={(value) => onUpdate(task.id, (current) => ({ ...current, difficulty: value }))}
      />

      <View style={styles.kindRow}>
        <Pressable
          style={[styles.kindBtn, task.kind === "one_time" && styles.kindBtnActive]}
          onPress={() => onUpdate(task.id, (current) => ({ ...current, kind: "one_time" }))}
        >
          <Text style={[styles.kindText, task.kind === "one_time" && styles.kindTextActive]}>
            Jednorazowy
          </Text>
        </Pressable>

        <Pressable
          style={[styles.kindBtn, task.kind === "habit" && styles.kindBtnActive]}
          onPress={() => onUpdate(task.id, (current) => ({ ...current, kind: "habit" }))}
        >
          <Text style={[styles.kindText, task.kind === "habit" && styles.kindTextActive]}>
            Cykliczny (nawyk)
          </Text>
        </Pressable>
      </View>

      {task.kind === "habit" ? (
        <View style={styles.habitBox}>
          <Text style={styles.habitTitle}>Ustawienia nawyku</Text>

          <Text style={styles.label}>START (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={task.habit.startDate}
            onChangeText={(value) =>
              onUpdate(task.id, (current) => ({
                ...current,
                habit: { ...current.habit, startDate: value },
              }))
            }
            placeholder="2026-02-16"
            placeholderTextColor="#8A93A8"
          />

          <View style={styles.twoCols}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>CZAS TRWANIA (DNI)</Text>
              <TextInput
                style={styles.input}
                value={String(task.habit.durationDays)}
                onChangeText={(value) =>
                  onUpdate(task.id, (current) => ({
                    ...current,
                    habit: {
                      ...current.habit,
                      durationDays: Number(value.replace(/[^0-9]/g, "")) || 0,
                    },
                  }))
                }
                keyboardType="numeric"
                placeholder="14"
                placeholderTextColor="#8A93A8"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.label}>CO ILE DNI</Text>
              <TextInput
                style={styles.input}
                value={String(task.habit.everyNDays)}
                onChangeText={(value) =>
                  onUpdate(task.id, (current) => ({
                    ...current,
                    habit: {
                      ...current.habit,
                      everyNDays: Number(value.replace(/[^0-9]/g, "")) || 0,
                    },
                  }))
                }
                keyboardType="numeric"
                placeholder="2"
                placeholderTextColor="#8A93A8"
              />
            </View>
          </View>

          <Text style={styles.label}>PORA DNIA (OPCJONALNIE)</Text>
          <View style={styles.kindRow}>
            <Chip selected={task.habit.timeOfDay === "morning"} onPress={() => setTimeOfDay("morning")}>
              Rano
            </Chip>
            <Chip
              selected={task.habit.timeOfDay === "afternoon"}
              onPress={() => setTimeOfDay("afternoon")}
            >
              Popołudnie
            </Chip>
            <Chip selected={task.habit.timeOfDay === "evening"} onPress={() => setTimeOfDay("evening")}>
              Wieczór
            </Chip>
          </View>
        </View>
      ) : null}

      {level === 0 ? (
        <Pressable style={styles.inlineBtn} onPress={() => onAddSubtask(task.id)}>
          <Text style={styles.inlineBtnText}>+ Dodaj podtask</Text>
        </Pressable>
      ) : null}

      {task.children.map((child) => (
        <TaskEditor
          key={child.id}
          task={child}
          level={level + 1}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onAddSubtask={onAddSubtask}
        />
      ))}
    </View>
  );
}

function ScaleSelector({
  max,
  value,
  onSelect,
}: {
  max: number;
  value: number;
  onSelect: (value: number) => void;
}) {
  return (
    <View style={styles.scaleRow}>
      {Array.from({ length: max }).map((_, index) => {
        const score = index + 1;
        const selected = value === score;
        return (
          <Pressable
            key={score}
            style={[styles.scaleChip, selected && styles.scaleChipSelected]}
            onPress={() => onSelect(score)}
          >
            <Text style={[styles.scaleChipText, selected && styles.scaleChipTextSelected]}>{score}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Chip({
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
  flex: { flex: 1 },
  container: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28, gap: 12 },
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
  card: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: "#0A1424",
    borderWidth: 1,
    borderColor: "#1F3A61",
  },
  label: {
    marginTop: 8,
    marginBottom: 6,
    fontSize: 11,
    letterSpacing: 0.9,
    fontWeight: "700",
    color: "#7D93BB",
  },
  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1F3A61",
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#F2F7FF",
    backgroundColor: "#0B1729",
  },
  multiline: { height: 86, paddingTop: 12, textAlignVertical: "top" },
  multilineMini: { height: 64, paddingTop: 10, textAlignVertical: "top", marginTop: 8 },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#F2F7FF" },
  emptyHint: { fontSize: 13, color: "#7992BA", marginBottom: 6 },
  taskCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#1F3A61",
    borderRadius: 16,
    backgroundColor: "#0A1628",
    padding: 12,
  },
  subtaskCard: {
    marginTop: 10,
    marginLeft: 8,
    borderColor: "#2E5784",
    borderLeftWidth: 2,
    borderLeftColor: "#62B6F4",
    backgroundColor: "#11243D",
  },
  taskHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  taskHeading: { fontSize: 13, fontWeight: "800", color: "#BEE6FF" },
  subtaskHeading: { color: "#EAF5FF" },
  deleteText: { fontSize: 12, fontWeight: "800", color: "#C63B3B" },
  kindRow: { marginTop: 10, flexDirection: "row", gap: 8, flexWrap: "wrap" },
  kindBtn: {
    flex: 1,
    minWidth: 130,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1F3A61",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0A1424",
  },
  kindBtnActive: { backgroundColor: "#22354A", borderColor: "#22354A" },
  kindText: { color: "#A8B9D7", fontSize: 12, fontWeight: "700" },
  kindTextActive: { color: "#FFFFFF" },
  habitBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1F3A61",
    backgroundColor: "#0A1424",
  },
  habitTitle: { fontSize: 13, fontWeight: "800", color: "#BEE6FF", marginBottom: 4 },
  twoCols: { flexDirection: "row", gap: 10 },
  chipsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  scaleRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  scaleChip: {
    minWidth: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1F3A61",
    backgroundColor: "#0A1424",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  scaleChipSelected: { backgroundColor: "#1A3556", borderColor: "#6FD1FF" },
  scaleChipText: { color: "#A8B9D7", fontSize: 12, fontWeight: "800" },
  scaleChipTextSelected: { color: "#EAF3FF" },
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
  inlineBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#0F1B2E",
  },
  inlineBtnText: { color: "#E7F0FF", fontSize: 12, fontWeight: "800" },
  error: { color: "#C63B3B", marginTop: 12, fontSize: 12, fontWeight: "700" },
});

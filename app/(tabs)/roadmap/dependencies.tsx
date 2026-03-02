import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoadmaps } from "@/lib/roadmap-context";
import {
  GOAL_DOMAIN_LABELS,
  hasDependencyCycle,
  flattenTasks,
  RoadmapTask,
} from "@/lib/roadmap-types";

type TaskOption = {
  id: string;
  title: string;
  kind: RoadmapTask["kind"];
  dependencies: string[];
  level: number;
  parentId?: string;
  rootTaskId: string;
  ancestorIds: string[];
  descendantIds: Set<string>;
};

function collectDescendantIds(task: RoadmapTask): Set<string> {
  const ids = new Set<string>();
  const walk = (node: RoadmapTask) => {
    for (const child of node.children) {
      ids.add(child.id);
      walk(child);
    }
  };
  walk(task);
  return ids;
}

function flattenTaskOptions(
  tasks: RoadmapTask[],
  level = 0,
  ancestorIds: string[] = [],
  parentId?: string,
  rootTaskId?: string,
): TaskOption[] {
  return tasks.flatMap((task) => {
    const nextRootTaskId = rootTaskId ?? task.id;
    const option: TaskOption = {
      id: task.id,
      title: task.title,
      kind: task.kind,
      dependencies: [...new Set(task.dependencies)],
      level,
      parentId,
      rootTaskId: nextRootTaskId,
      ancestorIds,
      descendantIds: collectDescendantIds(task),
    };

    return [
      option,
      ...flattenTaskOptions(
        task.children,
        level + 1,
        [...ancestorIds, task.id],
        task.id,
        nextRootTaskId,
      ),
    ];
  });
}

function getAllowedDependencyIds(task: TaskOption, allOptions: TaskOption[]) {
  const allowed = new Set<string>();

  if (task.level === 0) {
    for (const childId of task.descendantIds) {
      allowed.add(childId);
    }
    return allowed;
  }

  for (const option of allOptions) {
    if (option.id === task.id) continue;

    const siblingOfSameParent = option.parentId === task.parentId;
    const otherTopLevelTask = option.level === 0 && option.id !== task.rootTaskId;

    if (siblingOfSameParent || otherTopLevelTask) {
      allowed.add(option.id);
    }
  }

  return allowed;
}

function buildDraftDependencyGraph(tasks: RoadmapTask[]) {
  const allTasks = flattenTasks(tasks);
  const validIds = new Set(allTasks.map((item) => item.id));
  const graph: Record<string, string[]> = {};

  for (const task of allTasks) {
    graph[task.id] = [
      ...new Set(
        (task.dependencies ?? []).filter(
          (depId) => depId !== task.id && validIds.has(depId),
        ),
      ),
    ];
  }

  return graph;
}

function hasPath(graph: Record<string, string[]>, fromId: string, toId: string) {
  const stack = [fromId];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (current === toId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    for (const next of graph[current] ?? []) {
      if (!visited.has(next)) stack.push(next);
    }
  }

  return false;
}

function dependencyWouldCreateCycle(
  tasks: RoadmapTask[],
  taskId: string,
  dependencyId: string,
) {
  if (taskId === dependencyId) return true;
  const graph = buildDraftDependencyGraph(tasks);
  if (!graph[taskId] || !graph[dependencyId]) return false;
  if (graph[taskId].includes(dependencyId)) return false;
  return hasPath(graph, dependencyId, taskId);
}

function updateTaskTree(
  tasks: RoadmapTask[],
  taskId: string,
  updater: (task: RoadmapTask) => RoadmapTask,
): RoadmapTask[] {
  return tasks.map((task) => {
    if (task.id === taskId) {
      return updater(task);
    }

    if (task.children.length === 0) {
      return task;
    }

    return {
      ...task,
      children: updateTaskTree(task.children, taskId, updater),
    };
  });
}

function getTaskTitleById(tasks: TaskOption[], taskId: string) {
  return tasks.find((task) => task.id === taskId)?.title ?? taskId;
}

export default function RoadmapDependenciesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { goalDraft, setGoalDraft, createGoal, updateGoal } = useRoadmaps();

  const [tasks, setTasks] = useState<RoadmapTask[]>(() => goalDraft?.tasks ?? []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const taskOptions = useMemo(() => flattenTaskOptions(tasks), [tasks]);

  useEffect(() => {
    if (!goalDraft) return;
    setTasks(goalDraft.tasks);
  }, [goalDraft]);

  const handleBack = () => {
    if (goalDraft) {
      setGoalDraft({ ...goalDraft, tasks });
    }
    router.back();
  };

  const toggleDependency = (taskId: string, dependencyId: string) => {
    setTasks((prevTasks) => {
      const options = flattenTaskOptions(prevTasks);
      const optionMap = new Map(options.map((option) => [option.id, option]));
      const currentTask = optionMap.get(taskId);
      if (!currentTask) return prevTasks;

      const allowedDependencyIds = getAllowedDependencyIds(currentTask, options);
      const selected = currentTask.dependencies.includes(dependencyId);
      const isAllowed = allowedDependencyIds.has(dependencyId);
      const cycleRisk = !selected && isAllowed && dependencyWouldCreateCycle(prevTasks, taskId, dependencyId);

      if (!isAllowed) {
        setError("Ta zależność jest niedozwolona dla tego typu taska.");
        return prevTasks;
      }

      if (cycleRisk) {
        setError("Ta zależność tworzy niedozwolone powiązanie. Wybierz inny task.");
        return prevTasks;
      }

      const nextTasks = updateTaskTree(prevTasks, taskId, (task) => {
        if (task.dependencies.includes(dependencyId)) {
          return {
            ...task,
            dependencies: task.dependencies.filter((item) => item !== dependencyId),
          };
        }

        return {
          ...task,
          dependencies: [...task.dependencies, dependencyId],
        };
      });

      setError(null);
      return nextTasks;
    });
  };

  const handleSave = async () => {
    if (!goalDraft) {
      setError("Brak szkicu celu. Wróć do poprzedniego kroku.");
      return;
    }

    if (hasDependencyCycle(tasks)) {
      setError("Wykryto cykl zależności. Popraw zależności i spróbuj ponownie.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (goalDraft.goalId) {
        await updateGoal({
          goalId: goalDraft.goalId,
          title: goalDraft.title,
          description: goalDraft.description,
          domain: goalDraft.domain,
          tasks,
        });
      } else {
        await createGoal({
          title: goalDraft.title,
          description: goalDraft.description,
          domain: goalDraft.domain,
          tasks,
        });
      }

      setGoalDraft(null);
      router.dismissAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać celu.");
    } finally {
      setSaving(false);
    }
  };

  if (!goalDraft) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <View style={styles.bgTop} />
        <View style={styles.bgBottom} />
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Brak szkicu roadmapy</Text>
          <Text style={styles.emptyText}>
            Najpierw uzupełnij dane celu oraz taski, a potem ustaw zależności.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.replace("/(tabs)/roadmap/create")}>
            <Text style={styles.primaryBtnText}>Wróć do tworzenia celu</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.bgTop} />
      <View style={styles.bgBottom} />

      <View style={[styles.stickyTop, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topRow}>
          <Pressable onPress={handleBack} style={styles.ghostBtn}>
            <Text style={styles.ghostText}>← Wróć</Text>
          </Pressable>
          <Pressable onPress={handleSave} style={styles.primaryBtnSmall} disabled={saving}>
            <Text style={styles.primaryBtnSmallText}>{saving ? "Zapisywanie..." : "Zapisz cel"}</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: insets.top + 86,
          paddingBottom: insets.bottom + 120,
          gap: 12,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>Not Real Life</Text>
        <Text style={styles.title}>Zależności tasków</Text>
        <Text style={styles.subtitle}>
          Krok 2 z 2: ustaw kolejność wykonania.
          {"\n"}Task główny: tylko własne podtaski.
          {"\n"}Podtask: rodzeństwo + inne taski główne.
        </Text>

        <View style={styles.card}>
          <Text style={styles.goalTitle}>{goalDraft.title}</Text>
          <Text style={styles.goalDomain}>{GOAL_DOMAIN_LABELS[goalDraft.domain]}</Text>

          {taskOptions.length === 0 ? (
            <Text style={styles.emptyHint}>Brak tasków do ustawienia zależności.</Text>
          ) : (
            taskOptions.map((task) => {
              const allowedDependencyIds = getAllowedDependencyIds(task, taskOptions);
              const dependencyOptions = taskOptions.filter((option) =>
                allowedDependencyIds.has(option.id),
              );

              return (
                <View
                  key={task.id}
                  style={[
                    styles.taskCard,
                    task.level > 0 && styles.subtaskCard,
                    { marginLeft: Math.min(task.level * 10, 18) },
                  ]}
                >
                  <View style={styles.taskHeader}>
                    <Text style={[styles.taskTitle, task.level > 0 && styles.subtaskTitle]}>
                      {task.title}
                    </Text>
                    <Text style={[styles.kindTag, task.level > 0 && styles.kindTagSubtask]}>
                      {task.kind === "habit" ? "Nawyk" : "Jednorazowy"}
                    </Text>
                  </View>

                  <Text style={styles.label}>WYMAGA UKOŃCZENIA</Text>

                  {dependencyOptions.length === 0 ? (
                    <Text style={styles.emptyHintTiny}>Brak możliwych zależności dla tego taska.</Text>
                  ) : (
                    <View style={styles.dependencyWrap}>
                      {dependencyOptions.map((option) => {
                        const selected = task.dependencies.includes(option.id);
                        const cycleRisk =
                          !selected &&
                          dependencyWouldCreateCycle(tasks, task.id, option.id);
                        const blocked = cycleRisk;

                        return (
                          <Pressable
                            key={option.id}
                            style={[
                              styles.dependencyChip,
                              selected && styles.dependencyChipSelected,
                              blocked && styles.dependencyChipBlocked,
                            ]}
                            onPress={() => {
                              if (blocked) {
                                setError("Ta zależność tworzy cykl. Wybierz inną.");
                                return;
                              }
                              toggleDependency(task.id, option.id);
                            }}
                          >
                            <Text
                              style={[
                                styles.dependencyChipText,
                                selected && styles.dependencyChipTextSelected,
                                blocked && styles.dependencyChipTextBlocked,
                              ]}
                            >
                              {`${option.level > 0 ? "↳ " : ""}${option.title}`}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}

                  {task.dependencies.length > 0 ? (
                    <Text style={styles.dependencyHint}>
                      Wymagane: {task.dependencies.map((depId) => getTaskTitleById(taskOptions, depId)).join(", ")}
                    </Text>
                  ) : null}
                </View>
              );
            })
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#060B14" },
  centered: { justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
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
  goalTitle: { fontSize: 18, color: "#F2F7FF", fontWeight: "900" },
  goalDomain: {
    marginTop: 4,
    alignSelf: "flex-start",
    fontSize: 11,
    color: "#8CA9D3",
    backgroundColor: "#11233E",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontWeight: "800",
  },
  taskCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#1F3A61",
    borderRadius: 16,
    backgroundColor: "#0A1628",
    padding: 12,
  },
  subtaskCard: {
    borderColor: "#2E5784",
    borderLeftWidth: 2,
    borderLeftColor: "#62B6F4",
    backgroundColor: "#11243D",
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  taskTitle: { flex: 1, color: "#F2F7FF", fontWeight: "800", fontSize: 14 },
  subtaskTitle: { color: "#F0F7FF" },
  kindTag: {
    color: "#A8B9D7",
    fontSize: 11,
    fontWeight: "800",
    backgroundColor: "#0A1424",
    borderWidth: 1,
    borderColor: "#1F3A61",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
    overflow: "hidden",
  },
  kindTagSubtask: {
    backgroundColor: "#0E2038",
    borderColor: "#2E5784",
    color: "#D7EAFE",
  },
  label: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 11,
    letterSpacing: 0.9,
    fontWeight: "700",
    color: "#7D93BB",
  },
  dependencyWrap: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  dependencyChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1F3A61",
    backgroundColor: "#0A1424",
  },
  dependencyChipSelected: { backgroundColor: "#1A3556", borderColor: "#6FD1FF" },
  dependencyChipBlocked: { borderColor: "#6A2A3F", backgroundColor: "#2A1320" },
  dependencyChipText: { color: "#A8B9D7", fontSize: 12, fontWeight: "700" },
  dependencyChipTextSelected: { color: "#EAF3FF" },
  dependencyChipTextBlocked: { color: "#FFB0C2" },
  dependencyHint: { marginTop: 6, fontSize: 12, color: "#8FA3C6" },
  emptyHint: { marginTop: 12, fontSize: 13, color: "#7992BA" },
  emptyHintTiny: { fontSize: 12, color: "#7992BA" },
  emptyCard: {
    width: "100%",
    borderRadius: 24,
    backgroundColor: "#0A1424",
    borderWidth: 1,
    borderColor: "#1F3A61",
    padding: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: "900", color: "#F2F7FF", marginBottom: 6 },
  emptyText: { fontSize: 14, lineHeight: 20, color: "#A8B9D7" },
  primaryBtn: {
    marginTop: 16,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#22354A",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  error: { color: "#C63B3B", marginTop: 12, fontSize: 12, fontWeight: "700" },
});

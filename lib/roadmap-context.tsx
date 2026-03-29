import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getRoadmapGoals, saveRoadmapGoals } from "./roadmap-storage";
import {
  buildDependentsCountMap,
  buildId,
  buildTaskMap,
  flattenTasks,
  getBlockedByTaskIds,
  GoalDomain,
  hasDependencyCycle,
  isTaskBlocked,
  RoadmapGoal,
  RoadmapGoalSummary,
  RoadmapTask,
  taskIsDone,
} from "./roadmap-types";
import { isCompletionOnDate, isHabitDueOnDate, todayIsoDate } from "./habit-types";
import {
  buildProgressSnapshot,
  getWeekKey,
  ProgressSnapshot,
  WeeklyReviewEntry,
  WeeklyReviewInput,
  XpEvent,
} from "./progression-types";
import {
  getWeeklyReviews,
  getXpEvents,
  saveWeeklyReviews,
  saveXpEvents,
} from "./progression-storage";
import {
  createGoalRemote,
  getAllGoalsRemote,
  getGoalRemote,
  markOneTimeTaskRemote,
} from "./roadmap-api";

type TaskCompletionResult = {
  ok: boolean;
  xpAwarded: number;
  reason?: string;
};

type WeeklyReviewResult = {
  entry: WeeklyReviewEntry;
  xpAwarded: number;
  alreadyAwardedForWeek: boolean;
};

type CustomHabitXpInput = {
  habitId: string;
  domain: GoalDomain;
  impact: number;
  difficulty: number;
  date: string; // YYYY-MM-DD
};

export type RoadmapGoalDraft = {
  goalId?: string;
  title: string;
  description?: string;
  domain: GoalDomain;
  tasks: RoadmapTask[];
};

type RoadmapContextType = {
  goals: RoadmapGoal[];
  goalSummaries: RoadmapGoalSummary[];
  loading: boolean;
  progress: ProgressSnapshot;
  xpEvents: XpEvent[];
  weeklyReviews: WeeklyReviewEntry[];
  goalDraft: RoadmapGoalDraft | null;
  setGoalDraft: (draft: RoadmapGoalDraft | null) => void;
  createGoal: (payload: {
    title: string;
    description?: string;
    domain: GoalDomain;
    tasks: RoadmapTask[];
  }) => Promise<RoadmapGoal>;
  updateGoal: (payload: {
    goalId: string;
    title: string;
    description?: string;
    domain: GoalDomain;
    tasks: RoadmapTask[];
  }) => Promise<RoadmapGoal>;
  refreshGoalsList: () => Promise<void>;
  getGoalById: (goalId: string) => RoadmapGoal | undefined;
  refreshGoalById: (goalId: string) => Promise<void>;
  markOneTimeTaskDone: (goalId: string, taskId: string) => Promise<TaskCompletionResult>;
  addHabitCompletion: (goalId: string, taskId: string) => Promise<TaskCompletionResult>;
  awardCustomHabitXp: (input: CustomHabitXpInput) => Promise<TaskCompletionResult>;
  removeGoal: (goalId: string) => Promise<void>;
  submitWeeklyReview: (input: WeeklyReviewInput) => Promise<WeeklyReviewResult>;
  getWeeklyReviewForCurrentWeek: () => WeeklyReviewEntry | undefined;
};

const RoadmapContext = createContext<RoadmapContextType | undefined>(undefined);

function clamp(raw: number, min: number, max: number) {
  return Math.min(max, Math.max(min, raw));
}

function isRemoteGoalId(goalId: string) {
  return /^\d+$/.test(goalId.trim());
}

function isRemoteTaskId(taskId: string) {
  return /^\d+$/.test(taskId.trim());
}

function buildGoalSummary(goal: RoadmapGoal): RoadmapGoalSummary {
  const allTasks = flattenTasks(goal.tasks);
  const completedTasks = allTasks.filter((task) => taskIsDone(task)).length;

  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    domain: goal.domain,
    numberOfTasks: allTasks.length,
    numberOfCompletedTasks: completedTasks,
    updatedAt: goal.updatedAt,
  };
}

function upsertGoalSummary(
  summaries: RoadmapGoalSummary[],
  summary: RoadmapGoalSummary,
): RoadmapGoalSummary[] {
  const existingIndex = summaries.findIndex((item) => item.id === summary.id);
  if (existingIndex < 0) {
    return [summary, ...summaries];
  }

  const next = [...summaries];
  next[existingIndex] = {
    ...next[existingIndex],
    ...summary,
  };
  return next;
}

function normalizeTaskTree(tasks: RoadmapTask[]): RoadmapTask[] {
  const normalizeNode = (task: RoadmapTask): RoadmapTask => ({
    ...task,
    impact: clamp(Number(task.impact) || 3, 1, 5),
    difficulty: clamp(Number(task.difficulty) || 2, 1, 3),
    dependencies: Array.isArray(task.dependencies)
      ? task.dependencies.filter((item) => typeof item === "string")
      : [],
    children: (task.children ?? []).map((child) => normalizeNode(child)),
  });

  const normalized = tasks.map((task) => normalizeNode(task));

  const idSet = new Set(flattenTasks(normalized).map((task) => task.id));

  type TaskMeta = {
    level: number;
    parentId?: string;
    rootTaskId: string;
    descendantIds: Set<string>;
  };

  const collectDescendantIds = (task: RoadmapTask): Set<string> => {
    const ids = new Set<string>();
    const walk = (node: RoadmapTask) => {
      for (const child of node.children) {
        ids.add(child.id);
        walk(child);
      }
    };
    walk(task);
    return ids;
  };

  const taskMetaMap: Record<string, TaskMeta> = {};

  const collectTaskMeta = (
    nodes: RoadmapTask[],
    level = 0,
    parentId?: string,
    rootTaskId?: string,
  ) => {
    for (const node of nodes) {
      const currentRootTaskId = rootTaskId ?? node.id;
      taskMetaMap[node.id] = {
        level,
        parentId,
        rootTaskId: currentRootTaskId,
        descendantIds: collectDescendantIds(node),
      };
      collectTaskMeta(node.children, level + 1, node.id, currentRootTaskId);
    }
  };

  collectTaskMeta(normalized);

  const isDependencyAllowed = (taskId: string, dependencyId: string) => {
    const taskMeta = taskMetaMap[taskId];
    const dependencyMeta = taskMetaMap[dependencyId];
    if (!taskMeta || !dependencyMeta) return false;

    // Top-level task: can depend only on its own subtasks.
    if (taskMeta.level === 0) {
      return taskMeta.descendantIds.has(dependencyId);
    }

    // Subtask: can depend on sibling subtasks (same parent) or other top-level tasks.
    const siblingOfSameParent =
      dependencyMeta.parentId === taskMeta.parentId && dependencyId !== taskId;
    const otherTopLevelTask =
      dependencyMeta.level === 0 && dependencyId !== taskMeta.rootTaskId;
    return siblingOfSameParent || otherTopLevelTask;
  };

  const sanitizeDependencies = (task: RoadmapTask): RoadmapTask => {
    return {
      ...task,
      dependencies: [
        ...new Set(
          task.dependencies.filter(
            (depId) =>
              depId !== task.id &&
              idSet.has(depId) &&
              isDependencyAllowed(task.id, depId),
          ),
        ),
      ],
      children: task.children.map((child) => sanitizeDependencies(child)),
    };
  };

  return normalized.map((task) => sanitizeDependencies(task));
}

function updateTaskById(
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
      children: updateTaskById(task.children, taskId, updater),
    };
  });
}

function calculateTaskXp(task: RoadmapTask, dependentsCount: number) {
  const impact = clamp(task.impact, 1, 5);
  const difficulty = clamp(task.difficulty, 1, 3);
  const base = task.kind === "one_time" ? 24 : 12;
  const difficultyMultiplier = 1 + (difficulty - 1) * 0.35;
  const criticalMultiplier = dependentsCount > 0 ? 1.2 : 1;
  return Math.max(8, Math.round(base * impact * difficultyMultiplier * criticalMultiplier));
}

function calculateCustomHabitXp(impactRaw: number, difficultyRaw: number) {
  const impact = clamp(impactRaw, 1, 5);
  const difficulty = clamp(difficultyRaw, 1, 3);
  const base = 12;
  const difficultyMultiplier = 1 + (difficulty - 1) * 0.35;
  return Math.max(8, Math.round(base * impact * difficultyMultiplier));
}

function calculateWeeklyReviewXp(input: WeeklyReviewInput) {
  const consistency = clamp(Number(input.consistencyScore) || 1, 1, 5);
  const reflectionBonus = input.wins.trim().length >= 15 ? 8 : 4;
  const blockerBonus = input.blockers.trim().length >= 15 ? 8 : 4;
  const planBonus = input.nextPlan.trim().length >= 15 ? 8 : 4;
  return 18 + consistency * 6 + reflectionBonus + blockerBonus + planBonus;
}

export function RoadmapProvider({ children }: { children: React.ReactNode }) {
  const [goals, setGoals] = useState<RoadmapGoal[]>([]);
  const [goalSummaries, setGoalSummaries] = useState<RoadmapGoalSummary[]>([]);
  const [xpEvents, setXpEvents] = useState<XpEvent[]>([]);
  const [weeklyReviews, setWeeklyReviews] = useState<WeeklyReviewEntry[]>([]);
  const [goalDraft, setGoalDraft] = useState<RoadmapGoalDraft | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [storedGoals, storedXpEvents, storedReviews] = await Promise.all([
        getRoadmapGoals(),
        getXpEvents(),
        getWeeklyReviews(),
      ]);
      setGoals(storedGoals);
      setGoalSummaries(storedGoals.map((goal) => buildGoalSummary(goal)));
      setXpEvents(storedXpEvents);
      setWeeklyReviews(storedReviews);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (loading) return;
    void saveRoadmapGoals(goals);
  }, [goals, loading]);

  useEffect(() => {
    if (loading) return;
    void saveXpEvents(xpEvents);
  }, [xpEvents, loading]);

  useEffect(() => {
    if (loading) return;
    void saveWeeklyReviews(weeklyReviews);
  }, [weeklyReviews, loading]);

  const progress = useMemo(() => buildProgressSnapshot(xpEvents), [xpEvents]);

  const value = useMemo<RoadmapContextType>(
    () => ({
      goals,
      goalSummaries,
      loading,
      progress,
      xpEvents,
      weeklyReviews,
      goalDraft,
      setGoalDraft,
      createGoal: async ({ title, description, domain, tasks }) => {
        const normalizedTasks = normalizeTaskTree(tasks);

        if (hasDependencyCycle(normalizedTasks)) {
          throw new Error("Taski zawierają cykl zależności. Popraw zależności i zapisz ponownie.");
        }

        const remoteGoal = await createGoalRemote({
          title: title.trim(),
          description: description?.trim(),
          domain,
          tasks: normalizedTasks,
        });

        // Fallback: endpoint can return only createGoalSuccess without goal id.
        const now = new Date().toISOString();
        const localGoalFallback: RoadmapGoal = {
          id: buildId("goal"),
          title: title.trim(),
          description: description?.trim(),
          domain,
          createdAt: now,
          updatedAt: now,
          tasks: normalizedTasks,
        };
        const goalToStore = remoteGoal ?? localGoalFallback;

        setGoals((prev) => [goalToStore, ...prev.filter((goal) => goal.id !== goalToStore.id)]);
        setGoalSummaries((prev) => upsertGoalSummary(prev, buildGoalSummary(goalToStore)));
        return goalToStore;
      },
      updateGoal: async ({ goalId, title, description, domain, tasks }) => {
        const now = new Date().toISOString();
        const normalizedTasks = normalizeTaskTree(tasks);

        if (hasDependencyCycle(normalizedTasks)) {
          throw new Error("Taski zawierają cykl zależności. Popraw zależności i zapisz ponownie.");
        }

        let updatedGoal: RoadmapGoal | null = null;
        setGoals((prev) =>
          prev.map((goal) => {
            if (goal.id !== goalId) return goal;
            const nextGoal: RoadmapGoal = {
              ...goal,
              title: title.trim(),
              description: description?.trim(),
              domain,
              updatedAt: now,
              tasks: normalizedTasks,
            };
            updatedGoal = nextGoal;
            return nextGoal;
          }),
        );

        if (!updatedGoal) {
          throw new Error("Nie znaleziono celu do edycji.");
        }

        const goalToUpdate = updatedGoal;
        setGoalSummaries((prev) => upsertGoalSummary(prev, buildGoalSummary(goalToUpdate)));
        return goalToUpdate;
      },
      refreshGoalsList: async () => {
        const remoteSummaries = await getAllGoalsRemote();
        const goalsById = new Map(goals.map((goal) => [goal.id, goal]));

        const mergedRemoteSummaries = remoteSummaries.map((summary) => {
          const cachedGoal = goalsById.get(summary.id);
          if (!cachedGoal) return summary;

          return {
            ...summary,
            domain: cachedGoal.domain,
            updatedAt: cachedGoal.updatedAt,
          };
        });

        setGoalSummaries(mergedRemoteSummaries);
      },
      getGoalById: (goalId) => goals.find((g) => g.id === goalId),
      refreshGoalById: async (goalId) => {
        if (!isRemoteGoalId(goalId)) {
          return;
        }

        const remoteGoal = await getGoalRemote(goalId);
        setGoals((prev) => {
          const exactIdx = prev.findIndex((goal) => goal.id === remoteGoal.id);
          if (exactIdx >= 0) {
            const next = [...prev];
            next[exactIdx] = remoteGoal;
            return next;
          }

          const requestedIdx = prev.findIndex((goal) => goal.id === goalId);
          if (requestedIdx >= 0) {
            const next = [...prev];
            next[requestedIdx] = remoteGoal;
            return next;
          }

          return [remoteGoal, ...prev];
        });
        setGoalSummaries((prev) => upsertGoalSummary(prev, buildGoalSummary(remoteGoal)));
      },
      markOneTimeTaskDone: async (goalId, taskId) => {
        const goal = goals.find((item) => item.id === goalId);
        if (!goal) return { ok: false, xpAwarded: 0, reason: "Nie znaleziono celu." };

        const taskMap = buildTaskMap(goal.tasks);
        const task = taskMap[taskId];
        if (!task || task.kind !== "one_time") {
          return { ok: false, xpAwarded: 0, reason: "Nieprawidłowy task." };
        }

        if (task.status === "done") {
          return { ok: false, xpAwarded: 0, reason: "Task jest już ukończony." };
        }

        if (isTaskBlocked(task, taskMap)) {
          return { ok: false, xpAwarded: 0, reason: "Task jest zablokowany przez zależności." };
        }

        if (isRemoteGoalId(goal.id) && isRemoteTaskId(task.id)) {
          try {
            const remoteResult = await markOneTimeTaskRemote(task.id);
            if (remoteResult.taskMarked === false) {
              return {
                ok: false,
                xpAwarded: 0,
                reason: "Serwer nie potwierdził zaliczenia taska.",
              };
            }
          } catch (error) {
            return {
              ok: false,
              xpAwarded: 0,
              reason:
                error instanceof Error
                  ? error.message
                  : "Nie udało się zaliczyć taska na serwerze.",
            };
          }
        }

        const now = new Date().toISOString();
        const dependentsCount = buildDependentsCountMap(goal.tasks)[task.id] ?? 0;
        const xpAwarded = calculateTaskXp(task, dependentsCount);
        const sourceKey = `task_one_time:${goal.id}:${task.id}`;

        setGoals((prev) =>
          prev.map((currentGoal) => {
            if (currentGoal.id !== goal.id) return currentGoal;
            return {
              ...currentGoal,
              updatedAt: now,
              tasks: updateTaskById(currentGoal.tasks, task.id, (currentTask) => ({
                ...currentTask,
                status: "done",
              })),
            };
          }),
        );
        setGoalSummaries((prev) =>
          prev.map((summary) =>
            summary.id === goal.id
              ? {
                  ...summary,
                  numberOfCompletedTasks: Math.min(
                    summary.numberOfTasks,
                    summary.numberOfCompletedTasks + 1,
                  ),
                  updatedAt: now,
                }
              : summary,
          ),
        );

        let xpAdded = false;
        setXpEvents((prev) => {
          if (prev.some((event) => event.sourceKey === sourceKey)) return prev;
          xpAdded = true;
          return [
            {
              id: buildId("xp"),
              createdAt: now,
              domain: goal.domain,
              sourceType: "task_one_time",
              sourceKey,
              xp: xpAwarded,
              goalId: goal.id,
              taskId: task.id,
              meta: {
                impact: task.impact,
                difficulty: task.difficulty,
                critical: dependentsCount > 0,
              },
            },
            ...prev,
          ];
        });

        return { ok: true, xpAwarded: xpAdded ? xpAwarded : 0 };
      },
      addHabitCompletion: async (goalId, taskId) => {
        const goal = goals.find((item) => item.id === goalId);
        if (!goal) return { ok: false, xpAwarded: 0, reason: "Nie znaleziono celu." };

        const taskMap = buildTaskMap(goal.tasks);
        const task = taskMap[taskId];
        if (!task || task.kind !== "habit" || !task.habit) {
          return { ok: false, xpAwarded: 0, reason: "Nieprawidłowy nawyk." };
        }

        if (isTaskBlocked(task, taskMap)) {
          return { ok: false, xpAwarded: 0, reason: "Nawyk jest zablokowany przez zależności." };
        }

        const today = todayIsoDate();
        if (
          !isHabitDueOnDate({
            startDate: task.habit.startDate,
            everyNDays: task.habit.everyNDays,
            durationDays: task.habit.durationDays,
            date: today,
          })
        ) {
          return { ok: false, xpAwarded: 0, reason: "Ten nawyk nie jest dziś wymagany." };
        }

        if (isCompletionOnDate(task.habit.completions, today)) {
          return { ok: false, xpAwarded: 0, reason: "Dzisiejsze wykonanie już zostało zapisane." };
        }

        const now = new Date().toISOString();
        const dependentsCount = buildDependentsCountMap(goal.tasks)[task.id] ?? 0;
        const xpAwarded = calculateTaskXp(task, dependentsCount);
        const sourceKey = `task_habit:${goal.id}:${task.id}:${today}`;
        const nextHabitState = {
          ...task.habit,
          completions: [...task.habit.completions, now],
        };
        const completesTaskNow = taskIsDone({
          ...task,
          habit: nextHabitState,
        });

        setGoals((prev) =>
          prev.map((currentGoal) => {
            if (currentGoal.id !== goal.id) return currentGoal;
            return {
              ...currentGoal,
              updatedAt: now,
              tasks: updateTaskById(currentGoal.tasks, task.id, (currentTask) => {
                if (currentTask.kind !== "habit" || !currentTask.habit) return currentTask;
                const updatedHabit = {
                  ...currentTask.habit,
                  completions: [...currentTask.habit.completions, now],
                };
                return {
                  ...currentTask,
                  habit: updatedHabit,
                  status: taskIsDone({ ...currentTask, habit: updatedHabit }) ? "done" : "todo",
                };
              }),
            };
          }),
        );
        if (!taskIsDone(task) && completesTaskNow) {
          setGoalSummaries((prev) =>
            prev.map((summary) =>
              summary.id === goal.id
                ? {
                    ...summary,
                    numberOfCompletedTasks: Math.min(
                      summary.numberOfTasks,
                      summary.numberOfCompletedTasks + 1,
                    ),
                    updatedAt: now,
                  }
                : summary,
            ),
          );
        }

        let xpAdded = false;
        setXpEvents((prev) => {
          if (prev.some((event) => event.sourceKey === sourceKey)) return prev;
          xpAdded = true;
          return [
            {
              id: buildId("xp"),
              createdAt: now,
              domain: goal.domain,
              sourceType: "task_habit",
              sourceKey,
              xp: xpAwarded,
              goalId: goal.id,
              taskId: task.id,
              meta: {
                impact: task.impact,
                difficulty: task.difficulty,
                critical: dependentsCount > 0,
              },
            },
            ...prev,
          ];
        });

        return { ok: true, xpAwarded: xpAdded ? xpAwarded : 0 };
      },
      awardCustomHabitXp: async (input) => {
        const now = new Date().toISOString();
        const sourceKey = `custom_habit:${input.habitId}:${input.date}`;
        const xpAwarded = calculateCustomHabitXp(input.impact, input.difficulty);

        let xpAdded = false;
        setXpEvents((prev) => {
          if (prev.some((event) => event.sourceKey === sourceKey)) return prev;
          xpAdded = true;
          return [
            {
              id: buildId("xp"),
              createdAt: now,
              domain: input.domain,
              sourceType: "custom_habit",
              sourceKey,
              xp: xpAwarded,
              meta: {
                impact: clamp(input.impact, 1, 5),
                difficulty: clamp(input.difficulty, 1, 3),
                critical: false,
              },
            },
            ...prev,
          ];
        });

        return { ok: true, xpAwarded: xpAdded ? xpAwarded : 0 };
      },
      removeGoal: async (goalId) => {
        setGoals((prev) => prev.filter((goal) => goal.id !== goalId));
        setGoalSummaries((prev) => prev.filter((goal) => goal.id !== goalId));
      },
      submitWeeklyReview: async (input) => {
        const now = new Date().toISOString();
        const weekKey = getWeekKey(now);
        const normalizedInput: WeeklyReviewInput = {
          wins: input.wins.trim(),
          blockers: input.blockers.trim(),
          nextPlan: input.nextPlan.trim(),
          consistencyScore: clamp(Number(input.consistencyScore) || 1, 1, 5),
          focusDomain: input.focusDomain,
        };
        const proposedXp = calculateWeeklyReviewXp(normalizedInput);
        const sourceKey = `weekly_review:${weekKey}`;
        const alreadyAwardedForWeek = xpEvents.some((event) => event.sourceKey === sourceKey);
        const xpAwarded = alreadyAwardedForWeek ? 0 : proposedXp;

        const entry: WeeklyReviewEntry = {
          id: buildId("review"),
          createdAt: now,
          weekKey,
          xpAwarded,
          ...normalizedInput,
        };

        setWeeklyReviews((prev) => [entry, ...prev.filter((review) => review.weekKey !== weekKey)]);

        if (!alreadyAwardedForWeek) {
          setXpEvents((prev) => [
            {
              id: buildId("xp"),
              createdAt: now,
              domain: normalizedInput.focusDomain,
              sourceType: "weekly_review",
              sourceKey,
              xp: xpAwarded,
              meta: {
                difficulty: normalizedInput.consistencyScore,
              },
            },
            ...prev,
          ]);
        }

        return {
          entry,
          xpAwarded,
          alreadyAwardedForWeek,
        };
      },
      getWeeklyReviewForCurrentWeek: () => {
        const weekKey = getWeekKey();
        return weeklyReviews.find((review) => review.weekKey === weekKey);
      },
    }),
    [goalDraft, goalSummaries, goals, loading, progress, weeklyReviews, xpEvents],
  );

  return <RoadmapContext.Provider value={value}>{children}</RoadmapContext.Provider>;
}

export function useRoadmaps() {
  const ctx = useContext(RoadmapContext);
  if (!ctx) throw new Error("useRoadmaps must be used inside RoadmapProvider");
  return ctx;
}

export function getBlockingTaskTitles(tasks: RoadmapTask[], targetTaskId: string) {
  const taskMap = buildTaskMap(tasks);
  const target = taskMap[targetTaskId];
  if (!target) return [];
  return getBlockedByTaskIds(target, taskMap).map((dependencyId) => taskMap[dependencyId]?.title ?? dependencyId);
}

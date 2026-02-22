import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  flattenTasks,
  GoalDomain,
  removeDependencyCycles,
  RoadmapGoal,
  RoadmapTask,
  TimeOfDay,
} from "./roadmap-types";

const ROADMAP_STORAGE_KEY = "roadmap_goals_v1";

export async function saveRoadmapGoals(goals: RoadmapGoal[]) {
  await AsyncStorage.setItem(ROADMAP_STORAGE_KEY, JSON.stringify(goals));
}

function isDomain(value: unknown): value is GoalDomain {
  return value === "health" || value === "career" || value === "learning";
}

function normalizeTask(raw: unknown): RoadmapTask | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== "string") return null;
  if (typeof record.title !== "string") return null;

  const kind = record.kind === "habit" ? "habit" : "one_time";
  const status = record.status === "done" ? "done" : "todo";
  const dependencies = Array.isArray(record.dependencies)
    ? record.dependencies.filter((item): item is string => typeof item === "string")
    : [];
  const impact = Math.min(5, Math.max(1, Number(record.impact) || 3));
  const difficulty = Math.min(3, Math.max(1, Number(record.difficulty) || 2));
  const childrenRaw = Array.isArray(record.children) ? record.children : [];
  const children = childrenRaw
    .map((child) => normalizeTask(child))
    .filter((child): child is RoadmapTask => child !== null);

  const habit =
    kind === "habit"
      ? {
          startDate:
            typeof (record.habit as { startDate?: unknown } | undefined)?.startDate === "string"
              ? ((record.habit as { startDate: string }).startDate || new Date().toISOString().slice(0, 10))
              : new Date().toISOString().slice(0, 10),
          durationDays: Math.max(
            1,
            Number((record.habit as { durationDays?: unknown } | undefined)?.durationDays) || 1,
          ),
          everyNDays: Math.max(
            1,
            Number((record.habit as { everyNDays?: unknown } | undefined)?.everyNDays) || 1,
          ),
          timeOfDay: (() => {
            const time = (record.habit as { timeOfDay?: unknown } | undefined)?.timeOfDay;
            if (time === "morning" || time === "afternoon" || time === "evening") return time as TimeOfDay;
            return undefined;
          })(),
          completions: Array.isArray((record.habit as { completions?: unknown } | undefined)?.completions)
            ? (((record.habit as { completions?: unknown[] }).completions ?? []).filter(
                (item): item is string => typeof item === "string",
              ) as string[])
            : [],
        }
      : undefined;

  return {
    id: record.id,
    title: record.title.trim() || "Bez nazwy",
    notes: typeof record.notes === "string" ? record.notes : undefined,
    kind,
    status,
    dependencies,
    impact,
    difficulty,
    habit,
    children,
  };
}

function normalizeGoal(raw: unknown): RoadmapGoal | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== "string") return null;
  if (typeof record.title !== "string") return null;

  const tasksRaw = Array.isArray(record.tasks) ? record.tasks : [];
  const tasks = tasksRaw
    .map((task) => normalizeTask(task))
    .filter((task): task is RoadmapTask => task !== null);
  const taskIds = new Set(flattenTasks(tasks).map((task) => task.id));

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

  // Clean invalid/self dependencies + remove ancestor/descendant dependencies in same branch.
  const sanitizeDependencies = (task: RoadmapTask, ancestorIds: string[] = []): RoadmapTask => {
    const descendantIds = collectDescendantIds(task);
    return {
      ...task,
      dependencies: task.dependencies.filter(
        (depId) =>
          depId !== task.id &&
          taskIds.has(depId) &&
          !ancestorIds.includes(depId) &&
          !descendantIds.has(depId),
      ),
      children: task.children.map((child) => sanitizeDependencies(child, [...ancestorIds, task.id])),
    };
  };

  return {
    id: record.id,
    title: record.title.trim() || "Bez nazwy",
    description: typeof record.description === "string" ? record.description : undefined,
    domain: isDomain(record.domain) ? record.domain : "career",
    createdAt: typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString(),
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : new Date().toISOString(),
    tasks: removeDependencyCycles(tasks.map((task) => sanitizeDependencies(task))),
  };
}

export async function getRoadmapGoals(): Promise<RoadmapGoal[]> {
  const raw = await AsyncStorage.getItem(ROADMAP_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((goal) => normalizeGoal(goal)).filter((goal): goal is RoadmapGoal => goal !== null);
  } catch {
    return [];
  }
}

export async function clearRoadmapGoals() {
  await AsyncStorage.removeItem(ROADMAP_STORAGE_KEY);
}

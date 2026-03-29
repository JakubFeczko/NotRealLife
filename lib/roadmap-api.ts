import { authFetch } from "./auth-api";
import {
  GoalDomain,
  RoadmapGoal,
  RoadmapGoalSummary,
  RoadmapTask,
  TimeOfDay,
} from "./roadmap-types";

type BackendDomain = "HEALTH" | "CAREER" | "LEARNING";
type BackendTaskKind = "ONE_TIME" | "HABIT";
type BackendTaskStatus = "TODO" | "DONE";
type BackendTimeOfDay = "MORNING" | "AFTERNOON" | "EVENING";

type BackendTaskDependency = {
  taskId: number;
  dependsOnTaskId: number;
  dependencyType: "MUST_COMPLETE_BEFORE";
};

type BackendHabitSettings = {
  startDate: string;
  durationDays?: number | null;
  everyNDays?: number | null;
  every_n_days?: number | null;
  timeOfDay?: BackendTimeOfDay | null;
};

type BackendTask = {
  id: number | string;
  title: string;
  description?: string | null;
  taskKind: BackendTaskKind;
  impact?: number | null;
  difficulty?: number | null;
  status?: BackendTaskStatus | null;
  sortOrder?: number | null;
  subtasks?: BackendTask[];
  habitSettings?: BackendHabitSettings | null;
  completions?: unknown[];
};

type BackendGoalResponse = {
  id: number | string;
  title: string;
  description?: string | null;
  domain: BackendDomain | string;
  createdAt?: string;
  updatedAt?: string;
  tasks?: BackendTask[];
  tasksDependencies?: Array<{
    taskId?: number | string;
    dependsOnTaskId?: number | string;
    dependencyType?: string;
  }>;
};

type BackendGoalSummaryResponse = {
  id: number | string;
  title?: string | null;
  description?: string | null;
  numberOfTasks?: number | string | null;
  numberOfCompletedTasks?: number | string | null;
};

const GOALS_API_PREFIX = "/goals";
const TASKS_API_PREFIX = "/tasks";

function clamp(raw: number, min: number, max: number) {
  return Math.min(max, Math.max(min, raw));
}

function parseJsonSafe(raw: string) {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function extractErrorMessage(rawBody: string, fallback: string) {
  const parsed = parseJsonSafe(rawBody);
  if (parsed && typeof parsed === "object") {
    const message = (parsed as Record<string, unknown>).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return fallback;
}

function toBackendDomain(domain: GoalDomain): BackendDomain {
  if (domain === "health") return "HEALTH";
  if (domain === "learning") return "LEARNING";
  return "CAREER";
}

function toFrontendDomain(domain: unknown): GoalDomain {
  const normalized = String(domain ?? "").toUpperCase();
  if (normalized === "HEALTH") return "health";
  if (normalized === "LEARNING") return "learning";
  return "career";
}

function toBackendTaskKind(kind: RoadmapTask["kind"]): BackendTaskKind {
  return kind === "habit" ? "HABIT" : "ONE_TIME";
}

function toFrontendTaskKind(kind: unknown): RoadmapTask["kind"] {
  return String(kind ?? "").toUpperCase() === "HABIT" ? "habit" : "one_time";
}

function toFrontendTaskStatus(status: unknown): RoadmapTask["status"] {
  return String(status ?? "").toUpperCase() === "DONE" ? "done" : "todo";
}

function toBackendTimeOfDay(timeOfDay?: TimeOfDay): BackendTimeOfDay | undefined {
  if (timeOfDay === "morning") return "MORNING";
  if (timeOfDay === "afternoon") return "AFTERNOON";
  if (timeOfDay === "evening") return "EVENING";
  return undefined;
}

function toFrontendTimeOfDay(timeOfDay?: unknown): TimeOfDay | undefined {
  const normalized = String(timeOfDay ?? "").toUpperCase();
  if (normalized === "MORNING") return "morning";
  if (normalized === "AFTERNOON") return "afternoon";
  if (normalized === "EVENING") return "evening";
  return undefined;
}

function numericIdFromUnknown(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return null;
}

function collectLocalTaskIds(tasks: RoadmapTask[]) {
  const map = new Map<string, number>();
  let nextId = 1;

  const walk = (nodes: RoadmapTask[]) => {
    for (const node of nodes) {
      if (!map.has(node.id)) {
        map.set(node.id, nextId);
        nextId += 1;
      }
      walk(node.children);
    }
  };

  walk(tasks);
  return map;
}

function buildCreatePayload(params: {
  title: string;
  description?: string;
  domain: GoalDomain;
  tasks: RoadmapTask[];
}) {
  const taskIdMap = collectLocalTaskIds(params.tasks);
  const dependencies: BackendTaskDependency[] = [];

  const serializeNode = (node: RoadmapTask, index: number): BackendTask => {
    const mappedId = taskIdMap.get(node.id);
    if (!mappedId) {
      throw new Error("Brak mapowania ID taska do payloadu backendowego.");
    }

    const uniqueDependencies = [...new Set(node.dependencies)];
    for (const depId of uniqueDependencies) {
      const mappedDepId = taskIdMap.get(depId);
      if (!mappedDepId) continue;
      dependencies.push({
        taskId: mappedId,
        dependsOnTaskId: mappedDepId,
        dependencyType: "MUST_COMPLETE_BEFORE",
      });
    }

    const everyNDays = node.habit?.everyNDays;
    const durationDays = node.habit?.durationDays;

    return {
      id: mappedId,
      title: node.title,
      description: node.notes ?? null,
      taskKind: toBackendTaskKind(node.kind),
      impact: node.impact,
      difficulty: node.difficulty,
      sortOrder: index + 1,
      habitSettings:
        node.kind === "habit" && node.habit
          ? {
              startDate: node.habit.startDate,
              everyNDays: Math.max(1, Number(everyNDays) || 1),
              durationDays: Math.max(1, Number(durationDays) || 1),
              timeOfDay: toBackendTimeOfDay(node.habit.timeOfDay),
            }
          : null,
      subtasks: node.children.map((child, childIndex) => serializeNode(child, childIndex)),
    };
  };

  const serializedTasks = params.tasks.map((task, index) => serializeNode(task, index));
  const uniqueDependencies = Array.from(
    new Map(
      dependencies.map((item) => [`${item.taskId}:${item.dependsOnTaskId}`, item]),
    ).values(),
  );

  return {
    title: params.title.trim(),
    description: params.description?.trim() || undefined,
    domain: toBackendDomain(params.domain),
    tasks: serializedTasks,
    tasksDependencies: uniqueDependencies,
  };
}

function collectChildIds(nodes: RoadmapTask[]) {
  const ids = new Set<string>();
  const walk = (tasks: RoadmapTask[]) => {
    for (const task of tasks) {
      for (const child of task.children) {
        ids.add(child.id);
      }
      walk(task.children);
    }
  };
  walk(nodes);
  return ids;
}

function normalizeCompletions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string");
}

function mapBackendGoalToRoadmapGoal(raw: BackendGoalResponse): RoadmapGoal {
  const dependencyMap = new Map<string, string[]>();
  for (const dep of raw.tasksDependencies ?? []) {
    const taskId = numericIdFromUnknown(dep.taskId);
    const dependsOnTaskId = numericIdFromUnknown(dep.dependsOnTaskId);
    if (!taskId || !dependsOnTaskId) continue;

    const key = String(taskId);
    const list = dependencyMap.get(key) ?? [];
    list.push(String(dependsOnTaskId));
    dependencyMap.set(key, [...new Set(list)]);
  }

  const parseTask = (task: BackendTask): RoadmapTask => {
    const taskId = numericIdFromUnknown(task.id);
    const parsedId = taskId ? String(taskId) : String(task.id ?? "");
    const parsedSubtasksRaw = Array.isArray(task.subtasks) ? task.subtasks : [];

    const subtasksById = new Map<string, RoadmapTask>();
    const parsedSubtasks = parsedSubtasksRaw
      .map((subtask) => parseTask(subtask))
      .filter((subtask) => {
        if (subtasksById.has(subtask.id)) return false;
        subtasksById.set(subtask.id, subtask);
        return true;
      });

    const habitEveryRaw =
      task.habitSettings?.everyNDays ?? task.habitSettings?.every_n_days;

    return {
      id: parsedId,
      title: typeof task.title === "string" && task.title.trim() ? task.title.trim() : "Bez nazwy",
      notes:
        typeof task.description === "string" && task.description.trim().length > 0
          ? task.description.trim()
          : undefined,
      kind: toFrontendTaskKind(task.taskKind),
      status: toFrontendTaskStatus(task.status),
      impact: clamp(Number(task.impact) || 3, 1, 5),
      difficulty: clamp(Number(task.difficulty) || 2, 1, 3),
      dependencies: dependencyMap.get(parsedId) ?? [],
      habit:
        toFrontendTaskKind(task.taskKind) === "habit"
          ? {
              startDate:
                typeof task.habitSettings?.startDate === "string" && task.habitSettings.startDate
                  ? task.habitSettings.startDate
                  : new Date().toISOString().slice(0, 10),
              durationDays: Math.max(1, Number(task.habitSettings?.durationDays) || 1),
              everyNDays: Math.max(1, Number(habitEveryRaw) || 1),
              timeOfDay: toFrontendTimeOfDay(task.habitSettings?.timeOfDay),
              completions: normalizeCompletions(task.completions),
            }
          : undefined,
      children: parsedSubtasks,
    };
  };

  const rawTasks = Array.isArray(raw.tasks) ? raw.tasks : [];
  const parsedTopById = new Map<string, RoadmapTask>();

  const topTasks = rawTasks
    .map((task) => parseTask(task))
    .filter((task) => {
      if (parsedTopById.has(task.id)) return false;
      parsedTopById.set(task.id, task);
      return true;
    });

  // Backend currently may duplicate subtasks at top-level. Remove those roots.
  const childIds = collectChildIds(topTasks);
  const cleanedRoots = topTasks.filter((task) => !childIds.has(task.id));

  return {
    id: String(raw.id),
    title: raw.title?.trim() || "Bez nazwy",
    description:
      typeof raw.description === "string" && raw.description.trim().length > 0
        ? raw.description.trim()
        : undefined,
    domain: toFrontendDomain(raw.domain),
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
    tasks: cleanedRoots,
  };
}

function mapBackendGoalSummary(raw: BackendGoalSummaryResponse): RoadmapGoalSummary {
  const totalTasks = Math.max(0, Number(raw.numberOfTasks) || 0);
  const completedTasks = clamp(Number(raw.numberOfCompletedTasks) || 0, 0, totalTasks);

  return {
    id: String(raw.id),
    title:
      typeof raw.title === "string" && raw.title.trim().length > 0
        ? raw.title.trim()
        : "Bez nazwy",
    description:
      typeof raw.description === "string" && raw.description.trim().length > 0
        ? raw.description.trim()
        : undefined,
    numberOfTasks: totalTasks,
    numberOfCompletedTasks: completedTasks,
  };
}

function extractGoalIdFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  const directCandidates = ["goalId", "id", "createdGoalId"];
  for (const key of directCandidates) {
    const numeric = numericIdFromUnknown(record[key]);
    if (numeric) return String(numeric);
  }

  const nestedCandidates = ["goal", "data", "payload"];
  for (const key of nestedCandidates) {
    const nested = record[key];
    if (nested && typeof nested === "object") {
      const nestedId = extractGoalIdFromPayload(nested);
      if (nestedId) return nestedId;
    }
  }

  return null;
}

function extractGoalIdFromLocation(location: string | null): string | null {
  if (!location) return null;

  const queryMatch = location.match(/[?&]goalId=(\d+)/i);
  if (queryMatch?.[1]) return queryMatch[1];

  const tailMatch = location.match(/\/(\d+)(?:\/?$)/);
  if (tailMatch?.[1]) return tailMatch[1];

  return null;
}

export async function createGoalRemote(params: {
  title: string;
  description?: string;
  domain: GoalDomain;
  tasks: RoadmapTask[];
}): Promise<RoadmapGoal | null> {
  const payload = buildCreatePayload(params);
  const url = `${GOALS_API_PREFIX}/createGoal`;

  console.log("[goals/createGoal] request", {
    url,
    method: "POST",
    payload: JSON.parse(JSON.stringify(payload)),
  });

  const response = await authFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const rawBody = await response.text();
  const parsedBody = parseJsonSafe(rawBody);

  if (!response.ok) {
    console.log("[goals/createGoal] error response", {
      status: response.status,
      statusText: response.statusText,
      body: rawBody,
    });
    throw new Error(
      extractErrorMessage(rawBody, "Nie udało się utworzyć celu na serwerze."),
    );
  }

  console.log("[goals/createGoal] success response", {
    status: response.status,
    location: response.headers.get("Location"),
    body: parsedBody ?? rawBody,
  });

  const goalIdFromBody = extractGoalIdFromPayload(parsedBody);
  const goalIdFromLocation = extractGoalIdFromLocation(response.headers.get("Location"));
  const resolvedGoalId = goalIdFromBody ?? goalIdFromLocation;

  console.log("[goals/createGoal] resolved goal id", {
    goalIdFromBody,
    goalIdFromLocation,
    resolvedGoalId,
  });

  if (!resolvedGoalId) {
    // Endpoint currently may return only { createGoalSuccess: true }.
    console.log("[goals/createGoal] missing goalId in response; using local fallback");
    return null;
  }

  return getGoalRemote(resolvedGoalId);
}

export async function getGoalRemote(goalId: string | number): Promise<RoadmapGoal> {
  const id = String(goalId).trim();
  const url = `${GOALS_API_PREFIX}/getGoal?goalId=${encodeURIComponent(id)}`;

  console.log("[goals/getGoal] request", {
    url,
    method: "GET",
  });

  const response = await authFetch(url, {
    method: "GET",
  });

  const rawBody = await response.text();
  if (!response.ok) {
    console.log("[goals/getGoal] error response", {
      status: response.status,
      statusText: response.statusText,
      body: rawBody,
    });
    throw new Error(
      extractErrorMessage(rawBody, "Nie udało się pobrać celu z serwera."),
    );
  }

  const parsed = parseJsonSafe(rawBody);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Nieprawidłowa odpowiedź serwera dla pobierania celu.");
  }

  const mapped = mapBackendGoalToRoadmapGoal(parsed as BackendGoalResponse);
  console.log("[goals/getGoal] success response", {
    id: mapped.id,
    title: mapped.title,
    tasks: mapped.tasks.length,
  });

  return mapped;
}

export async function getAllGoalsRemote(): Promise<RoadmapGoalSummary[]> {
  const url = `${GOALS_API_PREFIX}/getAllGoals`;

  console.log("[goals/getAllGoals] request", {
    url,
    method: "GET",
  });

  const response = await authFetch(url, {
    method: "GET",
  });

  const rawBody = await response.text();
  if (!response.ok) {
    console.log("[goals/getAllGoals] error response", {
      status: response.status,
      statusText: response.statusText,
      body: rawBody,
    });
    throw new Error(
      extractErrorMessage(rawBody, "Nie udało się pobrać listy celów z serwera."),
    );
  }

  const parsed = parseJsonSafe(rawBody);
  if (!Array.isArray(parsed)) {
    throw new Error("Nieprawidłowa odpowiedź serwera dla listy celów.");
  }

  const mapped = parsed
    .filter((item): item is BackendGoalSummaryResponse => !!item && typeof item === "object")
    .map((item) => mapBackendGoalSummary(item));

  console.log("[goals/getAllGoals] success response", {
    count: mapped.length,
    body: parsed,
  });

  return mapped;
}

type MarkOneTimeTaskResponse = {
  goalCompleted?: boolean;
  taskMarked?: boolean;
};

export async function markOneTimeTaskRemote(
  taskId: string | number,
): Promise<MarkOneTimeTaskResponse> {
  const normalizedTaskId = numericIdFromUnknown(taskId);
  if (!normalizedTaskId) {
    throw new Error("Nieprawidłowe ID taska do zaliczenia.");
  }

  const url = `${TASKS_API_PREFIX}/MarkOneTimeTask`;
  const payload = { taskId: normalizedTaskId };

  console.log("[tasks/MarkOneTimeTask] request", {
    url,
    method: "POST",
    payload,
  });

  const response = await authFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const rawBody = await response.text();
  const parsedBody = parseJsonSafe(rawBody);

  if (!response.ok) {
    console.log("[tasks/MarkOneTimeTask] error response", {
      status: response.status,
      statusText: response.statusText,
      body: rawBody,
    });
    throw new Error(
      extractErrorMessage(rawBody, "Nie udało się zaliczyć taska na serwerze."),
    );
  }

  const result =
    parsedBody && typeof parsedBody === "object"
      ? (parsedBody as MarkOneTimeTaskResponse)
      : {};

  console.log("[tasks/MarkOneTimeTask] success response", {
    status: response.status,
    taskMarked: result.taskMarked ?? null,
    goalCompleted: result.goalCompleted ?? null,
  });

  return result;
}

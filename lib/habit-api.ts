import { authFetch } from "./auth-api";
import { TodayTaskItem, TodayTasksSnapshot } from "./habit-types";
import { TimeOfDay } from "./roadmap-types";

type BackendTodayTask = {
  title?: string | null;
  description?: string | null;
  isDoneToday?: boolean | null;
  time_of_day?: string | null;
};

type BackendTodayTasksResponse = {
  numberOfCompletedTasks?: number | string | null;
  numberOfTasksToDo?: number | string | null;
  tasksForToday?: BackendTodayTask[] | null;
};

const TASKS_API_PREFIX = "/tasks";

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

function toFrontendTimeOfDay(value: unknown): TimeOfDay | undefined {
  const normalized = String(value ?? "").toUpperCase();
  if (normalized === "MORNING") return "morning";
  if (normalized === "AFTERNOON") return "afternoon";
  if (normalized === "EVENING") return "evening";
  return undefined;
}

function mapTodayTask(raw: BackendTodayTask): TodayTaskItem {
  return {
    title:
      typeof raw.title === "string" && raw.title.trim().length > 0
        ? raw.title.trim()
        : "Bez nazwy",
    description:
      typeof raw.description === "string" && raw.description.trim().length > 0
        ? raw.description.trim()
        : undefined,
    isDoneToday: Boolean(raw.isDoneToday),
    timeOfDay: toFrontendTimeOfDay(raw.time_of_day),
  };
}

export async function getTodayTasksRemote(): Promise<TodayTasksSnapshot> {
  const url = `${TASKS_API_PREFIX}/getTasksForToday`;

  console.log("[tasks/getTasksForToday] request", {
    url,
    method: "GET",
  });

  const response = await authFetch(url, {
    method: "GET",
  });

  const rawBody = await response.text();
  if (!response.ok) {
    console.log("[tasks/getTasksForToday] error response", {
      status: response.status,
      statusText: response.statusText,
      body: rawBody,
    });
    throw new Error(
      extractErrorMessage(rawBody, "Nie udało się pobrać dzisiejszych zadań."),
    );
  }

  const parsed = parseJsonSafe(rawBody);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Nieprawidłowa odpowiedź serwera dla dzisiejszych zadań.");
  }

  const payload = parsed as BackendTodayTasksResponse;
  const tasks = Array.isArray(payload.tasksForToday)
    ? payload.tasksForToday.map((task) => mapTodayTask(task))
    : [];

  const completedCount = Math.max(0, Number(payload.numberOfCompletedTasks) || 0);
  const remainingCount = Math.max(0, Number(payload.numberOfTasksToDo) || 0);
  const totalCount = Math.max(tasks.length, completedCount + remainingCount);

  console.log("[tasks/getTasksForToday] success response", {
    completedCount,
    remainingCount,
    totalCount,
    tasks: tasks.length,
  });

  return {
    completedCount,
    remainingCount,
    totalCount,
    tasks,
  };
}

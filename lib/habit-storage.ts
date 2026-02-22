import AsyncStorage from "@react-native-async-storage/async-storage";
import { CustomHabit } from "./habit-types";
import { GoalDomain } from "./roadmap-types";

const CUSTOM_HABITS_KEY = "custom_habits_v1";

function isDomain(value: unknown): value is GoalDomain {
  return value === "health" || value === "career" || value === "learning";
}

function normalizeHabit(raw: unknown): CustomHabit | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== "string") return null;
  if (typeof record.title !== "string") return null;

  return {
    id: record.id,
    title: record.title.trim() || "Bez nazwy",
    domain: isDomain(record.domain) ? record.domain : "career",
    startDate:
      typeof record.startDate === "string" && record.startDate
        ? record.startDate
        : new Date().toISOString().slice(0, 10),
    everyNDays: Math.max(1, Number(record.everyNDays) || 1),
    durationDays:
      record.durationDays == null ? undefined : Math.max(1, Number(record.durationDays) || 1),
    impact: Math.max(1, Math.min(5, Number(record.impact) || 3)),
    difficulty: Math.max(1, Math.min(3, Number(record.difficulty) || 2)),
    timeOfDay:
      record.timeOfDay === "morning" ||
      record.timeOfDay === "afternoon" ||
      record.timeOfDay === "evening"
        ? record.timeOfDay
        : undefined,
    completions: Array.isArray(record.completions)
      ? record.completions.filter((item): item is string => typeof item === "string")
      : [],
    createdAt: typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString(),
  };
}

export async function getCustomHabits(): Promise<CustomHabit[]> {
  const raw = await AsyncStorage.getItem(CUSTOM_HABITS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((habit) => normalizeHabit(habit)).filter((habit): habit is CustomHabit => habit !== null);
  } catch {
    return [];
  }
}

export async function saveCustomHabits(habits: CustomHabit[]) {
  await AsyncStorage.setItem(CUSTOM_HABITS_KEY, JSON.stringify(habits));
}

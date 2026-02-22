import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoalDomain } from "./roadmap-types";
import { WeeklyReviewEntry, XpEvent } from "./progression-types";

const XP_EVENTS_STORAGE_KEY = "xp_events_v1";
const WEEKLY_REVIEW_STORAGE_KEY = "weekly_review_v1";

function isDomain(value: unknown): value is GoalDomain {
  return value === "health" || value === "career" || value === "learning";
}

function normalizeXpEvent(raw: unknown): XpEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;

  if (!isDomain(record.domain)) return null;
  if (typeof record.id !== "string") return null;
  if (typeof record.sourceType !== "string") return null;
  if (typeof record.sourceKey !== "string") return null;
  if (typeof record.createdAt !== "string") return null;

  return {
    id: record.id,
    createdAt: record.createdAt,
    domain: record.domain,
    sourceType: record.sourceType as XpEvent["sourceType"],
    sourceKey: record.sourceKey,
    xp: Number(record.xp) || 0,
    goalId: typeof record.goalId === "string" ? record.goalId : undefined,
    taskId: typeof record.taskId === "string" ? record.taskId : undefined,
    meta: typeof record.meta === "object" && record.meta ? (record.meta as XpEvent["meta"]) : undefined,
  };
}

function normalizeWeeklyReview(raw: unknown): WeeklyReviewEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (!isDomain(record.focusDomain)) return null;
  if (typeof record.id !== "string") return null;
  if (typeof record.createdAt !== "string") return null;
  if (typeof record.weekKey !== "string") return null;

  return {
    id: record.id,
    createdAt: record.createdAt,
    weekKey: record.weekKey,
    focusDomain: record.focusDomain,
    wins: typeof record.wins === "string" ? record.wins : "",
    blockers: typeof record.blockers === "string" ? record.blockers : "",
    nextPlan: typeof record.nextPlan === "string" ? record.nextPlan : "",
    consistencyScore: Number(record.consistencyScore) || 1,
    xpAwarded: Number(record.xpAwarded) || 0,
  };
}

export async function saveXpEvents(events: XpEvent[]) {
  await AsyncStorage.setItem(XP_EVENTS_STORAGE_KEY, JSON.stringify(events));
}

export async function getXpEvents(): Promise<XpEvent[]> {
  const raw = await AsyncStorage.getItem(XP_EVENTS_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeXpEvent).filter((item): item is XpEvent => item !== null);
  } catch {
    return [];
  }
}

export async function saveWeeklyReviews(reviews: WeeklyReviewEntry[]) {
  await AsyncStorage.setItem(WEEKLY_REVIEW_STORAGE_KEY, JSON.stringify(reviews));
}

export async function getWeeklyReviews(): Promise<WeeklyReviewEntry[]> {
  const raw = await AsyncStorage.getItem(WEEKLY_REVIEW_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeWeeklyReview).filter((item): item is WeeklyReviewEntry => item !== null);
  } catch {
    return [];
  }
}

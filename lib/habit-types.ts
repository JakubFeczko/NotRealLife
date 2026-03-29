import { GoalDomain, TimeOfDay } from "./roadmap-types";

export type CustomHabit = {
  id: string;
  title: string;
  domain: GoalDomain;
  startDate: string; // YYYY-MM-DD
  everyNDays: number;
  durationDays?: number;
  impact: number; // 1..5
  difficulty: number; // 1..3
  timeOfDay?: TimeOfDay;
  completions: string[]; // ISO timestamps
  createdAt: string;
};

export type TodayTaskItem = {
  title: string;
  description?: string;
  isDoneToday: boolean;
  timeOfDay?: TimeOfDay;
};

export type TodayTasksSnapshot = {
  completedCount: number;
  remainingCount: number;
  totalCount: number;
  tasks: TodayTaskItem[];
};

export function todayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isCompletionOnDate(completions: string[], date: string) {
  return completions.some((item) => item.slice(0, 10) === date);
}

export function isHabitDueOnDate({
  startDate,
  everyNDays,
  durationDays,
  date,
}: {
  startDate: string;
  everyNDays: number;
  durationDays?: number;
  date: string;
}) {
  const start = new Date(`${startDate}T00:00:00`);
  const current = new Date(`${date}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(current.getTime())) {
    return false;
  }

  const diffDays = Math.floor((current.getTime() - start.getTime()) / 86400000);
  if (diffDays < 0) return false;

  if (durationDays && diffDays >= durationDays) {
    return false;
  }

  const normalizedEvery = Math.max(1, everyNDays || 1);
  return diffDays % normalizedEvery === 0;
}

export function translateTimeOfDay(value?: TimeOfDay) {
  if (value === "morning") return "Rano";
  if (value === "afternoon") return "Popołudnie";
  if (value === "evening") return "Wieczór";
  return "Dowolna pora";
}

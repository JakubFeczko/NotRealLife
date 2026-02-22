import { GOAL_DOMAIN_LABELS, GOAL_DOMAIN_ORDER, GoalDomain } from "./roadmap-types";

export type XpSourceType = "task_one_time" | "task_habit" | "custom_habit" | "weekly_review";

export type XpEvent = {
  id: string;
  createdAt: string;
  domain: GoalDomain;
  sourceType: XpSourceType;
  sourceKey: string;
  xp: number;
  goalId?: string;
  taskId?: string;
  meta?: {
    impact?: number;
    difficulty?: number;
    critical?: boolean;
  };
};

export type WeeklyReviewInput = {
  wins: string;
  blockers: string;
  nextPlan: string;
  consistencyScore: number; // 1..5
  focusDomain: GoalDomain;
};

export type WeeklyReviewEntry = WeeklyReviewInput & {
  id: string;
  createdAt: string;
  weekKey: string;
  xpAwarded: number;
};

export type LevelState = {
  level: number;
  xpInLevel: number;
  xpToNextLevel: number;
  progress: number;
};

export type DomainProgress = {
  domain: GoalDomain;
  label: string;
  xp: number;
  level: number;
  xpInLevel: number;
  xpToNextLevel: number;
  progress: number;
};

export type ProgressSnapshot = {
  totalXp: number;
  overall: LevelState;
  domains: Record<GoalDomain, DomainProgress>;
};

export const DOMAIN_COLORS: Record<GoalDomain, string> = {
  health: "#6FD1FF",
  career: "#9FD7A8",
  learning: "#F0C17A",
};

const BASE_LEVEL_XP = 120;
const LEVEL_GROWTH = 1.16;

function xpNeededForLevel(level: number) {
  return Math.round(BASE_LEVEL_XP * Math.pow(LEVEL_GROWTH, Math.max(level - 1, 0)));
}

export function getLevelStateFromXp(rawXp: number): LevelState {
  let xp = Math.max(0, Math.floor(rawXp));
  let level = 1;
  let required = xpNeededForLevel(level);

  while (xp >= required) {
    xp -= required;
    level += 1;
    required = xpNeededForLevel(level);
  }

  return {
    level,
    xpInLevel: xp,
    xpToNextLevel: required,
    progress: required === 0 ? 0 : xp / required,
  };
}

export function getWeekKey(dateIso = new Date().toISOString()) {
  const date = new Date(dateIso);
  const day = date.getDay(); // 0 Sunday ... 6 Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  return monday.toISOString().slice(0, 10);
}

export function buildProgressSnapshot(events: XpEvent[]): ProgressSnapshot {
  const xpByDomain: Record<GoalDomain, number> = {
    health: 0,
    career: 0,
    learning: 0,
  };

  for (const event of events) {
    xpByDomain[event.domain] += Math.max(0, Math.floor(event.xp));
  }

  const domains = {} as Record<GoalDomain, DomainProgress>;
  for (const domain of GOAL_DOMAIN_ORDER) {
    const xp = xpByDomain[domain];
    const levelState = getLevelStateFromXp(xp);
    domains[domain] = {
      domain,
      label: GOAL_DOMAIN_LABELS[domain],
      xp,
      ...levelState,
    };
  }

  const totalXp = GOAL_DOMAIN_ORDER.reduce((sum, domain) => sum + domains[domain].xp, 0);

  return {
    totalXp,
    overall: getLevelStateFromXp(totalXp),
    domains,
  };
}

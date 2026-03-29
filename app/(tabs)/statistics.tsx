import React, { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line as SvgLine, Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHabits } from "@/lib/habit-context";
import { isCompletionOnDate, isHabitDueOnDate, todayIsoDate, translateTimeOfDay } from "@/lib/habit-types";
import { DOMAIN_COLORS } from "@/lib/progression-types";
import { useRoadmaps } from "@/lib/roadmap-context";
import {
  buildTaskMap,
  flattenTasks,
  GOAL_DOMAIN_LABELS,
  GOAL_DOMAIN_ORDER,
  isTaskBlocked,
  taskIsDone,
  TimeOfDay,
} from "@/lib/roadmap-types";

const DAY_LABELS = ["Pn", "Wt", "Sr", "Cz", "Pt", "Sb", "Nd"];
const MONTH_LABELS_SHORT = ["Sty", "Lut", "Mar", "Kwi", "Maj", "Cze", "Lip", "Sie", "Wrz", "Paz", "Lis", "Gru"];

const RANGE_OPTIONS = [
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
] as const;

type RangeKey = (typeof RANGE_OPTIONS)[number]["key"];

const FILTER_OPTIONS = [
  { key: "all", label: "Wszystko" },
  { key: "goals", label: "Cele" },
  { key: "tasks", label: "Zadania" },
  { key: "habits", label: "Nawyki" },
] as const;

type FilterKey = (typeof FILTER_OPTIONS)[number]["key"];
type IoniconName = keyof typeof Ionicons.glyphMap;

type HabitEntry = {
  id: string;
  goalId?: string;
  startDate: string;
  everyNDays: number;
  durationDays?: number;
  completions: string[];
  timeOfDay?: TimeOfDay;
};

type DailyStats = {
  date: string;
  plannedTasks: number;
  completedTasks: number;
  plannedHabits: number;
  completedHabits: number;
  plannedAll: number;
  completedAll: number;
};

type GoalStatus = "Krytyczne" | "Uwaga" | "Stabilne";

type GoalMetric = {
  id: string;
  title: string;
  progressPercent: number;
  daysWithoutProgress: number;
  daysToSoftDeadline: number;
  blockedCount: number;
  onTrack: boolean;
  riskScore: number;
  status: GoalStatus;
  nextHint: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysBetween(from: Date, to: Date) {
  const fromTs = startOfDay(from).getTime();
  const toTs = startOfDay(to).getTime();
  return Math.floor((toTs - fromTs) / 86400000);
}

function getWeekdayIndexMondayFirst(dateIso: string) {
  const date = new Date(`${dateIso}T00:00:00`);
  return (date.getDay() + 6) % 7;
}

function getRangeDays(range: RangeKey) {
  if (range === "7d") return 7;
  if (range === "30d") return 30;
  return 90;
}

function getRangeDatesEndingAt(referenceIso: string, days: number) {
  const end = startOfDay(new Date(`${referenceIso}T00:00:00`));
  const start = addDays(end, -(days - 1));
  const result: string[] = [];

  for (let i = 0; i < days; i += 1) {
    result.push(toIsoDate(addDays(start, i)));
  }

  return result;
}

function getHeatmapDates(referenceIso: string) {
  const today = startOfDay(new Date(`${referenceIso}T00:00:00`));
  const mondayOffset = getWeekdayIndexMondayFirst(referenceIso);
  const currentWeekMonday = addDays(today, -mondayOffset);
  const start = addDays(currentWeekMonday, -21);

  return Array.from({ length: 28 }).map((_, idx) => toIsoDate(addDays(start, idx)));
}

function ratioPercent(done: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

function sum(numbers: number[]) {
  return numbers.reduce((acc, value) => acc + value, 0);
}

function compressSeries(values: number[], maxPoints = 12) {
  if (values.length <= maxPoints) return values;

  const step = values.length / maxPoints;
  const result: number[] = [];

  for (let i = 0; i < maxPoints; i += 1) {
    const idx = Math.min(values.length - 1, Math.floor(i * step));
    result.push(values[idx] ?? 0);
  }

  return result;
}

function formatDelta(delta: number, suffix = "pp") {
  if (delta === 0) return `0 ${suffix}`;
  return `${delta > 0 ? "+" : ""}${delta} ${suffix}`;
}

function buildLinePath(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  return points.map((point, idx) => `${idx === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function aggregateHabitsForDate(entries: HabitEntry[], date: string, timeOfDay?: TimeOfDay) {
  let due = 0;
  let done = 0;

  for (const habit of entries) {
    if (timeOfDay && habit.timeOfDay !== timeOfDay) continue;

    const isDue = isHabitDueOnDate({
      startDate: habit.startDate,
      everyNDays: habit.everyNDays,
      durationDays: habit.durationDays,
      date,
    });

    if (!isDue) continue;

    due += 1;
    if (isCompletionOnDate(habit.completions, date)) {
      done += 1;
    }
  }

  return { due, done };
}

function buildDailyStatsForDates({
  dates,
  goalHabits,
  customHabits,
  taskCompletedByDate,
  oneTimePlanPerDay,
}: {
  dates: string[];
  goalHabits: HabitEntry[];
  customHabits: HabitEntry[];
  taskCompletedByDate: Map<string, number>;
  oneTimePlanPerDay: number;
}): DailyStats[] {
  return dates.map((date) => {
    const goalStats = aggregateHabitsForDate(goalHabits, date);
    const customStats = aggregateHabitsForDate(customHabits, date);

    const plannedTasks = goalStats.due + oneTimePlanPerDay;
    const completedTasks = taskCompletedByDate.get(date) ?? 0;
    const plannedHabits = goalStats.due + customStats.due;
    const completedHabits = goalStats.done + customStats.done;

    return {
      date,
      plannedTasks,
      completedTasks,
      plannedHabits,
      completedHabits,
      plannedAll: plannedTasks + customStats.due,
      completedAll: completedTasks + customStats.done,
    };
  });
}

function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  const compact = compressSeries(values, 10);
  const maxValue = Math.max(1, ...compact);

  return (
    <View style={styles.sparkRow}>
      {compact.map((value, idx) => {
        const height = value <= 0 ? 4 : Math.max(4, Math.round((value / maxValue) * 18));
        return (
          <View key={`spark_${idx}`} style={styles.sparkCol}>
            <View style={[styles.sparkBar, { height, backgroundColor: color }]} />
          </View>
        );
      })}
    </View>
  );
}

function KpiCard({
  icon,
  title,
  value,
  delta,
  support,
  series,
  tone,
}: {
  icon: IoniconName;
  title: string;
  value: string;
  delta: string;
  support: string;
  series: number[];
  tone: string;
}) {
  return (
    <View style={styles.kpiCard}>
      <View style={styles.kpiHeaderRow}>
        <View style={styles.kpiIconWrap}>
          <Ionicons name={icon} size={13} color="#CBE6FF" />
        </View>
        <Text style={styles.kpiDelta}>{delta}</Text>
      </View>

      <Text style={styles.kpiTitle}>{title}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiSupport}>{support}</Text>

      <MiniSparkline values={series} color={tone} />
    </View>
  );
}

function PlannedVsDoneLineChart({
  labels,
  planned,
  completed,
}: {
  labels: string[];
  planned: number[];
  completed: number[];
}) {
  const [chartWidth, setChartWidth] = useState(0);
  const chartHeight = 138;
  const yLabelCount = 4;
  const maxValue = Math.max(1, ...planned, ...completed);

  const pointSeries = useMemo(() => {
    const width = Math.max(1, chartWidth);
    const step = labels.length <= 1 ? width : width / (labels.length - 1);

    const build = (values: number[]) =>
      values.map((value, idx) => {
        const x = idx * step;
        const y = chartHeight - (value / maxValue) * chartHeight;
        return { x, y };
      });

    return {
      planned: build(planned),
      completed: build(completed),
    };
  }, [chartWidth, chartHeight, labels.length, maxValue, planned, completed]);

  const labelStep = labels.length <= 10 ? 1 : labels.length <= 20 ? 2 : labels.length <= 40 ? 4 : 6;

  return (
    <View>
      <View
        style={styles.lineChartWrap}
        onLayout={(event) => {
          const width = Math.round(event.nativeEvent.layout.width);
          if (width !== chartWidth) {
            setChartWidth(width);
          }
        }}
      >
        <Svg width="100%" height={chartHeight + 2}>
          {Array.from({ length: yLabelCount }).map((_, idx) => {
            const ratio = idx / (yLabelCount - 1);
            const y = chartHeight * ratio;
            return (
              <SvgLine
                key={`grid_${idx}`}
                x1={0}
                y1={y}
                x2={Math.max(1, chartWidth)}
                y2={y}
                stroke="rgba(88,132,184,0.25)"
                strokeWidth={1}
              />
            );
          })}

          <Path d={buildLinePath(pointSeries.planned)} fill="none" stroke="#5A85B5" strokeWidth={2.2} />
          <Path d={buildLinePath(pointSeries.completed)} fill="none" stroke="#8BE0B1" strokeWidth={2.8} />

          {pointSeries.planned.map((point, idx) => (
            <Circle key={`planned_dot_${idx}`} cx={point.x} cy={point.y} r={2} fill="#9DC3E7" />
          ))}

          {pointSeries.completed.map((point, idx) => (
            <Circle key={`done_dot_${idx}`} cx={point.x} cy={point.y} r={2.2} fill="#8BE0B1" />
          ))}
        </Svg>
      </View>

      <View style={styles.lineLegendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#5A85B5" }]} />
          <Text style={styles.legendText}>Zaplanowane</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#8BE0B1" }]} />
          <Text style={styles.legendText}>Wykonane</Text>
        </View>
      </View>

      <View style={styles.lineLabelsRow}>
        {labels.map((label, idx) => (
          <Text key={`x_${idx}`} style={styles.lineLabel} numberOfLines={1}>
            {idx % labelStep === 0 || idx === labels.length - 1 ? label : " "}
          </Text>
        ))}
      </View>
    </View>
  );
}

function getStatusColor(status: GoalStatus) {
  if (status === "Krytyczne") return "#EBA4B5";
  if (status === "Uwaga") return "#F0C68B";
  return "#9FD7A8";
}

function getHeatmapColor(ratio: number | null) {
  if (ratio === null) return "#122743";
  if (ratio <= 0.2) return "#2A4C72";
  if (ratio <= 0.5) return "#4D7FB4";
  if (ratio <= 0.8) return "#69B9D8";
  return "#86DFAE";
}

function selectTrendSeries(
  filter: FilterKey,
  stats: DailyStats[],
) {
  if (filter === "goals" || filter === "tasks") {
    return {
      planned: stats.map((item) => item.plannedTasks),
      completed: stats.map((item) => item.completedTasks),
    };
  }

  if (filter === "habits") {
    return {
      planned: stats.map((item) => item.plannedHabits),
      completed: stats.map((item) => item.completedHabits),
    };
  }

  return {
    planned: stats.map((item) => item.plannedAll),
    completed: stats.map((item) => item.completedAll),
  };
}

function getRangeAxisLabels(dates: string[], rangeDays: number) {
  if (rangeDays === 7) {
    return dates.map((date) => DAY_LABELS[getWeekdayIndexMondayFirst(date)] ?? "?");
  }

  if (rangeDays === 30) {
    return dates.map((date) => String(Number(date.slice(-2))));
  }

  return dates.map((date) => {
    const current = new Date(`${date}T00:00:00`);
    if (current.getDate() === 1) {
      return MONTH_LABELS_SHORT[current.getMonth()];
    }
    return String(current.getDate());
  });
}

function formatDateShort(dateIso: string) {
  const date = new Date(`${dateIso}T00:00:00`);
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function StatisticsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { goals, progress, xpEvents } = useRoadmaps();
  const { customHabits } = useHabits();

  const [range, setRange] = useState<RangeKey>("30d");
  const [filter, setFilter] = useState<FilterKey>("all");

  const today = todayIsoDate();
  const todayDate = useMemo(() => startOfDay(new Date(`${today}T00:00:00`)), [today]);

  const rangeDays = getRangeDays(range);
  const subtitle = `Ostatnie ${rangeDays} dni`;

  const rangeDates = useMemo(() => getRangeDatesEndingAt(today, rangeDays), [today, rangeDays]);

  const previousDates = useMemo(() => {
    const previousEnd = addDays(todayDate, -rangeDays);
    return getRangeDatesEndingAt(toIsoDate(previousEnd), rangeDays);
  }, [todayDate, rangeDays]);

  const taskToGoalMap = useMemo(() => {
    const map = new Map<string, string>();

    for (const goal of goals) {
      for (const task of flattenTasks(goal.tasks)) {
        map.set(task.id, goal.id);
      }
    }

    return map;
  }, [goals]);

  const goalHabits = useMemo<HabitEntry[]>(() => {
    const items: HabitEntry[] = [];

    for (const goal of goals) {
      const taskMap = buildTaskMap(goal.tasks);
      for (const task of flattenTasks(goal.tasks)) {
        if (task.kind !== "habit" || !task.habit) continue;
        if (isTaskBlocked(task, taskMap)) continue;

        items.push({
          id: task.id,
          goalId: goal.id,
          startDate: task.habit.startDate,
          everyNDays: task.habit.everyNDays,
          durationDays: task.habit.durationDays,
          completions: task.habit.completions,
          timeOfDay: task.habit.timeOfDay,
        });
      }
    }

    return items;
  }, [goals]);

  const customHabitEntries = useMemo<HabitEntry[]>(() => {
    return customHabits.map((habit) => ({
      id: habit.id,
      startDate: habit.startDate,
      everyNDays: habit.everyNDays,
      durationDays: habit.durationDays,
      completions: habit.completions,
      timeOfDay: habit.timeOfDay,
    }));
  }, [customHabits]);

  const allHabits = useMemo(() => [...goalHabits, ...customHabitEntries], [goalHabits, customHabitEntries]);

  const oneTimeOpenTasks = useMemo(() => {
    return goals.reduce((acc, goal) => {
      const remaining = flattenTasks(goal.tasks).filter((task) => task.kind === "one_time" && !taskIsDone(task)).length;
      return acc + remaining;
    }, 0);
  }, [goals]);

  const taskCompletedByDate = useMemo(() => {
    const map = new Map<string, number>();

    for (const event of xpEvents) {
      if (event.sourceType !== "task_one_time" && event.sourceType !== "task_habit") continue;
      const date = event.createdAt.slice(0, 10);
      map.set(date, (map.get(date) ?? 0) + 1);
    }

    return map;
  }, [xpEvents]);

  const actionEventsByDate = useMemo(() => {
    const total = new Map<string, number>();
    const aligned = new Map<string, number>();

    for (const event of xpEvents) {
      const date = event.createdAt.slice(0, 10);
      total.set(date, (total.get(date) ?? 0) + 1);

      const goalId = event.goalId ?? (event.taskId ? taskToGoalMap.get(event.taskId) : undefined);
      if (goalId || event.taskId) {
        aligned.set(date, (aligned.get(date) ?? 0) + 1);
      }
    }

    return { total, aligned };
  }, [xpEvents, taskToGoalMap]);

  const goalActivityLatestByGoal = useMemo(() => {
    const map = new Map<string, string>();

    for (const event of xpEvents) {
      const goalId = event.goalId ?? (event.taskId ? taskToGoalMap.get(event.taskId) : undefined);
      if (!goalId) continue;

      const date = event.createdAt.slice(0, 10);
      const previous = map.get(goalId);
      if (!previous || date > previous) {
        map.set(goalId, date);
      }
    }

    return map;
  }, [xpEvents, taskToGoalMap]);

  const goalActivityCountByDate = useMemo(() => {
    const map = new Map<string, Set<string>>();

    for (const event of xpEvents) {
      const goalId = event.goalId ?? (event.taskId ? taskToGoalMap.get(event.taskId) : undefined);
      if (!goalId) continue;

      const date = event.createdAt.slice(0, 10);
      if (!map.has(date)) {
        map.set(date, new Set());
      }
      map.get(date)?.add(goalId);
    }

    return map;
  }, [xpEvents, taskToGoalMap]);

  const oneTimePlanPerDay = Math.max(1, Math.ceil(oneTimeOpenTasks / rangeDays));

  const rangeDailyStats = useMemo(() => {
    return buildDailyStatsForDates({
      dates: rangeDates,
      goalHabits,
      customHabits: customHabitEntries,
      taskCompletedByDate,
      oneTimePlanPerDay,
    });
  }, [rangeDates, goalHabits, customHabitEntries, taskCompletedByDate, oneTimePlanPerDay]);

  const previousDailyStats = useMemo(() => {
    return buildDailyStatsForDates({
      dates: previousDates,
      goalHabits,
      customHabits: customHabitEntries,
      taskCompletedByDate,
      oneTimePlanPerDay,
    });
  }, [previousDates, goalHabits, customHabitEntries, taskCompletedByDate, oneTimePlanPerDay]);

  const goalMetrics = useMemo<GoalMetric[]>(() => {
    return goals.map((goal) => {
      const allTasks = flattenTasks(goal.tasks);
      const totalTasks = allTasks.length;
      const doneTasks = allTasks.filter((task) => taskIsDone(task)).length;
      const progressPercent = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

      const taskMap = buildTaskMap(goal.tasks);
      const blockedCount = allTasks.filter((task) => !taskIsDone(task) && isTaskBlocked(task, taskMap)).length;

      const createdAt = startOfDay(new Date(goal.createdAt));
      const daysSinceCreate = Math.max(0, daysBetween(createdAt, todayDate));
      const expectedProgress = Math.min(1, daysSinceCreate / 30);
      const actualProgress = progressPercent / 100;
      const onTrack = actualProgress + 0.1 >= expectedProgress;

      const lastActivityIso = goalActivityLatestByGoal.get(goal.id);
      const lastActivity = lastActivityIso ? startOfDay(new Date(`${lastActivityIso}T00:00:00`)) : createdAt;
      const daysWithoutProgress = Math.max(0, daysBetween(lastActivity, todayDate));

      const softDeadline = addDays(createdAt, 30);
      const daysToSoftDeadline = daysBetween(todayDate, softDeadline);

      let riskScore = 0;
      if (progressPercent < 40) riskScore += 2;
      else if (progressPercent < 70) riskScore += 1;
      if (daysWithoutProgress >= 9) riskScore += 3;
      else if (daysWithoutProgress >= 5) riskScore += 2;
      else if (daysWithoutProgress >= 3) riskScore += 1;
      if (daysToSoftDeadline <= 7) riskScore += 2;
      else if (daysToSoftDeadline <= 14) riskScore += 1;
      if (blockedCount >= 2) riskScore += 1;

      let status: GoalStatus = "Stabilne";
      if (riskScore >= 5) status = "Krytyczne";
      else if (riskScore >= 3) status = "Uwaga";

      const blockedTask = allTasks.find((task) => !taskIsDone(task) && isTaskBlocked(task, taskMap));
      const nextTodoTask = allTasks.find((task) => !taskIsDone(task) && !isTaskBlocked(task, taskMap));
      const nextHint = blockedTask
        ? `Odblokuj: ${blockedTask.title}`
        : nextTodoTask
          ? `Następny krok: ${nextTodoTask.title}`
          : "Cel ukończony";

      return {
        id: goal.id,
        title: goal.title,
        progressPercent,
        daysWithoutProgress,
        daysToSoftDeadline,
        blockedCount,
        onTrack,
        riskScore,
        status,
        nextHint,
      };
    });
  }, [goals, goalActivityLatestByGoal, todayDate]);

  const topRiskGoals = useMemo(() => {
    return [...goalMetrics]
      .sort((a, b) => b.riskScore - a.riskScore || a.progressPercent - b.progressPercent)
      .slice(0, 3);
  }, [goalMetrics]);

  const goalsOnTrack = goalMetrics.filter((goal) => goal.onTrack).length;

  const goalsWithActivityCurrent = useMemo(() => {
    const rangeSet = new Set(rangeDates);
    const active = new Set<string>();

    for (const [date, goalIds] of goalActivityCountByDate.entries()) {
      if (!rangeSet.has(date)) continue;
      for (const goalId of goalIds) {
        active.add(goalId);
      }
    }

    return active.size;
  }, [rangeDates, goalActivityCountByDate]);

  const goalsWithActivityPrevious = useMemo(() => {
    const previousSet = new Set(previousDates);
    const active = new Set<string>();

    for (const [date, goalIds] of goalActivityCountByDate.entries()) {
      if (!previousSet.has(date)) continue;
      for (const goalId of goalIds) {
        active.add(goalId);
      }
    }

    return active.size;
  }, [previousDates, goalActivityCountByDate]);

  const currentPlannedAll = sum(rangeDailyStats.map((item) => item.plannedAll));
  const currentCompletedAll = sum(rangeDailyStats.map((item) => item.completedAll));
  const previousPlannedAll = sum(previousDailyStats.map((item) => item.plannedAll));
  const previousCompletedAll = sum(previousDailyStats.map((item) => item.completedAll));

  const realismPercent = ratioPercent(currentCompletedAll, currentPlannedAll);
  const realismPrevious = ratioPercent(previousCompletedAll, previousPlannedAll);
  const realismDelta = realismPercent - realismPrevious;

  const currentHabitDue = sum(rangeDailyStats.map((item) => item.plannedHabits));
  const currentHabitDone = sum(rangeDailyStats.map((item) => item.completedHabits));
  const previousHabitDue = sum(previousDailyStats.map((item) => item.plannedHabits));
  const previousHabitDone = sum(previousDailyStats.map((item) => item.completedHabits));

  const habitRegularity = ratioPercent(currentHabitDone, currentHabitDue);
  const habitRegularityPrevious = ratioPercent(previousHabitDone, previousHabitDue);
  const habitRegularityDelta = habitRegularity - habitRegularityPrevious;

  const rangeDateSet = useMemo(() => new Set(rangeDates), [rangeDates]);
  const previousDateSet = useMemo(() => new Set(previousDates), [previousDates]);

  const currentActionTotals = useMemo(() => {
    let total = 0;
    let aligned = 0;

    for (const [date, value] of actionEventsByDate.total.entries()) {
      if (!rangeDateSet.has(date)) continue;
      total += value;
      aligned += actionEventsByDate.aligned.get(date) ?? 0;
    }

    return { total, aligned };
  }, [actionEventsByDate, rangeDateSet]);

  const previousActionTotals = useMemo(() => {
    let total = 0;
    let aligned = 0;

    for (const [date, value] of actionEventsByDate.total.entries()) {
      if (!previousDateSet.has(date)) continue;
      total += value;
      aligned += actionEventsByDate.aligned.get(date) ?? 0;
    }

    return { total, aligned };
  }, [actionEventsByDate, previousDateSet]);

  const alignmentPercent = ratioPercent(currentActionTotals.aligned, currentActionTotals.total);
  const alignmentPrevious = ratioPercent(previousActionTotals.aligned, previousActionTotals.total);
  const alignmentDelta = alignmentPercent - alignmentPrevious;

  const onTrackSeries = rangeDates.map((date) => goalActivityCountByDate.get(date)?.size ?? 0);
  const realismSeries = rangeDailyStats.map((item) => ratioPercent(item.completedAll, item.plannedAll));
  const regularitySeries = rangeDailyStats.map((item) => ratioPercent(item.completedHabits, item.plannedHabits));
  const alignmentSeries = rangeDates.map((date) => {
    const total = actionEventsByDate.total.get(date) ?? 0;
    const aligned = actionEventsByDate.aligned.get(date) ?? 0;
    return ratioPercent(aligned, total);
  });

  const trendData = selectTrendSeries(filter, rangeDailyStats);
  const trendLabels = getRangeAxisLabels(rangeDates, rangeDays);

  const takeaway = useMemo(() => {
    const window = Math.min(7, rangeDailyStats.length);
    if (window === 0) return "Brak danych do wniosków w wybranym zakresie.";

    let bestIndex = window - 1;
    let bestRatio = -1;

    for (let endIdx = window - 1; endIdx < rangeDailyStats.length; endIdx += 1) {
      const slice = rangeDailyStats.slice(endIdx - window + 1, endIdx + 1);
      const planned = sum(slice.map((item) => item.plannedAll));
      const done = sum(slice.map((item) => item.completedAll));
      const ratio = ratioPercent(done, planned);

      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestIndex = endIdx;
      }
    }

    const startIdx = Math.max(0, bestIndex - window + 1);
    const startDate = rangeDailyStats[startIdx]?.date ?? rangeDates[0];
    const endDate = rangeDailyStats[bestIndex]?.date ?? rangeDates[rangeDates.length - 1];

    return `Najlepsze tempo: ${formatDateShort(startDate)} - ${formatDateShort(endDate)} (${bestRatio}% planu).`;
  }, [rangeDailyStats, rangeDates]);

  const weekdayTaskBars = useMemo(() => {
    const buckets = DAY_LABELS.map(() => ({ planned: 0, completed: 0 }));

    for (const day of rangeDailyStats) {
      const idx = getWeekdayIndexMondayFirst(day.date);
      buckets[idx].planned += day.plannedTasks;
      buckets[idx].completed += day.completedTasks;
    }

    return buckets;
  }, [rangeDailyStats]);

  const movedTasksCount = useMemo(() => {
    return rangeDailyStats.reduce((acc, day) => acc + Math.max(0, day.plannedTasks - day.completedTasks), 0);
  }, [rangeDailyStats]);

  const overdueCount = useMemo(() => {
    const todayHabitStats = aggregateHabitsForDate(allHabits, today);
    const missedToday = Math.max(0, todayHabitStats.due - todayHabitStats.done);
    return oneTimeOpenTasks + missedToday;
  }, [allHabits, oneTimeOpenTasks, today]);

  const heatmapDates = useMemo(() => getHeatmapDates(today), [today]);

  const heatmapCells = useMemo(() => {
    return heatmapDates.map((date) => {
      const stats = aggregateHabitsForDate(allHabits, date);
      return {
        date,
        due: stats.due,
        done: stats.done,
        ratio: stats.due === 0 ? null : stats.done / stats.due,
      };
    });
  }, [allHabits, heatmapDates]);

  const heatmapRows = useMemo(() => {
    return Array.from({ length: 4 }).map((_, rowIdx) => heatmapCells.slice(rowIdx * 7, (rowIdx + 1) * 7));
  }, [heatmapCells]);

  const habitStreak = useMemo(() => {
    let streak = 0;

    for (let idx = heatmapCells.length - 1; idx >= 0; idx -= 1) {
      const cell = heatmapCells[idx];
      if (!cell || cell.due === 0) continue;
      if (cell.done === cell.due) {
        streak += 1;
      } else {
        break;
      }
    }

    return streak;
  }, [heatmapCells]);

  const habitRecoveryRate = useMemo(() => {
    let opportunities = 0;
    let recovered = 0;

    for (let idx = 1; idx < heatmapCells.length; idx += 1) {
      const prev = heatmapCells[idx - 1];
      const current = heatmapCells[idx];
      if (!prev || !current) continue;
      if (prev.due > 0 && prev.done < prev.due) {
        opportunities += 1;
        if (current.due > 0 && current.done === current.due) {
          recovered += 1;
        }
      }
    }

    return ratioPercent(recovered, opportunities);
  }, [heatmapCells]);

  const bestTimeCaption = useMemo(() => {
    const buckets: Record<"morning" | "afternoon" | "evening" | "any", { due: number; done: number }> = {
      morning: { due: 0, done: 0 },
      afternoon: { due: 0, done: 0 },
      evening: { due: 0, done: 0 },
      any: { due: 0, done: 0 },
    };

    for (const date of rangeDates) {
      for (const slot of ["morning", "afternoon", "evening"] as const) {
        const stats = aggregateHabitsForDate(allHabits, date, slot);
        buckets[slot].due += stats.due;
        buckets[slot].done += stats.done;
      }

      const anyStats = aggregateHabitsForDate(allHabits, date);
      buckets.any.due += anyStats.due;
      buckets.any.done += anyStats.done;
    }

    let bestKey: "morning" | "afternoon" | "evening" | "any" = "any";
    let bestRatio = -1;

    for (const key of ["morning", "afternoon", "evening", "any"] as const) {
      const current = buckets[key];
      if (current.due <= 0) continue;
      const ratio = current.done / current.due;
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestKey = key;
      }
    }

    if (bestRatio < 0) {
      return "Najlepsza regularność: brak danych";
    }

    const translated = bestKey === "any" ? "Dowolna pora" : translateTimeOfDay(bestKey);
    return `Najlepsza regularność: ${translated.toLowerCase()}`;
  }, [allHabits, rangeDates]);

  const insights = useMemo(() => {
    const result: string[] = [];

    const morningDoneByDate = rangeDates.map((date) => aggregateHabitsForDate(allHabits, date, "morning").done);
    const withMorning: number[] = [];
    const withoutMorning: number[] = [];

    for (let i = 0; i < rangeDates.length; i += 1) {
      const doneActions = rangeDailyStats[i]?.completedAll ?? 0;
      if ((morningDoneByDate[i] ?? 0) > 0) {
        withMorning.push(doneActions);
      } else {
        withoutMorning.push(doneActions);
      }
    }

    if (withMorning.length > 0 && withoutMorning.length > 0) {
      const avgWith = sum(withMorning) / withMorning.length;
      const avgWithout = sum(withoutMorning) / withoutMorning.length;
      if (avgWith > avgWithout + 0.3) {
        result.push("W dni z porannym nawykiem kończysz więcej zadań.");
      }
    }

    const carryByDay = weekdayTaskBars.map((item, idx) => ({
      day: DAY_LABELS[idx],
      value: Math.max(0, item.planned - item.completed),
    }));
    const topCarry = [...carryByDay].sort((a, b) => b.value - a.value)[0];
    if (topCarry && topCarry.value > 0) {
      result.push(`Najwięcej zadań przenosisz w ${topCarry.day}.`);
    }

    const topRisk = topRiskGoals[0];
    if (topRisk && topRisk.daysWithoutProgress >= 1) {
      result.push(`Cel '${topRisk.title}' nie miał ruchu od ${topRisk.daysWithoutProgress} dni.`);
    }

    if (result.length < 3) {
      result.push("Stabilny rytm 3-5 zadań dziennie poprawia domykanie tygodnia.");
    }

    return result.slice(0, 3);
  }, [allHabits, rangeDates, rangeDailyStats, topRiskGoals, weekdayTaskBars]);

  const avgPlannedTasksPerDay = Math.max(1, Math.round(sum(rangeDailyStats.map((d) => d.plannedTasks)) / Math.max(1, rangeDailyStats.length)));
  const recommendedPlannedTasks = clamp(Math.round(avgPlannedTasksPerDay * 0.65), 3, 12);

  const quickActions = [
    {
      id: "split_backlog",
      title: "Rozbij 2 zaległe zadania na podzadania",
      subtitle: `Priorytet: zmniejsz zaległe (${overdueCount}) bez utraty tempa.`,
      onPress: () => router.push("/(tabs)/roadmap"),
    },
    {
      id: "scale_plan",
      title: `Zmniejsz jutrzejszy plan z ${avgPlannedTasksPerDay} do ${recommendedPlannedTasks} zadań`,
      subtitle: "Cel: plan możliwy do domknięcia przy obecnej przepustowości.",
      onPress: () => router.push("/(tabs)/roadmap"),
    },
    {
      id: "bind_habit",
      title: "Podepnij nawyk czytania do celu Angielski B2",
      subtitle: "Zwiększ zgodność działań z celem przez codzienny trigger.",
      onPress: () => router.push("/(tabs)/habbits/create"),
    },
  ];

  const firstAction = quickActions[0];

  const showGoalSections = filter === "all" || filter === "goals";
  const showTaskSections = filter === "all" || filter === "tasks";
  const showHabitSections = filter === "all" || filter === "habits";

  return (
    <View style={styles.screen}>
      <View style={styles.bgAuraA} />
      <View style={styles.bgAuraB} />
      <View style={styles.bgAuraC} />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: 16,
          gap: 12,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>Statystyki</Text>
          <Text style={styles.headerSubtitle}>{subtitle}</Text>

          <View style={styles.segmentRow}>
            {RANGE_OPTIONS.map((option) => {
              const active = option.key === range;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => setRange(option.key)}
                  style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {FILTER_OPTIONS.map((option) => {
              const active = option.key === filter;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => setFilter(option.key)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.foldCard}>
          <View style={styles.foldTopRow}>
            <Text style={styles.foldTitle}>Najważniejsze teraz</Text>
            <Text style={styles.foldMeta}>Decyzja w 10s</Text>
          </View>

          <View style={styles.foldKpiRow}>
            <View style={styles.foldKpiPill}>
              <Text style={styles.foldKpiValue}>{goalsOnTrack}/{goals.length}</Text>
              <Text style={styles.foldKpiLabel}>Cele na torze</Text>
            </View>

            <View style={styles.foldKpiPill}>
              <Text style={styles.foldKpiValue}>{habitRegularity}%</Text>
              <Text style={styles.foldKpiLabel}>Regularność</Text>
            </View>
          </View>

          <View style={styles.foldTrendRow}>
            <MiniSparkline values={rangeDailyStats.slice(-7).map((item) => item.completedAll)} color="#8BE0B1" />
          </View>

          <Pressable style={styles.foldActionBtn} onPress={firstAction.onPress}>
            <Text style={styles.foldActionTitle}>Zrób teraz</Text>
            <Text style={styles.foldActionText}>{firstAction.title}</Text>
          </Pressable>
        </View>

        <View style={styles.kpiGrid}>
          <KpiCard
            icon="flag-outline"
            title="Cele na dobrym torze"
            value={`${goalsOnTrack}/${goals.length || 0}`}
            delta={formatDelta(goalsWithActivityCurrent - goalsWithActivityPrevious, "cele")}
            support="Aktywne cele z ruchem"
            series={onTrackSeries}
            tone="#8ED6FF"
          />

          <KpiCard
            icon="pulse-outline"
            title="Realizm planu"
            value={`${realismPercent}%`}
            delta={formatDelta(realismDelta)}
            support="Wykonane vs zaplanowane"
            series={realismSeries}
            tone="#7AB6FF"
          />

          <KpiCard
            icon="repeat-outline"
            title="Regularność nawyków"
            value={`${habitRegularity}%`}
            delta={formatDelta(habitRegularityDelta)}
            support="Wykonane nawyki"
            series={regularitySeries}
            tone="#92DFB4"
          />

          <KpiCard
            icon="git-branch-outline"
            title="Zgodność działań z celami"
            value={`${alignmentPercent}%`}
            delta={formatDelta(alignmentDelta)}
            support="Akcje przypięte do celów"
            series={alignmentSeries}
            tone="#C6B2FF"
          />
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeadRow}>
            <Text style={styles.sectionTitle}>Trend planu i wykonania</Text>
            <Text style={styles.sectionBadge}>{range.toUpperCase()}</Text>
          </View>

          <PlannedVsDoneLineChart
            labels={trendLabels}
            planned={trendData.planned}
            completed={trendData.completed}
          />

          <Text style={styles.takeawayText}>{takeaway}</Text>
        </View>

        {showGoalSections ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeadRow}>
              <Text style={styles.sectionTitle}>Cele zagrożone</Text>
              <Text style={styles.sectionMuted}>Top 3</Text>
            </View>

            {topRiskGoals.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Brak aktywnych celów do oceny ryzyka.</Text>
              </View>
            ) : (
              topRiskGoals.map((goal) => (
                <View key={goal.id} style={styles.riskCard}>
                  <View style={styles.riskTopRow}>
                    <Text style={styles.riskTitle} numberOfLines={1}>{goal.title}</Text>
                    <View style={[styles.riskBadge, { borderColor: getStatusColor(goal.status) }]}> 
                      <Text style={[styles.riskBadgeText, { color: getStatusColor(goal.status) }]}>{goal.status}</Text>
                    </View>
                  </View>

                  <View style={styles.riskProgressTrack}>
                    <View style={[styles.riskProgressFill, { width: `${goal.progressPercent}%` }]} />
                  </View>

                  <View style={styles.riskMetaRow}>
                    <Text style={styles.riskMeta}>Postęp: {goal.progressPercent}%</Text>
                    <Text style={styles.riskMeta}>Bez ruchu: {goal.daysWithoutProgress} dni</Text>
                  </View>

                  <View style={styles.riskMetaRow}>
                    <Text style={styles.riskMeta}>Soft deadline: {goal.daysToSoftDeadline >= 0 ? `za ${goal.daysToSoftDeadline} dni` : `${Math.abs(goal.daysToSoftDeadline)} dni po terminie`}</Text>
                    <Text style={styles.riskMeta}>Blokady: {goal.blockedCount}</Text>
                  </View>

                  <Text style={styles.riskHint}>{goal.nextHint}</Text>
                </View>
              ))
            )}
          </View>
        ) : null}

        {showTaskSections ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeadRow}>
              <Text style={styles.sectionTitle}>Wykonanie zadań</Text>
              <Text style={styles.sectionMuted}>Pn-Nd</Text>
            </View>

            <View style={styles.weekdayChartRow}>
              {weekdayTaskBars.map((item, idx) => {
                const maxValue = Math.max(1, ...weekdayTaskBars.map((bucket) => Math.max(bucket.planned, bucket.completed)));
                const plannedHeight = item.planned <= 0 ? 4 : Math.max(4, Math.round((item.planned / maxValue) * 72));
                const doneHeight = item.completed <= 0 ? 4 : Math.max(4, Math.round((item.completed / maxValue) * 72));

                return (
                  <View key={`weekday_${idx}`} style={styles.weekdayCol}>
                    <View style={styles.weekdayBarsWrap}>
                      <View style={[styles.weekdayBarPlanned, { height: plannedHeight }]} />
                      <View style={[styles.weekdayBarDone, { height: doneHeight }]} />
                    </View>
                    <Text style={styles.weekdayLabel}>{DAY_LABELS[idx]}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.taskMetaRow}>
              <View style={styles.taskMetaCard}>
                <Text style={styles.taskMetaLabel}>Przeniesione zadania</Text>
                <Text style={styles.taskMetaValue}>{movedTasksCount}</Text>
              </View>

              <View style={styles.taskMetaCard}>
                <Text style={styles.taskMetaLabel}>Zaległe</Text>
                <Text style={styles.taskMetaValue}>{overdueCount}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {showHabitSections ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeadRow}>
              <Text style={styles.sectionTitle}>Spójność nawyków</Text>
              <Text style={styles.sectionMuted}>4 tygodnie</Text>
            </View>

            <View style={styles.heatmapHeaderRow}>
              {DAY_LABELS.map((label) => (
                <Text key={`heat_hdr_${label}`} style={styles.heatmapHeaderLabel}>{label}</Text>
              ))}
            </View>

            <View style={styles.heatmapWrap}>
              {heatmapRows.map((row, rowIdx) => (
                <View key={`heat_row_${rowIdx}`} style={styles.heatmapRow}>
                  {row.map((cell) => (
                    <View
                      key={cell.date}
                      style={[styles.heatmapCell, { backgroundColor: getHeatmapColor(cell.ratio) }]}
                    />
                  ))}
                </View>
              ))}
            </View>

            <View style={styles.habitMetaRow}>
              <View style={styles.habitMetaCard}>
                <Text style={styles.habitMetaLabel}>Current streak</Text>
                <Text style={styles.habitMetaValue}>{habitStreak} dni</Text>
              </View>

              <View style={styles.habitMetaCard}>
                <Text style={styles.habitMetaLabel}>Recovery rate</Text>
                <Text style={styles.habitMetaValue}>{habitRecoveryRate}%</Text>
              </View>
            </View>

            <Text style={styles.habitCaption}>{bestTimeCaption}</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeadRow}>
            <Text style={styles.sectionTitle}>Insighty</Text>
            <Text style={styles.sectionMuted}>3 kluczowe</Text>
          </View>

          {insights.map((insight, idx) => (
            <View key={`insight_${idx}`} style={styles.insightCard}>
              <Ionicons name="sparkles-outline" size={14} color="#9FC8FF" />
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeadRow}>
            <Text style={styles.sectionTitle}>Zrób teraz</Text>
            <Text style={styles.sectionMuted}>3 rekomendacje</Text>
          </View>

          {quickActions.map((action) => (
            <Pressable key={action.id} style={styles.actionCard} onPress={action.onPress}>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
              </View>

              <View style={styles.actionArrowWrap}>
                <Ionicons name="arrow-forward" size={16} color="#D9EBFF" />
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeadRow}>
            <Text style={styles.sectionTitle}>Progres domen</Text>
            <Text style={styles.sectionMuted}>LV + XP</Text>
          </View>

          {GOAL_DOMAIN_ORDER.map((domain) => {
            const domainProgress = progress.domains[domain];
            return (
              <View key={domain} style={styles.domainRow}>
                <View style={styles.domainHeadRow}>
                  <View style={styles.domainNameWrap}>
                    <View style={[styles.domainDot, { backgroundColor: DOMAIN_COLORS[domain] }]} />
                    <Text style={styles.domainName}>{GOAL_DOMAIN_LABELS[domain]}</Text>
                  </View>
                  <Text style={styles.domainMeta}>LV {domainProgress.level} • XP {domainProgress.xp}</Text>
                </View>

                <View style={styles.domainTrack}>
                  <View
                    style={[
                      styles.domainFill,
                      {
                        width: `${Math.round(domainProgress.progress * 100)}%`,
                        backgroundColor: DOMAIN_COLORS[domain],
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#050B16",
  },
  bgAuraA: {
    position: "absolute",
    top: -130,
    right: -60,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "#173867",
    opacity: 0.42,
  },
  bgAuraB: {
    position: "absolute",
    bottom: -170,
    left: -100,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: "#0E2A50",
    opacity: 0.48,
  },
  bgAuraC: {
    position: "absolute",
    top: 260,
    left: 170,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#1E568E",
    opacity: 0.2,
  },
  headerCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#214873",
    backgroundColor: "rgba(9,21,40,0.94)",
    padding: 14,
    gap: 10,
  },
  headerTitle: {
    color: "#F1F8FF",
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "900",
  },
  headerSubtitle: {
    color: "#97B6D9",
    fontSize: 13,
    fontWeight: "700",
  },
  segmentRow: {
    flexDirection: "row",
    backgroundColor: "#0D2038",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2B557F",
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentBtnActive: {
    backgroundColor: "#1D4574",
  },
  segmentText: {
    color: "#8EB3DB",
    fontSize: 12,
    fontWeight: "900",
  },
  segmentTextActive: {
    color: "#ECF6FF",
  },
  filterRow: {
    gap: 8,
    paddingRight: 4,
  },
  filterChip: {
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#335C86",
    backgroundColor: "#0D2038",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipActive: {
    borderColor: "#7CC8FF",
    backgroundColor: "#1D4574",
  },
  filterChipText: {
    color: "#8EB3DB",
    fontSize: 12,
    fontWeight: "800",
  },
  filterChipTextActive: {
    color: "#EFF8FF",
  },
  foldCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#23496F",
    backgroundColor: "#091A31",
    padding: 14,
    gap: 10,
  },
  foldTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  foldTitle: {
    color: "#F2F8FF",
    fontSize: 16,
    fontWeight: "900",
  },
  foldMeta: {
    color: "#8DAED3",
    fontSize: 11,
    fontWeight: "800",
  },
  foldKpiRow: {
    flexDirection: "row",
    gap: 8,
  },
  foldKpiPill: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2D5680",
    backgroundColor: "#0D233E",
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 2,
  },
  foldKpiValue: {
    color: "#EDF7FF",
    fontSize: 17,
    fontWeight: "900",
  },
  foldKpiLabel: {
    color: "#92B5DB",
    fontSize: 11,
    fontWeight: "700",
  },
  foldTrendRow: {
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#21496F",
    backgroundColor: "#0A1E37",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  foldActionBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#32628E",
    backgroundColor: "#133256",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  foldActionTitle: {
    color: "#D4EBFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  foldActionText: {
    color: "#F4FAFF",
    fontSize: 13,
    fontWeight: "800",
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  kpiCard: {
    width: "48.5%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#22486F",
    backgroundColor: "#0A1A31",
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 6,
  },
  kpiHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kpiIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#3A6892",
    backgroundColor: "#123256",
    alignItems: "center",
    justifyContent: "center",
  },
  kpiDelta: {
    color: "#8FC8A6",
    fontSize: 10,
    fontWeight: "900",
  },
  kpiTitle: {
    color: "#A4C2E0",
    fontSize: 11,
    fontWeight: "800",
    minHeight: 26,
  },
  kpiValue: {
    color: "#F0F8FF",
    fontSize: 20,
    lineHeight: 22,
    fontWeight: "900",
  },
  kpiSupport: {
    color: "#87A8CB",
    fontSize: 10,
    fontWeight: "700",
    minHeight: 24,
  },
  sparkRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    minHeight: 18,
  },
  sparkCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  sparkBar: {
    width: "100%",
    borderRadius: 999,
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1F4268",
    backgroundColor: "#09162A",
    padding: 14,
    gap: 10,
  },
  sectionHeadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    color: "#F1F8FF",
    fontSize: 19,
    lineHeight: 23,
    fontWeight: "900",
  },
  sectionBadge: {
    color: "#D8EEFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    borderWidth: 1,
    borderColor: "#3D688E",
    backgroundColor: "#17365C",
    borderRadius: 999,
    overflow: "hidden",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  sectionMuted: {
    color: "#88A9CE",
    fontSize: 11,
    fontWeight: "800",
  },
  lineChartWrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1D3D61",
    backgroundColor: "#0D1F36",
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 4,
  },
  lineLegendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  legendText: {
    color: "#9DBADF",
    fontSize: 11,
    fontWeight: "700",
  },
  lineLabelsRow: {
    marginTop: -2,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 4,
  },
  lineLabel: {
    flex: 1,
    textAlign: "center",
    color: "#85A7CD",
    fontSize: 9,
    fontWeight: "800",
  },
  takeawayText: {
    color: "#A3C1E2",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  emptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#24486E",
    backgroundColor: "#0D233D",
    padding: 12,
  },
  emptyText: {
    color: "#8EAED2",
    fontSize: 12,
    fontWeight: "700",
  },
  riskCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#244A70",
    backgroundColor: "#0C1F39",
    padding: 12,
    gap: 8,
  },
  riskTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  riskTitle: {
    flex: 1,
    color: "#EAF5FF",
    fontSize: 15,
    fontWeight: "900",
  },
  riskBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  riskBadgeText: {
    fontSize: 10,
    fontWeight: "900",
  },
  riskProgressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#143253",
    overflow: "hidden",
  },
  riskProgressFill: {
    height: "100%",
    backgroundColor: "#6FC4EA",
  },
  riskMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  riskMeta: {
    color: "#8FAED1",
    fontSize: 11,
    fontWeight: "700",
  },
  riskHint: {
    color: "#C8E2FF",
    fontSize: 12,
    fontWeight: "700",
  },
  weekdayChartRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 6,
  },
  weekdayCol: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  weekdayBarsWrap: {
    height: 74,
    width: "100%",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1E4266",
    backgroundColor: "#0E243E",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: 3,
    paddingBottom: 4,
  },
  weekdayBarPlanned: {
    width: 6,
    borderRadius: 999,
    backgroundColor: "#5884B8",
    minHeight: 4,
  },
  weekdayBarDone: {
    width: 6,
    borderRadius: 999,
    backgroundColor: "#8BE0B1",
    minHeight: 4,
  },
  weekdayLabel: {
    color: "#8DACCE",
    fontSize: 10,
    fontWeight: "800",
  },
  taskMetaRow: {
    flexDirection: "row",
    gap: 8,
  },
  taskMetaCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#274D74",
    backgroundColor: "#102843",
    padding: 10,
    gap: 4,
  },
  taskMetaLabel: {
    color: "#91B2D8",
    fontSize: 11,
    fontWeight: "700",
  },
  taskMetaValue: {
    color: "#EFF8FF",
    fontSize: 20,
    fontWeight: "900",
  },
  heatmapHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 4,
  },
  heatmapHeaderLabel: {
    flex: 1,
    textAlign: "center",
    color: "#89A9CE",
    fontSize: 10,
    fontWeight: "800",
  },
  heatmapWrap: {
    gap: 4,
  },
  heatmapRow: {
    flexDirection: "row",
    gap: 4,
  },
  heatmapCell: {
    flex: 1,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#204668",
  },
  habitMetaRow: {
    flexDirection: "row",
    gap: 8,
  },
  habitMetaCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#274D74",
    backgroundColor: "#102843",
    padding: 10,
    gap: 4,
  },
  habitMetaLabel: {
    color: "#91B2D8",
    fontSize: 11,
    fontWeight: "700",
  },
  habitMetaValue: {
    color: "#F1F9FF",
    fontSize: 18,
    fontWeight: "900",
  },
  habitCaption: {
    color: "#9EC5DF",
    fontSize: 12,
    fontWeight: "700",
  },
  insightCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#23466B",
    backgroundColor: "#0D233E",
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  insightText: {
    flex: 1,
    color: "#D8EAFF",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  actionCard: {
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#2A5684",
    backgroundColor: "#0F2947",
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionTextWrap: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    color: "#EFF8FF",
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 17,
  },
  actionSubtitle: {
    color: "#8EB2D7",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
  },
  actionArrowWrap: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#3E6B96",
    backgroundColor: "#1D4066",
    alignItems: "center",
    justifyContent: "center",
  },
  domainRow: {
    gap: 6,
  },
  domainHeadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  domainNameWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  domainDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  domainName: {
    color: "#D9EAFF",
    fontSize: 12,
    fontWeight: "800",
  },
  domainMeta: {
    color: "#8CAFD6",
    fontSize: 11,
    fontWeight: "700",
  },
  domainTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: "#132F4F",
    overflow: "hidden",
  },
  domainFill: {
    height: "100%",
  },
});

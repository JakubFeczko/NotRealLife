import { Redirect } from "expo-router";
import { NativeTabs, Icon, Label, Badge } from "expo-router/unstable-native-tabs";
import { useAuth } from "@/lib/auth-context";
import { useHabits } from "@/lib/habit-context";
import { useRoadmaps } from "@/lib/roadmap-context";
import { isCompletionOnDate, isHabitDueOnDate, todayIsoDate } from "@/lib/habit-types";
import { buildTaskMap, flattenTasks, isTaskBlocked } from "@/lib/roadmap-types";

function getRoadmapHabitsRemainingToday(goals: ReturnType<typeof useRoadmaps>["goals"]) {
  const today = todayIsoDate();
  let count = 0;

  for (const goal of goals) {
    const taskMap = buildTaskMap(goal.tasks);
    const tasks = flattenTasks(goal.tasks);
    for (const task of tasks) {
      if (task.kind !== "habit" || !task.habit) continue;
      if (isTaskBlocked(task, taskMap)) continue;

      const dueToday = isHabitDueOnDate({
        startDate: task.habit.startDate,
        everyNDays: task.habit.everyNDays,
        durationDays: task.habit.durationDays,
        date: today,
      });
      if (!dueToday) continue;

      const doneToday = isCompletionOnDate(task.habit.completions, today);
      if (!doneToday) count += 1;
    }
  }

  return count;
}

export default function TabLayout() {
  const { isLoggedIn } = useAuth();
  const { goals } = useRoadmaps();
  const { customHabits, loading: habitsLoading } = useHabits();

  if (!isLoggedIn) {
    return <Redirect href="/(auth)/welcome" />;
  }

  const today = todayIsoDate();
  const customHabitsRemaining = habitsLoading
    ? 0
    : customHabits.filter((habit) => {
        const dueToday = isHabitDueOnDate({
          startDate: habit.startDate,
          everyNDays: habit.everyNDays,
          durationDays: habit.durationDays,
          date: today,
        });
        if (!dueToday) return false;
        return !isCompletionOnDate(habit.completions, today);
      }).length;

  const habitsBadgeCount = getRoadmapHabitsRemainingToday(goals) + customHabitsRemaining;

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Label>Home</Label>
        <Icon sf="house.fill" drawable="custom_android_drawable" selectedColor='black'/>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="habbits">
        <Icon sf="list.bullet" drawable="custom_settings_drawable" selectedColor='black' />
        <Label>Habbits</Label>
        {habitsBadgeCount > 0 ? (
          <Badge selectedBackgroundColor="black">{String(habitsBadgeCount)}</Badge>
        ) : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="roadmap">
        <Icon sf="map" drawable="custom_settings_drawable" selectedColor='black'/>
        <Label>RoadMap</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="statistics">
        <Icon sf="chart.bar" drawable="custom_settings_drawable" selectedColor='black'/>
        <Label>Statistics</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf="gear" drawable="custom_settings_drawable" selectedColor='black'/>
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { useWindowDimensions } from "react-native";
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
  const { width } = useWindowDimensions();

  if (!isLoggedIn) {
    return <Redirect href="/(auth)/welcome" />;
  }

  const isCompactTabs = width < 390;
  const isVeryCompactTabs = width < 360;
  const tabFontSize = isVeryCompactTabs ? 9 : isCompactTabs ? 10 : 11;
  const tabLabels = isCompactTabs
    ? {
        home: "Home",
        habits: "Habits",
        roadmap: "Roadmap",
        statistics: "Stats",
        settings: "Settings",
      }
    : {
        home: "Home",
        habits: "Habits",
        roadmap: "RoadMap",
        statistics: "Statistics",
        settings: "Settings",
      };

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
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#EAF4FF",
        tabBarInactiveTintColor: "#8CA9D3",
        tabBarAllowFontScaling: false,
        tabBarHideOnKeyboard: true,
        tabBarLabelPosition: "below-icon",
        tabBarStyle: {
          backgroundColor: "#0A1424",
          borderTopColor: "#1F3A61",
          borderTopWidth: 1,
          height: isVeryCompactTabs ? 68 : 72,
          paddingTop: isVeryCompactTabs ? 6 : 8,
          paddingBottom: isVeryCompactTabs ? 6 : 8,
        },
        tabBarItemStyle: {
          paddingVertical: isVeryCompactTabs ? 1 : 2,
        },
        tabBarLabelStyle: {
          fontSize: tabFontSize,
          fontWeight: "700",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarLabel: tabLabels.home,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="habbits"
        options={{
          title: "Habbits",
          tabBarLabel: tabLabels.habits,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
          tabBarBadge: habitsBadgeCount > 0 ? habitsBadgeCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: "#22354A",
            color: "#EAF4FF",
            fontSize: 10,
            fontWeight: "800",
          },
        }}
      />

      <Tabs.Screen
        name="roadmap"
        options={{
          title: "RoadMap",
          tabBarLabel: tabLabels.roadmap,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="statistics"
        options={{
          title: "Statistics",
          tabBarLabel: tabLabels.statistics,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarLabel: tabLabels.settings,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="weekly-review"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

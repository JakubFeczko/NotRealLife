import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { useWindowDimensions } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { useHabits } from "@/lib/habit-context";

export default function TabLayout() {
  const { isLoggedIn } = useAuth();
  const { todayTasks } = useHabits();
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

  const habitsBadgeCount = Math.max(todayTasks.remainingCount, 0);

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

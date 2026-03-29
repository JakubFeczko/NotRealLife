import React, { useEffect, useMemo, useState } from "react";
import { useIsFocused } from "@react-navigation/native";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useRoadmaps } from "@/lib/roadmap-context";
import {
  buildTaskMap,
  flattenTasks,
  GOAL_DOMAIN_LABELS,
  isTaskBlocked,
  taskIsDone,
} from "@/lib/roadmap-types";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function RoadmapListScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { goals, goalSummaries, loading, refreshGoalsList } = useRoadmaps();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

  useEffect(() => {
    if (!isFocused) return;

    let isActive = true;
    setRefreshing(true);
    setRefreshError(null);

    void refreshGoalsList()
      .catch((error) => {
        if (!isActive) return;
        setRefreshError(error instanceof Error ? error.message : "Nie udało się pobrać celów.");
      })
      .finally(() => {
        if (!isActive) return;
        setRefreshing(false);
      });

    return () => {
      isActive = false;
    };
    // refreshGoalsList identity depends on context snapshot; focus-only trigger prevents refetch loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  const goalsById = useMemo(() => new Map(goals.map((goal) => [goal.id, goal])), [goals]);
  const completedGoalSummaries = useMemo(
    () =>
      goalSummaries.filter(
        (goal) =>
          goal.numberOfTasks > 0 && goal.numberOfCompletedTasks >= goal.numberOfTasks,
      ),
    [goalSummaries],
  );
  const activeGoalSummaries = useMemo(
    () =>
      goalSummaries.filter(
        (goal) =>
          goal.numberOfTasks <= 0 || goal.numberOfCompletedTasks < goal.numberOfTasks,
      ),
    [goalSummaries],
  );
  const visibleGoalSummaries = activeTab === "active" ? activeGoalSummaries : completedGoalSummaries;

  if (loading || (refreshing && goalSummaries.length === 0)) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.loadingText}>Ładowanie celów...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <View style={styles.bgTop} />
      <View style={styles.bgBottom} />

      <View style={styles.header}>
        <Text style={styles.brand}>Not Real Life</Text>
        <Text style={styles.title}>Twoje cele</Text>
        <Text style={styles.subtitle}>Rozbij duży cel na działania i dowoź regularnie.</Text>
      </View>

      <View style={styles.segmentWrap}>
        <Pressable
          style={[styles.segmentBtn, activeTab === "active" && styles.segmentBtnActive]}
          onPress={() => setActiveTab("active")}
        >
          <Text
            style={[
              styles.segmentText,
              activeTab === "active" && styles.segmentTextActive,
            ]}
          >
            Aktywne
          </Text>
          <View
            style={[
              styles.segmentCount,
              activeTab === "active" && styles.segmentCountActive,
            ]}
          >
            <Text
              style={[
                styles.segmentCountText,
                activeTab === "active" && styles.segmentCountTextActive,
              ]}
            >
              {activeGoalSummaries.length}
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={[styles.segmentBtn, activeTab === "completed" && styles.segmentBtnActive]}
          onPress={() => setActiveTab("completed")}
        >
          <Text
            style={[
              styles.segmentText,
              activeTab === "completed" && styles.segmentTextActive,
            ]}
          >
            Ukończone
          </Text>
          <View
            style={[
              styles.segmentCount,
              activeTab === "completed" && styles.segmentCountActive,
            ]}
          >
            <Text
              style={[
                styles.segmentCountText,
                activeTab === "completed" && styles.segmentCountTextActive,
              ]}
            >
              {completedGoalSummaries.length}
            </Text>
          </View>
        </Pressable>
      </View>

      {refreshError ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>{refreshError}</Text>
        </View>
      ) : null}

      {goalSummaries.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Brak roadmap</Text>
          <Text style={styles.emptySub}>
            Utwórz pierwszy cel i dodaj taski jednorazowe lub cykliczne nawyki.
          </Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => router.push("/(tabs)/roadmap/create")}
          >
            <Text style={styles.primaryText}>Utwórz pierwszy cel</Text>
          </Pressable>
        </View>
      ) : visibleGoalSummaries.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            {activeTab === "active" ? "Brak aktywnych celów" : "Brak ukończonych celów"}
          </Text>
          <Text style={styles.emptySub}>
            {activeTab === "active"
              ? "Wszystkie obecne cele zostały już domknięte albo nie masz jeszcze żadnego nowego celu w toku."
              : "Kiedy ukończysz cały cel, pojawi się tutaj jako zapis Twojego progresu."}
          </Text>
          {activeTab === "active" ? (
            <Pressable
              style={styles.primaryBtn}
              onPress={() => router.push("/(tabs)/roadmap/create")}
            >
              <Text style={styles.primaryText}>+ Nowy cel</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <FlatList
          data={visibleGoalSummaries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 110,
            gap: 12,
          }}
          renderItem={({ item }) => {
            const cachedGoal = goalsById.get(item.id);
            const cachedTaskMap = cachedGoal ? buildTaskMap(cachedGoal.tasks) : null;
            const progress =
              item.numberOfTasks <= 0
                ? { done: 0, total: 0, ratio: 0 }
                : {
                    done: item.numberOfCompletedTasks,
                    total: item.numberOfTasks,
                    ratio: item.numberOfCompletedTasks / item.numberOfTasks,
                  };
            const goalCompleted = progress.total > 0 && progress.done >= progress.total;
            const blockedCount = cachedGoal && cachedTaskMap
              ? flattenTasks(cachedGoal.tasks).filter(
                  (task) => !taskIsDone(task) && isTaskBlocked(task, cachedTaskMap),
                ).length
              : null;

            return (
              <Pressable
                style={[styles.card, goalCompleted && styles.cardCompleted]}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/roadmap/[goalId]",
                    params: { goalId: item.id },
                  })
                }
              >
                {goalCompleted ? <View style={styles.completedHalo} /> : null}

                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {goalCompleted ? (
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedBadgeText}>✓ Cel ukończony</Text>
                    </View>
                  ) : null}
                </View>
                {item.domain ? (
                  <Text style={styles.domainTag}>{GOAL_DOMAIN_LABELS[item.domain]}</Text>
                ) : null}
                {!!item.description && <Text style={styles.cardDesc}>{item.description}</Text>}

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      goalCompleted && styles.progressFillCompleted,
                      { width: `${Math.min(progress.ratio * 100, 100)}%` },
                    ]}
                  />
                </View>

                <View style={styles.cardFooter}>
                  <Text style={[styles.cardSub, goalCompleted && styles.cardSubCompleted]}>
                    {progress.done} / {progress.total} tasków ukończonych
                  </Text>
                  <Text style={[styles.cardArrow, goalCompleted && styles.cardArrowCompleted]}>
                    {goalCompleted ? "✓" : "›"}
                  </Text>
                </View>
                <Text style={[styles.cardSubtle, goalCompleted && styles.cardSubtleCompleted]}>
                  {goalCompleted
                    ? "Wszystkie taski zostały ukończone. Możesz wrócić do szczegółów celu w każdej chwili."
                    : blockedCount === null
                      ? "Kliknij, aby wczytać szczegóły celu."
                      : `Zablokowane teraz: ${blockedCount}`}
                </Text>
              </Pressable>
            );
          }}
          ListFooterComponent={
            <Pressable
              style={[styles.primaryBtn, { marginTop: 6 }]}
              onPress={() => router.push("/(tabs)/roadmap/create")}
            >
              <Text style={styles.primaryText}>+ Nowy cel</Text>
            </Pressable>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#060B14",
  },
  center: { justifyContent: "center", alignItems: "center" },
  bgTop: {
    position: "absolute",
    top: -120,
    right: -40,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#152B50",
  },
  bgBottom: {
    position: "absolute",
    bottom: -140,
    left: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#0E223F",
  },
  loadingText: { fontSize: 14, color: "#A8B9D7", fontWeight: "700" },
  header: {
    paddingHorizontal: 20,
    marginBottom: 14,
    gap: 6,
  },
  segmentWrap: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 14,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1F3A61",
    backgroundColor: "#0A1424",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  segmentBtnActive: {
    backgroundColor: "#13253F",
    borderColor: "#376BA6",
  },
  segmentText: {
    color: "#A8B9D7",
    fontSize: 14,
    fontWeight: "800",
  },
  segmentTextActive: {
    color: "#F2F7FF",
  },
  segmentCount: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#11233E",
  },
  segmentCountActive: {
    backgroundColor: "rgba(141, 216, 255, 0.18)",
  },
  segmentCountText: {
    color: "#8CA9D3",
    fontSize: 12,
    fontWeight: "900",
  },
  segmentCountTextActive: {
    color: "#DDF4FF",
  },
  brand: {
    alignSelf: "flex-start",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#8DD8FF",
    backgroundColor: "rgba(26,55,86,0.45)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  title: { fontSize: 30, lineHeight: 34, fontWeight: "900", color: "#F2F7FF" },
  subtitle: { fontSize: 14, lineHeight: 20, color: "#A8B9D7" },
  infoCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#271420",
    borderWidth: 1,
    borderColor: "#6A2A3F",
  },
  infoText: { color: "#FFB0C2", fontSize: 12, lineHeight: 17, fontWeight: "700" },
  emptyCard: {
    marginHorizontal: 20,
    marginTop: 8,
    padding: 20,
    borderRadius: 24,
    backgroundColor: "#0A1424",
    borderWidth: 1,
    borderColor: "#1F3A61",
    shadowColor: "#606A5D",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  emptyTitle: { fontSize: 20, fontWeight: "900", color: "#F2F7FF", marginBottom: 6 },
  emptySub: { color: "#A8B9D7", fontSize: 14, lineHeight: 20 },
  card: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#0A1424",
    borderWidth: 1,
    borderColor: "#1F3A61",
  },
  cardCompleted: {
    backgroundColor: "#0B1621",
    borderColor: "#3A7A68",
    shadowColor: "#9DE7CC",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  completedHalo: {
    position: "absolute",
    top: -56,
    right: -26,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(138, 224, 191, 0.12)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 4,
  },
  cardTitle: { fontSize: 18, fontWeight: "800", color: "#F2F7FF", marginBottom: 4 },
  completedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(138, 224, 191, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(138, 224, 191, 0.3)",
  },
  completedBadgeText: {
    color: "#C9F5DE",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  domainTag: {
    alignSelf: "flex-start",
    marginBottom: 8,
    fontSize: 11,
    color: "#8CA9D3",
    backgroundColor: "#11233E",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontWeight: "800",
  },
  cardDesc: { fontSize: 13, color: "#A8B9D7", marginBottom: 10 },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#11233E",
    overflow: "hidden",
    marginBottom: 10,
  },
  progressFill: { height: "100%", backgroundColor: "#22354A" },
  progressFillCompleted: { backgroundColor: "#8AE0BF" },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardSub: { fontSize: 13, color: "#A8B9D7", fontWeight: "700" },
  cardSubCompleted: { color: "#D5F4E6" },
  cardArrow: { fontSize: 24, color: "#8CA9D3", fontWeight: "800" },
  cardArrowCompleted: { color: "#8AE0BF" },
  cardSubtle: { marginTop: 6, fontSize: 12, color: "#7992BA", fontWeight: "700" },
  cardSubtleCompleted: { color: "#9FD7BF" },
  primaryBtn: {
    height: 52,
    borderRadius: 18,
    backgroundColor: "#22354A",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    marginTop: 14,
  },
  primaryText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },
});

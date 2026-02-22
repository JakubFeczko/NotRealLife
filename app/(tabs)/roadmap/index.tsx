import React from "react";
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

function getGoalProgress(tasks: ReturnType<typeof flattenTasks>) {
  if (tasks.length === 0) return { done: 0, total: 0, ratio: 0 };
  const done = tasks.filter((task) => taskIsDone(task)).length;
  const total = tasks.length;
  return { done, total, ratio: done / total };
}

export default function RoadmapListScreen() {
  const router = useRouter();
  const { goals, loading } = useRoadmaps();
  const insets = useSafeAreaInsets();

  if (loading) {
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

      {goals.length === 0 ? (
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
      ) : (
        <FlatList
          data={goals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 110,
            gap: 12,
          }}
          renderItem={({ item }) => {
            const allTasks = flattenTasks(item.tasks);
            const progress = getGoalProgress(allTasks);
            const taskMap = buildTaskMap(item.tasks);
            const blockedCount = allTasks.filter(
              (task) => !taskIsDone(task) && isTaskBlocked(task, taskMap),
            ).length;

            return (
              <Pressable
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/roadmap/[goalId]",
                    params: { goalId: item.id },
                  })
                }
              >
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.domainTag}>{GOAL_DOMAIN_LABELS[item.domain]}</Text>
                {!!item.description && <Text style={styles.cardDesc}>{item.description}</Text>}

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(progress.ratio * 100, 100)}%` },
                    ]}
                  />
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.cardSub}>
                    {progress.done} / {progress.total} tasków ukończonych
                  </Text>
                  <Text style={styles.cardArrow}>›</Text>
                </View>
                <Text style={styles.cardSubtle}>Zablokowane teraz: {blockedCount}</Text>
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
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#0A1424",
    borderWidth: 1,
    borderColor: "#1F3A61",
  },
  cardTitle: { fontSize: 18, fontWeight: "800", color: "#F2F7FF", marginBottom: 4 },
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
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardSub: { fontSize: 13, color: "#A8B9D7", fontWeight: "700" },
  cardArrow: { fontSize: 24, color: "#8CA9D3", fontWeight: "800" },
  cardSubtle: { marginTop: 6, fontSize: 12, color: "#7992BA", fontWeight: "700" },
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

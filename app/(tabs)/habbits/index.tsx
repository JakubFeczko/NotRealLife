import React, { useEffect, useMemo, useState } from "react";
import { useIsFocused } from "@react-navigation/native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHabits } from "@/lib/habit-context";
import { translateTimeOfDay } from "@/lib/habit-types";
import { TimeOfDay } from "@/lib/roadmap-types";

type HabitFilter = "all" | TimeOfDay;

function matchesFilter(timeOfDay: TimeOfDay | undefined, filter: HabitFilter) {
  if (filter === "all") return true;
  return timeOfDay === filter;
}

export default function HabbitsScreen() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { todayTasks, todayTasksLoading, todayTasksError, refreshTodayTasks } = useHabits();

  const [filter, setFilter] = useState<HabitFilter>("all");
  const [pendingOnly, setPendingOnly] = useState(false);

  useEffect(() => {
    if (!isFocused) return;
    void refreshTodayTasks().catch(() => {
      // Error state is handled by context and rendered below.
    });
    // refreshTodayTasks identity depends on context snapshot; focus-only trigger prevents refetch loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  const filteredTasks = useMemo(() => {
    return todayTasks.tasks.filter((task) => {
      if (!matchesFilter(task.timeOfDay, filter)) return false;
      if (pendingOnly && task.isDoneToday) return false;
      return true;
    });
  }, [filter, pendingOnly, todayTasks.tasks]);

  const visibleCompletedCount = filteredTasks.filter((task) => task.isDoneToday).length;

  return (
    <View style={styles.screen}>
      <View style={styles.bgTop} />
      <View style={styles.bgBottom} />

      <View style={[styles.stickyTop, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topRow}>
          <Text style={styles.brand}>Not Real Life</Text>
          <Pressable
            style={styles.primaryBtnSmall}
            onPress={() => {
              void refreshTodayTasks().catch(() => {
                // Error state is handled by context and rendered below.
              });
            }}
          >
            <Text style={styles.primaryBtnSmallText}>Odśwież</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 72,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: 20,
          gap: 12,
        }}
      >
        <Text style={styles.title}>Nawyki na dziś</Text>
        <Text style={styles.subtitle}>Jedna lista na dziś. Statusy przychodzą bezpośrednio z backendu.</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Dzisiejszy wynik</Text>
          <Text style={styles.summaryValue}>
            {todayTasks.completedCount} / {todayTasks.totalCount}
          </Text>
          <Text style={styles.summaryHint}>
            wykonanych • do domknięcia: {todayTasks.remainingCount}
          </Text>
        </View>

        {todayTasksError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{todayTasksError}</Text>
          </View>
        ) : null}

        <SectionCard title="Filtr wyświetlania">
          <View style={styles.chipsRow}>
            <FilterChip selected={filter === "all"} onPress={() => setFilter("all")}>Dziś</FilterChip>
            <FilterChip selected={filter === "morning"} onPress={() => setFilter("morning")}>Rano</FilterChip>
            <FilterChip selected={filter === "afternoon"} onPress={() => setFilter("afternoon")}>Popołudnie</FilterChip>
            <FilterChip selected={filter === "evening"} onPress={() => setFilter("evening")}>Wieczór</FilterChip>
            <FilterChip selected={pendingOnly} onPress={() => setPendingOnly((value) => !value)}>
              Niewykonane
            </FilterChip>
          </View>
        </SectionCard>

        <SectionCard title="Dzisiejsza lista">
          <Text style={styles.sectionMeta}>
            Widoczne teraz: {filteredTasks.length} • wykonane w filtrze: {visibleCompletedCount}
          </Text>

          {todayTasksLoading && todayTasks.tasks.length === 0 ? (
            <Text style={styles.emptyText}>Ładowanie dzisiejszych nawyków...</Text>
          ) : filteredTasks.length === 0 ? (
            <Text style={styles.emptyText}>Brak nawyków dla wybranego filtra.</Text>
          ) : (
            filteredTasks.map((task, index) => {
              const subtitleParts = [translateTimeOfDay(task.timeOfDay)];
              if (task.description) {
                subtitleParts.push(task.description);
              }

              return (
                <HabitRow
                  key={`${task.title}_${index}`}
                  title={task.title}
                  subtitle={subtitleParts.join(" • ")}
                  done={task.isDoneToday}
                />
              );
            })
          )}
        </SectionCard>
      </ScrollView>
    </View>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function HabitRow({
  title,
  subtitle,
  done,
}: {
  title: string;
  subtitle: string;
  done: boolean;
}) {
  return (
    <View style={styles.habitRow}>
      <View style={styles.habitTextWrap}>
        <Text style={[styles.habitTitle, done && styles.habitTitleDone]}>{title}</Text>
        <Text style={styles.habitSubtitle}>{subtitle}</Text>
      </View>

      <View style={[styles.checkCircle, done && styles.checkCircleDone]}>
        <Text style={[styles.checkText, done && styles.checkTextDone]}>{done ? "✓" : ""}</Text>
      </View>
    </View>
  );
}

function FilterChip({
  children,
  selected,
  onPress,
}: {
  children: React.ReactNode;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#060B14" },
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
  stickyTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 20,
    paddingBottom: 8,
    backgroundColor: "rgba(6,11,20,0.95)",
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
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
  primaryBtnSmall: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#22354A",
  },
  primaryBtnSmallText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  title: { fontSize: 30, lineHeight: 34, fontWeight: "900", color: "#F2F7FF" },
  subtitle: { fontSize: 14, lineHeight: 20, color: "#A8B9D7" },
  summaryCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#22354A",
    borderWidth: 1,
    borderColor: "#1C2C3D",
  },
  summaryLabel: { color: "#C7D0D8", fontSize: 12, fontWeight: "800" },
  summaryValue: {
    color: "#FFFFFF",
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
    marginTop: 2,
  },
  summaryHint: { color: "#D8DFE5", fontSize: 12 },
  errorCard: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#271420",
    borderWidth: 1,
    borderColor: "#6A2A3F",
  },
  errorText: { color: "#FFB0C2", fontSize: 12, lineHeight: 17, fontWeight: "700" },
  sectionCard: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: "#0A1424",
    borderWidth: 1,
    borderColor: "#1F3A61",
    gap: 10,
  },
  sectionTitle: { fontSize: 17, fontWeight: "900", color: "#F2F7FF" },
  sectionMeta: { color: "#8CA9D3", fontSize: 12, fontWeight: "700" },
  emptyText: { color: "#7992BA", fontSize: 13 },
  habitRow: {
    borderWidth: 1,
    borderColor: "#1F3A61",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#0B1729",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  habitTextWrap: { flex: 1 },
  habitTitle: { fontSize: 14, fontWeight: "800", color: "#EAF3FF" },
  habitTitleDone: { textDecorationLine: "line-through", color: "#7D93BB" },
  habitSubtitle: { marginTop: 3, fontSize: 12, color: "#8CA9D3" },
  checkCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: "#9BA995",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0A1424",
  },
  checkCircleDone: {
    borderColor: "#6FD1FF",
    backgroundColor: "#1A3556",
  },
  checkText: { fontSize: 18, fontWeight: "900", color: "#6FD1FF", lineHeight: 20 },
  checkTextDone: { color: "#6FD1FF" },
  chipsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1F3A61",
    backgroundColor: "#0A1424",
  },
  chipSelected: { backgroundColor: "#1A3556", borderColor: "#6FD1FF" },
  chipText: { color: "#A8B9D7", fontSize: 12, fontWeight: "700" },
  chipTextSelected: { color: "#EAF3FF" },
});

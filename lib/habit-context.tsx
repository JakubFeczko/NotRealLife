import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth-context";
import { getTodayTasksRemote } from "./habit-api";
import { CustomHabit, isCompletionOnDate, TodayTasksSnapshot, todayIsoDate } from "./habit-types";
import { getCustomHabits, saveCustomHabits } from "./habit-storage";

type ToggleCustomHabitResult = {
  ok: boolean;
  habitId: string;
  date: string;
  doneToday: boolean;
};

type HabitContextType = {
  customHabits: CustomHabit[];
  loading: boolean;
  todayTasks: TodayTasksSnapshot;
  todayTasksLoading: boolean;
  todayTasksError: string | null;
  createCustomHabit: (habit: Omit<CustomHabit, "id" | "createdAt">) => Promise<void>;
  toggleCustomHabitDoneToday: (habitId: string) => Promise<ToggleCustomHabitResult>;
  refreshTodayTasks: () => Promise<void>;
};

const HabitContext = createContext<HabitContextType | undefined>(undefined);

const EMPTY_TODAY_TASKS: TodayTasksSnapshot = {
  completedCount: 0,
  remainingCount: 0,
  totalCount: 0,
  tasks: [],
};

export function HabitProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [customHabits, setCustomHabits] = useState<CustomHabit[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayTasks, setTodayTasks] = useState<TodayTasksSnapshot>(EMPTY_TODAY_TASKS);
  const [todayTasksLoading, setTodayTasksLoading] = useState(false);
  const [todayTasksError, setTodayTasksError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const stored = await getCustomHabits();
      setCustomHabits(stored);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (loading) return;
    void saveCustomHabits(customHabits);
  }, [customHabits, loading]);

  useEffect(() => {
    if (!isLoggedIn) {
      setTodayTasks(EMPTY_TODAY_TASKS);
      setTodayTasksError(null);
      setTodayTasksLoading(false);
      return;
    }

    let isActive = true;
    setTodayTasksLoading(true);
    setTodayTasksError(null);

    void getTodayTasksRemote()
      .then((snapshot) => {
        if (!isActive) return;
        setTodayTasks(snapshot);
      })
      .catch((error) => {
        if (!isActive) return;
        setTodayTasks(EMPTY_TODAY_TASKS);
        setTodayTasksError(
          error instanceof Error ? error.message : "Nie udało się pobrać dzisiejszych zadań.",
        );
      })
      .finally(() => {
        if (!isActive) return;
        setTodayTasksLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [isLoggedIn]);

  const value = useMemo<HabitContextType>(
    () => ({
      customHabits,
      loading,
      todayTasks,
      todayTasksLoading,
      todayTasksError,
      createCustomHabit: async (habit) => {
        const newHabit: CustomHabit = {
          ...habit,
          id: `custom_habit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          createdAt: new Date().toISOString(),
        };

        setCustomHabits((prev) => [newHabit, ...prev]);
      },
      toggleCustomHabitDoneToday: async (habitId) => {
        const now = new Date().toISOString();
        const today = todayIsoDate();
        let found = false;
        let doneTodayAfterToggle = false;

        setCustomHabits((prev) =>
          prev.map((habit) => {
            if (habit.id !== habitId) return habit;
            found = true;

            const doneToday = isCompletionOnDate(habit.completions, today);
            if (doneToday) {
              doneTodayAfterToggle = false;
              return {
                ...habit,
                completions: habit.completions.filter((item) => item.slice(0, 10) !== today),
              };
            }

            doneTodayAfterToggle = true;
            return {
              ...habit,
              completions: [...habit.completions, now],
            };
          }),
        );

        return {
          ok: found,
          habitId,
          date: today,
          doneToday: doneTodayAfterToggle,
        };
      },
      refreshTodayTasks: async () => {
        if (!isLoggedIn) {
          setTodayTasks(EMPTY_TODAY_TASKS);
          setTodayTasksError(null);
          return;
        }

        setTodayTasksLoading(true);
        setTodayTasksError(null);

        try {
          const snapshot = await getTodayTasksRemote();
          setTodayTasks(snapshot);
        } catch (error) {
          setTodayTasks(EMPTY_TODAY_TASKS);
          setTodayTasksError(
            error instanceof Error ? error.message : "Nie udało się pobrać dzisiejszych zadań.",
          );
          throw error;
        } finally {
          setTodayTasksLoading(false);
        }
      },
    }),
    [customHabits, isLoggedIn, loading, todayTasks, todayTasksError, todayTasksLoading],
  );

  return <HabitContext.Provider value={value}>{children}</HabitContext.Provider>;
}

export function useHabits() {
  const ctx = useContext(HabitContext);
  if (!ctx) throw new Error("useHabits must be used inside HabitProvider");
  return ctx;
}

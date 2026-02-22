import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { CustomHabit, isCompletionOnDate, todayIsoDate } from "./habit-types";
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
  createCustomHabit: (habit: Omit<CustomHabit, "id" | "createdAt">) => Promise<void>;
  toggleCustomHabitDoneToday: (habitId: string) => Promise<ToggleCustomHabitResult>;
};

const HabitContext = createContext<HabitContextType | undefined>(undefined);

export function HabitProvider({ children }: { children: React.ReactNode }) {
  const [customHabits, setCustomHabits] = useState<CustomHabit[]>([]);
  const [loading, setLoading] = useState(true);

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

  const value = useMemo<HabitContextType>(
    () => ({
      customHabits,
      loading,
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
    }),
    [customHabits, loading],
  );

  return <HabitContext.Provider value={value}>{children}</HabitContext.Provider>;
}

export function useHabits() {
  const ctx = useContext(HabitContext);
  if (!ctx) throw new Error("useHabits must be used inside HabitProvider");
  return ctx;
}

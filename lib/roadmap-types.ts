export type TimeOfDay = "morning" | "afternoon" | "evening";

export type TaskKind = "one_time" | "habit";

export type TaskStatus = "todo" | "done";

export type GoalDomain = "health" | "career" | "learning";

export const GOAL_DOMAIN_LABELS: Record<GoalDomain, string> = {
  health: "Zdrowie",
  career: "Kariera",
  learning: "Nauka",
};

export const GOAL_DOMAIN_ORDER: GoalDomain[] = ["health", "career", "learning"];

export type HabitConfig = {
  startDate: string; // ISO date: YYYY-MM-DD
  durationDays: number;
  everyNDays: number;
  timeOfDay?: TimeOfDay;
  completions: string[]; // ISO timestamps
};

export type RoadmapTask = {
  id: string;
  title: string;
  notes?: string;
  kind: TaskKind;
  status: TaskStatus;
  dependencies: string[];
  impact: number; // 1..5
  difficulty: number; // 1..3
  habit?: HabitConfig;
  children: RoadmapTask[];
};

export type RoadmapGoal = {
  id: string;
  title: string;
  description?: string;
  domain: GoalDomain;
  createdAt: string;
  updatedAt: string;
  tasks: RoadmapTask[];
};

export type RoadmapGoalSummary = {
  id: string;
  title: string;
  description?: string;
  domain?: GoalDomain;
  numberOfTasks: number;
  numberOfCompletedTasks: number;
  updatedAt?: string;
};

export function buildId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function expectedHabitCompletions(habit: HabitConfig) {
  if (habit.durationDays <= 0 || habit.everyNDays <= 0) return 0;
  return Math.floor((habit.durationDays - 1) / habit.everyNDays) + 1;
}

export function taskIsDone(task: RoadmapTask): boolean {
  if (task.kind === "one_time") {
    return task.status === "done";
  }

  if (!task.habit) return false;
  return task.habit.completions.length >= expectedHabitCompletions(task.habit);
}

export function flattenTasks(tasks: RoadmapTask[]): RoadmapTask[] {
  return tasks.flatMap((task) => [task, ...flattenTasks(task.children)]);
}

export function buildTaskMap(tasks: RoadmapTask[]) {
  const map: Record<string, RoadmapTask> = {};
  for (const task of flattenTasks(tasks)) {
    map[task.id] = task;
  }
  return map;
}

export function getBlockedByTaskIds(task: RoadmapTask, taskMap: Record<string, RoadmapTask>) {
  return (task.dependencies ?? []).filter((dependencyId) => {
    const dependency = taskMap[dependencyId];
    if (!dependency) return false;
    return !taskIsDone(dependency);
  });
}

export function isTaskBlocked(task: RoadmapTask, taskMap: Record<string, RoadmapTask>) {
  return getBlockedByTaskIds(task, taskMap).length > 0;
}

export function buildDependentsCountMap(tasks: RoadmapTask[]) {
  const dependents: Record<string, number> = {};
  const all = flattenTasks(tasks);

  for (const task of all) {
    dependents[task.id] = 0;
  }

  for (const task of all) {
    for (const dependencyId of task.dependencies ?? []) {
      if (!(dependencyId in dependents)) continue;
      dependents[dependencyId] += 1;
    }
  }

  return dependents;
}

export function hasDependencyCycle(tasks: RoadmapTask[]) {
  const all = flattenTasks(tasks);
  const taskIds = new Set(all.map((task) => task.id));
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const graph: Record<string, string[]> = {};

  for (const task of all) {
    graph[task.id] = (task.dependencies ?? []).filter((dependencyId) => taskIds.has(dependencyId));
  }

  function dfs(taskId: string): boolean {
    if (inStack.has(taskId)) return true;
    if (visited.has(taskId)) return false;

    visited.add(taskId);
    inStack.add(taskId);

    const dependencies = graph[taskId] ?? [];
    for (const dependencyId of dependencies) {
      if (dfs(dependencyId)) return true;
    }

    inStack.delete(taskId);
    return false;
  }

  for (const task of all) {
    if (dfs(task.id)) return true;
  }

  return false;
}

export function removeDependencyCycles(tasks: RoadmapTask[]): RoadmapTask[] {
  const all = flattenTasks(tasks);
  const validIds = new Set(all.map((task) => task.id));
  const cleanedDependencies: Record<string, string[]> = {};

  for (const task of all) {
    cleanedDependencies[task.id] = [];
  }

  const originalDependencies: Record<string, string[]> = {};
  for (const task of all) {
    originalDependencies[task.id] = [...new Set((task.dependencies ?? []).filter((depId) => depId !== task.id && validIds.has(depId)))];
  }

  const hasPath = (fromId: string, toId: string) => {
    const stack = [fromId];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const current = stack.pop() as string;
      if (current === toId) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      for (const next of cleanedDependencies[current] ?? []) {
        if (!visited.has(next)) stack.push(next);
      }
    }

    return false;
  };

  for (const task of all) {
    for (const depId of originalDependencies[task.id] ?? []) {
      // Edge task -> dep would create cycle if dep already reaches task.
      if (hasPath(depId, task.id)) continue;
      cleanedDependencies[task.id].push(depId);
    }
  }

  const apply = (nodes: RoadmapTask[]): RoadmapTask[] =>
    nodes.map((node) => ({
      ...node,
      dependencies: cleanedDependencies[node.id] ?? [],
      children: apply(node.children),
    }));

  return apply(tasks);
}

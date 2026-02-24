import type { Task as GanttTask } from "gantt-task-react";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type ProjectSummary = {
  id: number;
  name: string;
  startDate: Date | string | null;
  targetCompletionDate: Date | string | null;
};

type TaskSummary = {
  id: number;
  projectId: number;
  taskId: string;
  taskDescription: string;
  startDate: Date | string | null;
  dueDate: Date | string | null;
  durationDays: number | null;
  dependency: string | null;
  completionPercent: number;
};

export type GanttBuildResult = {
  tasks: GanttTask[];
  drilldownMap: Map<string, { projectId: number; taskId?: number }>;
  inferredTaskCount: number;
};

type BuildInput = {
  projects?: ProjectSummary[];
  tasks?: TaskSummary[];
  selectedProject: string;
  criticalTaskIds?: Set<number>;
};

const asDate = (value: Date | string | null | undefined): Date | undefined => {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
};

const normalizeRange = (
  startInput: Date | undefined,
  endInput: Date | undefined,
  fallbackStart: Date,
): { start: Date; end: Date } => {
  let start = startInput ? new Date(startInput.getTime()) : new Date(fallbackStart.getTime());
  let end = endInput ? new Date(endInput.getTime()) : new Date(start.getTime() + ONE_DAY_MS);

  if (end.getTime() <= start.getTime()) {
    end = addDays(start, 1);
  }

  return { start, end };
};

const taskSortKey = (task: TaskSummary) => {
  const match = /^T(\d+)$/i.exec(task.taskId?.trim() || "");
  if (match) return Number.parseInt(match[1] || "0", 10);
  return Number.MAX_SAFE_INTEGER;
};

export function buildGanttTimeline({
  projects,
  tasks,
  selectedProject,
  criticalTaskIds,
}: BuildInput): GanttBuildResult {
  const timeline: GanttTask[] = [];
  const drilldownMap = new Map<string, { projectId: number; taskId?: number }>();
  let inferredTaskCount = 0;

  const projectScope =
    selectedProject === "all"
      ? projects ?? []
      : (projects ?? []).filter((project) => project.id === Number.parseInt(selectedProject, 10));

  for (const project of projectScope) {
    const projectRowId = `project-${project.id}`;
    const projectTasks = (tasks ?? [])
      .filter((task) => task.projectId === project.id)
      .sort((a, b) => {
        const keyDelta = taskSortKey(a) - taskSortKey(b);
        if (keyDelta !== 0) return keyDelta;
        return a.id - b.id;
      });

    const taskRowIdByCode = new Map<string, string>();
    for (const task of projectTasks) {
      taskRowIdByCode.set(task.taskId.trim().toUpperCase(), `task-${task.id}`);
    }

    const explicitStarts = projectTasks.map((task) => asDate(task.startDate)).filter(Boolean) as Date[];
    const explicitEnds = projectTasks.map((task) => asDate(task.dueDate)).filter(Boolean) as Date[];
    const projectStartFallback =
      asDate(project.startDate) ??
      (explicitStarts.length > 0
        ? new Date(Math.min(...explicitStarts.map((value) => value.getTime())))
        : new Date());

    let rollingStart = new Date(projectStartFallback.getTime());
    const childRows: GanttTask[] = [];

    for (const task of projectTasks) {
      const explicitStart = asDate(task.startDate);
      const explicitEnd = asDate(task.dueDate);
      const durationDays =
        task.durationDays && Number.isFinite(task.durationDays) && task.durationDays > 0
          ? task.durationDays
          : 1;

      let start: Date;
      let end: Date;

      if (explicitStart && explicitEnd) {
        ({ start, end } = normalizeRange(explicitStart, explicitEnd, rollingStart));
      } else if (explicitStart) {
        start = explicitStart;
        end = addDays(explicitStart, durationDays);
        inferredTaskCount += 1;
      } else if (explicitEnd) {
        end = explicitEnd;
        start = addDays(explicitEnd, -durationDays);
        ({ start, end } = normalizeRange(start, end, rollingStart));
        inferredTaskCount += 1;
      } else {
        start = new Date(rollingStart.getTime());
        end = addDays(start, durationDays);
        inferredTaskCount += 1;
      }

      rollingStart = addDays(end, 1);
      const taskRowId = `task-${task.id}`;
      const dependencyIds = (task.dependency || "")
        .split(",")
        .map((dependency) => dependency.trim().toUpperCase())
        .filter(Boolean)
        .map((dependencyCode) => taskRowIdByCode.get(dependencyCode))
        .filter((value): value is string => Boolean(value));

      childRows.push({
        id: taskRowId,
        name: task.taskDescription,
        start,
        end,
        progress: task.completionPercent || 0,
        type: "task",
        project: projectRowId,
        dependencies: dependencyIds.length > 0 ? dependencyIds : undefined,
        styles:
          criticalTaskIds && criticalTaskIds.has(task.id)
            ? {
                backgroundColor: "#dc2626",
                backgroundSelectedColor: "#b91c1c",
                progressColor: "#fca5a5",
                progressSelectedColor: "#f87171",
              }
            : undefined,
      });

      drilldownMap.set(taskRowId, { projectId: project.id, taskId: task.id });
    }

    const childStarts = childRows.map((task) => task.start.getTime());
    const childEnds = childRows.map((task) => task.end.getTime());
    const projectStartInput =
      childStarts.length > 0
        ? new Date(Math.min(...childStarts))
        : asDate(project.startDate);
    const projectEndInput =
      childEnds.length > 0
        ? new Date(Math.max(...childEnds))
        : asDate(project.targetCompletionDate);
    const { start: projectStart, end: projectEnd } = normalizeRange(
      projectStartInput,
      projectEndInput,
      projectStartFallback,
    );

    const projectProgress =
      childRows.length > 0
        ? Math.round(
            childRows.reduce((total, task) => total + (task.progress || 0), 0) / childRows.length,
          )
        : 0;

    timeline.push({
      id: projectRowId,
      name: project.name,
      start: projectStart,
      end: projectEnd,
      progress: projectProgress,
      type: "project",
      hideChildren: false,
    });
    drilldownMap.set(projectRowId, { projectId: project.id });
    timeline.push(...childRows);
  }

  return { tasks: timeline, drilldownMap, inferredTaskCount };
}

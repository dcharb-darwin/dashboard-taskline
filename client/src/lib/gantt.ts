import type { Task as GanttTask } from "gantt-task-react";
import { groupByPhase, getPhaseColor } from "./phase-utils";

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
  phase: string | null;
};

export type GanttBuildResult = {
  tasks: GanttTask[];
  drilldownMap: Map<string, { projectId: number; taskId?: number; phaseName?: string }>;
  inferredTaskCount: number;
  viewDate: Date;
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
  const drilldownMap = new Map<string, { projectId: number; taskId?: number; phaseName?: string }>();
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

    // ── Build child task rows (resolving dates, dependencies) ──────────
    type ResolvedChild = GanttTask & { _phase: string };
    const childRows: ResolvedChild[] = [];

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
        project: projectRowId, // will be updated per-phase below
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
        _phase: task.phase?.trim() || "Uncategorized",
      } as ResolvedChild);

      drilldownMap.set(taskRowId, { projectId: project.id, taskId: task.id });
    }

    // ── Group by phase → insert phase rows between project and tasks ──
    const phaseGroups = groupByPhase(
      childRows,
      (row) => row._phase,
      (row) => row.progress || 0,
      (row) => row.start,
      (row) => row.end,
    );

    // Compute project-level dates from all children
    const allChildStarts = childRows.map((t) => t.start.getTime());
    const allChildEnds = childRows.map((t) => t.end.getTime());
    const projectStartInput =
      allChildStarts.length > 0
        ? new Date(Math.min(...allChildStarts))
        : asDate(project.startDate);
    const projectEndInput =
      allChildEnds.length > 0
        ? new Date(Math.max(...allChildEnds))
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

    // ── Project row ─────────────────────────────────────────────────────
    timeline.push({
      id: projectRowId,
      name: project.name,
      start: projectStart,
      end: projectEnd,
      progress: projectProgress,
      type: "project",
      hideChildren: true, // start collapsed
    });
    drilldownMap.set(projectRowId, { projectId: project.id });

    // ── Phase rows + task rows ──────────────────────────────────────────
    for (let i = 0; i < phaseGroups.length; i++) {
      const phase = phaseGroups[i]!;
      const phaseRowId = `phase-${project.id}-${i}`;
      const colors = getPhaseColor(i);

      const phaseStart = phase.startDate ?? projectStart;
      const phaseEnd = phase.endDate ?? addDays(phaseStart, 1);

      timeline.push({
        id: phaseRowId,
        name: `  ${phase.name}`,
        start: phaseStart,
        end: phaseEnd.getTime() > phaseStart.getTime() ? phaseEnd : addDays(phaseStart, 1),
        progress: phase.progress,
        type: "project",
        project: projectRowId,
        hideChildren: true, // phases also start collapsed
        styles: {
          backgroundColor: colors.bar,
          backgroundSelectedColor: colors.barSelected,
          progressColor: colors.bg,
          progressSelectedColor: colors.bg,
        },
      });
      drilldownMap.set(phaseRowId, { projectId: project.id, phaseName: phase.name });

      // Re-parent task rows to this phase
      for (const taskRow of phase.tasks) {
        timeline.push({
          ...taskRow,
          project: phaseRowId,
        });
      }
    }
  }

  // Use a date shortly before "now" as the initial viewport, so today's tasks
  // are visible without scrolling. Fall back to earliest task if no tasks exist.
  const allStarts = timeline.map((t) => t.start.getTime());
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * ONE_DAY_MS);
  const viewDate = allStarts.length > 0
    ? twoWeeksAgo
    : now;

  return { tasks: timeline, drilldownMap, inferredTaskCount, viewDate };
}

import { useCallback, useMemo, useState } from "react";
import { Gantt, Task as GanttTask, ViewMode } from "gantt-task-react";
import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronsDownUp, ChevronsUpDown, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { buildGanttTimeline } from "@/lib/gantt";
import "gantt-task-react/dist/index.css";

export default function GanttChart() {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Month);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [, setLocation] = useLocation();

  const { data: projects, isLoading: projectsLoading } = trpc.projects.list.useQuery();
  const { data: allTasks, isLoading: tasksLoading } = trpc.tasks.listAll.useQuery();
  const parsedSelectedProjectId =
    selectedProject === "all" ? null : Number.parseInt(selectedProject, 10);
  const selectedProjectId =
    parsedSelectedProjectId !== null && Number.isFinite(parsedSelectedProjectId)
      ? parsedSelectedProjectId
      : null;
  const { data: criticalPath } = trpc.tasks.criticalPath.useQuery(
    { projectId: selectedProjectId ?? 0 },
    { enabled: selectedProjectId !== null },
  );
  const criticalTaskIds = useMemo(
    () => new Set(criticalPath?.taskIds ?? []),
    [criticalPath?.taskIds],
  );

  const timeline = useMemo(
    () =>
      buildGanttTimeline({
        projects,
        tasks: allTasks,
        selectedProject,
        criticalTaskIds,
      }),
    [projects, allTasks, selectedProject, criticalTaskIds],
  );

  // ── Managed task list for collapse/expand ──────────────────────────
  const [ganttTasks, setGanttTasks] = useState<GanttTask[]>([]);

  // Sync timeline.tasks → ganttTasks (preserving existing hideChildren state)
  useMemo(() => {
    setGanttTasks((prev) => {
      const hiddenMap = new Map(
        prev
          .filter((t) => t.type === "project" && t.hideChildren !== undefined)
          .map((t) => [t.id, t.hideChildren]),
      );
      return timeline.tasks.map((t) => ({
        ...t,
        hideChildren:
          t.type === "project"
            ? hiddenMap.has(t.id)
              ? hiddenMap.get(t.id)
              : t.hideChildren // keep default from buildGanttTimeline
            : undefined,
      }));
    });
  }, [timeline.tasks]);

  const handleExpanderClick = useCallback((task: GanttTask) => {
    setGanttTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, hideChildren: !t.hideChildren } : t
      )
    );
  }, []);

  const expandAll = useCallback(() => {
    setGanttTasks((prev) =>
      prev.map((t) =>
        t.type === "project" ? { ...t, hideChildren: false } : t
      )
    );
  }, []);

  const collapseAll = useCallback(() => {
    setGanttTasks((prev) =>
      prev.map((t) =>
        t.type === "project" ? { ...t, hideChildren: true } : t
      )
    );
  }, []);

  if (projectsLoading || tasksLoading) {
    return (
      <AppLayout contentClassName="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Gantt Chart</h1>
        <p className="text-muted-foreground">Visualize project timelines and task dependencies</p>
      </div>

      <Card className="bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Project Timeline</CardTitle>
              <CardDescription>View and manage project schedules</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={expandAll}
                  title="Expand All"
                >
                  <ChevronsUpDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={collapseAll}
                  title="Collapse All"
                >
                  <ChevronsDownUp className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex gap-1">
                <Button
                  variant={viewMode === ViewMode.Day ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode(ViewMode.Day)}
                >
                  Day
                </Button>
                <Button
                  variant={viewMode === ViewMode.Week ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode(ViewMode.Week)}
                >
                  Week
                </Button>
                <Button
                  variant={viewMode === ViewMode.Month ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode(ViewMode.Month)}
                >
                  Month
                </Button>
              </div>
            </div>
          </div>
          {selectedProjectId !== null && criticalPath && criticalPath.taskCodes.length > 0 ? (
            <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4" />
                Critical path ({criticalPath.totalDurationDays} days)
              </div>
              <p className="mt-1">
                {criticalPath.taskCodes.join(" -> ")}
                {criticalPath.blockedByCycle
                  ? " (dependency cycle detected; showing best-effort path)"
                  : ""}
              </p>
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          {ganttTasks.length > 0 ? (
            <div className="overflow-x-auto">
              <Gantt
                tasks={ganttTasks}
                viewMode={viewMode}
                viewDate={timeline.viewDate}
                preStepsCount={1}
                listCellWidth="200px"
                columnWidth={viewMode === ViewMode.Month ? 60 : viewMode === ViewMode.Week ? 100 : 50}
                onExpanderClick={handleExpanderClick}
                onSelect={(selectedTask) => {
                  const match = timeline.drilldownMap.get(String(selectedTask.id));
                  if (!match) return;
                  if (match.taskId) {
                    setLocation(`/projects/${match.projectId}?task=${match.taskId}`);
                    return;
                  }
                  if (match.phaseName) {
                    setLocation(`/projects/${match.projectId}?phase=${encodeURIComponent(match.phaseName)}`);
                    return;
                  }
                  setLocation(`/projects/${match.projectId}`);
                }}
              />
              {timeline.inferredTaskCount > 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  {timeline.inferredTaskCount} task
                  {timeline.inferredTaskCount === 1 ? "" : "s"} lacked complete dates, so the
                  timeline uses inferred sequencing.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <p>No projects or tasks with dates available.</p>
              <p className="mt-2 text-sm">Add start and due dates to tasks to see them on the Gantt chart.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}

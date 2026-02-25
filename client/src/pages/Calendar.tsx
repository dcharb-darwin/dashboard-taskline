import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useMemo, useState } from "react";
import { getPhaseColor } from "@/lib/phase-utils";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function Calendar() {
  const [, setLocation] = useLocation();
  const { data: projects, isLoading: projectsLoading } = trpc.projects.list.useQuery();
  const { data: allTasks, isLoading: tasksLoading } = trpc.tasks.listAll.useQuery();
  const [viewMode, setViewMode] = useState<"projects" | "tasks">("projects");

  const isLoading = projectsLoading || (viewMode === "tasks" && tasksLoading);

  // Build project name map
  const projectMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of projects ?? []) map.set(p.id, p.name);
    return map;
  }, [projects]);

  // Build phase-index map for consistent colors: key=projectId:phase → index
  const phaseIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    let idx = 0;
    for (const task of allTasks ?? []) {
      const key = `${task.projectId}:${task.phase ?? ""}`;
      if (!map.has(key)) {
        map.set(key, idx++);
      }
    }
    return map;
  }, [allTasks]);

  // Project-level events
  const projectEvents = useMemo(
    () =>
      (projects ?? []).map((project) => ({
        id: `p-${project.id}`,
        title: project.name,
        start: project.startDate ? new Date(project.startDate) : new Date(),
        end: project.targetCompletionDate ? new Date(project.targetCompletionDate) : new Date(),
        resource: { type: "project" as const, project },
      })),
    [projects],
  );

  // Task-level events
  const taskEvents = useMemo(
    () =>
      (allTasks ?? [])
        .filter((t) => t.startDate || t.dueDate)
        .map((task) => ({
          id: `t-${task.id}`,
          title: `${task.taskId}: ${task.taskDescription}`,
          start: task.startDate ? new Date(task.startDate) : new Date(task.dueDate!),
          end: task.dueDate ? new Date(task.dueDate) : new Date(task.startDate!),
          resource: { type: "task" as const, task },
        })),
    [allTasks],
  );

  const events = viewMode === "projects" ? projectEvents : taskEvents;

  const handleSelectEvent = (event: any) => {
    const res = event.resource;
    if (res.type === "project") {
      setLocation(`/projects/${res.project.id}`);
    } else {
      setLocation(`/projects/${res.task.projectId}?task=${res.task.id}`);
    }
  };

  const eventStyleGetter = (event: any) => {
    const res = event.resource;

    if (res.type === "project") {
      const project = res.project;
      let backgroundColor = "#3b82f6";
      switch (project.status) {
        case "Planning": backgroundColor = "#6366f1"; break;
        case "Active": backgroundColor = "#10b981"; break;
        case "On Hold": backgroundColor = "#f59e0b"; break;
        case "Complete": backgroundColor = "#6b7280"; break;
      }
      return {
        style: {
          backgroundColor,
          borderRadius: "4px",
          opacity: 0.8,
          color: "white",
          border: "0px",
          display: "block",
        },
      };
    }

    // Task events: color by phase
    const task = res.task;
    const phaseKey = `${task.projectId}:${task.phase ?? ""}`;
    const idx = phaseIndexMap.get(phaseKey) ?? 0;
    const colors = getPhaseColor(idx);

    return {
      style: {
        backgroundColor: colors.bar,
        borderRadius: "4px",
        opacity: 0.85,
        color: "white",
        border: "0px",
        display: "block",
        fontSize: "0.75rem",
      },
    };
  };

  const tooltipAccessor = (event: any) => {
    const res = event.resource;
    if (res.type === "project") {
      const p = res.project;
      const parts = [p.name, `Status: ${p.status}`];
      if (p.completionPercentage != null) {
        parts.push(`Completion: ${p.completionPercentage}%`);
      }
      return parts.join("\n");
    }
    const t = res.task;
    const projName = projectMap.get(t.projectId) ?? "Unknown Project";
    const parts = [t.taskDescription, `Project: ${projName}`];
    if (t.phase) parts.push(`Phase: ${t.phase}`);
    parts.push(`Status: ${t.status}`);
    parts.push(`Completion: ${t.completionPercent ?? 0}%`);
    return parts.join("\n");
  };

  if (isLoading) {
    return (
      <AppLayout contentClassName="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Project Calendar</h1>
          <p className="text-muted-foreground">View all projects and tasks by their dates</p>
        </div>
        <div className="flex rounded-lg border bg-white p-1">
          <button
            onClick={() => setViewMode("projects")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === "projects"
                ? "bg-blue-100 text-blue-800"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Projects
          </button>
          <button
            onClick={() => setViewMode("tasks")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === "tasks"
                ? "bg-blue-100 text-blue-800"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Tasks
          </button>
        </div>
      </div>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>{viewMode === "projects" ? "Project Timeline" : "Task Timeline"}</CardTitle>
          <CardDescription>
            {viewMode === "projects"
              ? "Click on any project to view details"
              : "Click on any task to view its project. Tasks are color-coded by phase."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[600px]">
            <BigCalendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventStyleGetter}
              tooltipAccessor={tooltipAccessor}
              views={["month", "week", "day", "agenda"]}
              defaultView="month"
              popup
            />
          </div>
        </CardContent>
      </Card>

      {viewMode === "projects" && (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded" style={{ backgroundColor: "#6366f1" }}></div>
            <span className="text-sm">Planning</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded" style={{ backgroundColor: "#10b981" }}></div>
            <span className="text-sm">Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded" style={{ backgroundColor: "#f59e0b" }}></div>
            <span className="text-sm">On Hold</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded" style={{ backgroundColor: "#6b7280" }}></div>
            <span className="text-sm">Complete</span>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

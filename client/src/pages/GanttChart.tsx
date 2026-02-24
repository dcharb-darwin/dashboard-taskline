import { useMemo, useState } from "react";
import { Gantt, ViewMode } from "gantt-task-react";
import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
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

  const timeline = useMemo(
    () =>
      buildGanttTimeline({
        projects,
        tasks: allTasks,
        selectedProject,
      }),
    [projects, allTasks, selectedProject],
  );

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
        </CardHeader>
        <CardContent>
          {timeline.tasks.length > 0 ? (
            <div className="overflow-x-auto">
              <Gantt
                tasks={timeline.tasks}
                viewMode={viewMode}
                listCellWidth="200px"
                columnWidth={viewMode === ViewMode.Month ? 60 : viewMode === ViewMode.Week ? 100 : 50}
                onSelect={(selectedTask) => {
                  const match = timeline.drilldownMap.get(String(selectedTask.id));
                  if (!match) return;
                  if (match.taskId) {
                    setLocation(`/projects/${match.projectId}?task=${match.taskId}`);
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

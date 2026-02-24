import { useState } from "react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import "gantt-task-react/dist/index.css";

export default function GanttChart() {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Month);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  
  const { data: projects, isLoading: projectsLoading } = trpc.projects.list.useQuery();
  const { data: allTasks, isLoading: tasksLoading } = trpc.tasks.listAll.useQuery();

  if (projectsLoading || tasksLoading) {
    return (
      <AppLayout contentClassName="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </AppLayout>
    );
  }

  // Transform projects and tasks into Gantt chart format
  const tasks: Task[] = [];

  if (selectedProject === "all") {
    // Show all projects as top-level tasks
    projects?.forEach((project) => {
      const projectTasks = allTasks?.filter((t) => t.projectId === project.id) || [];
      
      // Calculate project dates from tasks or use project dates
      let projectStart = project.startDate ? new Date(project.startDate) : new Date();
      let projectEnd = project.targetCompletionDate ? new Date(project.targetCompletionDate) : new Date();
      
      if (projectTasks.length > 0) {
        const taskDates = projectTasks
          .filter((t) => t.startDate || t.dueDate)
          .map((t) => ({
            start: t.startDate ? new Date(t.startDate) : new Date(),
            end: t.dueDate ? new Date(t.dueDate) : new Date(),
          }));
        
        if (taskDates.length > 0) {
          projectStart = new Date(Math.min(...taskDates.map((d) => d.start.getTime())));
          projectEnd = new Date(Math.max(...taskDates.map((d) => d.end.getTime())));
        }
      }

      tasks.push({
        id: `project-${project.id}`,
        name: project.name,
        start: projectStart,
        end: projectEnd,
        progress: 0, // Projects don't have completionPercent
        type: "project",
        hideChildren: false,
      });

      // Add tasks as children
      projectTasks.forEach((task) => {
        if (task.startDate && task.dueDate) {
          tasks.push({
            id: `task-${task.id}`,
            name: task.taskDescription,
            start: new Date(task.startDate),
            end: new Date(task.dueDate),
            progress: task.completionPercent || 0,
            type: "task",
            project: `project-${project.id}`,
          });
        }
      });
    });
  } else {
    // Show single project with all its tasks
    const project = projects?.find((p) => p.id === parseInt(selectedProject));
    if (project) {
      const projectTasks = allTasks?.filter((t) => t.projectId === project.id) || [];
      
      let projectStart = project.startDate ? new Date(project.startDate) : new Date();
      let projectEnd = project.targetCompletionDate ? new Date(project.targetCompletionDate) : new Date();

      tasks.push({
        id: `project-${project.id}`,
        name: project.name,
        start: projectStart,
        end: projectEnd,
        progress: 0, // Projects don't have completionPercent
        type: "project",
        hideChildren: false,
      });

      projectTasks.forEach((task) => {
        if (task.startDate && task.dueDate) {
          tasks.push({
            id: `task-${task.id}`,
            name: task.taskDescription,
            start: new Date(task.startDate),
            end: new Date(task.dueDate),
            progress: task.completionPercent || 0,
            type: "task",
            project: `project-${project.id}`,
               // dependencies: task.dependency ? [task.dependency] : undefined,,
          });
        }
      });
    }
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
          {tasks.length > 0 ? (
            <div className="overflow-x-auto">
              <Gantt
                tasks={tasks}
                viewMode={viewMode}
                listCellWidth="200px"
                columnWidth={viewMode === ViewMode.Month ? 60 : viewMode === ViewMode.Week ? 100 : 50}
              />
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

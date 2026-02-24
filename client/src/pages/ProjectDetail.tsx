import { trpc } from "@/lib/trpc";
import { formatTemplateLabel } from "@/lib/template";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/AppLayout";
import { Link, useParams, useLocation } from "wouter";
import { ArrowLeft, Plus, Pencil, Filter } from "lucide-react";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { EditTaskDialog } from "@/components/EditTaskDialog";
import { AddTaskDialog } from "@/components/AddTaskDialog";
import { EditProjectDialog } from "@/components/EditProjectDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ProjectDetail() {
  const params = useParams();
  const [location, setLocation] = useLocation();
  const projectId = parseInt(params.id || "0");
  const [editingTask, setEditingTask] = useState<any>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterOwner, setFilterOwner] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("dueDate");

  const highlightedTaskId = useMemo(() => {
    const searchIndex = location.indexOf("?");
    if (searchIndex < 0) return null;
    const searchParams = new URLSearchParams(location.slice(searchIndex));
    const taskParam = searchParams.get("task");
    if (!taskParam) return null;
    const parsed = Number.parseInt(taskParam, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [location]);

  const { data: project, isLoading: projectLoading, refetch: refetchProject } = trpc.projects.getById.useQuery({ id: projectId });
  const { data: tasks, isLoading: tasksLoading, refetch: refetchTasks } = trpc.tasks.listByProject.useQuery({ projectId });

  const deleteProject = trpc.projects.delete.useMutation({
    onSuccess: () => {
      setLocation("/projects");
    },
  });

  useEffect(() => {
    if (highlightedTaskId === null) return;
    setFilterStatus("all");
    setFilterPriority("all");
    setFilterOwner("all");
  }, [highlightedTaskId]);

  useEffect(() => {
    if (highlightedTaskId === null || !tasks || tasks.length === 0) return;
    const timeout = window.setTimeout(() => {
      const target = document.getElementById(`task-row-${highlightedTaskId}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 120);
    return () => window.clearTimeout(timeout);
  }, [highlightedTaskId, tasks]);

  const exportToExcel = trpc.export.projectToExcel.useMutation({
    onSuccess: (data) => {
      // Convert base64 to blob and download
      const byteCharacters = atob(data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });

  if (projectLoading) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 rounded bg-slate-200"></div>
          <div className="h-64 rounded bg-slate-200"></div>
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout contentClassName="flex items-center justify-center">
        <Card className="bg-white">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Project not found</p>
            <Link href="/projects">
              <Button className="mt-4 w-full">Back to Projects</Button>
            </Link>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  // Apply filters
  let filteredTasks = tasks || [];
  if (filterStatus !== "all") {
    filteredTasks = filteredTasks.filter((t) => t.status === filterStatus);
  }
  if (filterPriority !== "all") {
    filteredTasks = filteredTasks.filter((t) => t.priority === filterPriority);
  }
  if (filterOwner !== "all") {
    filteredTasks = filteredTasks.filter((t) => t.owner === filterOwner);
  }

  // Apply sorting
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === "dueDate") {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    } else if (sortBy === "priority") {
      const priorityOrder = { High: 1, Medium: 2, Low: 3 };
      return (priorityOrder[a.priority as keyof typeof priorityOrder] || 4) - (priorityOrder[b.priority as keyof typeof priorityOrder] || 4);
    } else if (sortBy === "status") {
      return a.status.localeCompare(b.status);
    }
    return 0;
  });

  const tasksByStatus = {
    "Not Started": sortedTasks.filter((t) => t.status === "Not Started"),
    "In Progress": sortedTasks.filter((t) => t.status === "In Progress"),
    Complete: sortedTasks.filter((t) => t.status === "Complete"),
    "On Hold": sortedTasks.filter((t) => t.status === "On Hold"),
  };

  // Get unique owners for filter dropdown
  const uniqueOwners = Array.from(new Set(tasks?.map((t) => t.owner).filter(Boolean) || []));

  const completionRate =
    tasks && tasks.length > 0
      ? Math.round((tasksByStatus.Complete.length / tasks.length) * 100)
      : 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <Link href="/projects">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
        </Link>

          {/* Project Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold tracking-tight">{project.name}</h2>
                <span
                  className={`px-3 py-1 text-sm font-medium rounded-full ${
                    project.status === "Active"
                      ? "bg-green-100 text-green-700"
                      : project.status === "Planning"
                      ? "bg-blue-100 text-blue-700"
                      : project.status === "On Hold"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {project.status}
                </span>
              </div>
              <p className="text-muted-foreground">{project.description || "No description"}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEditProject(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Project
              </Button>
              <Button
                variant="outline"
                onClick={() => exportToExcel.mutate({ projectId })}
                disabled={exportToExcel.isPending}
              >
                {exportToExcel.isPending ? "Exporting..." : "Export to Excel"}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this project?")) {
                    deleteProject.mutate({ id: projectId });
                  }
                }}
              >
                Delete Project
              </Button>
            </div>
          </div>

          {/* Project Info Card */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Template Type</dt>
                  <dd className="mt-1 text-sm">{formatTemplateLabel(project.templateType)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Project Manager</dt>
                  <dd className="mt-1 text-sm">{project.projectManager || "Not assigned"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Start Date</dt>
                  <dd className="mt-1 text-sm">
                    {project.startDate ? format(new Date(project.startDate), "MMM d, yyyy") : "Not set"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Target Completion</dt>
                  <dd className="mt-1 text-sm">
                    {project.targetCompletionDate
                      ? format(new Date(project.targetCompletionDate), "MMM d, yyyy")
                      : "Not set"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Budget</dt>
                  <dd className="mt-1 text-sm">
                    {project.budget ? `$${(project.budget / 100).toLocaleString()}` : "Not set"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Completion Rate</dt>
                  <dd className="mt-1 text-sm">{completionRate}%</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Tasks Section */}
          <Card className="bg-white">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <CardTitle>Tasks ({sortedTasks.length} of {tasks?.length || 0})</CardTitle>
                <Button size="sm" onClick={() => setShowAddTask(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>
              
              {/* Filters */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>
                
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Complete">Complete</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>

                {uniqueOwners.length > 0 && (
                  <Select value={filterOwner} onValueChange={setFilterOwner}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Owner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Owners</SelectItem>
                      {uniqueOwners.map((owner) => (
                        <SelectItem key={owner as string} value={owner as string}>
                          {owner}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-sm text-muted-foreground">Sort by:</span>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dueDate">Due Date</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-slate-100 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : tasks && tasks.length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(tasksByStatus).map(([status, statusTasks]) =>
                    statusTasks.length > 0 ? (
                      <div key={status}>
                        <h4 className="font-semibold text-sm text-muted-foreground mb-3">
                          {status} ({statusTasks.length})
                        </h4>
                        <div className="space-y-2">
                          {statusTasks.map((task) => (
                            <div
                              key={task.id}
                              id={`task-row-${task.id}`}
                              className={`flex items-start justify-between rounded-lg border p-3 transition-colors hover:bg-slate-50 ${
                                highlightedTaskId === task.id
                                  ? "ring-2 ring-blue-500 ring-offset-1 bg-blue-50/40"
                                  : ""
                              }`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono text-muted-foreground">
                                    {task.taskId}
                                  </span>
                                  <p className="font-medium">{task.taskDescription}</p>
                                </div>
                                <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                                  {task.phase && <span className="px-2 py-0.5 bg-slate-100 rounded text-xs">{task.phase}</span>}
                                  {task.owner && <span>👤 {task.owner}</span>}
                                  {task.dueDate && (
                                    <span>📅 {format(new Date(task.dueDate), "MMM d, yyyy")}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    task.priority === "High"
                                      ? "bg-red-100 text-red-700"
                                      : task.priority === "Medium"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {task.priority}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {task.completionPercent}%
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingTask(task)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No tasks yet</p>
                  <Button className="mt-4" variant="outline" onClick={() => setShowAddTask(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Task
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
      </div>

      {/* Edit Task Dialog */}
      {editingTask && (
        <EditTaskDialog
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
          onSuccess={() => {
            refetchTasks();
            setEditingTask(null);
          }}
        />
      )}

      {/* Add Task Dialog */}
      <AddTaskDialog
        projectId={projectId}
        open={showAddTask}
        onOpenChange={setShowAddTask}
        onSuccess={() => {
          refetchTasks();
          setShowAddTask(false);
        }}
      />

      {/* Edit Project Dialog */}
      {project && (
        <EditProjectDialog
          project={project}
          open={showEditProject}
          onOpenChange={setShowEditProject}
          onSuccess={() => {
            refetchProject();
            setShowEditProject(false);
          }}
        />
      )}
    </AppLayout>
  );
}

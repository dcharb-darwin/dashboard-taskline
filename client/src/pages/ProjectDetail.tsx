import { trpc } from "@/lib/trpc";
import { formatTemplateLabel } from "@/lib/template";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/AppLayout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Link, useParams, useLocation, useSearch } from "wouter";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BellRing,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Filter,
  History,
  MessageSquare,
  Pencil,
  Plus,
  Send,
} from "lucide-react";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { EditTaskDialog } from "@/components/EditTaskDialog";
import { AddTaskDialog } from "@/components/AddTaskDialog";
import { EditProjectDialog } from "@/components/EditProjectDialog";
import ProjectRisks from "@/components/ProjectRisks";
import ProjectTagChips from "@/components/ProjectTagChips";
import UnifiedActivityFeed from "@/components/UnifiedActivityFeed";
import { useViewMode } from "@/contexts/ViewModeContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { groupByPhase, getPhaseColor } from "@/lib/phase-utils";
import { useEnums, getBadgeClass } from "@/contexts/EnumContext";

type BulkStatus = string;
type BulkPriority = string;

type DependencyIssue = {
  type: "missing_dependency" | "date_conflict" | "cycle";
  taskId: string;
  dependencyTaskId?: string;
  message: string;
};

type CollaborationComment = {
  id: number;
  projectId: number;
  taskId: number | null;
  authorName: string;
  content: string;
  mentions: string[];
  createdAt: Date | string;
  updatedAt: Date | string;
};

type CollaborationActivity = {
  id: number;
  projectId: number;
  taskId: number | null;
  actorName: string;
  eventType:
  | "comment_added"
  | "task_status_changed"
  | "task_assignment_changed"
  | "due_soon"
  | "overdue";
  summary: string;
  metadata: string | null;
  createdAt: Date | string;
};

type NotificationEventView = {
  id: number;
  projectId: number;
  taskId: number | null;
  eventType: "overdue" | "due_soon" | "assignment_changed" | "status_changed";
  title: string;
  message: string;
  channels: string[];
  createdAt: Date | string;
  metadata: string | null;
};



const formatCurrency = (value: number | null | undefined) =>
  value === null || value === undefined
    ? "Not set"
    : `$${(value / 100).toLocaleString()}`;

export default function ProjectDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const projectId = parseInt(params.id || "0", 10);
  const enums = useEnums();
  const { isMvp } = useViewMode();

  const [editingTask, setEditingTask] = useState<any>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterOwner, setFilterOwner] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("dueDate");
  const [taskGroupBy, setTaskGroupBy] = useState<"status" | "phase">("status");
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set());
  const highlightedTaskId = useMemo(() => {
    if (!search) return null;
    const searchParams = new URLSearchParams(search);
    const taskParam = searchParams.get("task");
    if (!taskParam) return null;
    const parsed = Number.parseInt(taskParam, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [search]);

  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkPatch, setBulkPatch] = useState({
    owner: "",
    status: "unchanged" as BulkStatus,
    priority: "unchanged" as BulkPriority,
    phase: "",
    startDate: "",
    dueDate: "",
    completionPercent: "",
    actualBudget: "",
    dateShiftDays: "",
    clearOwner: false,
    clearDates: false,
    enforceDependencyReadiness: true,
  });
  const [dependencyWarnings, setDependencyWarnings] = useState<DependencyIssue[]>([]);


  const { data: project, isLoading: projectLoading, refetch: refetchProject } =
    trpc.projects.getById.useQuery({ id: projectId });
  const { data: tasks, isLoading: tasksLoading, refetch: refetchTasks } =
    trpc.tasks.listByProject.useQuery({ projectId });
  const {
    data: notificationFeed,
    refetch: refetchNotificationFeed,
  } = trpc.collaboration.notifications.list.useQuery({
    projectId,
    limit: 100,
  });


  const deleteProject = trpc.projects.delete.useMutation({
    onSuccess: () => {
      setLocation("/projects");
    },
  });

  const generateDueAlerts =
    trpc.collaboration.notifications.generateDueAlerts.useMutation({
      onSuccess: async (result) => {
        if (result.generatedCount === 0) {
          toast.message("No new due-date alerts generated");
        } else {
          toast.success(`Generated ${result.generatedCount} alert(s)`);
        }
        await refetchNotificationFeed();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const bulkUpdateTasks = trpc.tasks.bulkUpdate.useMutation({
    onSuccess: async (result) => {
      toast.success(`Updated ${result.updatedCount} task(s)`);
      setDependencyWarnings(result.dependencyWarnings as DependencyIssue[]);
      await Promise.all([
        refetchTasks(),
        refetchNotificationFeed(),
      ]);
      setSelectedTaskIds([]);
      setShowBulkDialog(false);
      setBulkPatch({
        owner: "",
        status: "unchanged",
        priority: "unchanged",
        phase: "",
        startDate: "",
        dueDate: "",
        completionPercent: "",
        actualBudget: "",
        dateShiftDays: "",
        clearOwner: false,
        clearDates: false,
        enforceDependencyReadiness: true,
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const dependencyCheck = trpc.tasks.validateDependencies.useQuery(
    { projectId },
    {
      enabled: false,
    }
  );

  const exportToExcel = trpc.export.projectToExcel.useMutation({
    onSuccess: (data) => {
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

  useEffect(() => {
    if (!tasks || tasks.length === 0) {
      setSelectedTaskIds([]);
      return;
    }

    const availableIds = new Set(tasks.map((task) => task.id));
    setSelectedTaskIds((prev) => prev.filter((taskId) => availableIds.has(taskId)));
  }, [tasks]);



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

  let filteredTasks = tasks || [];
  if (filterStatus !== "all") {
    filteredTasks = filteredTasks.filter((task) => task.status === filterStatus);
  }
  if (filterPriority !== "all") {
    filteredTasks = filteredTasks.filter((task) => task.priority === filterPriority);
  }
  if (filterOwner !== "all") {
    filteredTasks = filteredTasks.filter((task) => task.owner === filterOwner);
  }

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === "dueDate") {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (sortBy === "priority") {
      const priorityOrder = { High: 1, Medium: 2, Low: 3 };
      return (
        (priorityOrder[a.priority as keyof typeof priorityOrder] || 4) -
        (priorityOrder[b.priority as keyof typeof priorityOrder] || 4)
      );
    }
    if (sortBy === "status") {
      return a.status.localeCompare(b.status);
    }
    return 0;
  });

  const tasksByStatus: Record<string, typeof sortedTasks> = {};
  for (const opt of enums.taskStatus) {
    tasksByStatus[opt.label] = sortedTasks.filter((task) => task.status === opt.label);
  }

  const uniqueOwners = Array.from(
    new Set(tasks?.map((task) => task.owner).filter(Boolean) || [])
  );

  const completionRate =
    tasks && tasks.length > 0
      ? Math.round((tasksByStatus.Complete.length / tasks.length) * 100)
      : 0;

  const visibleTaskIds = sortedTasks.map((task) => task.id);
  const allVisibleSelected =
    visibleTaskIds.length > 0 &&
    visibleTaskIds.every((taskId) => selectedTaskIds.includes(taskId));

  const plannedTaskBudget = (tasks || []).reduce((sum, task) => sum + (task.budget || 0), 0);
  const actualTaskBudget = (tasks || []).reduce(
    (sum, task) => sum + (task.actualBudget || 0),
    0
  );

  const plannedBudget = project.budget ?? plannedTaskBudget;
  const actualBudget = project.actualBudget ?? actualTaskBudget;
  const budgetVariance =
    plannedBudget !== null && actualBudget !== null ? actualBudget - plannedBudget : null;

  const toggleTaskSelection = (taskId: number) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  const toggleSelectVisibleTasks = () => {
    if (allVisibleSelected) {
      setSelectedTaskIds((prev) => prev.filter((id) => !visibleTaskIds.includes(id)));
      return;
    }

    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      for (const taskId of visibleTaskIds) {
        next.add(taskId);
      }
      return Array.from(next);
    });
  };

  const runDependencyValidation = async () => {
    const result = await dependencyCheck.refetch();
    const issues = (result.data ?? []) as DependencyIssue[];
    setDependencyWarnings(issues);
    if (issues.length === 0) {
      toast.success("No dependency issues found");
    } else {
      toast.warning(`Found ${issues.length} dependency issue(s)`);
    }
  };

  const runBulkUpdate = () => {
    if (selectedTaskIds.length === 0) {
      toast.error("Select at least one task");
      return;
    }

    const patch: Record<string, unknown> = {};
    if (bulkPatch.owner.trim()) patch.owner = bulkPatch.owner.trim();
    if (bulkPatch.status !== "unchanged") patch.status = bulkPatch.status;
    if (bulkPatch.priority !== "unchanged") patch.priority = bulkPatch.priority;
    if (bulkPatch.phase.trim()) patch.phase = bulkPatch.phase.trim();
    if (!bulkPatch.clearDates && bulkPatch.startDate) {
      patch.startDate = new Date(bulkPatch.startDate);
    }
    if (!bulkPatch.clearDates && bulkPatch.dueDate) {
      patch.dueDate = new Date(bulkPatch.dueDate);
    }
    if (bulkPatch.completionPercent !== "") {
      patch.completionPercent = Math.max(
        0,
        Math.min(100, Number.parseInt(bulkPatch.completionPercent, 10) || 0)
      );
    }
    if (bulkPatch.actualBudget !== "") {
      patch.actualBudget = Math.round(
        (Number.parseFloat(bulkPatch.actualBudget) || 0) * 100
      );
    }
    if (bulkPatch.dateShiftDays !== "") {
      const shift = Number.parseInt(bulkPatch.dateShiftDays, 10) || 0;
      if (shift !== 0) {
        patch.dateShiftDays = shift;
      }
    }
    if (bulkPatch.clearOwner) patch.clearOwner = true;
    if (bulkPatch.clearDates) patch.clearDates = true;

    if (Object.keys(patch).length === 0) {
      toast.error("Provide at least one bulk update value");
      return;
    }

    patch.enforceDependencyReadiness = bulkPatch.enforceDependencyReadiness;

    bulkUpdateTasks.mutate({
      projectId,
      taskIds: selectedTaskIds,
      patch: patch as any,
    });
  };



  return (
    <AppLayout>
      <div className="space-y-6">
        <Link href="/projects">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tight">{project.name}</h2>
              <span
                className={`rounded-full px-3 py-1 text-sm font-medium ${getBadgeClass(enums.projectStatus, project.status)}`}
              >
                {project.status}
              </span>
            </div>
            <p className="text-muted-foreground">{project.description || "No description"}</p>
            {!isMvp && <ProjectTagChips projectId={projectId} />}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowEditProject(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Project
            </Button>
            {!isMvp && (
              <Button
                variant="outline"
                onClick={() => exportToExcel.mutate({ projectId })}
                disabled={exportToExcel.isPending}
              >
                {exportToExcel.isPending ? "Exporting..." : "Export to Excel"}
              </Button>
            )}
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
                  {project.startDate
                    ? format(new Date(project.startDate), "MMM d, yyyy")
                    : "Not set"}
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
                <dt className="text-sm font-medium text-muted-foreground">Planned Budget</dt>
                <dd className="mt-1 text-sm">{formatCurrency(plannedBudget)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Actual Spend</dt>
                <dd className="mt-1 text-sm">{formatCurrency(actualBudget)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Budget Variance</dt>
                <dd
                  className={`mt-1 text-sm ${budgetVariance !== null && budgetVariance > 0
                    ? "text-red-600"
                    : "text-emerald-700"
                    }`}
                >
                  {budgetVariance === null
                    ? "Not available"
                    : `${budgetVariance >= 0 ? "+" : ""}${formatCurrency(budgetVariance)}`}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Completion Rate</dt>
                <dd className="mt-1 text-sm">{completionRate}%</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {!isMvp && <ProjectRisks projectId={projectId} />}

        <Card className="bg-white">
          <CardHeader>
            <div className="mb-4 flex items-center justify-between">
              <CardTitle>Tasks ({sortedTasks.length} of {tasks?.length || 0})</CardTitle>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={runDependencyValidation}>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Validate Dependencies
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={toggleSelectVisibleTasks}
                  disabled={visibleTaskIds.length === 0}
                >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  {allVisibleSelected ? "Clear Visible" : "Select Visible"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowBulkDialog(true)}
                  disabled={selectedTaskIds.length === 0}
                >
                  Bulk Edit ({selectedTaskIds.length})
                </Button>
                <Button size="sm" onClick={() => setShowAddTask(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Task
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
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
                  {enums.taskStatus.map((opt) => (
                    <SelectItem key={opt.label} value={opt.label}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  {enums.taskPriority.map((opt) => (
                    <SelectItem key={opt.label} value={opt.label}>{opt.label}</SelectItem>
                  ))}
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

              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Group by:</span>
                <Select value={taskGroupBy} onValueChange={(v) => setTaskGroupBy(v as "status" | "phase")}>
                  <SelectTrigger className="w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="phase">Phase</SelectItem>
                  </SelectContent>
                </Select>
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
            {dependencyWarnings.length > 0 ? (
              <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 p-3">
                <p className="mb-2 text-sm font-medium text-amber-800">
                  Dependency warnings ({dependencyWarnings.length})
                </p>
                <ul className="space-y-1 text-sm text-amber-700">
                  {dependencyWarnings.map((issue, index) => (
                    <li key={`${issue.taskId}-${issue.type}-${index}`}>{issue.message}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {tasksLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, idx) => (
                  <div key={idx} className="h-16 animate-pulse rounded bg-slate-100"></div>
                ))}
              </div>
            ) : tasks && tasks.length > 0 ? (
              taskGroupBy === "phase" ? (
                /* ── Phase grouping ──────────────────────────────────── */
                <div className="space-y-4">
                  {groupByPhase(
                    sortedTasks,
                    (t) => t.phase,
                    (t) => t.completionPercent ?? 0,
                    (t) => t.startDate ? new Date(t.startDate) : null,
                    (t) => t.dueDate ? new Date(t.dueDate) : null,
                  ).map((phaseGroup, phaseIdx) => {
                    const isCollapsed = collapsedPhases.has(phaseGroup.name);
                    const colors = getPhaseColor(phaseIdx);
                    return (
                      <div key={phaseGroup.name} className="rounded-lg border">
                        <button
                          onClick={() => {
                            setCollapsedPhases((prev) => {
                              const next = new Set(prev);
                              if (next.has(phaseGroup.name)) next.delete(phaseGroup.name);
                              else next.add(phaseGroup.name);
                              return next;
                            });
                          }}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                        >
                          {isCollapsed
                            ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          <span
                            className="rounded px-2 py-0.5 text-xs font-semibold"
                            style={{ backgroundColor: colors.bg, color: colors.bar }}
                          >
                            {phaseGroup.name}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {phaseGroup.tasks.length} task{phaseGroup.tasks.length !== 1 ? "s" : ""}
                          </span>
                          <div className="ml-auto flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${phaseGroup.progress}%`, backgroundColor: colors.bar }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{phaseGroup.progress}%</span>
                          </div>
                        </button>
                        {!isCollapsed && (
                          <div className="space-y-2 border-t px-3 py-2">
                            {phaseGroup.tasks.map((task) => (
                              <div
                                key={task.id}
                                id={`task-row-${task.id}`}
                                className={`flex cursor-pointer items-start justify-between rounded-lg border p-3 transition-colors hover:bg-slate-50 ${highlightedTaskId === task.id
                                  ? "ring-2 ring-blue-500 ring-offset-1 bg-blue-50/40"
                                  : ""
                                  }`}
                                onClick={(e) => {
                                  if ((e.target as HTMLElement).closest('input[type="checkbox"], button')) return;
                                  setEditingTask(task);
                                }}
                              >
                                <div className="flex flex-1 gap-3">
                                  <input
                                    type="checkbox"
                                    className="mt-1 h-4 w-4"
                                    checked={selectedTaskIds.includes(task.id)}
                                    onChange={() => toggleTaskSelection(task.id)}
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-mono text-muted-foreground">
                                        {task.taskId}
                                      </span>
                                      <p className="font-medium">{task.taskDescription}</p>
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getBadgeClass(enums.taskStatus, task.status)}`}>{task.status}</span>
                                      {task.owner ? <span>Owner: {task.owner}</span> : null}
                                      {task.dueDate ? (
                                        <span>
                                          Due {format(new Date(task.dueDate), "MMM d, yyyy")}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                                <div className="ml-4 flex items-center gap-2">
                                  <span
                                    className={`rounded-full px-2 py-1 text-xs font-medium ${task.priority === "High"
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
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* ── Status grouping (default) ──────────────────────── */
                <div className="space-y-6">
                  {Object.entries(tasksByStatus).map(([status, statusTasks]) =>
                    statusTasks.length > 0 ? (
                      <div key={status}>
                        <h4 className="mb-3 text-sm font-semibold text-muted-foreground">
                          {status} ({statusTasks.length})
                        </h4>
                        <div className="space-y-2">
                          {statusTasks.map((task) => (
                            <div
                              key={task.id}
                              id={`task-row-${task.id}`}
                              className={`flex cursor-pointer items-start justify-between rounded-lg border p-3 transition-colors hover:bg-slate-50 ${highlightedTaskId === task.id
                                ? "ring-2 ring-blue-500 ring-offset-1 bg-blue-50/40"
                                : ""
                                }`}
                              onClick={(e) => {
                                if ((e.target as HTMLElement).closest('input[type="checkbox"], button')) return;
                                setEditingTask(task);
                              }}
                            >
                              <div className="flex flex-1 gap-3">
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4"
                                  checked={selectedTaskIds.includes(task.id)}
                                  onChange={() => toggleTaskSelection(task.id)}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-muted-foreground">
                                      {task.taskId}
                                    </span>
                                    <p className="font-medium">{task.taskDescription}</p>
                                  </div>
                                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                    {task.phase ? (
                                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                                        {task.phase}
                                      </span>
                                    ) : null}
                                    {task.owner ? <span>Owner: {task.owner}</span> : null}
                                    {task.dueDate ? (
                                      <span>
                                        Due {format(new Date(task.dueDate), "MMM d, yyyy")}
                                      </span>
                                    ) : null}
                                    <span>
                                      Planned {formatCurrency(task.budget)} / Actual {formatCurrency(task.actualBudget)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="ml-4 flex items-center gap-2">
                                <span
                                  className={`rounded-full px-2 py-1 text-xs font-medium ${task.priority === "High"
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
              )
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <p>No tasks yet</p>
                <Button className="mt-4" variant="outline" onClick={() => setShowAddTask(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Task
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {!isMvp && (
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Project Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UnifiedActivityFeed
                projectId={projectId}
                tasks={(tasks || []).map((t) => ({ id: t.id, taskId: t.taskId, taskDescription: t.taskDescription }))}
              />
            </CardContent>
          </Card>
        )}

        {!isMvp && (
          <Card className="bg-white">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <BellRing className="h-4 w-4" />
                  Notifications and Alerts
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateDueAlerts.mutate({ projectId, scopeType: "team", scopeKey: "default" })}
                  disabled={generateDueAlerts.isPending}
                >
                  {generateDueAlerts.isPending ? "Scanning..." : "Generate Due Alerts"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-muted-foreground">
                Notification delivery channels and event preferences are managed in{" "}
                <Link href="/admin" className="font-medium text-blue-600 underline">Admin Settings → Notifications</Link>.
              </p>
              <div>
                <p className="mb-2 text-sm font-medium">Recent Notification Events</p>
                {(notificationFeed as NotificationEventView[] | undefined)?.length ? (
                  <div className="space-y-2">
                    {(notificationFeed as NotificationEventView[]).map((event) => (
                      <div key={event.id} className="rounded border p-3">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{event.title}</p>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(event.createdAt), "MMM d, h:mm a")}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{event.message}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Channels: {event.channels.join(", ") || "None"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No notification events yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Bulk Edit Tasks</DialogTitle>
            <DialogDescription>
              Update selected task fields in one operation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bulk-owner">Owner</Label>
                <Input
                  id="bulk-owner"
                  value={bulkPatch.owner}
                  onChange={(event) =>
                    setBulkPatch((prev) => ({ ...prev, owner: event.target.value }))
                  }
                  placeholder="Leave blank to keep"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulk-status">Status</Label>
                <Select
                  value={bulkPatch.status}
                  onValueChange={(value) =>
                    setBulkPatch((prev) => ({
                      ...prev,
                      status: value as BulkStatus,
                    }))
                  }
                >
                  <SelectTrigger id="bulk-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unchanged">Unchanged</SelectItem>
                    {enums.taskStatus.map((opt) => (
                      <SelectItem key={opt.label} value={opt.label}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bulk-priority">Priority</Label>
                <Select
                  value={bulkPatch.priority}
                  onValueChange={(value) =>
                    setBulkPatch((prev) => ({
                      ...prev,
                      priority: value as BulkPriority,
                    }))
                  }
                >
                  <SelectTrigger id="bulk-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unchanged">Unchanged</SelectItem>
                    {enums.taskPriority.map((opt) => (
                      <SelectItem key={opt.label} value={opt.label}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulk-phase">Phase</Label>
                <Input
                  id="bulk-phase"
                  value={bulkPatch.phase}
                  onChange={(event) =>
                    setBulkPatch((prev) => ({ ...prev, phase: event.target.value }))
                  }
                  placeholder="Leave blank to keep"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulk-completion">Completion %</Label>
                <Input
                  id="bulk-completion"
                  type="number"
                  min={0}
                  max={100}
                  value={bulkPatch.completionPercent}
                  onChange={(event) =>
                    setBulkPatch((prev) => ({
                      ...prev,
                      completionPercent: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bulk-start-date">Start Date</Label>
                <Input
                  id="bulk-start-date"
                  type="date"
                  disabled={bulkPatch.clearDates}
                  value={bulkPatch.startDate}
                  onChange={(event) =>
                    setBulkPatch((prev) => ({ ...prev, startDate: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulk-due-date">Due Date</Label>
                <Input
                  id="bulk-due-date"
                  type="date"
                  disabled={bulkPatch.clearDates}
                  value={bulkPatch.dueDate}
                  onChange={(event) =>
                    setBulkPatch((prev) => ({ ...prev, dueDate: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulk-shift-days">Shift Dates (days)</Label>
                <Input
                  id="bulk-shift-days"
                  type="number"
                  step="1"
                  value={bulkPatch.dateShiftDays}
                  onChange={(event) =>
                    setBulkPatch((prev) => ({
                      ...prev,
                      dateShiftDays: event.target.value,
                    }))
                  }
                  placeholder="e.g. 3 or -2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulk-actual-budget">Actual ($)</Label>
                <Input
                  id="bulk-actual-budget"
                  type="number"
                  step="0.01"
                  value={bulkPatch.actualBudget}
                  onChange={(event) =>
                    setBulkPatch((prev) => ({
                      ...prev,
                      actualBudget: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <label className="flex items-center justify-between gap-3 rounded border p-2 text-sm">
                Clear owner
                <Switch
                  checked={bulkPatch.clearOwner}
                  onCheckedChange={(checked) =>
                    setBulkPatch((prev) => ({ ...prev, clearOwner: checked }))
                  }
                />
              </label>
              <label className="flex items-center justify-between gap-3 rounded border p-2 text-sm">
                Clear dates
                <Switch
                  checked={bulkPatch.clearDates}
                  onCheckedChange={(checked) =>
                    setBulkPatch((prev) => ({ ...prev, clearDates: checked }))
                  }
                />
              </label>
              <label className="flex items-center justify-between gap-3 rounded border p-2 text-sm">
                Enforce dependency readiness
                <Switch
                  checked={bulkPatch.enforceDependencyReadiness}
                  onCheckedChange={(checked) =>
                    setBulkPatch((prev) => ({
                      ...prev,
                      enforceDependencyReadiness: checked,
                    }))
                  }
                />
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={runBulkUpdate}
              disabled={bulkUpdateTasks.isPending}
            >
              {bulkUpdateTasks.isPending ? "Applying..." : `Apply to ${selectedTaskIds.length} Task(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingTask ? (
        <EditTaskDialog
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
          onSuccess={async () => {
            await Promise.all([
              refetchTasks(),
              refetchNotificationFeed(),
            ]);
            setEditingTask(null);
          }}
        />
      ) : null}

      <AddTaskDialog
        projectId={projectId}
        open={showAddTask}
        onOpenChange={setShowAddTask}
        onSuccess={async () => {
          await refetchTasks();
          setShowAddTask(false);
        }}
      />

      <EditProjectDialog
        project={project as any}
        open={showEditProject}
        onOpenChange={setShowEditProject}
        onSuccess={() => {
          refetchProject();
          setShowEditProject(false);
        }}
      />
    </AppLayout>
  );
}

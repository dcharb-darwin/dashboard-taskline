import { trpc } from "@/lib/trpc";
import { normalizeTemplateKey, parseTemplateTasks, type TemplateTask } from "@/lib/template";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "wouter";
import {
  FileText,
  FolderKanban,
  Plus,
  Megaphone,
  Calendar,
  Presentation,
  ClipboardList,
  Share2,
  Search,
  ImageIcon,
  Video,
  Bell,
  DollarSign,
  PenTool,
  FolderOpen,
  Pencil,
  Save,
  Trash2,
  Download,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import DependencyPicker from "@/components/DependencyPicker";
import { ViewToggle } from "@/components/ViewToggle";
import { useViewMode } from "@/hooks/useViewMode";

type EditableTemplateTask = {
  taskId: string;
  taskDescription: string;
  phase: string;
  priority: "High" | "Medium" | "Low";
  owner: string;
  dependency: string;
  durationDays: string;
  approvalRequired: "Yes" | "No";
  deliverableType: string;
  notes: string;
};

const emptyTaskDraft = (index: number): EditableTemplateTask => ({
  taskId: `T${String(index + 1).padStart(3, "0")}`,
  taskDescription: "",
  phase: "",
  priority: "Medium",
  owner: "",
  dependency: "",
  durationDays: "",
  approvalRequired: "No",
  deliverableType: "",
  notes: "",
});

const toEditableTask = (task: TemplateTask, index: number): EditableTemplateTask => ({
  taskId: task.taskId?.trim() || `T${String(index + 1).padStart(3, "0")}`,
  taskDescription: (task.taskDescription || task.description || "").trim(),
  phase: task.phase?.trim() || "",
  priority: task.priority === "High" || task.priority === "Low" ? task.priority : "Medium",
  owner: task.owner?.trim() || "",
  dependency: task.dependency?.trim() || "",
  durationDays:
    task.durationDays === undefined || task.durationDays === null ? "" : String(task.durationDays),
  approvalRequired: task.approvalRequired === "Yes" ? "Yes" : "No",
  deliverableType: task.deliverableType?.trim() || "",
  notes: task.notes?.trim() || "",
});

const toPersistedTask = (task: EditableTemplateTask, index: number) => ({
  taskId: task.taskId.trim() || `T${String(index + 1).padStart(3, "0")}`,
  taskDescription: task.taskDescription.trim(),
  phase: task.phase.trim() || undefined,
  priority: task.priority,
  owner: task.owner.trim() || undefined,
  dependency: task.dependency.trim() || undefined,
  durationDays:
    task.durationDays.trim().length > 0
      ? Math.max(0, Number.parseInt(task.durationDays.trim(), 10) || 0)
      : undefined,
  approvalRequired: task.approvalRequired,
  deliverableType: task.deliverableType.trim() || undefined,
  notes: task.notes.trim() || undefined,
});

export default function Templates() {
  const { data: templates, isLoading } = trpc.templates.list.useQuery();
  const utils = trpc.useUtils();
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [draftTasks, setDraftTasks] = useState<EditableTemplateTask[]>([]);
  const [taskEditorOpen, setTaskEditorOpen] = useState(false);
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
  const [taskDraft, setTaskDraft] = useState<EditableTemplateTask>(emptyTaskDraft(0));

  const updateTemplateTasks = trpc.templates.update.useMutation();
  const exportTemplateMutation = trpc.templateTransfer.export.useMutation();
  const importTemplateMutation = trpc.templateTransfer.import.useMutation();
  const [viewMode, setViewMode] = useViewMode("templates");

  const templateIcons: Record<string, React.ElementType> = {
    marketing_campaign: Megaphone,
    event_plan: Calendar,
    presentation: Presentation,
    survey: ClipboardList,
    press_release: FileText,
    social_media_campaign: Share2,
    planning_study: Search,
    poster: ImageIcon,
    video_project: Video,
    public_notice: Bell,
    media_buy: DollarSign,
    op_ed: PenTool,
    other_custom: FolderOpen,
    generic_project: FolderKanban,
  };

  const sourceTemplateTasks = useMemo(
    () => parseTemplateTasks(selectedTemplate?.sampleTasks).map((task, index) => toEditableTask(task, index)),
    [selectedTemplate?.id, selectedTemplate?.sampleTasks]
  );

  const hasTaskChanges = useMemo(
    () => JSON.stringify(draftTasks) !== JSON.stringify(sourceTemplateTasks),
    [draftTasks, sourceTemplateTasks]
  );

  const selectedIconKey = selectedTemplate
    ? normalizeTemplateKey(selectedTemplate.templateKey || selectedTemplate.name)
    : "";
  const SelectedTemplateIcon = templateIcons[selectedIconKey] || FolderKanban;

  useEffect(() => {
    setDraftTasks(sourceTemplateTasks);
  }, [sourceTemplateTasks]);

  useEffect(() => {
    if (!taskEditorOpen) {
      setEditingTaskIndex(null);
      setTaskDraft(emptyTaskDraft(draftTasks.length));
    }
  }, [taskEditorOpen, draftTasks.length]);

  const openNewTaskEditor = () => {
    setEditingTaskIndex(null);
    setTaskDraft(emptyTaskDraft(draftTasks.length));
    setTaskEditorOpen(true);
  };

  const openEditTaskEditor = (task: EditableTemplateTask, index: number) => {
    setEditingTaskIndex(index);
    setTaskDraft(task);
    setTaskEditorOpen(true);
  };

  const saveTaskDraft = () => {
    if (!taskDraft.taskDescription.trim()) {
      toast.error("Task description is required");
      return;
    }

    const normalizedTask = {
      ...taskDraft,
      taskId: taskDraft.taskId.trim() || `T${String(draftTasks.length + 1).padStart(3, "0")}`,
      taskDescription: taskDraft.taskDescription.trim(),
    } satisfies EditableTemplateTask;

    setDraftTasks((previous) => {
      if (editingTaskIndex === null) {
        return [...previous, normalizedTask];
      }
      return previous.map((task, index) => (index === editingTaskIndex ? normalizedTask : task));
    });

    setTaskEditorOpen(false);
  };

  const removeDraftTask = (indexToRemove: number) => {
    setDraftTasks((previous) => previous.filter((_, index) => index !== indexToRemove));
  };

  const saveTemplateTaskLibrary = async () => {
    if (!selectedTemplate) return;

    const persistedTasks = draftTasks
      .map((task, index) => toPersistedTask(task, index))
      .filter((task) => task.taskDescription.length > 0);

    if (persistedTasks.length === 0) {
      toast.error("Template must include at least one task");
      return;
    }

    const normalizedTaskIds = persistedTasks.map((task) => task.taskId.toUpperCase());
    const duplicateTaskIds = Array.from(
      new Set(
        normalizedTaskIds.filter((taskId, index) => normalizedTaskIds.indexOf(taskId) !== index)
      )
    );
    if (duplicateTaskIds.length > 0) {
      toast.error(`Duplicate task IDs are not allowed: ${duplicateTaskIds.join(", ")}`);
      return;
    }

    const taskIdSet = new Set(normalizedTaskIds);
    const invalidDependencies: string[] = [];
    for (const task of persistedTasks) {
      if (!task.dependency) continue;
      const dependencies = task.dependency
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => value.toUpperCase());

      for (const dependencyId of dependencies) {
        if (dependencyId === task.taskId.toUpperCase()) {
          toast.error(`Task ${task.taskId} cannot depend on itself`);
          return;
        }
        if (!taskIdSet.has(dependencyId)) {
          invalidDependencies.push(`${task.taskId} -> ${dependencyId}`);
        }
      }
    }
    if (invalidDependencies.length > 0) {
      toast.error(`Unknown dependencies: ${invalidDependencies.slice(0, 5).join(", ")}`);
      return;
    }

    try {
      await updateTemplateTasks.mutateAsync({
        id: selectedTemplate.id,
        data: {
          sampleTasks: persistedTasks,
        },
      });
    } catch (error: any) {
      toast.error(`Failed to save template tasks: ${error?.message || "Unknown error"}`);
      return;
    }

    const updatedSampleTasks = JSON.stringify(persistedTasks);
    setSelectedTemplate((previous: any) =>
      previous
        ? {
          ...previous,
          sampleTasks: updatedSampleTasks,
        }
        : previous
    );

    await utils.templates.list.invalidate();
    toast.success("Template task library saved");
  };

  const handleExport = async (templateId: number) => {
    try {
      const payload = await exportTemplateMutation.mutateAsync({ templateId });
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${payload.template.name.replace(/[^a-z0-9]/gi, "_")}_template.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Template exported");
    } catch (e: any) {
      toast.error(e.message || "Export failed");
    }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const payload = JSON.parse(text);
        if (payload.version !== 1 || !payload.template) {
          toast.error("Invalid template file format");
          return;
        }
        const result = await importTemplateMutation.mutateAsync({ payload });
        await utils.templates.list.invalidate();
        toast.success(`Imported: ${result.name}`);
      } catch (e: any) {
        toast.error(e.message || "Import failed");
      }
    };
    input.click();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Project Templates</h2>
            <p className="mt-2 text-muted-foreground">
              Browse, customize, and launch projects from standardized templates
            </p>
          </div>
          <Button variant="outline" onClick={handleImport} disabled={importTemplateMutation.isPending}>
            <Upload className="mr-2 h-4 w-4" />
            {importTemplateMutation.isPending ? "Importing..." : "Import Template"}
          </Button>
          <ViewToggle mode={viewMode} onModeChange={setViewMode} />
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(14)].map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-lg bg-white"></div>
            ))}
          </div>
        ) : (
          viewMode === "table" ? (
            <Card className="bg-white">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-left">
                        <th className="px-4 py-3 font-medium text-muted-foreground">Name</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground">Description</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground">Tasks</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {templates?.map((template) => {
                        const taskCount = parseTemplateTasks(template.sampleTasks).length;
                        return (
                          <tr
                            key={template.id}
                            className="cursor-pointer border-b transition-colors hover:bg-slate-50"
                            onClick={() => setSelectedTemplate(template)}
                          >
                            <td className="px-4 py-3 font-medium">{template.name}</td>
                            <td className="max-w-md truncate px-4 py-3 text-muted-foreground">
                              {template.description || "—"}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{taskCount}</td>
                            <td className="px-4 py-3">
                              <Button variant="outline" size="sm">View Details</Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates?.map((template) => {
                const iconKey = normalizeTemplateKey(template.templateKey || template.name);
                const Icon = templateIcons[iconKey] || FolderKanban;
                const taskCount = parseTemplateTasks(template.sampleTasks).length;

                return (
                  <Card
                    key={template.id}
                    className="cursor-pointer bg-white transition-shadow hover:shadow-lg"
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="mb-3 rounded-lg bg-blue-50 p-3">
                          <Icon className="h-8 w-8 text-blue-600" />
                        </div>
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="line-clamp-2">{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">{taskCount} template tasks</p>
                      <Button variant="outline" className="w-full" size="sm">
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )
        )}
      </div>

      <Dialog
        open={!!selectedTemplate}
        onOpenChange={(open) => {
          if (!open) setSelectedTemplate(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <SelectedTemplateIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-2xl">{selectedTemplate?.name}</DialogTitle>
                <DialogDescription>{selectedTemplate?.description}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <h4 className="mb-2 font-semibold">About This Template</h4>
              <p className="text-sm text-muted-foreground">
                This template includes pre-defined phases and task defaults based on proven workflows.
                Update the task library below to permanently change what gets created for new projects.
              </p>
            </div>

            <Card className="bg-slate-50">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">Template Task Library</CardTitle>
                    <CardDescription>
                      Add, edit, or remove tasks. Changes are persisted to this template.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={openNewTaskEditor}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Task
                    </Button>
                    <Button
                      onClick={saveTemplateTaskLibrary}
                      disabled={!hasTaskChanges || updateTemplateTasks.isPending}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {updateTemplateTasks.isPending ? "Saving..." : "Save Template Tasks"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {draftTasks.length === 0 ? (
                  <div className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-muted-foreground">
                    No tasks in this template yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {draftTasks.map((task, index) => (
                      <div
                        key={`${task.taskId}-${index}`}
                        className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-white p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium">
                              {task.taskId}
                            </span>
                            <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                              {task.phase || "No Phase"}
                            </span>
                            <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                              {task.priority}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-medium">{task.taskDescription}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {task.owner || "Unassigned"}
                            {task.dependency ? ` • depends on ${task.dependency}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditTaskEditor(task, index)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => removeDraftTask(index)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-3 pt-2">
              {selectedTemplate ? (
                <>
                  <Link href={`/projects/new?templateId=${selectedTemplate.id}`}>
                    <Button className="flex-1">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Project from Template
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => handleExport(selectedTemplate.id)}
                    disabled={exportTemplateMutation.isPending}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {exportTemplateMutation.isPending ? "Exporting..." : "Export JSON"}
                  </Button>
                </>
              ) : null}
              <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={taskEditorOpen} onOpenChange={setTaskEditorOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTaskIndex === null ? "Add Template Task" : "Edit Template Task"}</DialogTitle>
            <DialogDescription>
              Configure task defaults for every project created from this template.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taskId">Task ID</Label>
                <Input
                  id="taskId"
                  value={taskDraft.taskId}
                  onChange={(event) => setTaskDraft((previous) => ({ ...previous, taskId: event.target.value }))}
                  placeholder="T001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phase">Phase</Label>
                <Input
                  id="phase"
                  value={taskDraft.phase}
                  onChange={(event) => setTaskDraft((previous) => ({ ...previous, phase: event.target.value }))}
                  placeholder="Planning"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taskDescription">Task Description</Label>
              <Textarea
                id="taskDescription"
                value={taskDraft.taskDescription}
                onChange={(event) =>
                  setTaskDraft((previous) => ({ ...previous, taskDescription: event.target.value }))
                }
                rows={3}
                placeholder="Describe the task"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={taskDraft.priority}
                  onValueChange={(value: "High" | "Medium" | "Low") =>
                    setTaskDraft((previous) => ({ ...previous, priority: value }))
                  }
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="approvalRequired">Approval Required</Label>
                <Select
                  value={taskDraft.approvalRequired}
                  onValueChange={(value: "Yes" | "No") =>
                    setTaskDraft((previous) => ({ ...previous, approvalRequired: value }))
                  }
                >
                  <SelectTrigger id="approvalRequired">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="No">No</SelectItem>
                    <SelectItem value="Yes">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="owner">Owner</Label>
                <Input
                  id="owner"
                  value={taskDraft.owner}
                  onChange={(event) => setTaskDraft((previous) => ({ ...previous, owner: event.target.value }))}
                  placeholder="Team / person"
                />
              </div>
              <div className="space-y-2">
                <Label>Dependencies</Label>
                <DependencyPicker
                  currentTaskId={taskDraft.taskId}
                  value={taskDraft.dependency}
                  onChange={(val) => setTaskDraft((previous) => ({ ...previous, dependency: val }))}
                  templateTasks={draftTasks.map((t) => ({
                    taskId: t.taskId,
                    taskDescription: t.taskDescription,
                  }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="durationDays">Duration (Days)</Label>
                <Input
                  id="durationDays"
                  type="number"
                  min={0}
                  value={taskDraft.durationDays}
                  onChange={(event) =>
                    setTaskDraft((previous) => ({ ...previous, durationDays: event.target.value }))
                  }
                  placeholder="3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliverableType">Deliverable</Label>
                <Input
                  id="deliverableType"
                  value={taskDraft.deliverableType}
                  onChange={(event) =>
                    setTaskDraft((previous) => ({ ...previous, deliverableType: event.target.value }))
                  }
                  placeholder="Brief, asset, deck..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={taskDraft.notes}
                onChange={(event) => setTaskDraft((previous) => ({ ...previous, notes: event.target.value }))}
                rows={3}
                placeholder="Optional implementation notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTaskEditorOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveTaskDraft}>
              Save Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

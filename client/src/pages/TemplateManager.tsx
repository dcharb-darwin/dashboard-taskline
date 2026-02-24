import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { parseTemplateTasks } from "@/lib/template";
import { trpc } from "@/lib/trpc";
import { Archive, CopyPlus, FileUp, Plus, Rocket, SquarePen } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

type TemplateRecord = {
  id: number;
  name: string;
  templateKey: string;
  templateGroupKey: string;
  version: number;
  status: "Draft" | "Published" | "Archived";
  description: string | null;
  phases: string;
  sampleTasks: string;
  uploadSource: string;
  createdAt: Date;
  updatedAt: Date;
};

type FormState = {
  name: string;
  templateKey: string;
  description: string;
  status: "Draft" | "Published" | "Archived";
  phasesCsv: string;
  tasksJson: string;
};

const defaultTasks = [
  {
    taskId: "T001",
    taskDescription: "Define scope and outcome",
    phase: "Planning",
    priority: "Medium",
  },
];

const initialFormState = (): FormState => ({
  name: "",
  templateKey: "",
  description: "",
  status: "Draft",
  phasesCsv: "Planning, Execution, Completion",
  tasksJson: JSON.stringify(defaultTasks, null, 2),
});

const slugifyTemplateKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const parsePhases = (value: string) =>
  value
    .split(",")
    .map((phase) => phase.trim())
    .filter(Boolean);

const safeParsePhases = (value: string) => {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((phase) => String(phase));
  } catch {
    return [];
  }
};

export default function TemplateManager() {
  const [statusFilter, setStatusFilter] = useState<"All" | "Draft" | "Published" | "Archived">(
    "All"
  );
  const [formOpen, setFormOpen] = useState(false);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [editingTemplate, setEditingTemplate] = useState<TemplateRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: templates, isLoading } = trpc.templates.listManage.useQuery({
    status: statusFilter,
    includeArchived: true,
  });

  const createTemplate = trpc.templates.create.useMutation({
    onSuccess: async () => {
      toast.success("Template created");
      await utils.templates.list.invalidate();
      await utils.templates.listManage.invalidate();
      setFormOpen(false);
      setFormState(initialFormState());
    },
    onError: (error) => toast.error(error.message),
  });

  const updateTemplate = trpc.templates.update.useMutation({
    onSuccess: async () => {
      toast.success("Template updated");
      await utils.templates.list.invalidate();
      await utils.templates.listManage.invalidate();
      setFormOpen(false);
      setEditingTemplate(null);
      setFormState(initialFormState());
    },
    onError: (error) => toast.error(error.message),
  });

  const createVersion = trpc.templates.createVersion.useMutation({
    onSuccess: async () => {
      toast.success("Draft version created");
      await utils.templates.listManage.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const publishTemplate = trpc.templates.publish.useMutation({
    onSuccess: async () => {
      toast.success("Template published");
      await utils.templates.list.invalidate();
      await utils.templates.listManage.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const archiveTemplate = trpc.templates.archive.useMutation({
    onSuccess: async () => {
      toast.success("Template archived");
      await utils.templates.list.invalidate();
      await utils.templates.listManage.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const importJson = trpc.templates.importJson.useMutation({
    onSuccess: async (result) => {
      toast.success(`Imported ${result.createdCount} template(s)`);
      await utils.templates.list.invalidate();
      await utils.templates.listManage.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const templateRows = useMemo(
    () => ((templates as TemplateRecord[] | undefined) ?? []),
    [templates]
  );

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setFormState(initialFormState());
    setFormOpen(true);
  };

  const openEditDialog = (template: TemplateRecord) => {
    const phases = safeParsePhases(template.phases).join(", ");
    const tasks = parseTemplateTasks(template.sampleTasks);

    setEditingTemplate(template);
    setFormState({
      name: template.name,
      templateKey: template.templateKey,
      description: template.description ?? "",
      status: template.status,
      phasesCsv: phases,
      tasksJson: JSON.stringify(tasks, null, 2),
    });
    setFormOpen(true);
  };

  const handleSubmit = () => {
    const name = formState.name.trim();
    const templateKey = slugifyTemplateKey(formState.templateKey || formState.name);
    const phases = parsePhases(formState.phasesCsv);

    if (!name) {
      toast.error("Name is required");
      return;
    }
    if (!templateKey) {
      toast.error("Template key is required");
      return;
    }
    if (phases.length === 0) {
      toast.error("At least one phase is required");
      return;
    }

    let parsedTasks: unknown = [];
    try {
      parsedTasks = JSON.parse(formState.tasksJson);
    } catch {
      toast.error("Tasks JSON is invalid");
      return;
    }

    if (!Array.isArray(parsedTasks)) {
      toast.error("Tasks JSON must be an array");
      return;
    }

    const payload = {
      name,
      templateKey,
      templateGroupKey: editingTemplate?.templateGroupKey ?? templateKey,
      version: editingTemplate?.version,
      status: formState.status,
      description: formState.description,
      phases,
      sampleTasks: parsedTasks,
      uploadSource: editingTemplate ? editingTemplate.uploadSource : "manual",
    } as const;

    if (editingTemplate) {
      updateTemplate.mutate({
        id: editingTemplate.id,
        data: payload,
      });
      return;
    }

    createTemplate.mutate({
      ...payload,
      version: 1,
      status: formState.status,
    });
  };

  const onImportFile = async (file: File) => {
    const fileContent = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(fileContent);
    } catch {
      toast.error("Import file is not valid JSON");
      return;
    }

    const templatesToImport = Array.isArray(parsed)
      ? parsed
      : typeof parsed === "object" && parsed !== null && "templates" in parsed
      ? (parsed as { templates: unknown }).templates
      : null;

    if (!Array.isArray(templatesToImport) || templatesToImport.length === 0) {
      toast.error("Import must contain one or more templates");
      return;
    }

    importJson.mutate({
      templates: templatesToImport as any,
      publishImported: false,
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Template Manager</h2>
            <p className="mt-2 text-muted-foreground">
              Create, import, version, publish, and archive template types.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/templates">
              <Button variant="outline">Browse Templates</Button>
            </Link>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <FileUp className="mr-2 h-4 w-4" />
              Import JSON
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Button>
          </div>
        </div>

        <div className="flex max-w-xs items-center gap-2">
          <Label htmlFor="status-filter">Status</Label>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as "All" | "Draft" | "Published" | "Archived")
            }
          >
            <SelectTrigger id="status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Published">Published</SelectItem>
              <SelectItem value="Archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, idx) => (
              <div key={idx} className="h-44 animate-pulse rounded-lg bg-white" />
            ))}
          </div>
        ) : templateRows.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="py-10 text-center text-muted-foreground">
              No templates for this filter.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {templateRows.map((template) => {
              const tasks = parseTemplateTasks(template.sampleTasks);
              const phaseCount = safeParsePhases(template.phases).length;
              return (
                <Card key={template.id} className="bg-white">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {template.templateGroupKey} • v{template.version}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          template.status === "Published"
                            ? "bg-green-100 text-green-700"
                            : template.status === "Draft"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {template.status}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      <p>{template.description || "No description"}</p>
                      <p className="mt-1">
                        {phaseCount} phase(s) • {tasks.length} task(s)
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(template)}>
                        <SquarePen className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => createVersion.mutate({ sourceTemplateId: template.id })}
                      >
                        <CopyPlus className="mr-2 h-4 w-4" />
                        New Version
                      </Button>
                      {template.status !== "Published" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => publishTemplate.mutate({ id: template.id })}
                        >
                          <Rocket className="mr-2 h-4 w-4" />
                          Publish
                        </Button>
                      ) : null}
                      {template.status !== "Archived" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => archiveTemplate.mutate({ id: template.id })}
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Archive
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
            <DialogDescription>
              Manage template metadata, phases, and task payload.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-key">Template Key</Label>
                <Input
                  id="template-key"
                  value={formState.templateKey}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      templateKey: event.target.value,
                    }))
                  }
                  placeholder="marketing_campaign"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formState.description}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phases">Phases (comma-separated)</Label>
                <Input
                  id="phases"
                  value={formState.phasesCsv}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      phasesCsv: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formState.status}
                  onValueChange={(value) =>
                    setFormState((prev) => ({
                      ...prev,
                      status: value as FormState["status"],
                    }))
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Published">Published</SelectItem>
                    <SelectItem value="Archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tasks-json">Tasks JSON</Label>
              <Textarea
                id="tasks-json"
                value={formState.tasksJson}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    tasksJson: event.target.value,
                  }))
                }
                rows={14}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormOpen(false);
                setEditingTemplate(null);
                setFormState(initialFormState());
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={createTemplate.isPending || updateTemplate.isPending}
            >
              {editingTemplate ? "Save Template" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          await onImportFile(file);
          event.currentTarget.value = "";
        }}
      />
    </AppLayout>
  );
}

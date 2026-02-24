import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { normalizeTemplateKey, parseTemplateTasks } from "@/lib/template";
import { parseDateInputValue } from "@/lib/dateInput";
import { Link, useLocation, useSearch } from "wouter";
import { 
  ArrowLeft, FolderKanban, Check, ChevronDown, ChevronUp,
  Megaphone, Calendar, Presentation, ClipboardList, FileText, Share2,
  Search, ImageIcon, Video, Bell, DollarSign, PenTool, FolderOpen
} from "lucide-react";

// Icon mapping for each template type
const templateIcons: Record<string, React.ElementType> = {
  "marketing_campaign": Megaphone,
  "event_plan": Calendar,
  "presentation": Presentation,
  "survey": ClipboardList,
  "press_release": FileText,
  "social_media_campaign": Share2,
  "planning_study": Search,
  "poster": ImageIcon,
  "video_project": Video,
  "public_notice": Bell,
  "media_buy": DollarSign,
  "op_ed": PenTool,
  "other_custom": FolderOpen,
  "generic_project": FolderKanban,
};
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function CreateProject() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { data: templates } = trpc.templates.list.useQuery();
  const [showTaskPreview, setShowTaskPreview] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    templateId: "",
    templateType: "",
    projectManager: "",
    startDate: "",
    targetCompletionDate: "",
    budget: "",
    status: "Planning" as const,
  });

  const utils = trpc.useUtils();
  const createProject = trpc.projects.create.useMutation({
    onSuccess: async (data) => {
      await utils.projects.list.invalidate();
      toast.success("Project created successfully!");
      setLocation(`/projects/${data.id}`);
    },
    onError: (error) => {
      toast.error(`Failed to create project: ${error.message}`);
    },
  });

  const preselectedTemplateId = useMemo(() => {
    if (!search) return null;
    const searchParams = new URLSearchParams(search);
    const templateIdParam = searchParams.get("templateId");
    if (!templateIdParam) return null;
    const parsed = Number.parseInt(templateIdParam, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [search]);

  useEffect(() => {
    if (!templates || !preselectedTemplateId || formData.templateId) return;
    const preselectedTemplate = templates.find((template) => template.id === preselectedTemplateId);
    if (!preselectedTemplate) return;

    setFormData((previous) => ({
      ...previous,
      templateId: preselectedTemplate.id.toString(),
      templateType: preselectedTemplate.name,
    }));
    setShowTaskPreview(true);
  }, [templates, preselectedTemplateId, formData.templateId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const projectName = formData.name.trim();
    if (!projectName || !formData.templateId) {
      toast.error("Please fill in required fields");
      return;
    }

    const templateId = Number.parseInt(formData.templateId, 10);
    if (!Number.isFinite(templateId)) {
      toast.error("Please select a valid template");
      return;
    }

    const startDate = parseDateInputValue(formData.startDate);
    const targetCompletionDate = parseDateInputValue(formData.targetCompletionDate);
    if (formData.startDate && !startDate) {
      toast.error("Start date is invalid");
      return;
    }
    if (formData.targetCompletionDate && !targetCompletionDate) {
      toast.error("Target completion date is invalid");
      return;
    }
    if (
      startDate &&
      targetCompletionDate &&
      targetCompletionDate.getTime() < startDate.getTime()
    ) {
      toast.error("Target completion date cannot be earlier than start date");
      return;
    }

    const budgetRaw = formData.budget.trim();
    const parsedBudget = budgetRaw.length > 0 ? Number.parseFloat(budgetRaw) : undefined;
    if (budgetRaw.length > 0) {
      if (!Number.isFinite(parsedBudget) || (parsedBudget ?? -1) < 0) {
        toast.error("Budget must be a non-negative number");
        return;
      }
    }

    createProject.mutate({
      name: projectName,
      description: formData.description.trim() || undefined,
      templateId,
      templateType: formData.templateType,
      projectManager: formData.projectManager.trim() || undefined,
      startDate,
      targetCompletionDate,
      budget: parsedBudget === undefined ? undefined : Math.round(parsedBudget * 100),
      status: formData.status,
    });
  };

  const selectedTemplate = templates?.find((t) => t.id.toString() === formData.templateId);
  const selectedTemplateTasks = parseTemplateTasks(selectedTemplate?.sampleTasks);

  // Group tasks by phase
  const tasksByPhase = selectedTemplateTasks.reduce<Record<string, typeof selectedTemplateTasks>>((acc, task) => {
    const phase = task.phase || "Uncategorized";
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(task);
    return acc;
  }, {});

  return (
    <AppLayout contentClassName="max-w-6xl">
      <div className="space-y-6">
        <Link href="/projects">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
        </Link>

          {/* Page Header */}
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Create New Project</h2>
            <p className="text-muted-foreground mt-2">
              Select a template and fill in the project details
            </p>
          </div>

          {/* Step 1: Template Selection */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Step 1: Select a Template</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates?.map((template) => {
                const templateTasks = parseTemplateTasks(template.sampleTasks);
                const taskCount = templateTasks.length;
                const isSelected = formData.templateId === template.id.toString();
                const iconKey = normalizeTemplateKey(template.templateKey || template.name);
                
                return (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      isSelected ? "ring-2 ring-blue-600 bg-blue-50" : "bg-white hover:bg-slate-50"
                    }`}
                    onClick={() => {
                      setFormData({
                        ...formData,
                        templateType: template.name,
                        templateId: template.id.toString(),
                      });
                      setShowTaskPreview(true);
                    }}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2 rounded-lg ${
                            isSelected ? "bg-blue-600" : "bg-slate-100"
                          }`}>
                            {(() => {
                              const Icon = templateIcons[iconKey] || FolderKanban;
                              return <Icon className={`h-5 w-5 ${
                                isSelected ? "text-white" : "text-slate-600"
                              }`} />;
                            })()}
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            <CardDescription className="mt-1">
                              {taskCount} tasks • {template.description || "Standard project template"}
                            </CardDescription>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="flex-shrink-0 ml-2">
                            <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Task Preview (shown when template is selected) */}
          {formData.templateId && selectedTemplate && (
            <Collapsible open={showTaskPreview} onOpenChange={setShowTaskPreview}>
              <Card className="bg-white border-blue-200">
                <CardHeader>
                  <CollapsibleTrigger className="flex items-center justify-between w-full">
                    <div>
                      <CardTitle>Template Tasks Preview</CardTitle>
                      <CardDescription>
                        {selectedTemplateTasks.length} tasks will be created automatically
                      </CardDescription>
                    </div>
                    {showTaskPreview ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    {Object.entries(tasksByPhase).map(([phase, tasks]) => (
                      <div key={phase} className="space-y-2">
                        <h4 className="font-semibold text-sm text-blue-600">{phase}</h4>
                        <div className="space-y-1 pl-4">
                          {tasks.map((task, idx: number) => (
                            <div key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-xs mt-0.5">•</span>
                              <span>{task.taskDescription || task.description || "Untitled task"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Step 2: Project Details Form (only shown after template selection) */}
          {formData.templateId && (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Step 2: Project Details</h3>
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Project Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name">
                        Project Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="Enter project name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Enter project description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                      />
                    </div>

                    {/* Project Manager */}
                    <div className="space-y-2">
                      <Label htmlFor="projectManager">Project Manager</Label>
                      <Input
                        id="projectManager"
                        placeholder="Enter project manager name"
                        value={formData.projectManager}
                        onChange={(e) => setFormData({ ...formData, projectManager: e.target.value })}
                      />
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startDate">Start Date</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="targetCompletionDate">Target Completion Date</Label>
                        <Input
                          id="targetCompletionDate"
                          type="date"
                          value={formData.targetCompletionDate}
                          onChange={(e) => setFormData({ ...formData, targetCompletionDate: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Budget */}
                    <div className="space-y-2">
                      <Label htmlFor="budget">Budget ($)</Label>
                      <Input
                        id="budget"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.budget}
                        onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      />
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Planning">Planning</SelectItem>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="On Hold">On Hold</SelectItem>
                          <SelectItem value="Complete">Complete</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <Button type="submit" disabled={createProject.isPending} className="flex-1">
                        {createProject.isPending ? "Creating..." : "Create Project"}
                      </Button>
                      <Link href="/projects">
                        <Button type="button" variant="outline">
                          Cancel
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </form>
          )}
      </div>
    </AppLayout>
  );
}

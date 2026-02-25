import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import DependencyPicker from "@/components/DependencyPicker";
import NotesJournal from "@/components/NotesJournal";
import { X, Save, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

type SlideOutTask = {
    id: number;
    projectId: number;
    taskId: string;
    taskDescription: string;
    phase: string | null;
    status: string;
    priority: string;
    owner: string | null;
    completionPercent: number;
    startDate: Date | null;
    dueDate: Date | null;
    dependency: string | null;
    notes: string | null;
    approvalRequired: string;
};

export default function TaskSlideOutPanel({
    task,
    projectName,
    onClose,
    onSaved,
}: {
    task: SlideOutTask;
    projectName?: string;
    onClose: () => void;
    onSaved?: () => void;
}) {
    const [draft, setDraft] = useState({
        taskDescription: task.taskDescription,
        status: task.status,
        priority: task.priority,
        owner: task.owner ?? "",
        completionPercent: task.completionPercent ?? 0,
        dependency: task.dependency ?? "",
    });

    const updateTask = trpc.tasks.update.useMutation({
        onSuccess: () => {
            toast.success("Task updated");
            onSaved?.();
        },
        onError: (e) => toast.error(e.message),
    });

    useEffect(() => {
        setDraft({
            taskDescription: task.taskDescription,
            status: task.status,
            priority: task.priority,
            owner: task.owner ?? "",
            completionPercent: task.completionPercent ?? 0,
            dependency: task.dependency ?? "",
        });
    }, [task.id]);

    const hasChanges =
        draft.taskDescription !== task.taskDescription ||
        draft.status !== task.status ||
        draft.priority !== task.priority ||
        draft.owner !== (task.owner ?? "") ||
        draft.completionPercent !== (task.completionPercent ?? 0) ||
        draft.dependency !== (task.dependency ?? "");

    const handleSave = () => {
        updateTask.mutate({
            id: task.id,
            taskDescription: draft.taskDescription,
            status: draft.status as "Not Started" | "In Progress" | "Complete" | "On Hold",
            priority: draft.priority as "High" | "Medium" | "Low",
            owner: draft.owner || undefined,
            completionPercent: draft.completionPercent,
            dependency: draft.dependency || undefined,
        });
    };

    const formatDate = (d: Date | null) => {
        if (!d) return "—";
        return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    return (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium">{task.taskId}</span>
                        {task.phase && (
                            <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                {task.phase}
                            </span>
                        )}
                    </div>
                    {projectName && (
                        <Link href={`/projects/${task.projectId}`}>
                            <span className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                <ExternalLink className="h-3 w-3" />
                                {projectName}
                            </span>
                        </Link>
                    )}
                </div>
                <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Body */}
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                        value={draft.taskDescription}
                        onChange={(e) => setDraft((p) => ({ ...p, taskDescription: e.target.value }))}
                        rows={3}
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={draft.status} onValueChange={(v) => setDraft((p) => ({ ...p, status: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Not Started">Not Started</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="On Hold">On Hold</SelectItem>
                                <SelectItem value="Complete">Complete</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Priority</Label>
                        <Select value={draft.priority} onValueChange={(v) => setDraft((p) => ({ ...p, priority: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="High">High</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="Low">Low</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <Label>Owner</Label>
                        <Input
                            value={draft.owner}
                            onChange={(e) => setDraft((p) => ({ ...p, owner: e.target.value }))}
                            placeholder="Unassigned"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Progress (%)</Label>
                        <Input
                            type="number"
                            min={0}
                            max={100}
                            value={draft.completionPercent}
                            onChange={(e) => setDraft((p) => ({ ...p, completionPercent: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Dependencies</Label>
                    <DependencyPicker
                        projectId={task.projectId}
                        currentTaskId={task.taskId}
                        value={draft.dependency}
                        onChange={(val) => setDraft((p) => ({ ...p, dependency: val }))}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Notes</Label>
                    <NotesJournal type="task" entityId={task.id} compact />
                </div>

                {/* Read-only metadata */}
                <div className="rounded-lg border bg-slate-50 p-3">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Details</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                            <span className="text-muted-foreground">Start:</span>{" "}
                            <span>{formatDate(task.startDate)}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Due:</span>{" "}
                            <span>{formatDate(task.dueDate)}</span>
                        </div>
                        {task.approvalRequired === "Yes" && (
                            <div className="col-span-2">
                                <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Approval Required</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="border-t px-4 py-3">
                <Button onClick={handleSave} disabled={!hasChanges || updateTask.isPending} className="w-full">
                    <Save className="mr-2 h-4 w-4" />
                    {updateTask.isPending ? "Saving..." : "Save Changes"}
                </Button>
            </div>
        </div>
    );
}

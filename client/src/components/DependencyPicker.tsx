import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X, ChevronDown, Link2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface DependencyPickerProps {
    /** The project whose tasks are candidates. Pass 0 or undefined for template-scope. */
    projectId?: number;
    /** Task ID code of the task being edited (excluded from the list). */
    currentTaskId?: string;
    /** Comma-separated task ID codes, e.g. "T001,T003" */
    value: string;
    /** Called with updated comma-separated string. */
    onChange: (value: string) => void;
    /** When used in template context, pass the list of sibling task IDs directly. */
    templateTasks?: { taskId: string; taskDescription: string }[];
}

export default function DependencyPicker({
    projectId,
    currentTaskId,
    value,
    onChange,
    templateTasks,
}: DependencyPickerProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    // Fetch sibling tasks from the project (skip if templateTasks provided)
    const tasksQuery = trpc.tasks.listByProject.useQuery(
        { projectId: projectId! },
        { enabled: !!projectId && !templateTasks }
    );

    const candidates = useMemo(() => {
        const source = templateTasks ?? (tasksQuery.data ?? []).map((t) => ({
            taskId: t.taskId as string,
            taskDescription: t.taskDescription as string,
        }));
        // Filter out self
        return source.filter(
            (t) => t.taskId.toUpperCase() !== (currentTaskId ?? "").toUpperCase()
        );
    }, [templateTasks, tasksQuery.data, currentTaskId]);

    // Parse currently selected IDs
    const selectedIds = useMemo(() => {
        return value
            .split(",")
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean);
    }, [value]);

    const filteredCandidates = useMemo(() => {
        const term = search.toLowerCase();
        if (!term) return candidates;
        return candidates.filter(
            (t) =>
                t.taskId.toLowerCase().includes(term) ||
                t.taskDescription.toLowerCase().includes(term)
        );
    }, [candidates, search]);

    const toggle = (taskId: string) => {
        const upper = taskId.toUpperCase();
        const next = selectedIds.includes(upper)
            ? selectedIds.filter((id) => id !== upper)
            : [...selectedIds, upper];
        onChange(next.join(","));
    };

    const remove = (taskId: string) => {
        const upper = taskId.toUpperCase();
        const next = selectedIds.filter((id) => id !== upper);
        onChange(next.join(","));
    };

    const label = (taskId: string) => {
        const c = candidates.find(
            (t) => t.taskId.toUpperCase() === taskId.toUpperCase()
        );
        return c ? `${c.taskId} – ${c.taskDescription}` : taskId;
    };

    return (
        <div className="space-y-2">
            {/* Selected chips */}
            {selectedIds.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {selectedIds.map((id) => (
                        <Badge
                            key={id}
                            variant="secondary"
                            className="flex items-center gap-1 pr-1 text-xs"
                        >
                            <span className="max-w-[180px] truncate">{label(id)}</span>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    remove(id);
                                }}
                                className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}

            {/* Popover trigger */}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        className="w-full justify-between text-left font-normal"
                    >
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Link2 className="h-3.5 w-3.5" />
                            {selectedIds.length === 0
                                ? "Select dependencies…"
                                : `${selectedIds.length} selected`}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent
                    className="w-[340px] p-0"
                    align="start"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <div className="border-b px-3 py-2">
                        <Input
                            placeholder="Search tasks…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-8"
                            autoFocus
                        />
                    </div>

                    <div className="max-h-[240px] overflow-y-auto p-1">
                        {filteredCandidates.length === 0 ? (
                            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                                No tasks found
                            </p>
                        ) : (
                            filteredCandidates.map((task) => {
                                const checked = selectedIds.includes(
                                    task.taskId.toUpperCase()
                                );
                                return (
                                    <label
                                        key={task.taskId}
                                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                                    >
                                        <Checkbox
                                            checked={checked}
                                            onCheckedChange={() => toggle(task.taskId)}
                                        />
                                        <span className="font-medium text-blue-700">
                                            {task.taskId}
                                        </span>
                                        <span className="truncate text-muted-foreground">
                                            {task.taskDescription}
                                        </span>
                                    </label>
                                );
                            })
                        )}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}

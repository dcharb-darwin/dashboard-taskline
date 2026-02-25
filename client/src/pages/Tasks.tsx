import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
    ListChecks,
    Search,
    Loader2,
    Bookmark,
    Save,
    Trash2,
    ChevronDown,
    ChevronRight,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import TaskSlideOutPanel from "@/components/TaskSlideOutPanel";
import { getPhaseColor, parsePhaseOrder } from "@/lib/phase-utils";
import { useEnums, getBadgeClass } from "@/contexts/EnumContext";



export default function Tasks() {
    const { data: allTasks, isLoading: tasksLoading, refetch } = trpc.tasks.listAll.useQuery();
    const { data: projects } = trpc.projects.list.useQuery();
    const enums = useEnums();

    const [filterStatus, setFilterStatus] = useState("all");
    const [filterPriority, setFilterPriority] = useState("all");
    const [filterProject, setFilterProject] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTask, setSelectedTask] = useState<(typeof allTasks extends (infer T)[] | undefined ? T : never) | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [sortBy, setSortBy] = useState<"dueDate" | "priority" | "status" | "project" | "phase">("dueDate");
    const [groupBy, setGroupBy] = useState<"none" | "phase" | "project" | "priority" | "owner">("none");
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [saveViewName, setSaveViewName] = useState("");
    const [showSaveView, setShowSaveView] = useState(false);

    const updateTask = trpc.tasks.update.useMutation({ onSuccess: () => refetch() });
    const { data: savedViews, refetch: refetchViews } = trpc.savedViews.list.useQuery();
    const createView = trpc.savedViews.create.useMutation({
        onSuccess: () => {
            toast.success("View saved");
            setShowSaveView(false);
            setSaveViewName("");
            refetchViews();
        },
    });
    const deleteView = trpc.savedViews.delete.useMutation({ onSuccess: () => refetchViews() });

    const projectMap = useMemo(() => {
        const map = new Map<number, string>();
        projects?.forEach((p) => map.set(p.id, p.name));
        return map;
    }, [projects]);

    const filtered = useMemo(() => {
        if (!allTasks) return [];
        let list = [...allTasks];

        if (filterStatus !== "all") list = list.filter((t) => t.status === filterStatus);
        if (filterPriority !== "all") list = list.filter((t) => t.priority === filterPriority);
        if (filterProject !== "all") list = list.filter((t) => t.projectId === Number(filterProject));
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            list = list.filter(
                (t) =>
                    t.taskDescription.toLowerCase().includes(q) ||
                    t.taskId.toLowerCase().includes(q) ||
                    (t.owner && t.owner.toLowerCase().includes(q))
            );
        }

        // Sort
        const priorityOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
        const statusOrder: Record<string, number> = {
            "On Hold": 0,
            "In Progress": 1,
            "Not Started": 2,
            Complete: 3,
        };

        list.sort((a, b) => {
            if (sortBy === "dueDate") {
                const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                return da - db;
            }
            if (sortBy === "priority") return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
            if (sortBy === "status") return (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
            if (sortBy === "project") return (a.projectId ?? 0) - (b.projectId ?? 0);
            if (sortBy === "phase") {
                const pa = parsePhaseOrder(a.phase ?? "");
                const pb = parsePhaseOrder(b.phase ?? "");
                if (pa !== pb) return pa - pb;
                return (a.phase ?? "").localeCompare(b.phase ?? "");
            }
            return 0;
        });

        return list;
    }, [allTasks, filterStatus, filterPriority, filterProject, searchQuery, sortBy]);

    const toggleSelect = (id: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filtered.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filtered.map((t) => t.id)));
        }
    };

    const bulkUpdateStatus = (status: string) => {
        const ids = Array.from(selectedIds);
        Promise.all(ids.map((id) => updateTask.mutateAsync({ id, status }))).then(() => {
            setSelectedIds(new Set());
        });
    };

    const formatDate = (d: Date | null) => {
        if (!d) return "—";
        return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    if (tasksLoading) {
        return (
            <AppLayout contentClassName="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </AppLayout>
        );
    }

    const counts = {
        total: allTasks?.length ?? 0,
        inProgress: allTasks?.filter((t) => t.status === "In Progress").length ?? 0,
        onHold: allTasks?.filter((t) => t.status === "On Hold").length ?? 0,
        complete: allTasks?.filter((t) => t.status === "Complete").length ?? 0,
    };

    return (
        <AppLayout>
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Tasks</h2>
                    <p className="mt-1 text-muted-foreground">
                        Cross-project task view • {counts.total} total • {counts.inProgress} in progress • {counts.onHold} on hold
                    </p>
                </div>

                {/* Filters */}
                <Card className="bg-white">
                    <CardContent className="pt-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative min-w-[200px] flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search tasks, codes, owners..."
                                    className="pl-9"
                                />
                            </div>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    {enums.taskStatus.map((opt) => (
                                        <SelectItem key={opt.label} value={opt.label}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={filterPriority} onValueChange={setFilterPriority}>
                                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Priority" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Priority</SelectItem>
                                    {enums.taskPriority.map((opt) => (
                                        <SelectItem key={opt.label} value={opt.label}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={filterProject} onValueChange={setFilterProject}>
                                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Project" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Projects</SelectItem>
                                    {projects?.map((p) => (
                                        <SelectItem key={p.id} value={String(p.id)}>
                                            {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Sort By" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="dueDate">Due Date</SelectItem>
                                    <SelectItem value="priority">Priority</SelectItem>
                                    <SelectItem value="status">Status</SelectItem>
                                    <SelectItem value="project">Project</SelectItem>
                                    <SelectItem value="phase">Phase</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as typeof groupBy)}>
                                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Group By" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Grouping</SelectItem>
                                    <SelectItem value="phase">Phase</SelectItem>
                                    <SelectItem value="project">Project</SelectItem>
                                    <SelectItem value="priority">Priority</SelectItem>
                                    <SelectItem value="owner">Owner</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {/* Saved Views */}
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                            <Bookmark className="h-4 w-4 text-muted-foreground" />
                            {savedViews?.map((v) => {
                                const f = JSON.parse(v.filters);
                                return (
                                    <span key={v.id} className="inline-flex items-center gap-1">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs"
                                            onClick={() => {
                                                setFilterStatus(f.status ?? "all");
                                                setFilterPriority(f.priority ?? "all");
                                                setFilterProject(f.project ?? "all");
                                                setSearchQuery(f.search ?? "");
                                                setSortBy(f.sortBy ?? "dueDate");
                                            }}
                                        >
                                            {v.name}
                                        </Button>
                                        <button
                                            onClick={() => deleteView.mutate({ id: v.id })}
                                            className="rounded p-0.5 text-muted-foreground hover:text-red-500"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </span>
                                );
                            })}
                            {showSaveView ? (
                                <div className="flex items-center gap-1">
                                    <Input
                                        value={saveViewName}
                                        onChange={(e) => setSaveViewName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && saveViewName.trim()) {
                                                createView.mutate({
                                                    name: saveViewName.trim(),
                                                    filters: JSON.stringify({
                                                        status: filterStatus,
                                                        priority: filterPriority,
                                                        project: filterProject,
                                                        search: searchQuery,
                                                        sortBy,
                                                    }),
                                                });
                                            }
                                        }}
                                        placeholder="View name"
                                        className="h-7 w-32 text-xs"
                                        autoFocus
                                    />
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7"
                                        onClick={() => {
                                            if (!saveViewName.trim()) return;
                                            createView.mutate({
                                                name: saveViewName.trim(),
                                                filters: JSON.stringify({
                                                    status: filterStatus,
                                                    priority: filterPriority,
                                                    project: filterProject,
                                                    search: searchQuery,
                                                    sortBy,
                                                }),
                                            });
                                        }}
                                    >
                                        <Save className="h-3 w-3" />
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs"
                                    onClick={() => setShowSaveView(true)}
                                >
                                    <Save className="mr-1 h-3 w-3" />
                                    Save View
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Bulk action bar */}
                {selectedIds.size > 0 && (
                    <div className="sticky top-0 z-40 flex items-center gap-3 rounded-lg border bg-blue-50 px-4 py-2 shadow">
                        <span className="text-sm font-medium">{selectedIds.size} selected</span>
                        <Button size="sm" variant="outline" onClick={() => bulkUpdateStatus("In Progress")}>
                            → In Progress
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => bulkUpdateStatus("Complete")}>
                            → Complete
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => bulkUpdateStatus("On Hold")}>
                            → On Hold
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                            Clear
                        </Button>
                    </div>
                )}

                {/* Task list */}
                <Card className="bg-white">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <ListChecks className="h-5 w-5" />
                                {filtered.length} Task{filtered.length !== 1 ? "s" : ""}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                                    onCheckedChange={toggleSelectAll}
                                />
                                <span className="text-xs text-muted-foreground">Select All</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {filtered.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground">
                                <p>No tasks match your filters.</p>
                            </div>
                        ) : groupBy !== "none" ? (
                            <GroupedTaskList
                                tasks={filtered}
                                groupBy={groupBy}
                                projectMap={projectMap}
                                collapsedGroups={collapsedGroups}
                                onToggleGroup={(name) => {
                                    setCollapsedGroups((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(name)) next.delete(name);
                                        else next.add(name);
                                        return next;
                                    });
                                }}
                                selectedIds={selectedIds}
                                toggleSelect={toggleSelect}
                                selectedTask={selectedTask}
                                setSelectedTask={setSelectedTask}
                                formatDate={formatDate}
                            />
                        ) : (
                            <div className="space-y-1">
                                {filtered.map((task) => (
                                    <TaskRow
                                        key={task.id}
                                        task={task}
                                        projectMap={projectMap}
                                        selectedIds={selectedIds}
                                        toggleSelect={toggleSelect}
                                        isSelected={selectedTask?.id === task.id}
                                        onClick={() => setSelectedTask(task)}
                                        formatDate={formatDate}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Slide-out panel */}
            {selectedTask && (
                <TaskSlideOutPanel
                    task={selectedTask}
                    projectName={projectMap.get(selectedTask.projectId)}
                    onClose={() => setSelectedTask(null)}
                    onSaved={() => refetch()}
                />
            )}
        </AppLayout>
    );
}

// ── TaskRow component ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TaskType = any;

function TaskRow({
    task,
    projectMap,
    selectedIds,
    toggleSelect,
    isSelected,
    onClick,
    formatDate,
}: {
    task: TaskType;
    projectMap: Map<number, string>;
    selectedIds: Set<number>;
    toggleSelect: (id: number) => void;
    isSelected: boolean;
    onClick: () => void;
    formatDate: (d: Date | null) => string;
}) {
    const enums = useEnums();
    return (
        <div
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-slate-50 ${isSelected ? "ring-2 ring-blue-400" : ""}`}
            onClick={onClick}
        >
            <Checkbox
                checked={selectedIds.has(task.id)}
                onCheckedChange={() => toggleSelect(task.id)}
                onClick={(e) => e.stopPropagation()}
            />
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium">
                        {task.taskId}
                    </span>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${getBadgeClass(enums.taskStatus, task.status)}`}>
                        {task.status}
                    </span>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${getBadgeClass(enums.taskPriority, task.priority)}`}>
                        {task.priority}
                    </span>
                    {task.phase && (
                        <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                            {task.phase}
                        </span>
                    )}
                </div>
                <p className="mt-1 text-sm font-medium">{task.taskDescription}</p>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <a
                        href={`/projects/${task.projectId}`}
                        onClick={(e) => { e.stopPropagation(); }}
                        className="text-blue-600 underline-offset-2 hover:underline"
                    >
                        {projectMap.get(task.projectId) ?? `Project #${task.projectId}`}
                    </a>
                    {task.owner && <span>• {task.owner}</span>}
                    <span>• Due: {formatDate(task.dueDate)}</span>
                    <span>• {task.completionPercent ?? 0}%</span>
                </div>
            </div>
        </div>
    );
}

// ── Grouped task list ──────────────────────────────────────────────────────────

function GroupedTaskList({
    tasks,
    groupBy,
    projectMap,
    collapsedGroups,
    onToggleGroup,
    selectedIds,
    toggleSelect,
    selectedTask,
    setSelectedTask,
    formatDate,
}: {
    tasks: TaskType[];
    groupBy: "phase" | "project" | "priority" | "owner";
    projectMap: Map<number, string>;
    collapsedGroups: Set<string>;
    onToggleGroup: (name: string) => void;
    selectedIds: Set<number>;
    toggleSelect: (id: number) => void;
    selectedTask: TaskType | null;
    setSelectedTask: (t: TaskType) => void;
    formatDate: (d: Date | null) => string;
}) {
    const groups = useMemo(() => {
        const map = new Map<string, TaskType[]>();
        for (const task of tasks) {
            let key: string;
            switch (groupBy) {
                case "phase": {
                    const projName = projectMap.get(task.projectId) ?? `Project #${task.projectId}`;
                    const phaseName = task.phase?.trim() || "Uncategorized";
                    key = `${projName} → ${phaseName}`;
                    break;
                }
                case "project":
                    key = projectMap.get(task.projectId) ?? `Project #${task.projectId}`;
                    break;
                case "priority":
                    key = task.priority;
                    break;
                case "owner":
                    key = task.owner?.trim() || "Unassigned";
                    break;
            }
            const existing = map.get(key);
            if (existing) existing.push(task);
            else map.set(key, [task]);
        }

        const priorityRank: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

        const result = Array.from(map.entries()).map(([name, items]) => ({
            name,
            tasks: items,
            avgCompletion: items.length > 0
                ? Math.round(items.reduce((s, t) => s + (t.completionPercent ?? 0), 0) / items.length)
                : 0,
        }));

        // Sort groups by type-appropriate order
        result.sort((a, b) => {
            if (groupBy === "phase") {
                return parsePhaseOrder(a.name) - parsePhaseOrder(b.name) || a.name.localeCompare(b.name);
            }
            if (groupBy === "priority") {
                return (priorityRank[a.name] ?? 99) - (priorityRank[b.name] ?? 99);
            }
            return a.name.localeCompare(b.name);
        });

        return result;
    }, [tasks, groupBy, projectMap]);

    return (
        <div className="space-y-3">
            {groups.map((group, idx) => {
                const isCollapsed = collapsedGroups.has(group.name);
                const colors = getPhaseColor(idx);
                return (
                    <div key={group.name} className="rounded-lg border">
                        <button
                            onClick={() => onToggleGroup(group.name)}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                        >
                            {isCollapsed
                                ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                            <span
                                className="rounded px-2 py-0.5 text-xs font-semibold"
                                style={{ backgroundColor: colors.bg, color: colors.bar }}
                            >
                                {group.name}
                            </span>
                            <span className="text-sm text-muted-foreground">
                                {group.tasks.length} task{group.tasks.length !== 1 ? "s" : ""}
                            </span>
                            <div className="ml-auto flex items-center gap-2">
                                <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className="h-full rounded-full transition-all"
                                        style={{ width: `${group.avgCompletion}%`, backgroundColor: colors.bar }}
                                    />
                                </div>
                                <span className="text-xs text-muted-foreground">{group.avgCompletion}%</span>
                            </div>
                        </button>
                        {!isCollapsed && (
                            <div className="space-y-1 border-t px-2 py-2">
                                {group.tasks.map((task) => (
                                    <TaskRow
                                        key={task.id}
                                        task={task}
                                        projectMap={projectMap}
                                        selectedIds={selectedIds}
                                        toggleSelect={toggleSelect}
                                        isSelected={selectedTask?.id === task.id}
                                        onClick={() => setSelectedTask(task)}
                                        formatDate={formatDate}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

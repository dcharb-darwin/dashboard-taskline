import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useViewMode } from "@/contexts/ViewModeContext";
import {
    Command,
    Search,
    FolderOpen,
    CheckSquare,
    ArrowRight,
    LayoutDashboard,
    FileText,
    Calendar,
    BarChart3,
    Settings,
    ListChecks,
} from "lucide-react";

type SearchResult = {
    id: string;
    type: "project" | "task" | "nav";
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    path: string;
};

const NAV_ITEMS: SearchResult[] = [
    { id: "nav-dashboard", type: "nav", title: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, path: "/" },
    { id: "nav-projects", type: "nav", title: "Projects", icon: <FolderOpen className="h-4 w-4" />, path: "/projects" },
    { id: "nav-templates", type: "nav", title: "Templates", icon: <FileText className="h-4 w-4" />, path: "/templates" },
    { id: "nav-tasks", type: "nav", title: "Tasks", icon: <ListChecks className="h-4 w-4" />, path: "/tasks" },
    { id: "nav-calendar", type: "nav", title: "Calendar", icon: <Calendar className="h-4 w-4" />, path: "/calendar" },
    { id: "nav-gantt", type: "nav", title: "Gantt Chart", icon: <BarChart3 className="h-4 w-4" />, path: "/gantt" },
    { id: "nav-admin", type: "nav", title: "Admin Settings", icon: <Settings className="h-4 w-4" />, path: "/admin" },
    { id: "nav-new-project", type: "nav", title: "New Project", subtitle: "Create a new project", icon: <FolderOpen className="h-4 w-4" />, path: "/projects/new" },
];

export default function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [, setLocation] = useLocation();
    const { isMvp } = useViewMode();

    const { data: projects } = trpc.projects.list.useQuery(undefined, { enabled: open });
    const { data: tasks } = trpc.tasks.listAll.useQuery(undefined, { enabled: open });

    // Keyboard shortcut: Cmd+K / Ctrl+K
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setOpen((prev) => !prev);
                setQuery("");
                setSelectedIndex(0);
            }
            if (e.key === "Escape") {
                setOpen(false);
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    const results = useMemo(() => {
        const items: SearchResult[] = [];
        const q = query.toLowerCase().trim();

        // Projects
        projects?.forEach((p) => {
            items.push({
                id: `project-${p.id}`,
                type: "project",
                title: p.name,
                subtitle: `${p.status} • ${p.projectManager || "No manager"}`,
                icon: <FolderOpen className="h-4 w-4 text-blue-500" />,
                path: `/projects/${p.id}`,
            });
        });

        // Tasks
        tasks?.forEach((t) => {
            items.push({
                id: `task-${t.id}`,
                type: "task",
                title: `${t.taskId}: ${t.taskDescription}`,
                subtitle: `${t.status} • ${t.priority} priority`,
                icon: <CheckSquare className="h-4 w-4 text-green-500" />,
                path: `/projects/${t.projectId}?task=${t.id}`,
            });
        });

        // Nav items (filter by view mode)
        const filteredNavItems = isMvp
            ? NAV_ITEMS.filter((item) => item.path !== "/tasks" && item.path !== "/admin")
            : NAV_ITEMS;
        items.push(...filteredNavItems);

        if (!q) return items.slice(0, 12);

        return items
            .filter(
                (item) =>
                    item.title.toLowerCase().includes(q) ||
                    (item.subtitle && item.subtitle.toLowerCase().includes(q))
            )
            .slice(0, 12);
    }, [projects, tasks, query, isMvp]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    const handleSelect = (result: SearchResult) => {
        setOpen(false);
        setQuery("");
        setLocation(result.path);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (results[selectedIndex]) handleSelect(results[selectedIndex]);
        }
    };

    if (!open) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

            {/* Dialog */}
            <div className="fixed left-1/2 top-[20%] z-[61] w-full max-w-lg -translate-x-1/2 rounded-xl border bg-white shadow-2xl">
                {/* Search input */}
                <div className="flex items-center gap-3 border-b px-4 py-3">
                    <Command className="h-5 w-5 text-muted-foreground" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search projects, tasks, pages..."
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        autoFocus
                    />
                    <kbd className="rounded border bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-y-auto py-2">
                    {results.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            No results found for "{query}"
                        </div>
                    ) : (
                        <div>
                            {/* Group headers */}
                            {["project", "task", "nav"].map((type) => {
                                const group = results.filter((r) => r.type === type);
                                if (group.length === 0) return null;
                                return (
                                    <div key={type}>
                                        <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                            {type === "project" ? "Projects" : type === "task" ? "Tasks" : "Pages"}
                                        </p>
                                        {group.map((result) => {
                                            const globalIndex = results.indexOf(result);
                                            return (
                                                <button
                                                    key={result.id}
                                                    onClick={() => handleSelect(result)}
                                                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                                                    className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${globalIndex === selectedIndex ? "bg-blue-50 text-blue-900" : "hover:bg-slate-50"
                                                        }`}
                                                >
                                                    {result.icon}
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate font-medium">{result.title}</p>
                                                        {result.subtitle && (
                                                            <p className="truncate text-xs text-muted-foreground">{result.subtitle}</p>
                                                        )}
                                                    </div>
                                                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t px-4 py-2">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <kbd className="rounded border bg-slate-100 px-1.5 py-0.5">↑↓</kbd>
                        <span>navigate</span>
                        <kbd className="rounded border bg-slate-100 px-1.5 py-0.5">↵</kbd>
                        <span>select</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Search className="h-3 w-3" />
                        <span>{results.length} results</span>
                    </div>
                </div>
            </div>
        </>
    );
}

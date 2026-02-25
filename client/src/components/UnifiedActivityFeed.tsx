import { useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import {
    StickyNote,
    MessageSquare,
    Activity,
    Send,
    Loader2,
    Filter,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────

type FeedEntryType = "note" | "comment" | "activity";

interface FeedEntry {
    id: string;           // unique key: "note-3", "comment-12", etc.
    type: FeedEntryType;
    author: string;
    content: string;
    taskLabel: string | null;  // e.g. "T004 - Develop timeline" or null
    taskDbId: number | null;   // database task id for drill-down link
    createdAt: Date;
    meta?: {
        mentions?: string[];
        eventType?: string;
        eventColor?: string;
    };
}

// ── Color map for activity events ──────────────────────────────────────

const eventColors: Record<string, string> = {
    comment_added: "bg-slate-100 text-slate-700",
    task_status_changed: "bg-blue-100 text-blue-700",
    task_assignment_changed: "bg-purple-100 text-purple-700",
    due_soon: "bg-amber-100 text-amber-700",
    overdue: "bg-red-100 text-red-700",
};

// ── Icons by type ──────────────────────────────────────────────────────

const TypeIcon = ({ type }: { type: FeedEntryType }) => {
    switch (type) {
        case "note":
            return <StickyNote className="h-3.5 w-3.5 text-slate-500" />;
        case "comment":
            return <MessageSquare className="h-3.5 w-3.5 text-blue-500" />;
        case "activity":
            return <Activity className="h-3.5 w-3.5 text-violet-500" />;
    }
};

// ── Component ──────────────────────────────────────────────────────────

interface Props {
    projectId: number;
    tasks: { id: number; taskId: string; taskDescription: string }[];
}

export default function UnifiedActivityFeed({ projectId, tasks }: Props) {
    // ── Filter state ───────────────────────────────────────────────────
    const [activeFilters, setActiveFilters] = useState(
        () => new Set<FeedEntryType>(["note", "comment", "activity"])
    );

    // ── Compose state ──────────────────────────────────────────────────
    const [composeType, setComposeType] = useState<"note" | "comment">("note");
    const [composeContent, setComposeContent] = useState("");
    const [composeTaskScope, setComposeTaskScope] = useState("project");

    const utils = trpc.useUtils();

    // ── Data queries ───────────────────────────────────────────────────
    const { data: projectNotes } = trpc.projectNotes.list.useQuery({ projectId });
    const { data: taskNotes } = trpc.taskNotes.listByProject.useQuery({ projectId });
    const { data: comments } = trpc.collaboration.comments.list.useQuery({ projectId });
    const { data: activityFeed } = trpc.collaboration.activity.list.useQuery({ projectId, limit: 200 });

    // ── Mutations ──────────────────────────────────────────────────────
    const createProjectNote = trpc.projectNotes.create.useMutation({
        onSuccess: () => {
            setComposeContent("");
            toast.success("Note added");
            utils.projectNotes.list.invalidate({ projectId });
        },
        onError: (e) => toast.error(e.message),
    });
    const createTaskNote = trpc.taskNotes.create.useMutation({
        onSuccess: () => {
            setComposeContent("");
            toast.success("Note added");
            utils.taskNotes.listByProject.invalidate({ projectId });
        },
        onError: (e) => toast.error(e.message),
    });
    const createComment = trpc.collaboration.comments.create.useMutation({
        onSuccess: () => {
            setComposeContent("");
            setComposeTaskScope("project");
            toast.success("Comment posted");
            utils.collaboration.comments.list.invalidate({ projectId });
            utils.collaboration.activity.list.invalidate({ projectId });
        },
        onError: (e) => toast.error(e.message),
    });

    const isPending = createProjectNote.isPending || createTaskNote.isPending || createComment.isPending;

    // ── Build task label helper ────────────────────────────────────────
    const taskLabel = (taskId: number | null | undefined, taskCode?: string) => {
        if (!taskId && !taskCode) return null;
        if (taskCode) {
            const t = tasks.find((t) => t.taskId === taskCode);
            return t ? `${t.taskId} – ${t.taskDescription}` : taskCode;
        }
        const t = tasks.find((t) => t.id === taskId);
        return t ? `${t.taskId} – ${t.taskDescription}` : `Task #${taskId}`;
    };

    // ── Normalize all sources into FeedEntry[] ─────────────────────────
    const feed = useMemo<FeedEntry[]>(() => {
        const entries: FeedEntry[] = [];

        // Project notes
        for (const n of projectNotes ?? []) {
            entries.push({
                id: `pnote-${n.id}`,
                type: "note",
                author: n.authorName,
                content: n.content,
                taskLabel: null,
                taskDbId: null,
                createdAt: new Date(n.createdAt),
            });
        }

        // Task notes (project-wide query)
        for (const n of taskNotes ?? []) {
            entries.push({
                id: `tnote-${n.id}`,
                type: "note",
                author: n.authorName,
                content: n.content,
                taskLabel: taskLabel(n.taskId, (n as any).taskCode),
                taskDbId: n.taskId,
                createdAt: new Date(n.createdAt),
            });
        }

        // Comments
        for (const c of (comments ?? []) as any[]) {
            const mentions: string[] = Array.isArray(c.mentions)
                ? c.mentions
                : typeof c.mentions === "string"
                    ? JSON.parse(c.mentions || "[]")
                    : [];
            entries.push({
                id: `comment-${c.id}`,
                type: "comment",
                author: c.authorName,
                content: c.content,
                taskLabel: taskLabel(c.taskId),
                taskDbId: c.taskId ?? null,
                createdAt: new Date(c.createdAt),
                meta: { mentions: mentions.length > 0 ? mentions : undefined },
            });
        }

        // Activity events
        for (const a of (activityFeed ?? []) as any[]) {
            entries.push({
                id: `activity-${a.id}`,
                type: "activity",
                author: a.actorName,
                content: a.summary,
                taskLabel: taskLabel(a.taskId),
                taskDbId: a.taskId ?? null,
                createdAt: new Date(a.createdAt),
                meta: {
                    eventType: a.eventType,
                    eventColor: eventColors[a.eventType] || "bg-slate-100 text-slate-700",
                },
            });
        }

        // Sort newest first
        entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return entries;
    }, [projectNotes, taskNotes, comments, activityFeed, tasks]);

    // ── Filter ─────────────────────────────────────────────────────────
    const filteredFeed = useMemo(
        () => feed.filter((e) => activeFilters.has(e.type)),
        [feed, activeFilters]
    );

    const toggleFilter = (type: FeedEntryType) => {
        setActiveFilters((prev) => {
            const next = new Set(prev);
            if (next.has(type)) {
                if (next.size > 1) next.delete(type);
            } else {
                next.add(type);
            }
            return next;
        });
    };

    // ── Submit handler ─────────────────────────────────────────────────
    const handleSubmit = () => {
        const trimmed = composeContent.trim();
        if (!trimmed) return;

        if (composeType === "note") {
            if (composeTaskScope === "project") {
                createProjectNote.mutate({ projectId, content: trimmed });
            } else {
                createTaskNote.mutate({ taskId: Number(composeTaskScope), content: trimmed });
            }
        } else {
            createComment.mutate({
                projectId,
                content: trimmed,
                taskId: composeTaskScope === "project" ? undefined : Number(composeTaskScope),
            });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit();
        }
    };

    // ── Filter chip counts ─────────────────────────────────────────────
    const counts = useMemo(() => {
        const c = { note: 0, comment: 0, activity: 0 };
        for (const e of feed) c[e.type]++;
        return c;
    }, [feed]);

    return (
        <div className="space-y-4">
            {/* ── Compose area ──────────────────────────────────────────── */}
            <div className="space-y-3 rounded-lg border bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                    <Select value={composeType} onValueChange={(v: any) => setComposeType(v)}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="note">📝 Note</SelectItem>
                            <SelectItem value="comment">💬 Comment</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={composeTaskScope} onValueChange={setComposeTaskScope}>
                        <SelectTrigger className="w-[220px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="project">Project-wide</SelectItem>
                            {tasks.map((t) => (
                                <SelectItem key={t.id} value={String(t.id)}>
                                    {t.taskId} – {t.taskDescription}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Textarea
                    value={composeContent}
                    onChange={(e) => setComposeContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={2}
                    placeholder={
                        composeType === "note"
                            ? "Add a note… (⌘+Enter to submit)"
                            : "Add a comment. Use @handle to mention teammates. (⌘+Enter)"
                    }
                    className="resize-none"
                />

                <div className="flex justify-end">
                    <Button size="sm" onClick={handleSubmit} disabled={!composeContent.trim() || isPending}>
                        {isPending ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Send className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        {composeType === "note" ? "Add Note" : "Post Comment"}
                    </Button>
                </div>
            </div>

            {/* ── Filter chips ──────────────────────────────────────────── */}
            <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                {(["note", "comment", "activity"] as const).map((type) => (
                    <button
                        key={type}
                        type="button"
                        onClick={() => toggleFilter(type)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${activeFilters.has(type)
                            ? type === "note"
                                ? "border-slate-300 bg-slate-100 text-slate-700"
                                : type === "comment"
                                    ? "border-blue-300 bg-blue-50 text-blue-700"
                                    : "border-violet-300 bg-violet-50 text-violet-700"
                            : "border-slate-200 bg-white text-slate-400"
                            }`}
                    >
                        <TypeIcon type={type} />
                        {type === "note" ? "Notes" : type === "comment" ? "Comments" : "Activity"}
                        <span className="ml-0.5 text-[10px] opacity-70">{counts[type]}</span>
                    </button>
                ))}
            </div>

            {/* ── Timeline ──────────────────────────────────────────────── */}
            {filteredFeed.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                    No activity yet. Add a note or comment above.
                </p>
            ) : (
                <div className="space-y-2">
                    {filteredFeed.map((entry) => (
                        <div
                            key={entry.id}
                            className="rounded-lg border bg-white px-4 py-3 text-sm"
                        >
                            {/* Header */}
                            <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
                                <TypeIcon type={entry.type} />
                                <span className="font-medium text-slate-700">{entry.author}</span>

                                {entry.type === "activity" && entry.meta?.eventType && (
                                    <span className={`rounded px-2 py-0.5 font-medium ${entry.meta.eventColor}`}>
                                        {entry.meta.eventType.replace(/_/g, " ")}
                                    </span>
                                )}

                                {entry.taskLabel && (
                                    entry.taskDbId ? (
                                        <Link href={`/projects/${projectId}?task=${entry.taskDbId}`}>
                                            <Badge variant="secondary" className="cursor-pointer text-[10px] font-normal hover:bg-slate-200">
                                                {entry.taskLabel.length > 40
                                                    ? `${entry.taskLabel.slice(0, 40)}…`
                                                    : entry.taskLabel}
                                            </Badge>
                                        </Link>
                                    ) : (
                                        <Badge variant="secondary" className="text-[10px] font-normal">
                                            {entry.taskLabel.length > 40
                                                ? `${entry.taskLabel.slice(0, 40)}…`
                                                : entry.taskLabel}
                                        </Badge>
                                    )
                                )}

                                {entry.meta?.mentions && entry.meta.mentions.length > 0 && (
                                    <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-700">
                                        @{entry.meta.mentions.join(", @")}
                                    </span>
                                )}

                                <span className="ml-auto text-muted-foreground">
                                    {format(entry.createdAt, "MMM d, h:mm a")}
                                </span>
                            </div>

                            {/* Content */}
                            <p className="whitespace-pre-wrap text-slate-600">{entry.content}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

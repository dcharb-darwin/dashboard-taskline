import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageSquarePlus, Loader2 } from "lucide-react";

interface NotesJournalProps {
    type: "task" | "project";
    entityId: number;
    /** Compact layout for slide-out panels */
    compact?: boolean;
}

function timeAgo(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function NotesJournal({ type, entityId, compact }: NotesJournalProps) {
    const [content, setContent] = useState("");
    const utils = trpc.useUtils();

    // Queries
    const taskNotes = trpc.taskNotes.list.useQuery(
        { taskId: entityId },
        { enabled: type === "task" }
    );
    const projectNotes = trpc.projectNotes.list.useQuery(
        { projectId: entityId },
        { enabled: type === "project" }
    );

    const notes = type === "task" ? taskNotes.data : projectNotes.data;
    const isLoading = type === "task" ? taskNotes.isLoading : projectNotes.isLoading;

    // Mutations
    const createTaskNote = trpc.taskNotes.create.useMutation({
        onSuccess: () => {
            setContent("");
            utils.taskNotes.list.invalidate({ taskId: entityId });
            toast.success("Note added");
        },
        onError: (e) => toast.error(e.message),
    });
    const createProjectNote = trpc.projectNotes.create.useMutation({
        onSuccess: () => {
            setContent("");
            utils.projectNotes.list.invalidate({ projectId: entityId });
            toast.success("Note added");
        },
        onError: (e) => toast.error(e.message),
    });

    const isPending = createTaskNote.isPending || createProjectNote.isPending;

    const handleSubmit = () => {
        const trimmed = content.trim();
        if (!trimmed) return;
        if (type === "task") {
            createTaskNote.mutate({ taskId: entityId, content: trimmed });
        } else {
            createProjectNote.mutate({ projectId: entityId, content: trimmed });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="space-y-3">
            {/* Input area */}
            <div className="space-y-2">
                <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={compact ? 2 : 3}
                    placeholder="Add a note… (⌘+Enter to submit)"
                    className="resize-none"
                />
                <div className="flex justify-end">
                    <Button
                        size="sm"
                        onClick={handleSubmit}
                        disabled={!content.trim() || isPending}
                    >
                        {isPending ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <MessageSquarePlus className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Add Note
                    </Button>
                </div>
            </div>

            {/* Notes timeline */}
            {isLoading ? (
                <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">Loading notes…</div>
            ) : !notes || notes.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No notes yet</p>
            ) : (
                <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
                    {notes.map((note) => (
                        <div
                            key={note.id}
                            className="rounded-lg border bg-slate-50 px-3 py-2 text-sm"
                        >
                            <div className="mb-1 flex items-center justify-between">
                                <span className="font-medium text-slate-700">{note.authorName}</span>
                                <span className="text-xs text-muted-foreground">{timeAgo(note.createdAt)}</span>
                            </div>
                            <p className="whitespace-pre-wrap text-slate-600">{note.content}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

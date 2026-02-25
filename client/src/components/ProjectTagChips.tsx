import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Tag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const TAG_COLORS = [
    "#3b82f6", // blue
    "#10b981", // emerald
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#84cc16", // lime
];

export default function ProjectTagChips({
    projectId,
    compact = false,
}: {
    projectId: number;
    compact?: boolean;
}) {
    const { data: tags, refetch } = trpc.tags.list.useQuery({ projectId });
    const [showInput, setShowInput] = useState(false);
    const [newLabel, setNewLabel] = useState("");

    const addTag = trpc.tags.add.useMutation({
        onSuccess: async () => {
            setNewLabel("");
            setShowInput(false);
            await refetch();
        },
        onError: (e) => toast.error(e.message),
    });

    const removeTag = trpc.tags.remove.useMutation({
        onSuccess: async () => { await refetch(); },
        onError: (e) => toast.error(e.message),
    });

    const handleAdd = () => {
        if (!newLabel.trim()) return;
        const color = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
        addTag.mutate({ projectId, label: newLabel.trim(), color });
    };

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {tags?.map((tag) => (
                <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: tag.color }}
                >
                    {tag.label}
                    {!compact && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                removeTag.mutate({ id: tag.id });
                            }}
                            className="ml-0.5 rounded-full p-0.5 hover:bg-white/25"
                        >
                            <X className="h-2.5 w-2.5" />
                        </button>
                    )}
                </span>
            ))}
            {!compact && (
                <>
                    {showInput ? (
                        <div className="flex items-center gap-1">
                            <Input
                                value={newLabel}
                                onChange={(e) => setNewLabel(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                                placeholder="Tag name"
                                className="h-6 w-24 text-xs"
                                autoFocus
                            />
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleAdd}>
                                <Plus className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setShowInput(false)}>
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowInput(true)}
                            className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-xs text-muted-foreground hover:border-slate-400 hover:text-slate-600"
                        >
                            <Tag className="h-3 w-3" />
                            Add tag
                        </button>
                    )}
                </>
            )}
        </div>
    );
}

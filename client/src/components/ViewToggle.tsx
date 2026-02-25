import { LayoutGrid, Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ViewMode } from "@/hooks/useViewMode";

interface ViewToggleProps {
    mode: ViewMode;
    onModeChange: (mode: ViewMode) => void;
}

export function ViewToggle({ mode, onModeChange }: ViewToggleProps) {
    return (
        <div className="flex rounded-lg border bg-white p-0.5">
            <Button
                size="sm"
                variant={mode === "card" ? "default" : "ghost"}
                className="h-8 w-8 p-0"
                onClick={() => onModeChange("card")}
                title="Card view"
            >
                <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
                size="sm"
                variant={mode === "table" ? "default" : "ghost"}
                className="h-8 w-8 p-0"
                onClick={() => onModeChange("table")}
                title="Table view"
            >
                <Table className="h-4 w-4" />
            </Button>
        </div>
    );
}

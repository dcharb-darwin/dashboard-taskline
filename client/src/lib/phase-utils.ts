/**
 * Phase grouping utilities shared across all views.
 *
 * Provides consistent phase ordering, grouping, and coloring.
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PhaseGroup<T> {
    /** Phase display name, e.g. "Phase 1: Planning" or "Uncategorized" */
    name: string;
    /** Numeric sort key parsed from "Phase N:" prefix (Infinity = unparseable) */
    order: number;
    /** Tasks belonging to this phase */
    tasks: T[];
    /** Average completion percentage across tasks (0–100) */
    progress: number;
    /** Earliest start date among tasks, or null */
    startDate: Date | null;
    /** Latest end date among tasks, or null */
    endDate: Date | null;
}

// ── Parse phase order ──────────────────────────────────────────────────────────

const PHASE_PREFIX_RE = /^Phase\s+(\d+)/i;

/**
 * Extract a numeric sort key from a phase name.
 * "Phase 2: Execution" → 2
 * "Planning" → Infinity (sorts last)
 */
export function parsePhaseOrder(name: string): number {
    const match = PHASE_PREFIX_RE.exec(name);
    return match ? Number.parseInt(match[1]!, 10) : Number.MAX_SAFE_INTEGER;
}

// ── Group tasks by phase ───────────────────────────────────────────────────────

/**
 * Group an array of items by phase, computing aggregate stats per group.
 *
 * @param items - The array to group
 * @param getPhase - Extract the phase name from an item (null → "Uncategorized")
 * @param getCompletion - Extract completion percentage (0-100)
 * @param getStart - Extract start date (null ok)
 * @param getEnd - Extract end date (null ok)
 * @returns Sorted array of PhaseGroups (by parsed phase order, then alpha)
 */
export function groupByPhase<T>(
    items: T[],
    getPhase: (item: T) => string | null | undefined,
    getCompletion: (item: T) => number,
    getStart: (item: T) => Date | null | undefined,
    getEnd: (item: T) => Date | null | undefined,
): PhaseGroup<T>[] {
    const map = new Map<string, T[]>();

    for (const item of items) {
        const phase = getPhase(item)?.trim() || "Uncategorized";
        const existing = map.get(phase);
        if (existing) {
            existing.push(item);
        } else {
            map.set(phase, [item]);
        }
    }

    const groups: PhaseGroup<T>[] = [];

    for (const [name, tasks] of Array.from(map.entries())) {
        const starts = tasks
            .map(getStart)
            .filter((d): d is Date => d instanceof Date);
        const ends = tasks
            .map(getEnd)
            .filter((d): d is Date => d instanceof Date);

        groups.push({
            name,
            order: parsePhaseOrder(name),
            tasks,
            progress:
                tasks.length > 0
                    ? Math.round(
                        tasks.reduce((sum, t) => sum + getCompletion(t), 0) /
                        tasks.length,
                    )
                    : 0,
            startDate:
                starts.length > 0
                    ? new Date(Math.min(...starts.map((d) => d.getTime())))
                    : null,
            endDate:
                ends.length > 0
                    ? new Date(Math.max(...ends.map((d) => d.getTime())))
                    : null,
        });
    }

    // Sort by order, then alphabetically for same order
    groups.sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.name.localeCompare(b.name);
    });

    return groups;
}

// ── Phase colors ───────────────────────────────────────────────────────────────

const PHASE_COLORS = [
    { bg: "#dbeafe", bar: "#3b82f6", barSelected: "#2563eb" }, // blue
    { bg: "#dcfce7", bar: "#22c55e", barSelected: "#16a34a" }, // green
    { bg: "#fef3c7", bar: "#f59e0b", barSelected: "#d97706" }, // amber
    { bg: "#fce7f3", bar: "#ec4899", barSelected: "#db2777" }, // pink
    { bg: "#e0e7ff", bar: "#6366f1", barSelected: "#4f46e5" }, // indigo
    { bg: "#f3e8ff", bar: "#a855f7", barSelected: "#9333ea" }, // purple
    { bg: "#ccfbf1", bar: "#14b8a6", barSelected: "#0d9488" }, // teal
    { bg: "#ffedd5", bar: "#f97316", barSelected: "#ea580c" }, // orange
];

/**
 * Get consistent colors for a phase by index (cycles through the palette).
 */
export function getPhaseColor(index: number) {
    return PHASE_COLORS[index % PHASE_COLORS.length]!;
}

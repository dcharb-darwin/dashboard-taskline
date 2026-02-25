/**
 * Shared enum types and defaults for DB-driven configurable enums.
 *
 * These defaults are seeded into app_settings on first run and can be
 * edited via the Admin → Statuses & Labels panel.
 */

export type EnumOption = {
    label: string;
    color: string; // Tailwind color key: blue, green, yellow, orange, red, purple, pink, gray
};

export type EnumGroupKey = "projectStatus" | "taskStatus" | "taskPriority" | "riskStatus";

/** All configurable enum groups with their default values. */
export const DEFAULT_ENUMS: Record<EnumGroupKey, EnumOption[]> = {
    projectStatus: [
        { label: "Planning", color: "blue" },
        { label: "Active", color: "green" },
        { label: "On Hold", color: "yellow" },
        { label: "Closeout", color: "orange" },
        { label: "Complete", color: "gray" },
    ],
    taskStatus: [
        { label: "Not Started", color: "gray" },
        { label: "In Progress", color: "blue" },
        { label: "Complete", color: "green" },
        { label: "On Hold", color: "yellow" },
    ],
    taskPriority: [
        { label: "High", color: "red" },
        { label: "Medium", color: "yellow" },
        { label: "Low", color: "gray" },
    ],
    riskStatus: [
        { label: "Open", color: "red" },
        { label: "Mitigated", color: "yellow" },
        { label: "Accepted", color: "blue" },
        { label: "Closed", color: "gray" },
    ],
};

/** Human-readable labels for each enum group. */
export const ENUM_GROUP_LABELS: Record<EnumGroupKey, string> = {
    projectStatus: "Project Statuses",
    taskStatus: "Task Statuses",
    taskPriority: "Task Priorities",
    riskStatus: "Risk Statuses",
};

/** The setting key prefix used in app_settings table. */
export const ENUM_SETTING_PREFIX = "enums.";

/** Build the app_settings key for an enum group. */
export function enumSettingKey(group: EnumGroupKey): string {
    return `${ENUM_SETTING_PREFIX}${group}`;
}

/** Extract just the labels from an enum options array. */
export function enumLabels(options: EnumOption[]): string[] {
    return options.map((o) => o.label);
}

/** Tailwind badge classes for each color key. */
export const COLOR_BADGE_CLASSES: Record<string, string> = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellow-100 text-yellow-700",
    orange: "bg-orange-100 text-orange-700",
    red: "bg-red-100 text-red-700",
    purple: "bg-purple-100 text-purple-700",
    pink: "bg-pink-100 text-pink-700",
    gray: "bg-gray-100 text-gray-700",
};

/** Calendar hex colors for each color key. */
export const COLOR_HEX: Record<string, string> = {
    blue: "#6366f1",
    green: "#10b981",
    yellow: "#f59e0b",
    orange: "#f97316",
    red: "#ef4444",
    purple: "#8b5cf6",
    pink: "#ec4899",
    gray: "#6b7280",
};

/** Available color keys for the admin color picker. */
export const AVAILABLE_COLORS = Object.keys(COLOR_BADGE_CLASSES);

/** Get the badge class for a label within an options array. Falls back to gray. */
export function getBadgeClass(options: EnumOption[], label: string): string {
    const option = options.find((o) => o.label === label);
    return COLOR_BADGE_CLASSES[option?.color ?? "gray"] ?? COLOR_BADGE_CLASSES.gray;
}

/** Get the hex color for a label within an options array. Falls back to gray. */
export function getHexColor(options: EnumOption[], label: string): string {
    const option = options.find((o) => o.label === label);
    return COLOR_HEX[option?.color ?? "gray"] ?? COLOR_HEX.gray;
}

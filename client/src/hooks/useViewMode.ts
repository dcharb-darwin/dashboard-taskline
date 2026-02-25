import { useState, useCallback } from "react";

export type ViewMode = "card" | "table";

/**
 * Persists card/table view mode preference per page key in localStorage.
 */
export function useViewMode(key: string, defaultMode: ViewMode = "card"): [ViewMode, (mode: ViewMode) => void] {
    const storageKey = `viewMode:${key}`;

    const [mode, setModeState] = useState<ViewMode>(() => {
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored === "card" || stored === "table") return stored;
        } catch {
            // SSR or restricted localStorage
        }
        return defaultMode;
    });

    const setMode = useCallback(
        (newMode: ViewMode) => {
            setModeState(newMode);
            try {
                localStorage.setItem(storageKey, newMode);
            } catch {
                // ignore
            }
        },
        [storageKey],
    );

    return [mode, setMode];
}

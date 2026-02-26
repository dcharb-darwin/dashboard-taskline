import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type ViewMode = "mvp" | "vision";

interface ViewModeContextValue {
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    isMvp: boolean;
}

const STORAGE_KEY = "taskline-view-mode";

const ViewModeContext = createContext<ViewModeContextValue | undefined>(undefined);

function getInitialMode(): ViewMode {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "mvp" || stored === "vision") return stored;
    } catch {
        // SSR or restricted storage
    }
    return "mvp";
}

export function ViewModeProvider({ children }: { children: ReactNode }) {
    const [viewMode, setViewModeState] = useState<ViewMode>(getInitialMode);

    const setViewMode = (mode: ViewMode) => {
        setViewModeState(mode);
        try {
            localStorage.setItem(STORAGE_KEY, mode);
        } catch {
            // ignore
        }
    };

    // Sync across tabs
    useEffect(() => {
        const handler = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY && (e.newValue === "mvp" || e.newValue === "vision")) {
                setViewModeState(e.newValue);
            }
        };
        window.addEventListener("storage", handler);
        return () => window.removeEventListener("storage", handler);
    }, []);

    return (
        <ViewModeContext.Provider value={{ viewMode, setViewMode, isMvp: viewMode === "mvp" }}>
            {children}
        </ViewModeContext.Provider>
    );
}

export function useViewMode() {
    const ctx = useContext(ViewModeContext);
    if (!ctx) throw new Error("useViewMode must be used within ViewModeProvider");
    return ctx;
}

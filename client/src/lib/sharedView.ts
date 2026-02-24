export type ProjectStatusFilter = "all" | "Planning" | "Active" | "On Hold" | "Complete";

type SharedView = {
  projectStatus: ProjectStatusFilter;
  selectedProject: string;
};

const SHARED_VIEW_KEY = "rtc-shared-project-view";

const defaultSharedView: SharedView = {
  projectStatus: "all",
  selectedProject: "all",
};

export const getSharedView = (): SharedView => {
  try {
    const raw = localStorage.getItem(SHARED_VIEW_KEY);
    if (!raw) return defaultSharedView;
    const parsed = JSON.parse(raw) as Partial<SharedView>;
    return {
      projectStatus:
        parsed.projectStatus === "Planning" ||
        parsed.projectStatus === "Active" ||
        parsed.projectStatus === "On Hold" ||
        parsed.projectStatus === "Complete" ||
        parsed.projectStatus === "all"
          ? parsed.projectStatus
          : "all",
      selectedProject:
        typeof parsed.selectedProject === "string" && parsed.selectedProject
          ? parsed.selectedProject
          : "all",
    };
  } catch {
    return defaultSharedView;
  }
};

export const updateSharedView = (update: Partial<SharedView>) => {
  const current = getSharedView();
  const next = {
    ...current,
    ...update,
  };
  localStorage.setItem(SHARED_VIEW_KEY, JSON.stringify(next));
};

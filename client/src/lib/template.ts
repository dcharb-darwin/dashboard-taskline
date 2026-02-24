export type TemplateTask = {
  taskId?: string;
  taskDescription?: string;
  description?: string;
  phase?: string;
  priority?: string;
  owner?: string;
  dependency?: string;
  durationDays?: number;
  approvalRequired?: "Yes" | "No";
  deliverableType?: string;
  notes?: string;
};

const TEMPLATE_LABELS: Record<string, string> = {
  generic_project: "Generic Project",
  marketing_campaign: "Marketing Campaign",
  event_plan: "Event Plan",
  presentation: "Presentation",
  survey: "Survey",
  press_release: "Press Release",
  social_media_campaign: "Social Media Campaign",
  planning_study: "Planning Study",
  poster: "Poster",
  video_project: "Video Project",
  public_notice: "Public Notice",
  media_buy: "Media Buy",
  op_ed: "Op-Ed",
  other_custom: "Other/Custom",
};

export function normalizeTemplateKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function formatTemplateLabel(value?: string | null) {
  if (!value) return "Unknown";
  const normalized = normalizeTemplateKey(value);
  return TEMPLATE_LABELS[normalized] ?? value;
}

export function parseTemplateTasks(sampleTasks?: string | null): TemplateTask[] {
  if (!sampleTasks) return [];

  try {
    const parsed = JSON.parse(sampleTasks);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is TemplateTask =>
        typeof item === "object" && item !== null
    );
  } catch {
    return [];
  }
}

import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import {
  type AppSetting,
  type AuditLog,
  type InsertAuditLog,
  type InsertNotificationEvent,
  type InsertNotificationPreference,
  type InsertProjectActivity,
  type InsertProjectComment,
  type InsertProject,
  type InsertProjectRisk,
  type InsertProjectTag,
  type InsertSavedView,
  type InsertTemplate,
  type InsertTask,
  type InsertUserAccessPolicy,
  type InsertUser,
  type InsertWebhookSubscription,
  type NotificationEvent,
  type NotificationPreference,
  type ProjectActivity,
  type ProjectComment,
  type Project,
  type ProjectRisk,
  type ProjectTag,
  type ProjectNote,
  type SavedView,
  type Task,
  type TaskNote,
  type Template,
  type UserAccessPolicy,
  type WebhookSubscription,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export type TemplateStatus = Template["status"];
export type NotificationScopeType = NotificationPreference["scopeType"];
export type NotificationEventType = NotificationEvent["eventType"];
export type GovernanceRole = UserAccessPolicy["accessRole"];

const YES_NO_YES = "Yes" as const;
const YES_NO_NO = "No" as const;
const DUE_SOON_WINDOW_DAYS = 3;

const DEFAULT_NOTIFICATION_SCOPE = {
  scopeType: "team" as const,
  scopeKey: "default",
};

type TemplateQueryOptions = {
  status?: TemplateStatus | "All";
  includeArchived?: boolean;
  templateGroupKey?: string;
};

export type DependencyValidationIssue = {
  type: "missing_dependency" | "date_conflict" | "cycle";
  taskId: string;
  dependencyTaskId?: string;
  message: string;
};

export type CriticalPathSummary = {
  projectId: number;
  taskIds: number[];
  taskCodes: string[];
  totalDurationDays: number;
  blockedByCycle: boolean;
};

export type PortfolioProjectHealth = "On Track" | "At Risk" | "Off Track";

export type PortfolioSummary = {
  totals: {
    totalProjects: number;
    activeProjects: number;
    onTrack: number;
    atRisk: number;
    offTrack: number;
    averageCompletionPercent: number;
  };
  milestoneConfidence: {
    high: number;
    medium: number;
    low: number;
  };
  throughputByWeek: Array<{
    weekStart: string;
    completedTasks: number;
  }>;
  topRisks: Array<{
    projectId: number;
    projectName: string;
    health: PortfolioProjectHealth;
    overdueTasks: number;
    blockedTasks: number;
  }>;
  projectHealth: Array<{
    projectId: number;
    health: PortfolioProjectHealth;
  }>;
};

export type AuditEntityType = AuditLog["entityType"];

type WebhookEventName =
  | "project.created"
  | "project.updated"
  | "project.deleted"
  | "task.created"
  | "task.updated"
  | "task.deleted"
  | "template.created"
  | "template.updated"
  | "template.published"
  | "template.archived"
  | "integration.external_event";

type DeliveryChannel = "in_app" | "email" | "slack" | "webhook";

type NotificationPreferencesPatch = Partial<
  Pick<
    NotificationPreference,
    | "inAppEnabled"
    | "emailEnabled"
    | "slackEnabled"
    | "webhookEnabled"
    | "webhookUrl"
    | "overdueEnabled"
    | "dueSoonEnabled"
    | "assignmentEnabled"
    | "statusChangeEnabled"
  >
>;

type TemplateTaskSeed = {
  taskId: string;
  taskDescription: string;
  phase: string;
  milestone?: string;
  priority?: Task["priority"];
  owner?: string;
  dependency?: string;
  approvalRequired?: Task["approvalRequired"];
  approver?: string;
  deliverableType?: string;
  notes?: string;
};

type TemplateSeed = {
  name: string;
  key: string;
  description: string;
  phases: string[];
  tasks: TemplateTaskSeed[];
};

const templateTask = (
  taskId: string,
  taskDescription: string,
  phase: string,
  overrides: Partial<TemplateTaskSeed> = {}
): TemplateTaskSeed => ({
  taskId,
  taskDescription,
  phase,
  priority: "Medium",
  ...overrides,
});

const normalizeTemplateKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const getTemplateGroupKey = (templateKey: string) =>
  normalizeTemplateKey(templateKey).replace(/_v\d+$/, "");

const TEMPLATE_SEED: TemplateSeed[] = [
  {
    name: "Generic Project",
    key: "generic_project",
    description: "Universal template for any project type",
    phases: ["Phase 1: Project Initiation & Planning", "Phase 2: Execution & Development", "Phase 3: Review & Approval", "Phase 4: Launch & Distribution", "Phase 5: Post-Project Evaluation"],
    tasks: [
      templateTask("T001", "Define project objectives and success metrics", "Phase 1: Project Initiation & Planning", { "priority": "High", "owner": "Project Manager", "notes": "Clearly articulate what success looks like" }),
      templateTask("T002", "Identify stakeholders and create communication plan", "Phase 1: Project Initiation & Planning", { "priority": "High", "owner": "Project Manager", "notes": "Include internal and external stakeholders" }),
      templateTask("T003", "Develop project timeline and milestones", "Phase 1: Project Initiation & Planning", { "priority": "High", "owner": "Project Manager", "notes": "Be realistic with deadlines" }),
      templateTask("T004", "Determine budget and resource requirements", "Phase 1: Project Initiation & Planning", { "owner": "Project Manager", "notes": "Include contingency buffer" }),
      templateTask("T005", "Execute primary project activities", "Phase 2: Execution & Development", { "priority": "High", "owner": "Team", "notes": "Main work phase" }),
      templateTask("T006", "Monitor progress and adjust as needed", "Phase 2: Execution & Development", { "owner": "Project Manager", "notes": "Weekly check-ins recommended" }),
      templateTask("T007", "Coordinate with stakeholders", "Phase 2: Execution & Development", { "owner": "Project Manager", "notes": "Regular updates" }),
      templateTask("T008", "Internal team review", "Phase 3: Review & Approval", { "priority": "High", "owner": "Project Manager", "notes": "First level of review" }),
      templateTask("T009", "Department director review", "Phase 3: Review & Approval", { "priority": "High", "owner": "Director", "notes": "Second level of review" }),
      templateTask("T010", "C-Suite approval", "Phase 3: Review & Approval", { "priority": "High", "owner": "Executive", "notes": "Final approval" }),
      templateTask("T011", "Execute launch activities", "Phase 4: Launch & Distribution", { "priority": "High", "owner": "Team", "notes": "Go-live activities" }),
      templateTask("T012", "Distribute deliverables", "Phase 4: Launch & Distribution", { "priority": "High", "owner": "Project Manager", "notes": "To all stakeholders" }),
      templateTask("T013", "Monitor initial performance", "Phase 4: Launch & Distribution", { "owner": "Project Manager", "notes": "First week critical" }),
      templateTask("T014", "Gather feedback from stakeholders", "Phase 5: Post-Project Evaluation", { "owner": "Project Manager", "notes": "Survey or interviews" }),
      templateTask("T015", "Compile lessons learned", "Phase 5: Post-Project Evaluation", { "owner": "Project Manager", "notes": "Document for future projects" }),
      templateTask("T016", "Create final project report", "Phase 5: Post-Project Evaluation", { "priority": "Low", "owner": "Project Manager", "notes": "Archive all materials" }),
    ],
  },
  {
    name: "Marketing Campaign",
    key: "marketing_campaign",
    description: "Marketing and promotional campaigns",
    phases: ["Phase 1: Campaign Planning & Strategy", "Phase 2: Creative Development", "Phase 3: Internal Review & Approval", "Phase 4: Pre-Launch Activities", "Phase 5: Campaign Launch", "Phase 6: Monitoring & Optimization", "Phase 7: Post-Campaign Analysis"],
    tasks: [
      templateTask("T001", "Define campaign objectives and target audience", "Phase 1: Campaign Planning & Strategy", { "priority": "High", "owner": "Marketing Manager", "notes": "Include demographic and psychographic details" }),
      templateTask("T002", "Develop campaign strategy and key messages", "Phase 1: Campaign Planning & Strategy", { "priority": "High", "owner": "Marketing Manager", "notes": "Align with organizational goals" }),
      templateTask("T003", "Create campaign budget and resource plan", "Phase 1: Campaign Planning & Strategy", { "priority": "High", "owner": "Marketing Manager", "notes": "Include all costs: creative, media, production" }),
      templateTask("T004", "Develop campaign timeline with milestones", "Phase 1: Campaign Planning & Strategy", { "priority": "High", "owner": "Marketing Manager", "notes": "Work backwards from launch date" }),
      templateTask("T005", "Submit creative request to GAMM", "Phase 2: Creative Development", { "priority": "High", "owner": "Project Manager", "notes": "Include all specifications and deadlines" }),
      templateTask("T006", "Develop creative brief", "Phase 2: Creative Development", { "priority": "High", "owner": "Creative Team", "notes": "Clear direction for designers" }),
      templateTask("T007", "Create social media content and graphics", "Phase 2: Creative Development", { "priority": "High", "owner": "Creative Team", "notes": "Multiple platforms and formats" }),
      templateTask("T008", "Produce videos and multimedia assets", "Phase 2: Creative Development", { "owner": "Creative Team", "notes": "Include scripts and storyboards" }),
      templateTask("T009", "Write campaign copy and messaging", "Phase 2: Creative Development", { "priority": "High", "owner": "Content Writer", "notes": "All channels and touchpoints" }),
      templateTask("T010", "Project manager review of creative assets", "Phase 3: Internal Review & Approval", { "priority": "High", "owner": "Project Manager", "notes": "First review for accuracy and alignment" }),
      templateTask("T011", "GAMM team review", "Phase 3: Internal Review & Approval", { "priority": "High", "owner": "GAMM", "notes": "Brand consistency check" }),
      templateTask("T012", "Department director review", "Phase 3: Internal Review & Approval", { "priority": "High", "owner": "Director", "notes": "Strategic alignment" }),
      templateTask("T013", "C-Suite approval", "Phase 3: Internal Review & Approval", { "priority": "High", "owner": "Executive", "notes": "Final sign-off" }),
      templateTask("T014", "Incorporate feedback and finalize assets", "Phase 3: Internal Review & Approval", { "priority": "High", "owner": "Creative Team", "notes": "All revisions complete" }),
      templateTask("T015", "Develop media distribution list", "Phase 4: Pre-Launch Activities", { "owner": "PR Team", "notes": "Local and national outlets" }),
      templateTask("T016", "Draft and distribute media advisory", "Phase 4: Pre-Launch Activities", { "owner": "PR Team", "notes": "2 weeks before launch" }),
      templateTask("T017", "Schedule social media posts", "Phase 4: Pre-Launch Activities", { "priority": "High", "owner": "Social Media Manager", "notes": "Use scheduling platform" }),
      templateTask("T018", "Coordinate with partners and stakeholders", "Phase 4: Pre-Launch Activities", { "owner": "Project Manager", "notes": "Ensure alignment" }),
      templateTask("T019", "Prepare talking points for spokespeople", "Phase 4: Pre-Launch Activities", { "owner": "PR Team", "notes": "Key messages and Q&A" }),
      templateTask("T020", "Launch campaign across all channels", "Phase 5: Campaign Launch", { "priority": "High", "owner": "Marketing Team", "notes": "Coordinated go-live" }),
      templateTask("T021", "Distribute press release", "Phase 5: Campaign Launch", { "priority": "High", "owner": "PR Team", "notes": "Same day as launch" }),
      templateTask("T022", "Monitor social media engagement", "Phase 5: Campaign Launch", { "priority": "High", "owner": "Social Media Manager", "notes": "Real-time monitoring" }),
      templateTask("T023", "Respond to media inquiries", "Phase 5: Campaign Launch", { "priority": "High", "owner": "PR Team", "notes": "Timely responses critical" }),
      templateTask("T024", "Track campaign performance metrics daily", "Phase 6: Monitoring & Optimization", { "priority": "High", "owner": "Marketing Manager", "notes": "KPIs defined in planning phase" }),
      templateTask("T025", "Optimize content based on engagement", "Phase 6: Monitoring & Optimization", { "owner": "Social Media Manager", "notes": "A/B testing as needed" }),
      templateTask("T026", "Adjust media spend if applicable", "Phase 6: Monitoring & Optimization", { "owner": "Marketing Manager", "notes": "Maximize ROI" }),
      templateTask("T027", "Provide weekly status updates to stakeholders", "Phase 6: Monitoring & Optimization", { "owner": "Project Manager", "notes": "Dashboard or report format" }),
      templateTask("T028", "Compile campaign performance data", "Phase 7: Post-Campaign Analysis", { "priority": "High", "owner": "Marketing Manager", "notes": "All metrics and KPIs" }),
      templateTask("T029", "Analyze results against objectives", "Phase 7: Post-Campaign Analysis", { "priority": "High", "owner": "Marketing Manager", "notes": "What worked, what didn't" }),
      templateTask("T030", "Create post-campaign report", "Phase 7: Post-Campaign Analysis", { "priority": "High", "owner": "Marketing Manager", "notes": "Include recommendations" }),
      templateTask("T031", "Present findings to leadership", "Phase 7: Post-Campaign Analysis", { "owner": "Marketing Manager", "notes": "Lessons learned" }),
      templateTask("T032", "Archive campaign materials", "Phase 7: Post-Campaign Analysis", { "priority": "Low", "owner": "Project Manager", "notes": "For future reference" }),
    ],
  },
  {
    name: "Event Plan",
    key: "event_plan",
    description: "Events, press conferences, and community gatherings",
    phases: ["Phase 1: Event Concept & Planning", "Phase 2: Logistics & Coordination", "Phase 3: Marketing & Promotion", "Phase 4: Pre-Event Preparation", "Phase 5: Event Execution", "Phase 6: Post-Event Follow-Up"],
    tasks: [
      templateTask("T001", "Define event objectives and success metrics", "Phase 1: Event Concept & Planning", { "priority": "High", "owner": "Event Manager", "notes": "What does success look like?" }),
      templateTask("T002", "Determine event date, time, and duration", "Phase 1: Event Concept & Planning", { "priority": "High", "owner": "Event Manager", "notes": "Check for conflicts with other events" }),
      templateTask("T003", "Secure venue and confirm availability", "Phase 1: Event Concept & Planning", { "priority": "High", "owner": "Event Manager", "notes": "Site visit recommended" }),
      templateTask("T004", "Develop event budget", "Phase 1: Event Concept & Planning", { "priority": "High", "owner": "Event Manager", "notes": "Include all costs: venue, catering, AV, materials" }),
      templateTask("T005", "Create preliminary run-of-show", "Phase 1: Event Concept & Planning", { "priority": "High", "owner": "Event Manager", "notes": "Timing for each segment" }),
      templateTask("T006", "Develop speaker list and confirm attendance", "Phase 2: Logistics & Coordination", { "priority": "High", "owner": "Event Manager", "notes": "Include backup speakers" }),
      templateTask("T007", "Create invitee list (elected officials, media, partners)", "Phase 2: Logistics & Coordination", { "priority": "High", "owner": "Event Manager", "notes": "Categorize by priority" }),
      templateTask("T008", "Order catering and refreshments", "Phase 2: Logistics & Coordination", { "owner": "Event Manager", "notes": "Confirm dietary restrictions" }),
      templateTask("T009", "Arrange AV equipment and technical needs", "Phase 2: Logistics & Coordination", { "priority": "High", "owner": "Event Manager", "notes": "Microphones, projector, sound system" }),
      templateTask("T010", "Coordinate transportation and parking", "Phase 2: Logistics & Coordination", { "owner": "Event Manager", "notes": "Signage and directions" }),
      templateTask("T011", "Arrange event rentals (chairs, tables, tents)", "Phase 2: Logistics & Coordination", { "owner": "Event Manager", "notes": "Confirm delivery and setup times" }),
      templateTask("T012", "Design and produce invitations", "Phase 3: Marketing & Promotion", { "priority": "High", "owner": "Creative Team", "notes": "Submit to GAMM" }),
      templateTask("T013", "Distribute invitations", "Phase 3: Marketing & Promotion", { "priority": "High", "owner": "Event Manager", "notes": "Track RSVPs" }),
      templateTask("T014", "Draft and distribute media advisory", "Phase 3: Marketing & Promotion", { "owner": "PR Team", "notes": "2 weeks before event" }),
      templateTask("T015", "Create promotional social media content", "Phase 3: Marketing & Promotion", { "owner": "Social Media Manager", "notes": "Build anticipation" }),
      templateTask("T016", "Develop event fact sheets and materials", "Phase 3: Marketing & Promotion", { "owner": "Event Manager", "notes": "For media and attendees" }),
      templateTask("T017", "Finalize run-of-show", "Phase 4: Pre-Event Preparation", { "priority": "High", "owner": "Event Manager", "notes": "Share with all participants" }),
      templateTask("T018", "Prepare speaker remarks and talking points", "Phase 4: Pre-Event Preparation", { "priority": "High", "owner": "PR Team", "notes": "Review with speakers" }),
      templateTask("T019", "Conduct site walkthrough with IT and vendors", "Phase 4: Pre-Event Preparation", { "priority": "High", "owner": "Event Manager", "notes": "Test all equipment" }),
      templateTask("T020", "Create event signage and directional signs", "Phase 4: Pre-Event Preparation", { "owner": "Creative Team", "notes": "Parking, registration, restrooms" }),
      templateTask("T021", "Prepare registration materials and name tags", "Phase 4: Pre-Event Preparation", { "owner": "Event Manager", "notes": "Alphabetize for easy check-in" }),
      templateTask("T022", "Confirm final headcount with caterer", "Phase 4: Pre-Event Preparation", { "owner": "Event Manager", "notes": "24-48 hours before" }),
      templateTask("T023", "Brief event staff on roles and responsibilities", "Phase 4: Pre-Event Preparation", { "priority": "High", "owner": "Event Manager", "notes": "Walk through timeline" }),
      templateTask("T024", "Set up venue and registration area", "Phase 5: Event Execution", { "priority": "High", "owner": "Event Staff", "notes": "Arrive early for setup" }),
      templateTask("T025", "Test all AV equipment", "Phase 5: Event Execution", { "priority": "High", "owner": "IT Team", "notes": "Before guests arrive" }),
      templateTask("T026", "Greet and register attendees", "Phase 5: Event Execution", { "priority": "High", "owner": "Event Staff", "notes": "Friendly and efficient" }),
      templateTask("T027", "Execute event according to run-of-show", "Phase 5: Event Execution", { "priority": "High", "owner": "Event Manager", "notes": "Keep on schedule" }),
      templateTask("T028", "Capture photos and video", "Phase 5: Event Execution", { "priority": "High", "owner": "Creative Team", "notes": "B-roll and key moments" }),
      templateTask("T029", "Facilitate media interviews", "Phase 5: Event Execution", { "owner": "PR Team", "notes": "Designated interview area" }),
      templateTask("T030", "Distribute press materials to media", "Phase 5: Event Execution", { "owner": "PR Team", "notes": "Press release and fact sheets" }),
      templateTask("T031", "Distribute press release to media", "Phase 6: Post-Event Follow-Up", { "priority": "High", "owner": "PR Team", "notes": "Same day or next business day" }),
      templateTask("T032", "Post event recap on social media", "Phase 6: Post-Event Follow-Up", { "priority": "High", "owner": "Social Media Manager", "notes": "Photos and highlights" }),
      templateTask("T033", "Create event recap blog post", "Phase 6: Post-Event Follow-Up", { "owner": "Content Writer", "notes": "Include photos and quotes" }),
      templateTask("T034", "Send thank you communications to speakers and attendees", "Phase 6: Post-Event Follow-Up", { "owner": "Event Manager", "notes": "Within one week" }),
      templateTask("T035", "Compile event metrics and attendance data", "Phase 6: Post-Event Follow-Up", { "owner": "Event Manager", "notes": "For reporting" }),
      templateTask("T036", "Create post-event report", "Phase 6: Post-Event Follow-Up", { "owner": "Event Manager", "notes": "Lessons learned and recommendations" }),
      templateTask("T037", "Process invoices and close out budget", "Phase 6: Post-Event Follow-Up", { "priority": "Low", "owner": "Event Manager", "notes": "Reconcile all expenses" }),
    ],
  },
  {
    name: "Presentation",
    key: "presentation",
    description: "Presentations, briefings, and meetings",
    phases: ["Phase 1: Presentation Planning", "Phase 2: Content Development", "Phase 3: Review & Revisions", "Phase 4: Final Approval", "Phase 5: Presentation Delivery"],
    tasks: [
      templateTask("T001", "Identify presentation purpose and objectives", "Phase 1: Presentation Planning", { "priority": "High", "owner": "Project Manager", "notes": "What action or decision is needed?" }),
      templateTask("T002", "Define target audience and their needs", "Phase 1: Presentation Planning", { "priority": "High", "owner": "Project Manager", "notes": "Tailor content to audience" }),
      templateTask("T003", "Determine key messages and takeaways", "Phase 1: Presentation Planning", { "priority": "High", "owner": "Project Manager", "notes": "3-5 main points maximum" }),
      templateTask("T004", "Gather data and supporting materials", "Phase 1: Presentation Planning", { "owner": "Project Manager", "notes": "Charts, statistics, examples" }),
      templateTask("T005", "Create presentation outline", "Phase 1: Presentation Planning", { "priority": "High", "owner": "Project Manager", "notes": "Logical flow of information" }),
      templateTask("T006", "Submit creative request to GAMM", "Phase 2: Content Development", { "priority": "High", "owner": "Project Manager", "notes": "Include deadline and specifications" }),
      templateTask("T007", "Draft presentation slides", "Phase 2: Content Development", { "priority": "High", "owner": "Creative Team", "notes": "Follow brand guidelines" }),
      templateTask("T008", "Develop speaker notes", "Phase 2: Content Development", { "owner": "Project Manager", "notes": "Key points for each slide" }),
      templateTask("T009", "Create data visualizations and charts", "Phase 2: Content Development", { "owner": "Creative Team", "notes": "Clear and easy to understand" }),
      templateTask("T010", "Source images and graphics", "Phase 2: Content Development", { "priority": "Low", "owner": "Creative Team", "notes": "High quality and relevant" }),
      templateTask("T011", "Project manager review", "Phase 3: Review & Revisions", { "priority": "High", "owner": "Project Manager", "notes": "Content accuracy and completeness" }),
      templateTask("T012", "GAMM review", "Phase 3: Review & Revisions", { "priority": "High", "owner": "GAMM", "notes": "Design and brand consistency" }),
      templateTask("T013", "Department director review", "Phase 3: Review & Revisions", { "priority": "High", "owner": "Director", "notes": "Strategic alignment" }),
      templateTask("T014", "Incorporate feedback and revise", "Phase 3: Review & Revisions", { "priority": "High", "owner": "Creative Team", "notes": "Track changes for approval" }),
      templateTask("T015", "C-Suite review and approval", "Phase 4: Final Approval", { "priority": "High", "owner": "Executive", "notes": "Final sign-off" }),
      templateTask("T016", "Finalize presentation file", "Phase 4: Final Approval", { "priority": "High", "owner": "Creative Team", "notes": "All edits complete" }),
      templateTask("T017", "Create handouts if needed", "Phase 4: Final Approval", { "priority": "Low", "owner": "Creative Team", "notes": "Print-ready format" }),
      templateTask("T018", "Test presentation on delivery equipment", "Phase 4: Final Approval", { "owner": "IT Team", "notes": "Avoid technical issues" }),
      templateTask("T019", "Conduct rehearsal with speaker", "Phase 5: Presentation Delivery", { "priority": "High", "owner": "Project Manager", "notes": "Practice timing and transitions" }),
      templateTask("T020", "Prepare Q&A talking points", "Phase 5: Presentation Delivery", { "owner": "Project Manager", "notes": "Anticipate questions" }),
      templateTask("T021", "Deliver presentation", "Phase 5: Presentation Delivery", { "priority": "High", "owner": "Speaker", "notes": "Engage audience" }),
      templateTask("T022", "Facilitate Q&A session", "Phase 5: Presentation Delivery", { "owner": "Speaker", "notes": "Clear and concise responses" }),
      templateTask("T023", "Distribute presentation to attendees", "Phase 5: Presentation Delivery", { "priority": "Low", "owner": "Project Manager", "notes": "Email or shared drive" }),
    ],
  },
  {
    name: "Survey",
    key: "survey",
    description: "Survey design and analysis",
    phases: ["Phase 1: Survey Planning", "Phase 2: Survey Development", "Phase 3: Testing & Approval", "Phase 4: Survey Deployment", "Phase 5: Data Collection", "Phase 6: Analysis & Reporting"],
    tasks: [
      templateTask("T001", "Define survey objectives and research questions", "Phase 1: Survey Planning", { "priority": "High", "owner": "Project Manager", "notes": "What do you need to learn?" }),
      templateTask("T002", "Identify target audience and sample size", "Phase 1: Survey Planning", { "priority": "High", "owner": "Project Manager", "notes": "Representative sample" }),
      templateTask("T003", "Determine survey methodology", "Phase 1: Survey Planning", { "priority": "High", "owner": "Project Manager", "notes": "Online, phone, in-person, or mixed" }),
      templateTask("T004", "Select survey platform or tool", "Phase 1: Survey Planning", { "owner": "Project Manager", "notes": "SurveyMonkey, Qualtrics, etc." }),
      templateTask("T005", "Develop survey timeline", "Phase 1: Survey Planning", { "priority": "High", "owner": "Project Manager", "notes": "Deployment to final report" }),
      templateTask("T006", "Draft survey questions", "Phase 2: Survey Development", { "priority": "High", "owner": "Project Manager", "notes": "Clear, unbiased, and relevant" }),
      templateTask("T007", "Determine question types and response options", "Phase 2: Survey Development", { "priority": "High", "owner": "Project Manager", "notes": "Multiple choice, scale, open-ended" }),
      templateTask("T008", "Create survey logic and branching", "Phase 2: Survey Development", { "owner": "Project Manager", "notes": "Skip patterns if needed" }),
      templateTask("T009", "Write survey introduction and instructions", "Phase 2: Survey Development", { "owner": "Project Manager", "notes": "Explain purpose and time estimate" }),
      templateTask("T010", "Design survey layout in platform", "Phase 2: Survey Development", { "priority": "High", "owner": "Project Manager", "notes": "User-friendly interface" }),
      templateTask("T011", "Conduct internal test of survey", "Phase 3: Testing & Approval", { "priority": "High", "owner": "Project Team", "notes": "Check for errors and clarity" }),
      templateTask("T012", "Pilot test with small sample", "Phase 3: Testing & Approval", { "priority": "High", "owner": "Project Manager", "notes": "5-10 people from target audience" }),
      templateTask("T013", "Review pilot results and refine questions", "Phase 3: Testing & Approval", { "priority": "High", "owner": "Project Manager", "notes": "Address any confusion" }),
      templateTask("T014", "Department director review and approval", "Phase 3: Testing & Approval", { "priority": "High", "owner": "Director", "notes": "Final sign-off on content" }),
      templateTask("T015", "Finalize survey and set live date", "Phase 4: Survey Deployment", { "priority": "High", "owner": "Project Manager", "notes": "Double-check all settings" }),
      templateTask("T016", "Create survey distribution list", "Phase 4: Survey Deployment", { "priority": "High", "owner": "Project Manager", "notes": "Email, SMS, or web link" }),
      templateTask("T017", "Develop promotional materials", "Phase 4: Survey Deployment", { "owner": "Creative Team", "notes": "Email, social media, flyers" }),
      templateTask("T018", "Deploy survey to target audience", "Phase 4: Survey Deployment", { "priority": "High", "owner": "Project Manager", "notes": "Launch on schedule" }),
      templateTask("T019", "Send reminder communications", "Phase 4: Survey Deployment", { "owner": "Project Manager", "notes": "Midpoint and near closing" }),
      templateTask("T020", "Monitor response rates daily", "Phase 5: Data Collection", { "priority": "High", "owner": "Project Manager", "notes": "Track progress toward goal" }),
      templateTask("T021", "Address technical issues promptly", "Phase 5: Data Collection", { "priority": "High", "owner": "Project Manager", "notes": "Ensure accessibility" }),
      templateTask("T022", "Send additional reminders if needed", "Phase 5: Data Collection", { "owner": "Project Manager", "notes": "Boost response rate" }),
      templateTask("T023", "Close survey on scheduled end date", "Phase 5: Data Collection", { "priority": "High", "owner": "Project Manager", "notes": "No late responses" }),
      templateTask("T024", "Export and clean survey data", "Phase 6: Analysis & Reporting", { "priority": "High", "owner": "Project Manager", "notes": "Remove incomplete or invalid responses" }),
      templateTask("T025", "Analyze quantitative data", "Phase 6: Analysis & Reporting", { "priority": "High", "owner": "Analyst", "notes": "Descriptive statistics and trends" }),
      templateTask("T026", "Code and analyze qualitative responses", "Phase 6: Analysis & Reporting", { "priority": "High", "owner": "Analyst", "notes": "Themes and patterns" }),
      templateTask("T027", "Create data visualizations", "Phase 6: Analysis & Reporting", { "owner": "Analyst", "notes": "Charts and graphs for key findings" }),
      templateTask("T028", "Draft survey findings report", "Phase 6: Analysis & Reporting", { "priority": "High", "owner": "Project Manager", "notes": "Executive summary and detailed results" }),
      templateTask("T029", "Review report with stakeholders", "Phase 6: Analysis & Reporting", { "owner": "Project Manager", "notes": "Validate findings" }),
      templateTask("T030", "Finalize and distribute report", "Phase 6: Analysis & Reporting", { "priority": "High", "owner": "Project Manager", "notes": "To all stakeholders" }),
      templateTask("T031", "Present findings to leadership", "Phase 6: Analysis & Reporting", { "owner": "Project Manager", "notes": "Recommendations for action" }),
    ],
  },
  {
    name: "Press Release",
    key: "press_release",
    description: "Press releases and announcements",
    phases: ["Phase 1: Planning & Research", "Phase 2: Drafting", "Phase 3: Review & Approval", "Phase 4: Distribution", "Phase 5: Follow-Up"],
    tasks: [
      templateTask("T001", "Identify news angle and key messages", "Phase 1: Planning & Research", { "priority": "High", "owner": "PR Manager", "notes": "Why is this newsworthy?" }),
      templateTask("T002", "Gather facts, data, and background information", "Phase 1: Planning & Research", { "priority": "High", "owner": "PR Manager", "notes": "Accurate and complete" }),
      templateTask("T003", "Identify and confirm quote sources", "Phase 1: Planning & Research", { "priority": "High", "owner": "PR Manager", "notes": "CEO, elected officials, partners" }),
      templateTask("T004", "Determine target media outlets", "Phase 1: Planning & Research", { "owner": "PR Manager", "notes": "Local, national, trade publications" }),
      templateTask("T005", "Set distribution timeline", "Phase 1: Planning & Research", { "priority": "High", "owner": "PR Manager", "notes": "Coordinate with event or announcement" }),
      templateTask("T006", "Write press release headline", "Phase 2: Drafting", { "priority": "High", "owner": "PR Manager", "notes": "Attention-grabbing and informative" }),
      templateTask("T007", "Draft press release body", "Phase 2: Drafting", { "priority": "High", "owner": "PR Manager", "notes": "Inverted pyramid structure" }),
      templateTask("T008", "Include quotes from key stakeholders", "Phase 2: Drafting", { "priority": "High", "owner": "PR Manager", "notes": "Add credibility and human element" }),
      templateTask("T009", "Add boilerplate about RTC", "Phase 2: Drafting", { "priority": "Low", "owner": "PR Manager", "notes": "Standard organizational description" }),
      templateTask("T010", "Include media contact information", "Phase 2: Drafting", { "owner": "PR Manager", "notes": "Name, phone, email" }),
      templateTask("T011", "Project manager review", "Phase 3: Review & Approval", { "priority": "High", "owner": "Project Manager", "notes": "Accuracy and completeness" }),
      templateTask("T012", "TWG review", "Phase 3: Review & Approval", { "priority": "High", "owner": "The Warren Group", "notes": "Media relations perspective" }),
      templateTask("T013", "Senior director review", "Phase 3: Review & Approval", { "priority": "High", "owner": "Senior Director", "notes": "Strategic alignment" }),
      templateTask("T014", "C-Suite approval", "Phase 3: Review & Approval", { "priority": "High", "owner": "Executive", "notes": "Final sign-off" }),
      templateTask("T015", "Finalize press release", "Phase 3: Review & Approval", { "priority": "High", "owner": "PR Manager", "notes": "Incorporate all feedback" }),
      templateTask("T016", "Finalize media distribution list", "Phase 4: Distribution", { "priority": "High", "owner": "PR Manager", "notes": "Targeted and comprehensive" }),
      templateTask("T017", "Distribute press release via email", "Phase 4: Distribution", { "priority": "High", "owner": "PR Manager", "notes": "Personalized pitches preferred" }),
      templateTask("T018", "Post to RTC website and newsroom", "Phase 4: Distribution", { "priority": "High", "owner": "PR Manager", "notes": "Same time as distribution" }),
      templateTask("T019", "Share on social media channels", "Phase 4: Distribution", { "owner": "Social Media Manager", "notes": "Link to website version" }),
      templateTask("T020", "TWG media call-downs", "Phase 4: Distribution", { "priority": "High", "owner": "The Warren Group", "notes": "Follow up with key reporters" }),
      templateTask("T021", "Monitor media coverage", "Phase 5: Follow-Up", { "priority": "High", "owner": "PR Manager", "notes": "Track pickups and mentions" }),
      templateTask("T022", "Respond to media inquiries", "Phase 5: Follow-Up", { "priority": "High", "owner": "PR Manager", "notes": "Timely and helpful" }),
      templateTask("T023", "Facilitate interviews if requested", "Phase 5: Follow-Up", { "owner": "PR Manager", "notes": "Coordinate with spokespeople" }),
      templateTask("T024", "Compile media coverage report", "Phase 5: Follow-Up", { "owner": "PR Manager", "notes": "Clips and metrics" }),
      templateTask("T025", "Share coverage with internal stakeholders", "Phase 5: Follow-Up", { "priority": "Low", "owner": "PR Manager", "notes": "Celebrate successes" }),
    ],
  },
  {
    name: "Social Media Campaign",
    key: "social_media_campaign",
    description: "Social media campaigns and content series",
    phases: ["Phase 1: Campaign Strategy", "Phase 2: Content Creation", "Phase 3: Approval & Scheduling", "Phase 4: Campaign Launch", "Phase 5: Engagement & Monitoring", "Phase 6: Performance Analysis"],
    tasks: [
      templateTask("T001", "Define campaign goals and KPIs", "Phase 1: Campaign Strategy", { "priority": "High", "owner": "Social Media Manager", "notes": "Reach, engagement, conversions" }),
      templateTask("T002", "Identify target audience and personas", "Phase 1: Campaign Strategy", { "priority": "High", "owner": "Social Media Manager", "notes": "Demographics and interests" }),
      templateTask("T003", "Select social media platforms", "Phase 1: Campaign Strategy", { "priority": "High", "owner": "Social Media Manager", "notes": "Where is your audience?" }),
      templateTask("T004", "Develop campaign theme and hashtags", "Phase 1: Campaign Strategy", { "priority": "High", "owner": "Social Media Manager", "notes": "Memorable and on-brand" }),
      templateTask("T005", "Create content calendar", "Phase 1: Campaign Strategy", { "priority": "High", "owner": "Social Media Manager", "notes": "Frequency and timing" }),
      templateTask("T006", "Submit creative request to GAMM", "Phase 2: Content Creation", { "priority": "High", "owner": "Social Media Manager", "notes": "Include all specifications" }),
      templateTask("T007", "Create social media graphics", "Phase 2: Content Creation", { "priority": "High", "owner": "Creative Team", "notes": "Platform-specific sizes" }),
      templateTask("T008", "Produce videos and GIFs", "Phase 2: Content Creation", { "owner": "Creative Team", "notes": "Short-form content" }),
      templateTask("T009", "Write post copy for all platforms", "Phase 2: Content Creation", { "priority": "High", "owner": "Social Media Manager", "notes": "Platform-appropriate tone" }),
      templateTask("T010", "Develop Instagram Stories and Reels", "Phase 2: Content Creation", { "owner": "Social Media Manager", "notes": "Vertical format" }),
      templateTask("T011", "Internal review of all content", "Phase 3: Approval & Scheduling", { "priority": "High", "owner": "Project Manager", "notes": "Brand and message consistency" }),
      templateTask("T012", "GAMM approval", "Phase 3: Approval & Scheduling", { "priority": "High", "owner": "GAMM", "notes": "Final sign-off" }),
      templateTask("T013", "Schedule posts in social media platform", "Phase 3: Approval & Scheduling", { "priority": "High", "owner": "Social Media Manager", "notes": "Optimal posting times" }),
      templateTask("T014", "Set up social media monitoring", "Phase 3: Approval & Scheduling", { "owner": "Social Media Manager", "notes": "Track mentions and hashtags" }),
      templateTask("T015", "Launch campaign across all platforms", "Phase 4: Campaign Launch", { "priority": "High", "owner": "Social Media Manager", "notes": "Coordinated go-live" }),
      templateTask("T016", "Monitor initial engagement", "Phase 4: Campaign Launch", { "priority": "High", "owner": "Social Media Manager", "notes": "First 24 hours critical" }),
      templateTask("T017", "Engage with early commenters", "Phase 4: Campaign Launch", { "priority": "High", "owner": "Social Media Manager", "notes": "Build momentum" }),
      templateTask("T018", "Monitor social media daily", "Phase 5: Engagement & Monitoring", { "priority": "High", "owner": "Social Media Manager", "notes": "Comments, mentions, messages" }),
      templateTask("T019", "Respond to comments and questions", "Phase 5: Engagement & Monitoring", { "priority": "High", "owner": "Social Media Manager", "notes": "Timely and helpful" }),
      templateTask("T020", "Track campaign hashtag performance", "Phase 5: Engagement & Monitoring", { "owner": "Social Media Manager", "notes": "Reach and impressions" }),
      templateTask("T021", "Adjust content based on performance", "Phase 5: Engagement & Monitoring", { "owner": "Social Media Manager", "notes": "Optimize in real-time" }),
      templateTask("T022", "Engage with influencers and partners", "Phase 5: Engagement & Monitoring", { "priority": "Low", "owner": "Social Media Manager", "notes": "Amplify reach" }),
      templateTask("T023", "Compile campaign metrics", "Phase 6: Performance Analysis", { "priority": "High", "owner": "Social Media Manager", "notes": "All platforms and KPIs" }),
      templateTask("T024", "Analyze engagement and reach data", "Phase 6: Performance Analysis", { "priority": "High", "owner": "Social Media Manager", "notes": "What worked best?" }),
      templateTask("T025", "Identify top-performing content", "Phase 6: Performance Analysis", { "owner": "Social Media Manager", "notes": "Replicate success" }),
      templateTask("T026", "Create campaign performance report", "Phase 6: Performance Analysis", { "priority": "High", "owner": "Social Media Manager", "notes": "Insights and recommendations" }),
      templateTask("T027", "Present findings to team", "Phase 6: Performance Analysis", { "owner": "Social Media Manager", "notes": "Lessons learned" }),
    ],
  },
  {
    name: "Planning Study",
    key: "planning_study",
    description: "Planning studies and analysis",
    phases: ["Phase 1: Study Initiation", "Phase 2: Stakeholder Engagement", "Phase 3: Data Collection & Analysis", "Phase 4: Draft Report Development", "Phase 5: Review & Finalization", "Phase 6: Presentation & Closeout"],
    tasks: [
      templateTask("T001", "Define study objectives and scope", "Phase 1: Study Initiation", { "priority": "High", "owner": "Project Manager", "notes": "Clear research questions" }),
      templateTask("T002", "Select and contract with consultant", "Phase 1: Study Initiation", { "priority": "High", "owner": "Project Manager", "notes": "RFP process if needed" }),
      templateTask("T003", "Conduct project kickoff meeting", "Phase 1: Study Initiation", { "priority": "High", "owner": "Project Manager", "notes": "Align expectations" }),
      templateTask("T004", "Develop project management plan", "Phase 1: Study Initiation", { "priority": "High", "owner": "Project Manager", "notes": "Timeline, deliverables, budget" }),
      templateTask("T005", "Establish project steering committee", "Phase 1: Study Initiation", { "owner": "Project Manager", "notes": "Key stakeholders" }),
      templateTask("T006", "Develop stakeholder engagement plan", "Phase 2: Stakeholder Engagement", { "priority": "High", "owner": "Project Manager", "notes": "Who, when, how" }),
      templateTask("T007", "Create engagement materials", "Phase 2: Stakeholder Engagement", { "owner": "Creative Team", "notes": "Fact sheets, presentations" }),
      templateTask("T008", "Conduct stakeholder meetings", "Phase 2: Stakeholder Engagement", { "priority": "High", "owner": "Project Manager", "notes": "Document feedback" }),
      templateTask("T009", "Host public workshops or forums", "Phase 2: Stakeholder Engagement", { "owner": "Project Manager", "notes": "Community input" }),
      templateTask("T010", "Deploy surveys to target audiences", "Phase 2: Stakeholder Engagement", { "owner": "Project Manager", "notes": "Online and in-person" }),
      templateTask("T011", "Collect primary data", "Phase 3: Data Collection & Analysis", { "priority": "High", "owner": "Consultant", "notes": "Surveys, interviews, observations" }),
      templateTask("T012", "Gather secondary data and research", "Phase 3: Data Collection & Analysis", { "priority": "High", "owner": "Consultant", "notes": "Existing studies and statistics" }),
      templateTask("T013", "Analyze quantitative data", "Phase 3: Data Collection & Analysis", { "priority": "High", "owner": "Consultant", "notes": "Statistical analysis" }),
      templateTask("T014", "Analyze qualitative data", "Phase 3: Data Collection & Analysis", { "priority": "High", "owner": "Consultant", "notes": "Themes and patterns" }),
      templateTask("T015", "Develop preliminary findings", "Phase 3: Data Collection & Analysis", { "priority": "High", "owner": "Consultant", "notes": "Share with project team" }),
      templateTask("T016", "Consultant drafts report", "Phase 4: Draft Report Development", { "priority": "High", "owner": "Consultant", "notes": "Follow agreed-upon outline" }),
      templateTask("T017", "Create data visualizations and maps", "Phase 4: Draft Report Development", { "owner": "Consultant", "notes": "Support findings" }),
      templateTask("T018", "Develop recommendations", "Phase 4: Draft Report Development", { "priority": "High", "owner": "Consultant", "notes": "Actionable and prioritized" }),
      templateTask("T019", "Submit draft report to RTC", "Phase 4: Draft Report Development", { "priority": "High", "owner": "Consultant", "notes": "Allow time for review" }),
      templateTask("T020", "Project manager review of draft", "Phase 5: Review & Finalization", { "priority": "High", "owner": "Project Manager", "notes": "Accuracy and completeness" }),
      templateTask("T021", "Steering committee review", "Phase 5: Review & Finalization", { "priority": "High", "owner": "Steering Committee", "notes": "Strategic alignment" }),
      templateTask("T022", "Incorporate feedback", "Phase 5: Review & Finalization", { "priority": "High", "owner": "Consultant", "notes": "Track changes" }),
      templateTask("T023", "Department director review", "Phase 5: Review & Finalization", { "priority": "High", "owner": "Director", "notes": "Final technical review" }),
      templateTask("T024", "C-Suite approval", "Phase 5: Review & Finalization", { "priority": "High", "owner": "Executive", "notes": "Sign-off on final report" }),
      templateTask("T025", "Finalize report and deliverables", "Phase 5: Review & Finalization", { "priority": "High", "owner": "Consultant", "notes": "Print-ready and web-ready" }),
      templateTask("T026", "Create executive summary", "Phase 6: Presentation & Closeout", { "priority": "High", "owner": "Project Manager", "notes": "Key findings and recommendations" }),
      templateTask("T027", "Develop presentation for board", "Phase 6: Presentation & Closeout", { "priority": "High", "owner": "Project Manager", "notes": "Highlight key points" }),
      templateTask("T028", "Present findings to RTC Board", "Phase 6: Presentation & Closeout", { "priority": "High", "owner": "Project Manager", "notes": "Q&A session" }),
      templateTask("T029", "Create study summary blog post", "Phase 6: Presentation & Closeout", { "owner": "Content Writer", "notes": "Public-facing summary" }),
      templateTask("T030", "Post final report to website", "Phase 6: Presentation & Closeout", { "owner": "Project Manager", "notes": "Public access" }),
      templateTask("T031", "Conduct project closeout meeting", "Phase 6: Presentation & Closeout", { "owner": "Project Manager", "notes": "Lessons learned" }),
      templateTask("T032", "Archive all project materials", "Phase 6: Presentation & Closeout", { "priority": "Low", "owner": "Project Manager", "notes": "Organized and accessible" }),
    ],
  },
  {
    name: "Poster",
    key: "poster",
    description: "Poster and print collateral",
    phases: ["Phase 1: Planning & Content Development", "Phase 2: Design", "Phase 3: Review & Approval", "Phase 4: Production & Distribution"],
    tasks: [
      templateTask("T001", "Define poster purpose and target audience", "Phase 1: Planning & Content Development", { "priority": "High", "owner": "Project Manager", "notes": "What action do you want?" }),
      templateTask("T002", "Develop key message and call-to-action", "Phase 1: Planning & Content Development", { "priority": "High", "owner": "Project Manager", "notes": "Clear and concise" }),
      templateTask("T003", "Gather content (text, images, logos)", "Phase 1: Planning & Content Development", { "priority": "High", "owner": "Project Manager", "notes": "High-resolution assets" }),
      templateTask("T004", "Determine poster size and quantity", "Phase 1: Planning & Content Development", { "priority": "High", "owner": "Project Manager", "notes": "Standard sizes: 11x17, 18x24, 24x36" }),
      templateTask("T005", "Identify distribution locations", "Phase 1: Planning & Content Development", { "owner": "Project Manager", "notes": "Transit centers, facilities, community sites" }),
      templateTask("T006", "Submit creative request to GAMM", "Phase 2: Design", { "priority": "High", "owner": "Project Manager", "notes": "Include all specifications and deadline" }),
      templateTask("T007", "Create draft poster design", "Phase 2: Design", { "priority": "High", "owner": "Creative Team", "notes": "Follow brand guidelines" }),
      templateTask("T008", "Select color scheme and typography", "Phase 2: Design", { "owner": "Creative Team", "notes": "Readable from distance" }),
      templateTask("T009", "Incorporate images and graphics", "Phase 2: Design", { "owner": "Creative Team", "notes": "High quality and relevant" }),
      templateTask("T010", "Project manager review of draft", "Phase 3: Review & Approval", { "priority": "High", "owner": "Project Manager", "notes": "Content accuracy" }),
      templateTask("T011", "GAMM review", "Phase 3: Review & Approval", { "priority": "High", "owner": "GAMM", "notes": "Design quality and brand consistency" }),
      templateTask("T012", "Incorporate feedback and revise", "Phase 3: Review & Approval", { "priority": "High", "owner": "Creative Team", "notes": "Address all comments" }),
      templateTask("T013", "Final design approval", "Phase 3: Review & Approval", { "priority": "High", "owner": "Director", "notes": "Sign-off to print" }),
      templateTask("T014", "Prepare print-ready files", "Phase 4: Production & Distribution", { "priority": "High", "owner": "Creative Team", "notes": "Correct resolution and bleed" }),
      templateTask("T015", "Send to printer or production vendor", "Phase 4: Production & Distribution", { "priority": "High", "owner": "Project Manager", "notes": "Confirm specifications" }),
      templateTask("T016", "Review and approve proof", "Phase 4: Production & Distribution", { "priority": "High", "owner": "Project Manager", "notes": "Check for errors" }),
      templateTask("T017", "Receive printed posters", "Phase 4: Production & Distribution", { "owner": "Project Manager", "notes": "Inspect quality" }),
      templateTask("T018", "Distribute posters to locations", "Phase 4: Production & Distribution", { "owner": "Project Manager", "notes": "Track distribution" }),
      templateTask("T019", "Install posters at facilities", "Phase 4: Production & Distribution", { "priority": "Low", "owner": "Facilities Team", "notes": "Proper mounting" }),
    ],
  },
  {
    name: "Video Project",
    key: "video_project",
    description: "Video production projects",
    phases: ["Phase 1: Pre-Production Planning", "Phase 2: Script & Storyboard Development", "Phase 3: Filming", "Phase 4: Editing & Review", "Phase 5: Final Approval & Distribution"],
    tasks: [
      templateTask("T001", "Define video purpose and target audience", "Phase 1: Pre-Production Planning", { "priority": "High", "owner": "Project Manager", "notes": "What action do you want viewers to take?" }),
      templateTask("T002", "Determine video length and format", "Phase 1: Pre-Production Planning", { "priority": "High", "owner": "Project Manager", "notes": "30 sec, 1 min, 2 min, long-form" }),
      templateTask("T003", "Identify distribution channels", "Phase 1: Pre-Production Planning", { "priority": "High", "owner": "Project Manager", "notes": "Social media, website, presentations" }),
      templateTask("T004", "Develop video concept and key messages", "Phase 1: Pre-Production Planning", { "priority": "High", "owner": "Project Manager", "notes": "Core story to tell" }),
      templateTask("T005", "Establish budget and resources", "Phase 1: Pre-Production Planning", { "priority": "High", "owner": "Project Manager", "notes": "Internal or external production" }),
      templateTask("T006", "Submit creative request to GAMM", "Phase 2: Script & Storyboard Development", { "priority": "High", "owner": "Project Manager", "notes": "Include all specifications" }),
      templateTask("T007", "Write video script", "Phase 2: Script & Storyboard Development", { "priority": "High", "owner": "Creative Team", "notes": "Narration and dialogue" }),
      templateTask("T008", "Create storyboard", "Phase 2: Script & Storyboard Development", { "owner": "Creative Team", "notes": "Visual sequence" }),
      templateTask("T009", "Identify filming locations", "Phase 2: Script & Storyboard Development", { "priority": "High", "owner": "Project Manager", "notes": "Permits if needed" }),
      templateTask("T010", "Select on-camera talent", "Phase 2: Script & Storyboard Development", { "owner": "Project Manager", "notes": "Employees, customers, actors" }),
      templateTask("T011", "Review and approve script/storyboard", "Phase 2: Script & Storyboard Development", { "priority": "High", "owner": "Project Manager", "notes": "Content accuracy" }),
      templateTask("T012", "Schedule filming dates and times", "Phase 3: Filming", { "priority": "High", "owner": "Project Manager", "notes": "Coordinate with all participants" }),
      templateTask("T013", "Secure equipment and crew", "Phase 3: Filming", { "priority": "High", "owner": "Creative Team", "notes": "Camera, lighting, audio" }),
      templateTask("T014", "Conduct filming", "Phase 3: Filming", { "priority": "High", "owner": "Creative Team", "notes": "Capture all needed footage" }),
      templateTask("T015", "Capture B-roll footage", "Phase 3: Filming", { "owner": "Creative Team", "notes": "Supplemental visuals" }),
      templateTask("T016", "Review footage for quality", "Phase 3: Filming", { "priority": "High", "owner": "Creative Team", "notes": "Reshoot if necessary" }),
      templateTask("T017", "Edit video - first draft", "Phase 4: Editing & Review", { "priority": "High", "owner": "Creative Team", "notes": "Rough cut" }),
      templateTask("T018", "Add music and sound effects", "Phase 4: Editing & Review", { "owner": "Creative Team", "notes": "Licensed or royalty-free" }),
      templateTask("T019", "Create graphics and titles", "Phase 4: Editing & Review", { "owner": "Creative Team", "notes": "Lower thirds, captions" }),
      templateTask("T020", "Project manager review of first draft", "Phase 4: Editing & Review", { "priority": "High", "owner": "Project Manager", "notes": "Content and pacing" }),
      templateTask("T021", "Department director review", "Phase 4: Editing & Review", { "priority": "High", "owner": "Director", "notes": "Strategic alignment" }),
      templateTask("T022", "Incorporate feedback and revise", "Phase 4: Editing & Review", { "priority": "High", "owner": "Creative Team", "notes": "Address all comments" }),
      templateTask("T023", "C-Suite approval of final video", "Phase 5: Final Approval & Distribution", { "priority": "High", "owner": "Executive", "notes": "Sign-off to publish" }),
      templateTask("T024", "Export video in required formats", "Phase 5: Final Approval & Distribution", { "priority": "High", "owner": "Creative Team", "notes": "Platform-specific specs" }),
      templateTask("T025", "Upload to YouTube and social media", "Phase 5: Final Approval & Distribution", { "priority": "High", "owner": "Social Media Manager", "notes": "Optimized titles and descriptions" }),
      templateTask("T026", "Post to RTC website", "Phase 5: Final Approval & Distribution", { "owner": "Project Manager", "notes": "Embed or link" }),
      templateTask("T027", "Create promotional posts", "Phase 5: Final Approval & Distribution", { "owner": "Social Media Manager", "notes": "Drive views" }),
      templateTask("T028", "Monitor video performance", "Phase 5: Final Approval & Distribution", { "owner": "Social Media Manager", "notes": "Views, engagement, shares" }),
    ],
  },
  {
    name: "Public Notice",
    key: "public_notice",
    description: "Public notices and official announcements",
    phases: ["Phase 1: Notice Preparation", "Phase 2: Legal Review", "Phase 3: Publication", "Phase 4: Comment Period", "Phase 5: Response & Closeout"],
    tasks: [
      templateTask("T001", "Identify legal requirements for notice", "Phase 1: Notice Preparation", { "priority": "High", "owner": "Project Manager", "notes": "Federal, state, or local regulations" }),
      templateTask("T002", "Determine comment period duration", "Phase 1: Notice Preparation", { "priority": "High", "owner": "Project Manager", "notes": "Typically 21, 30, or 45 days" }),
      templateTask("T003", "Draft public notice content", "Phase 1: Notice Preparation", { "priority": "High", "owner": "Project Manager", "notes": "Clear and comprehensive" }),
      templateTask("T004", "Identify required publication outlets", "Phase 1: Notice Preparation", { "priority": "High", "owner": "Project Manager", "notes": "Website, newspapers, etc." }),
      templateTask("T005", "Gather supporting documents", "Phase 1: Notice Preparation", { "owner": "Project Manager", "notes": "Plans, studies, reports" }),
      templateTask("T006", "Submit notice to legal counsel", "Phase 2: Legal Review", { "priority": "High", "owner": "Project Manager", "notes": "Ensure compliance" }),
      templateTask("T007", "Legal review and feedback", "Phase 2: Legal Review", { "priority": "High", "owner": "Legal Counsel", "notes": "Revisions if needed" }),
      templateTask("T008", "Incorporate legal feedback", "Phase 2: Legal Review", { "priority": "High", "owner": "Project Manager", "notes": "Address all comments" }),
      templateTask("T009", "Final legal approval", "Phase 2: Legal Review", { "priority": "High", "owner": "Legal Counsel", "notes": "Sign-off to publish" }),
      templateTask("T010", "Finalize public notice", "Phase 3: Publication", { "priority": "High", "owner": "Project Manager", "notes": "All edits complete" }),
      templateTask("T011", "Post notice to RTC website", "Phase 3: Publication", { "priority": "High", "owner": "Project Manager", "notes": "Prominent placement" }),
      templateTask("T012", "Publish in required media outlets", "Phase 3: Publication", { "priority": "High", "owner": "Project Manager", "notes": "Newspapers, bulletin boards" }),
      templateTask("T013", "Notify stakeholders of notice", "Phase 3: Publication", { "owner": "Project Manager", "notes": "Email distribution list" }),
      templateTask("T014", "Post on social media if appropriate", "Phase 3: Publication", { "priority": "Low", "owner": "Social Media Manager", "notes": "Increase awareness" }),
      templateTask("T015", "Monitor incoming comments", "Phase 4: Comment Period", { "priority": "High", "owner": "Project Manager", "notes": "Email, mail, online form" }),
      templateTask("T016", "Log and organize all comments", "Phase 4: Comment Period", { "priority": "High", "owner": "Project Manager", "notes": "Spreadsheet or database" }),
      templateTask("T017", "Respond to requests for information", "Phase 4: Comment Period", { "owner": "Project Manager", "notes": "Timely and helpful" }),
      templateTask("T018", "Provide weekly status updates", "Phase 4: Comment Period", { "priority": "Low", "owner": "Project Manager", "notes": "To project team" }),
      templateTask("T019", "Close comment period on scheduled date", "Phase 4: Comment Period", { "priority": "High", "owner": "Project Manager", "notes": "No late submissions" }),
      templateTask("T020", "Compile all comments received", "Phase 5: Response & Closeout", { "priority": "High", "owner": "Project Manager", "notes": "Organized by theme" }),
      templateTask("T021", "Analyze comments for themes and issues", "Phase 5: Response & Closeout", { "priority": "High", "owner": "Project Manager", "notes": "Identify key concerns" }),
      templateTask("T022", "Draft responses to comments", "Phase 5: Response & Closeout", { "priority": "High", "owner": "Project Manager", "notes": "Address each substantive comment" }),
      templateTask("T023", "Legal review of responses", "Phase 5: Response & Closeout", { "priority": "High", "owner": "Legal Counsel", "notes": "Ensure adequacy" }),
      templateTask("T024", "Finalize comment summary and responses", "Phase 5: Response & Closeout", { "priority": "High", "owner": "Project Manager", "notes": "Public record" }),
      templateTask("T025", "Post responses to website", "Phase 5: Response & Closeout", { "owner": "Project Manager", "notes": "Transparency" }),
      templateTask("T026", "Notify commenters of responses", "Phase 5: Response & Closeout", { "priority": "Low", "owner": "Project Manager", "notes": "If contact info provided" }),
      templateTask("T027", "Create final closeout report", "Phase 5: Response & Closeout", { "owner": "Project Manager", "notes": "Archive all materials" }),
    ],
  },
  {
    name: "Media Buy",
    key: "media_buy",
    description: "Paid media campaigns",
    phases: ["Phase 1: Planning & Strategy", "Phase 2: Creative Development", "Phase 3: Media Planning & Buying", "Phase 4: Campaign Launch", "Phase 5: Monitoring & Optimization", "Phase 6: Performance Reporting"],
    tasks: [
      templateTask("T001", "Define campaign objectives and KPIs", "Phase 1: Planning & Strategy", { "priority": "High", "owner": "Marketing Manager", "notes": "Awareness, consideration, conversion" }),
      templateTask("T002", "Identify target audience", "Phase 1: Planning & Strategy", { "priority": "High", "owner": "Marketing Manager", "notes": "Demographics, behaviors, locations" }),
      templateTask("T003", "Determine total budget", "Phase 1: Planning & Strategy", { "priority": "High", "owner": "Marketing Manager", "notes": "Include production and media costs" }),
      templateTask("T004", "Select media channels", "Phase 1: Planning & Strategy", { "priority": "High", "owner": "Marketing Manager", "notes": "Digital, print, radio, outdoor, TV" }),
      templateTask("T005", "Develop campaign timeline", "Phase 1: Planning & Strategy", { "priority": "High", "owner": "Marketing Manager", "notes": "Flight dates" }),
      templateTask("T006", "Submit creative request to GAMM", "Phase 2: Creative Development", { "priority": "High", "owner": "Marketing Manager", "notes": "All specifications and deadlines" }),
      templateTask("T007", "Develop creative concepts", "Phase 2: Creative Development", { "priority": "High", "owner": "Creative Team", "notes": "Aligned with campaign goals" }),
      templateTask("T008", "Create ad copy and messaging", "Phase 2: Creative Development", { "priority": "High", "owner": "Creative Team", "notes": "Platform-specific" }),
      templateTask("T009", "Design display ads", "Phase 2: Creative Development", { "priority": "High", "owner": "Creative Team", "notes": "Multiple sizes and formats" }),
      templateTask("T010", "Produce video or audio ads", "Phase 2: Creative Development", { "owner": "Creative Team", "notes": "If applicable" }),
      templateTask("T011", "Review and approve creative", "Phase 2: Creative Development", { "priority": "High", "owner": "Marketing Manager", "notes": "All stakeholders sign-off" }),
      templateTask("T012", "Develop media plan", "Phase 3: Media Planning & Buying", { "priority": "High", "owner": "Media Buyer", "notes": "Channels, placements, budget allocation" }),
      templateTask("T013", "Request proposals from media vendors", "Phase 3: Media Planning & Buying", { "owner": "Media Buyer", "notes": "RFPs if needed" }),
      templateTask("T014", "Negotiate rates and placements", "Phase 3: Media Planning & Buying", { "priority": "High", "owner": "Media Buyer", "notes": "Best value for budget" }),
      templateTask("T015", "Finalize media buy and contracts", "Phase 3: Media Planning & Buying", { "priority": "High", "owner": "Media Buyer", "notes": "Sign insertion orders" }),
      templateTask("T016", "Submit creative to media vendors", "Phase 3: Media Planning & Buying", { "priority": "High", "owner": "Media Buyer", "notes": "Meet specs and deadlines" }),
      templateTask("T017", "Confirm campaign launch with vendors", "Phase 4: Campaign Launch", { "priority": "High", "owner": "Media Buyer", "notes": "All systems go" }),
      templateTask("T018", "Monitor initial ad delivery", "Phase 4: Campaign Launch", { "priority": "High", "owner": "Media Buyer", "notes": "Verify ads are running correctly" }),
      templateTask("T019", "Track initial performance metrics", "Phase 4: Campaign Launch", { "priority": "High", "owner": "Marketing Manager", "notes": "Impressions, clicks, engagement" }),
      templateTask("T020", "Address any technical issues", "Phase 4: Campaign Launch", { "priority": "High", "owner": "Media Buyer", "notes": "Work with vendors to resolve" }),
      templateTask("T021", "Monitor campaign performance daily", "Phase 5: Monitoring & Optimization", { "priority": "High", "owner": "Marketing Manager", "notes": "Against KPIs" }),
      templateTask("T022", "Analyze which placements perform best", "Phase 5: Monitoring & Optimization", { "priority": "High", "owner": "Marketing Manager", "notes": "Optimize budget allocation" }),
      templateTask("T023", "Adjust targeting or creative if needed", "Phase 5: Monitoring & Optimization", { "owner": "Marketing Manager", "notes": "A/B testing" }),
      templateTask("T024", "Provide weekly performance reports", "Phase 5: Monitoring & Optimization", { "owner": "Marketing Manager", "notes": "To stakeholders" }),
      templateTask("T025", "Reallocate budget to top performers", "Phase 5: Monitoring & Optimization", { "owner": "Media Buyer", "notes": "Maximize ROI" }),
      templateTask("T026", "Compile final campaign metrics", "Phase 6: Performance Reporting", { "priority": "High", "owner": "Marketing Manager", "notes": "All channels and KPIs" }),
      templateTask("T027", "Analyze ROI and cost per result", "Phase 6: Performance Reporting", { "priority": "High", "owner": "Marketing Manager", "notes": "Efficiency metrics" }),
      templateTask("T028", "Compare performance to benchmarks", "Phase 6: Performance Reporting", { "owner": "Marketing Manager", "notes": "Industry standards" }),
      templateTask("T029", "Create campaign performance report", "Phase 6: Performance Reporting", { "priority": "High", "owner": "Marketing Manager", "notes": "Insights and recommendations" }),
      templateTask("T030", "Present findings to leadership", "Phase 6: Performance Reporting", { "owner": "Marketing Manager", "notes": "Lessons learned" }),
      templateTask("T031", "Archive campaign materials and data", "Phase 6: Performance Reporting", { "priority": "Low", "owner": "Marketing Manager", "notes": "For future reference" }),
    ],
  },
  {
    name: "Op-Ed",
    key: "op_ed",
    description: "Opinion editorials and thought leadership",
    phases: ["Phase 1: Topic Selection & Research", "Phase 2: Drafting", "Phase 3: Review & Approval", "Phase 4: Submission & Publication", "Phase 5: Promotion & Follow-Up"],
    tasks: [
      templateTask("T001", "Identify timely and relevant topic", "Phase 1: Topic Selection & Research", { "priority": "High", "owner": "PR Manager", "notes": "News hook or trending issue" }),
      templateTask("T002", "Develop unique angle or perspective", "Phase 1: Topic Selection & Research", { "priority": "High", "owner": "PR Manager", "notes": "What's your distinct point of view?" }),
      templateTask("T003", "Research supporting data and examples", "Phase 1: Topic Selection & Research", { "priority": "High", "owner": "PR Manager", "notes": "Facts, statistics, case studies" }),
      templateTask("T004", "Identify target publication", "Phase 1: Topic Selection & Research", { "priority": "High", "owner": "PR Manager", "notes": "Local newspaper, trade publication, online outlet" }),
      templateTask("T005", "Review publication's submission guidelines", "Phase 1: Topic Selection & Research", { "owner": "PR Manager", "notes": "Length, format, process" }),
      templateTask("T006", "Write compelling headline", "Phase 2: Drafting", { "priority": "High", "owner": "PR Manager", "notes": "Attention-grabbing" }),
      templateTask("T007", "Draft op-ed opening paragraph", "Phase 2: Drafting", { "priority": "High", "owner": "PR Manager", "notes": "Hook the reader" }),
      templateTask("T008", "Develop main arguments with evidence", "Phase 2: Drafting", { "priority": "High", "owner": "PR Manager", "notes": "Logical flow" }),
      templateTask("T009", "Include personal anecdotes if appropriate", "Phase 2: Drafting", { "owner": "PR Manager", "notes": "Humanize the piece" }),
      templateTask("T010", "Write strong conclusion with call-to-action", "Phase 2: Drafting", { "priority": "High", "owner": "PR Manager", "notes": "What should readers do?" }),
      templateTask("T011", "Add author bio", "Phase 2: Drafting", { "priority": "Low", "owner": "PR Manager", "notes": "Credentials and expertise" }),
      templateTask("T012", "Project manager review", "Phase 3: Review & Approval", { "priority": "High", "owner": "Project Manager", "notes": "Clarity and persuasiveness" }),
      templateTask("T013", "TWG review", "Phase 3: Review & Approval", { "priority": "High", "owner": "The Warren Group", "notes": "Media perspective" }),
      templateTask("T014", "Senior director review", "Phase 3: Review & Approval", { "priority": "High", "owner": "Senior Director", "notes": "Strategic alignment" }),
      templateTask("T015", "C-Suite approval", "Phase 3: Review & Approval", { "priority": "High", "owner": "Executive", "notes": "Final sign-off" }),
      templateTask("T016", "Finalize op-ed", "Phase 3: Review & Approval", { "priority": "High", "owner": "PR Manager", "notes": "Incorporate all feedback" }),
      templateTask("T017", "Submit op-ed to target publication", "Phase 4: Submission & Publication", { "priority": "High", "owner": "PR Manager", "notes": "Follow submission guidelines" }),
      templateTask("T018", "Follow up with editor", "Phase 4: Submission & Publication", { "owner": "PR Manager", "notes": "1 week after submission" }),
      templateTask("T019", "Respond to editor questions or requests", "Phase 4: Submission & Publication", { "priority": "High", "owner": "PR Manager", "notes": "Timely responses" }),
      templateTask("T020", "Confirm publication date", "Phase 4: Submission & Publication", { "priority": "High", "owner": "PR Manager", "notes": "Plan promotion" }),
      templateTask("T021", "Review final published version", "Phase 4: Submission & Publication", { "owner": "PR Manager", "notes": "Check for errors" }),
      templateTask("T022", "Share op-ed on social media", "Phase 5: Promotion & Follow-Up", { "priority": "High", "owner": "Social Media Manager", "notes": "Multiple posts" }),
      templateTask("T023", "Post to RTC blog or website", "Phase 5: Promotion & Follow-Up", { "owner": "PR Manager", "notes": "Link to publication" }),
      templateTask("T024", "Distribute to internal stakeholders", "Phase 5: Promotion & Follow-Up", { "priority": "Low", "owner": "PR Manager", "notes": "Email with context" }),
      templateTask("T025", "Monitor reader comments and responses", "Phase 5: Promotion & Follow-Up", { "owner": "PR Manager", "notes": "Engage if appropriate" }),
      templateTask("T026", "Track reach and engagement metrics", "Phase 5: Promotion & Follow-Up", { "priority": "Low", "owner": "PR Manager", "notes": "For reporting" }),
    ],
  },
  {
    name: "Other/Custom",
    key: "other_custom",
    description: "Flexible template for custom projects",
    phases: ["Phase 1: Project Definition", "Phase 2: Planning", "Phase 3: Execution", "Phase 4: Review", "Phase 5: Completion"],
    tasks: [
      templateTask("T001", "Define project objectives", "Phase 1: Project Definition", { "priority": "High", "owner": "Project Manager", "notes": "What are you trying to achieve?" }),
      templateTask("T002", "Identify stakeholders", "Phase 1: Project Definition", { "priority": "High", "owner": "Project Manager", "notes": "Who needs to be involved?" }),
      templateTask("T003", "Determine success criteria", "Phase 1: Project Definition", { "priority": "High", "owner": "Project Manager", "notes": "How will you measure success?" }),
      templateTask("T004", "Develop project plan", "Phase 2: Planning", { "priority": "High", "owner": "Project Manager", "notes": "Timeline, resources, budget" }),
      templateTask("T005", "Identify dependencies and risks", "Phase 2: Planning", { "owner": "Project Manager", "notes": "What could go wrong?" }),
      templateTask("T006", "Assign roles and responsibilities", "Phase 2: Planning", { "priority": "High", "owner": "Project Manager", "notes": "Who does what?" }),
      templateTask("T007", "Execute project tasks", "Phase 3: Execution", { "priority": "High", "owner": "Team", "notes": "Do the work" }),
      templateTask("T008", "Monitor progress", "Phase 3: Execution", { "priority": "High", "owner": "Project Manager", "notes": "Track against plan" }),
      templateTask("T009", "Communicate with stakeholders", "Phase 3: Execution", { "owner": "Project Manager", "notes": "Regular updates" }),
      templateTask("T010", "Review deliverables", "Phase 4: Review", { "priority": "High", "owner": "Project Manager", "notes": "Quality check" }),
      templateTask("T011", "Obtain approvals", "Phase 4: Review", { "priority": "High", "owner": "Stakeholders", "notes": "Sign-offs" }),
      templateTask("T012", "Make revisions if needed", "Phase 4: Review", { "owner": "Team", "notes": "Address feedback" }),
      templateTask("T013", "Deliver final project outputs", "Phase 5: Completion", { "priority": "High", "owner": "Project Manager", "notes": "To all stakeholders" }),
      templateTask("T014", "Conduct project retrospective", "Phase 5: Completion", { "owner": "Team", "notes": "Lessons learned" }),
      templateTask("T015", "Archive project materials", "Phase 5: Completion", { "priority": "Low", "owner": "Project Manager", "notes": "For future reference" }),
    ],
  },
];

type MemoryState = {
  templates: Template[];
  projects: Project[];
  tasks: Task[];
  projectComments: ProjectComment[];
  projectActivities: ProjectActivity[];
  notificationPreferences: NotificationPreference[];
  notificationEvents: NotificationEvent[];
  auditLogs: AuditLog[];
  webhookSubscriptions: WebhookSubscription[];
  userAccessPolicies: UserAccessPolicy[];
  projectRisks: ProjectRisk[];
  projectTags: ProjectTag[];
  savedViews: SavedView[];
  taskNotes: TaskNote[];
  projectNotes: ProjectNote[];
  nextProjectId: number;
  nextTaskId: number;
  nextProjectCommentId: number;
  nextProjectActivityId: number;
  nextNotificationPreferenceId: number;
  nextNotificationEventId: number;
  nextAuditLogId: number;
  nextWebhookSubscriptionId: number;
  nextUserAccessPolicyId: number;
  nextProjectRiskId: number;
  nextProjectTagId: number;
  nextSavedViewId: number;
  nextTaskNoteId: number;
  nextProjectNoteId: number;
  appSettings: AppSetting[];
  nextAppSettingId: number;
};

const copyTemplate = (template: Template): Template => ({ ...template });
const copyProject = (project: Project): Project => ({ ...project });
const copyTask = (task: Task): Task => ({ ...task });
const copyProjectComment = (comment: ProjectComment): ProjectComment => ({ ...comment });
const copyProjectActivity = (activity: ProjectActivity): ProjectActivity => ({ ...activity });
const copyNotificationPreference = (
  preference: NotificationPreference
): NotificationPreference => ({ ...preference });
const copyNotificationEvent = (event: NotificationEvent): NotificationEvent => ({ ...event });
const copyAuditLog = (auditLog: AuditLog): AuditLog => ({ ...auditLog });
const copyWebhookSubscription = (
  webhook: WebhookSubscription
): WebhookSubscription => ({ ...webhook });
const copyUserAccessPolicy = (policy: UserAccessPolicy): UserAccessPolicy => ({ ...policy });
const copyProjectRisk = (risk: ProjectRisk): ProjectRisk => ({ ...risk });
const copyProjectTag = (tag: ProjectTag): ProjectTag => ({ ...tag });
const copySavedView = (view: SavedView): SavedView => ({ ...view });
const copyTaskNote = (note: TaskNote): TaskNote => ({ ...note });
const copyProjectNote = (note: ProjectNote): ProjectNote => ({ ...note });

const asYesNo = (value: boolean) => (value ? YES_NO_YES : YES_NO_NO);
const isEnabled = (value: "Yes" | "No" | null | undefined) => value === YES_NO_YES;

const defaultNotificationPreference = (
  scopeType: NotificationScopeType,
  scopeKey: string
): Omit<NotificationPreference, "id" | "createdAt" | "updatedAt"> => ({
  scopeType,
  scopeKey,
  inAppEnabled: YES_NO_YES,
  emailEnabled: YES_NO_NO,
  slackEnabled: YES_NO_NO,
  webhookEnabled: YES_NO_NO,
  webhookUrl: null,
  overdueEnabled: YES_NO_YES,
  dueSoonEnabled: YES_NO_YES,
  assignmentEnabled: YES_NO_YES,
  statusChangeEnabled: YES_NO_YES,
});

const normalizeWebhookUrl = (value: string | null | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getDeliveryChannels = (
  preference: NotificationPreference
): DeliveryChannel[] => {
  const channels: DeliveryChannel[] = [];
  if (isEnabled(preference.inAppEnabled)) channels.push("in_app");
  if (isEnabled(preference.emailEnabled)) channels.push("email");
  if (isEnabled(preference.slackEnabled)) channels.push("slack");
  if (isEnabled(preference.webhookEnabled) && preference.webhookUrl) {
    channels.push("webhook");
  }
  return channels;
};

const buildMemoryState = (): MemoryState => {
  const seedTimestamp = new Date("2025-01-01T00:00:00.000Z");

  const templates: Template[] = TEMPLATE_SEED.map((template, index) => ({
    id: index + 1,
    name: template.name,
    templateKey: template.key,
    templateGroupKey: template.key,
    version: 1,
    status: "Published",
    description: template.description,
    phases: JSON.stringify(template.phases),
    sampleTasks: JSON.stringify(template.tasks),
    uploadSource: "seed",
    createdAt: new Date(seedTimestamp),
    updatedAt: new Date(seedTimestamp),
  }));

  // ── Dynamic seed date helpers ─────────────────────────────────────────
  const now = new Date();
  const addDays = (base: Date, days: number) => new Date(base.getTime() + days * 864e5);
  const addMonths = (base: Date, months: number) => {
    const d = new Date(base);
    d.setMonth(d.getMonth() + months);
    return d;
  };

  // Project definitions with offsets relative to now
  const projectDefs = [
    {
      name: "Summer Heat Campaign 2025",
      description: "Awareness campaign for summer heat safety",
      templateName: "Marketing Campaign",
      manager: "Communications Team",
      startOffset: -4,   // months from now
      durationMonths: 5,
      budget: 1250000,
      progressPct: 60,   // how far through the project timeline we are
    },
    {
      name: "Alexander Dennis Grand Opening",
      description: "Grand opening event planning",
      templateName: "Event Plan",
      manager: "Events Team",
      startOffset: -1,
      durationMonths: 2.5,
      budget: 250000,
      progressPct: 30,
    },
    {
      name: "AAMP Phase 1 Planning Study",
      description: "Planning study for AAMP Phase 1 implementation",
      templateName: "Planning Study",
      manager: "Planning Department",
      startOffset: -6,
      durationMonths: 12,
      budget: 500000,
      progressPct: 45,
    },
    {
      name: "rideRTC Rewards Program Launch",
      description: "Communications plan for rideRTC Rewards Program launch",
      templateName: "Marketing Campaign",
      manager: "Marketing Team",
      startOffset: -10,
      durationMonths: 4,
      budget: 350000,
      progressPct: 100,
    },
  ];

  const projects: Project[] = projectDefs.map((def, idx) => {
    const tmpl = templates.find((t) => t.name === def.templateName);
    const start = addMonths(now, def.startOffset);
    const end = addMonths(start, def.durationMonths);
    const isComplete = def.progressPct >= 100;
    return {
      id: idx + 1,
      name: def.name,
      description: def.description,
      templateId: tmpl?.id ?? null,
      templateType: def.templateName,
      projectManager: def.manager,
      startDate: start,
      targetCompletionDate: end,
      budget: def.budget,
      actualBudget: Math.round(def.budget * (def.progressPct / 100) * 0.85),
      status: isComplete ? "Complete" : "Active",
      createdAt: addDays(start, -7),
      updatedAt: isComplete ? end : now,
    };
  });

  // Task seed data per project — descriptions, owners, notes, phases, deps, budgets
  const taskBlueprints: {
    taskId: string; desc: string; owner: string; phase: string; dep: string | null;
    notes: string; budget: number; approval: "Yes" | "No"; approver: string | null;
  }[][] = [
      // Project 1: Marketing Campaign
      [
        { taskId: "T001", desc: "Define campaign objectives and target audience", owner: "Marketing Manager", phase: "Phase 1: Campaign Planning & Strategy", dep: null, notes: "Include demographic and psychographic details", budget: 0, approval: "No", approver: null },
        { taskId: "T002", desc: "Develop campaign strategy and key messages", owner: "Marketing Manager", phase: "Phase 1: Campaign Planning & Strategy", dep: "T001", notes: "Align with organizational goals", budget: 0, approval: "No", approver: null },
        { taskId: "T003", desc: "Create campaign budget and resource plan", owner: "Marketing Manager", phase: "Phase 1: Campaign Planning & Strategy", dep: null, notes: "Include all costs: creative, media, production", budget: 0, approval: "No", approver: null },
        { taskId: "T004", desc: "Develop campaign timeline with milestones", owner: "Marketing Manager", phase: "Phase 1: Campaign Planning & Strategy", dep: "T002", notes: "Work backwards from launch date", budget: 0, approval: "No", approver: null },
        { taskId: "T005", desc: "Submit creative request to GAMM", owner: "Project Manager", phase: "Phase 2: Creative Development", dep: "T004", notes: "Include all specifications and deadlines", budget: 0, approval: "No", approver: null },
        { taskId: "T006", desc: "Develop creative brief", owner: "Creative Team", phase: "Phase 2: Creative Development", dep: "T005", notes: "Clear direction for designers", budget: 25000, approval: "No", approver: null },
        { taskId: "T007", desc: "Create social media content and graphics", owner: "Creative Team", phase: "Phase 2: Creative Development", dep: "T006", notes: "Multiple platforms and formats", budget: 50000, approval: "No", approver: null },
        { taskId: "T009", desc: "Write campaign copy and messaging", owner: "Content Writer", phase: "Phase 2: Creative Development", dep: "T006", notes: "All channels and touchpoints", budget: 30000, approval: "No", approver: null },
        { taskId: "T010", desc: "Project manager review of creative assets", owner: "Project Manager", phase: "Phase 3: Internal Review & Approval", dep: "T007,T009", notes: "First review for accuracy and alignment", budget: 0, approval: "Yes", approver: "Director" },
        { taskId: "T013", desc: "C-Suite approval", owner: "Executive", phase: "Phase 3: Internal Review & Approval", dep: "T010", notes: "Final sign-off", budget: 0, approval: "Yes", approver: "CEO" },
      ],
      // Project 2: Event Plan
      [
        { taskId: "T001", desc: "Define event objectives and success metrics", owner: "Event Manager", phase: "Phase 1: Event Concept & Planning", dep: null, notes: "What does success look like?", budget: 0, approval: "No", approver: null },
        { taskId: "T002", desc: "Determine event date, time, and duration", owner: "Event Manager", phase: "Phase 1: Event Concept & Planning", dep: null, notes: "Check for conflicts with other events", budget: 0, approval: "No", approver: null },
        { taskId: "T003", desc: "Secure venue and confirm availability", owner: "Event Manager", phase: "Phase 1: Event Concept & Planning", dep: "T002", notes: "Site visit recommended", budget: 50000, approval: "No", approver: null },
        { taskId: "T004", desc: "Develop event budget", owner: "Event Manager", phase: "Phase 1: Event Concept & Planning", dep: null, notes: "Include all costs: venue, catering, AV, materials", budget: 0, approval: "No", approver: null },
        { taskId: "T005", desc: "Create preliminary run-of-show", owner: "Event Manager", phase: "Phase 1: Event Concept & Planning", dep: "T001", notes: "Timing for each segment", budget: 0, approval: "No", approver: null },
        { taskId: "T006", desc: "Develop speaker list and confirm attendance", owner: "Event Manager", phase: "Phase 2: Logistics & Coordination", dep: "T001", notes: "Include backup speakers", budget: 0, approval: "No", approver: null },
        { taskId: "T007", desc: "Create invitee list (elected officials, media, partners)", owner: "Event Manager", phase: "Phase 2: Logistics & Coordination", dep: null, notes: "Categorize by priority", budget: 0, approval: "No", approver: null },
        { taskId: "T009", desc: "Arrange AV equipment and technical needs", owner: "Event Manager", phase: "Phase 2: Logistics & Coordination", dep: "T003", notes: "Microphones, projector, sound system", budget: 15000, approval: "No", approver: null },
        { taskId: "T012", desc: "Design and produce invitations", owner: "Creative Team", phase: "Phase 3: Marketing & Promotion", dep: "T007", notes: "Submit to GAMM", budget: 5000, approval: "No", approver: null },
        { taskId: "T017", desc: "Finalize run-of-show", owner: "Event Manager", phase: "Phase 4: Pre-Event Preparation", dep: "T005,T006", notes: "Share with all participants", budget: 0, approval: "Yes", approver: "Director" },
      ],
      // Project 3: Planning Study
      [
        { taskId: "T001", desc: "Define study scope and objectives", owner: "Study Lead", phase: "Phase 1: Initiation", dep: null, notes: "Include stakeholder interviews", budget: 0, approval: "No", approver: null },
        { taskId: "T002", desc: "Assemble project team and assign roles", owner: "Study Lead", phase: "Phase 1: Initiation", dep: "T001", notes: "Cross-departmental team", budget: 0, approval: "No", approver: null },
        { taskId: "T003", desc: "Conduct background research and data review", owner: "Research Analyst", phase: "Phase 2: Research & Data Collection", dep: "T002", notes: "Review existing studies and reports", budget: 10000, approval: "No", approver: null },
        { taskId: "T004", desc: "Collect field data and community input", owner: "Research Analyst", phase: "Phase 2: Research & Data Collection", dep: "T002", notes: "Surveys, interviews, site visits", budget: 25000, approval: "No", approver: null },
        { taskId: "T005", desc: "Analyze data and develop findings", owner: "Research Analyst", phase: "Phase 3: Analysis", dep: "T003,T004", notes: "Statistical analysis and GIS mapping", budget: 15000, approval: "No", approver: null },
        { taskId: "T006", desc: "Draft study report", owner: "Study Lead", phase: "Phase 4: Draft Report", dep: "T005", notes: "Include executive summary", budget: 0, approval: "No", approver: null },
        { taskId: "T007", desc: "Internal team review", owner: "Study Lead", phase: "Phase 5: Review & Revisions", dep: "T006", notes: "All team members review", budget: 0, approval: "Yes", approver: "Director" },
        { taskId: "T008", desc: "Incorporate feedback and revise", owner: "Study Lead", phase: "Phase 5: Review & Revisions", dep: "T007", notes: "Track changes for audit trail", budget: 0, approval: "No", approver: null },
        { taskId: "T009", desc: "Executive review and approval", owner: "Director", phase: "Phase 5: Review & Revisions", dep: "T008", notes: "Final sign-off required", budget: 0, approval: "Yes", approver: "Executive" },
        { taskId: "T010", desc: "Finalize and publish report", owner: "Study Lead", phase: "Phase 6: Final Report", dep: "T009", notes: "Distribute to all stakeholders", budget: 5000, approval: "No", approver: null },
      ],
      // Project 4: rideRTC Rewards (complete)
      [
        { taskId: "T001", desc: "Define rewards program objectives and KPIs", owner: "Marketing Manager", phase: "Phase 1: Campaign Planning & Strategy", dep: null, notes: "Loyalty, ridership growth targets", budget: 0, approval: "No", approver: null },
        { taskId: "T002", desc: "Identify target rider demographics", owner: "Marketing Manager", phase: "Phase 1: Campaign Planning & Strategy", dep: "T001", notes: "Existing vs new riders", budget: 0, approval: "No", approver: null },
        { taskId: "T003", desc: "Design rewards tier structure", owner: "Marketing Manager", phase: "Phase 1: Campaign Planning & Strategy", dep: "T002", notes: "Bronze, Silver, Gold tiers", budget: 0, approval: "No", approver: null },
        { taskId: "T004", desc: "Create marketing collateral and assets", owner: "Creative Team", phase: "Phase 2: Creative Development", dep: "T003", notes: "Posters, digital ads, social media", budget: 35000, approval: "No", approver: null },
        { taskId: "T005", desc: "GAMM review of all materials", owner: "GAMM", phase: "Phase 3: Internal Review & Approval", dep: "T004", notes: "Brand compliance check", budget: 0, approval: "Yes", approver: "GAMM Manager" },
        { taskId: "T006", desc: "Director approval", owner: "Director", phase: "Phase 3: Internal Review & Approval", dep: "T005", notes: "Strategic alignment review", budget: 0, approval: "Yes", approver: "Director" },
        { taskId: "T007", desc: "Launch rewards program", owner: "Marketing Team", phase: "Phase 4: Campaign Launch", dep: "T006", notes: "Coordinated launch across all channels", budget: 50000, approval: "No", approver: null },
        { taskId: "T008", desc: "Monitor enrollment and engagement", owner: "Marketing Analyst", phase: "Phase 5: Monitoring & Optimization", dep: "T007", notes: "Weekly dashboard updates", budget: 0, approval: "No", approver: null },
        { taskId: "T009", desc: "Optimize based on early metrics", owner: "Marketing Manager", phase: "Phase 5: Monitoring & Optimization", dep: "T008", notes: "A/B test messaging variations", budget: 10000, approval: "No", approver: null },
        { taskId: "T010", desc: "Compile final campaign report", owner: "Marketing Analyst", phase: "Phase 6: Post-Campaign Analysis", dep: "T009", notes: "ROI analysis and recommendations", budget: 0, approval: "No", approver: null },
      ],
    ];

  // Generate tasks with dynamic dates
  let taskIdCounter = 1;
  const tasks: Task[] = [];

  for (let pIdx = 0; pIdx < projects.length; pIdx++) {
    const project = projects[pIdx];
    const blueprints = taskBlueprints[pIdx];
    const projStart = project.startDate!;
    const projEnd = project.targetCompletionDate!;
    const projDurationMs = projEnd.getTime() - projStart.getTime();
    const taskCount = blueprints.length;
    const progressPct = projectDefs[pIdx].progressPct;

    for (let tIdx = 0; tIdx < taskCount; tIdx++) {
      const bp = blueprints[tIdx];
      // Distribute tasks evenly across the project timeline
      const taskFractionStart = tIdx / taskCount;
      const taskFractionEnd = (tIdx + 1) / taskCount;
      const startDate = new Date(projStart.getTime() + projDurationMs * taskFractionStart);
      const dueDate = new Date(projStart.getTime() + projDurationMs * taskFractionEnd);
      const durationDays = Math.max(1, Math.round((dueDate.getTime() - startDate.getTime()) / 864e5));

      // Derive status from project progress — task is complete if its midpoint is before the progress line
      const taskMidFraction = (taskFractionStart + taskFractionEnd) / 2;
      const progressFraction = progressPct / 100;
      let status: Task["status"];
      let completionPercent: number;
      if (taskMidFraction < progressFraction - 0.05) {
        status = "Complete";
        completionPercent = 100;
      } else if (taskMidFraction < progressFraction + 0.05) {
        status = "In Progress";
        completionPercent = Math.round(30 + Math.random() * 50);
      } else {
        status = "Not Started";
        completionPercent = 0;
      }

      const actualBudget = status === "Complete"
        ? Math.round(bp.budget * (0.8 + Math.random() * 0.3))
        : status === "In Progress"
          ? Math.round(bp.budget * (completionPercent / 100) * 0.9)
          : 0;

      tasks.push({
        id: taskIdCounter++,
        projectId: project.id,
        taskId: bp.taskId,
        taskDescription: bp.desc,
        startDate,
        dueDate,
        durationDays,
        dependency: bp.dep,
        owner: bp.owner,
        status,
        priority: "High",
        phase: bp.phase,
        milestone: null,
        budget: bp.budget,
        actualBudget,
        approvalRequired: bp.approval,
        approver: bp.approver,
        deliverableType: null,
        completionPercent,
        notes: bp.notes,
        createdAt: addDays(startDate, -1),
        updatedAt: status === "Complete" ? dueDate : status === "In Progress" ? now : startDate,
      });
    }
  }


  const notificationPreferences: NotificationPreference[] = [
    {
      id: 1,
      ...defaultNotificationPreference(DEFAULT_NOTIFICATION_SCOPE.scopeType, DEFAULT_NOTIFICATION_SCOPE.scopeKey),
      createdAt: new Date(seedTimestamp),
      updatedAt: new Date(seedTimestamp),
    },
  ];

  const userAccessPolicies: UserAccessPolicy[] = [
    {
      id: 1,
      openId: "test-user",
      accessRole: "Admin",
      updatedBy: "System",
      createdAt: new Date(seedTimestamp),
      updatedAt: new Date(seedTimestamp),
    },
  ];

  return {
    templates,
    projects,
    tasks,
    projectComments: [],
    projectActivities: [],
    notificationPreferences,
    notificationEvents: [],
    auditLogs: [],
    webhookSubscriptions: [],
    userAccessPolicies,
    projectRisks: [],
    projectTags: [],
    savedViews: [],
    taskNotes: [],
    projectNotes: [],
    nextProjectId: projects.length + 1,
    nextTaskId: tasks.length + 1,
    nextProjectCommentId: 1,
    nextProjectActivityId: 1,
    nextNotificationPreferenceId: notificationPreferences.length + 1,
    nextNotificationEventId: 1,
    nextAuditLogId: 1,
    nextWebhookSubscriptionId: 1,
    nextUserAccessPolicyId: userAccessPolicies.length + 1,
    nextProjectRiskId: 1,
    nextProjectTagId: 1,
    nextSavedViewId: 1,
    nextTaskNoteId: 1,
    nextProjectNoteId: 1,
    appSettings: [
      {
        id: 1,
        category: "branding",
        settingKey: "branding.appName",
        value: JSON.stringify("Darwin TaskLine"),
        updatedBy: "System",
        createdAt: new Date(seedTimestamp),
        updatedAt: new Date(seedTimestamp),
      },
      {
        id: 2,
        category: "branding",
        settingKey: "branding.logoUrl",
        value: JSON.stringify(null),
        updatedBy: "System",
        createdAt: new Date(seedTimestamp),
        updatedAt: new Date(seedTimestamp),
      },
    ] as AppSetting[],
    nextAppSettingId: 3,
  };
};

let memoryState = buildMemoryState();

const parseTaskCodeNumber = (taskId: string): number | null => {
  const match = /^T(\d+)$/i.exec(taskId.trim());
  if (!match) return null;
  const parsed = Number.parseInt(match[1] || "", 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const getNextTaskCodeFromIds = (taskIds: string[]) => {
  const upperTaskIds = new Set(taskIds.map((taskId) => taskId.trim().toUpperCase()));
  const highestNumber = taskIds.reduce((max, taskId) => {
    const parsed = parseTaskCodeNumber(taskId);
    if (parsed === null) return max;
    return Math.max(max, parsed);
  }, 0);

  let next = highestNumber + 1;
  let candidate = `T${String(next).padStart(3, "0")}`;
  while (upperTaskIds.has(candidate)) {
    next += 1;
    candidate = `T${String(next).padStart(3, "0")}`;
  }

  return candidate;
};

const getNextTaskCode = (projectId: number) => {
  const taskIds = memoryState.tasks
    .filter((task) => task.projectId === projectId)
    .map((task) => task.taskId);
  return getNextTaskCodeFromIds(taskIds);
};

const parseJsonArray = (value: string | null | undefined): string[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
};

const toNotificationFingerprint = (
  eventType: NotificationEventType,
  taskId: number | null | undefined,
  dueDate: Date | null | undefined
) => {
  const dayKey = dueDate ? dueDate.toISOString().slice(0, 10) : "no-date";
  return `${eventType}:${taskId ?? "none"}:${dayKey}`;
};

const parseEventMetadata = (value: string | null | undefined) => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
};

const getMentionHandles = (content: string) => {
  const handles = new Set<string>();
  const regex = /@([a-zA-Z0-9._-]+)/g;
  let match: RegExpExecArray | null = null;
  while ((match = regex.exec(content)) !== null) {
    const handle = match[1]?.trim();
    if (handle) handles.add(handle);
  }
  return Array.from(handles);
};

const parseWebhookEvents = (value: string | null | undefined): WebhookEventName[] =>
  parseJsonArray(value).filter((event): event is WebhookEventName => event.length > 0);

const computeProjectHealthFromTasks = (
  project: Project,
  projectTasks: Task[]
): PortfolioProjectHealth => {
  const now = new Date();
  const openTasks = projectTasks.filter((task) => task.status !== "Complete");
  const overdueOpenTasks = openTasks.filter(
    (task) => task.dueDate && task.dueDate.getTime() < now.getTime()
  ).length;
  const blockedTasks = projectTasks.filter((task) => task.status === "On Hold").length;

  if (overdueOpenTasks > 0 || blockedTasks >= 3 || project.status === "On Hold") {
    return "Off Track";
  }
  if (blockedTasks > 0 || overdueOpenTasks > 0 || project.status === "Planning") {
    return "At Risk";
  }
  return "On Track";
};

const getWeekStartIso = (date: Date) => {
  const weekStart = new Date(date);
  const day = weekStart.getUTCDay();
  const shift = day === 0 ? -6 : 1 - day;
  weekStart.setUTCDate(weekStart.getUTCDate() + shift);
  weekStart.setUTCHours(0, 0, 0, 0);
  return weekStart.toISOString().slice(0, 10);
};

const parseDependencies = (dependency: string | null) =>
  dependency
    ? dependency
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
    : [];

const uniqueIssues = (issues: DependencyValidationIssue[]) => {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.type}:${issue.taskId}:${issue.dependencyTaskId ?? ""}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const detectCycles = (taskMap: Map<string, Task>) => {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const cycleIssues: DependencyValidationIssue[] = [];

  const dfs = (taskId: string, path: string[]) => {
    if (visiting.has(taskId)) {
      cycleIssues.push({
        type: "cycle",
        taskId,
        message: `Dependency cycle detected: ${[...path, taskId].join(" -> ")}`,
      });
      return;
    }
    if (visited.has(taskId)) return;

    visiting.add(taskId);
    const task = taskMap.get(taskId);
    const dependencies = parseDependencies(task?.dependency ?? null);
    for (const dependencyTaskId of dependencies) {
      if (!taskMap.has(dependencyTaskId)) continue;
      dfs(dependencyTaskId, [...path, taskId]);
    }
    visiting.delete(taskId);
    visited.add(taskId);
  };

  for (const taskId of Array.from(taskMap.keys())) {
    if (!visited.has(taskId)) {
      dfs(taskId, []);
    }
  }

  return cycleIssues;
};

const buildDependencyIssues = (tasks: Task[]): DependencyValidationIssue[] => {
  const taskMap = new Map(tasks.map((task) => [task.taskId, task]));
  const issues: DependencyValidationIssue[] = [];

  for (const task of tasks) {
    const dependencies = parseDependencies(task.dependency);
    for (const dependencyTaskId of dependencies) {
      const dependencyTask = taskMap.get(dependencyTaskId);
      if (!dependencyTask) {
        issues.push({
          type: "missing_dependency",
          taskId: task.taskId,
          dependencyTaskId,
          message: `Task ${task.taskId} references missing dependency ${dependencyTaskId}.`,
        });
        continue;
      }

      if (
        dependencyTask.dueDate &&
        task.startDate &&
        dependencyTask.dueDate.getTime() > task.startDate.getTime()
      ) {
        issues.push({
          type: "date_conflict",
          taskId: task.taskId,
          dependencyTaskId,
          message: `Task ${task.taskId} starts before dependency ${dependencyTaskId} is due.`,
        });
      }
    }
  }

  return uniqueIssues([...issues, ...detectCycles(taskMap)]);
};

const computeDashboardStats = (allProjects: Project[], allTasks: Task[]) => {
  const totalProjects = allProjects.length;
  const activeProjects = allProjects.filter(
    (project) => project.status === "Active" || project.status === "Planning"
  ).length;
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((task) => task.status === "Complete").length;

  const now = new Date();
  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const upcomingDeadlines = allTasks
    .filter(
      (task) =>
        task.dueDate &&
        task.status !== "Complete" &&
        task.dueDate >= now &&
        task.dueDate <= twoWeeksLater
    )
    .sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0))
    .slice(0, 10);

  return {
    totalProjects,
    activeProjects,
    totalTasks,
    completedTasks,
    upcomingDeadlines,
  };
};

const computePortfolioSummary = (
  allProjects: Project[],
  allTasks: Task[]
): PortfolioSummary => {
  const now = new Date();
  const tasksByProject = new Map<number, Task[]>();
  for (const task of allTasks) {
    if (!tasksByProject.has(task.projectId)) {
      tasksByProject.set(task.projectId, []);
    }
    tasksByProject.get(task.projectId)!.push(task);
  }

  const projectHealthRows = allProjects.map((project) => {
    const projectTasks = tasksByProject.get(project.id) ?? [];
    const health = computeProjectHealthFromTasks(project, projectTasks);
    const overdueTasks = projectTasks.filter(
      (task) =>
        task.status !== "Complete" &&
        task.dueDate &&
        task.dueDate.getTime() < now.getTime()
    ).length;
    const blockedTasks = projectTasks.filter((task) => task.status === "On Hold").length;

    return {
      projectId: project.id,
      projectName: project.name,
      health,
      overdueTasks,
      blockedTasks,
      completionPercent:
        projectTasks.length > 0
          ? Math.round(
            projectTasks.reduce(
              (sum, task) => sum + (task.completionPercent ?? 0),
              0
            ) / projectTasks.length
          )
          : 0,
    };
  });

  const onTrack = projectHealthRows.filter((row) => row.health === "On Track").length;
  const atRisk = projectHealthRows.filter((row) => row.health === "At Risk").length;
  const offTrack = projectHealthRows.filter((row) => row.health === "Off Track").length;

  const confidence = {
    high: projectHealthRows.filter((row) => row.health === "On Track").length,
    medium: projectHealthRows.filter((row) => row.health === "At Risk").length,
    low: projectHealthRows.filter((row) => row.health === "Off Track").length,
  };

  const throughputCounter = new Map<string, number>();
  for (const task of allTasks) {
    if (task.status !== "Complete") continue;
    const completionDate = task.updatedAt ?? task.createdAt;
    const weekStart = getWeekStartIso(completionDate);
    throughputCounter.set(weekStart, (throughputCounter.get(weekStart) ?? 0) + 1);
  }

  const throughputByWeek = Array.from(throughputCounter.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-8)
    .map(([weekStart, completedTasks]) => ({
      weekStart,
      completedTasks,
    }));

  const topRisks = projectHealthRows
    .filter((row) => row.health !== "On Track")
    .sort((a, b) => {
      if (a.overdueTasks !== b.overdueTasks) return b.overdueTasks - a.overdueTasks;
      if (a.blockedTasks !== b.blockedTasks) return b.blockedTasks - a.blockedTasks;
      return a.projectName.localeCompare(b.projectName);
    })
    .slice(0, 5)
    .map((row) => ({
      projectId: row.projectId,
      projectName: row.projectName,
      health: row.health,
      overdueTasks: row.overdueTasks,
      blockedTasks: row.blockedTasks,
    }));

  const totalCompletionPercent =
    projectHealthRows.length > 0
      ? Math.round(
        projectHealthRows.reduce((sum, row) => sum + row.completionPercent, 0) /
        projectHealthRows.length
      )
      : 0;

  return {
    totals: {
      totalProjects: allProjects.length,
      activeProjects: allProjects.filter(
        (project) => project.status === "Active" || project.status === "Planning"
      ).length,
      onTrack,
      atRisk,
      offTrack,
      averageCompletionPercent: totalCompletionPercent,
    },
    milestoneConfidence: confidence,
    throughputByWeek,
    topRisks,
    projectHealth: projectHealthRows.map((row) => ({
      projectId: row.projectId,
      health: row.health,
    })),
  };
};

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const Database = (await import("better-sqlite3")).default;
      const dbPath = process.env.DATABASE_URL.replace(/^file:/, "");
      const sqlite = new Database(dbPath);
      sqlite.pragma("journal_mode = WAL");
      _db = drizzle(sqlite);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function listUsers(limit = 100) {
  const boundedLimit = Math.max(1, Math.min(limit, 500));
  const db = await getDb();
  if (!db) {
    return [] as Array<{
      openId: string;
      name: string | null;
      email: string | null;
      role: "user" | "admin";
    }>;
  }

  const rows = await db.select().from(users).orderBy(desc(users.updatedAt)).limit(boundedLimit);
  return rows.map((row) => ({
    openId: row.openId,
    name: row.name ?? null,
    email: row.email ?? null,
    role: row.role,
  }));
}

export async function updateUserBaseRole(openId: string, role: "user" | "admin") {
  const db = await getDb();
  if (!db) {
    return;
  }
  await db.update(users).set({ role }).where(eq(users.openId, openId));
}

// ============================================================================
// TEMPLATE QUERIES
// ============================================================================

const filterTemplates = (
  templates: Template[],
  options: TemplateQueryOptions = {}
) => {
  const status = options.status ?? "Published";
  const includeArchived = options.includeArchived ?? false;
  const templateGroupKey = options.templateGroupKey
    ? getTemplateGroupKey(options.templateGroupKey)
    : undefined;

  return templates
    .filter((template) => {
      if (status !== "All" && template.status !== status) return false;
      if (status === "All" && !includeArchived && template.status === "Archived") return false;
      if (templateGroupKey && template.templateGroupKey !== templateGroupKey) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.name !== b.name) return a.name.localeCompare(b.name);
      return a.version - b.version;
    });
};

export async function getAllTemplates(options: TemplateQueryOptions = {}) {
  const db = await getDb();
  if (!db) {
    return filterTemplates([...memoryState.templates], options).map(copyTemplate);
  }

  const { templates } = await import("../drizzle/schema");
  const rows = await db.select().from(templates).orderBy(templates.name, templates.version);
  return filterTemplates(rows, options);
}

export async function getTemplateById(id: number) {
  const db = await getDb();
  if (!db) {
    const template = memoryState.templates.find((item) => item.id === id);
    return template ? copyTemplate(template) : undefined;
  }

  const { templates } = await import("../drizzle/schema");
  const result = await db.select().from(templates).where(eq(templates.id, id)).limit(1);
  return result[0];
}

export async function getTemplateByKey(key: string) {
  const db = await getDb();
  if (!db) {
    const template = memoryState.templates.find((item) => item.templateKey === key);
    return template ? copyTemplate(template) : undefined;
  }

  const { templates } = await import("../drizzle/schema");
  const result = await db.select().from(templates).where(eq(templates.templateKey, key)).limit(1);
  return result[0];
}

export async function createTemplate(data: InsertTemplate) {
  const db = await getDb();
  const normalizedKey = normalizeTemplateKey(data.templateKey || data.name);
  const templateGroupKey = getTemplateGroupKey(data.templateGroupKey || normalizedKey);

  if (!db) {
    const template: Template = {
      id: memoryState.templates.reduce((max, item) => Math.max(max, item.id), 0) + 1,
      name: data.name,
      templateKey: normalizedKey,
      templateGroupKey,
      version: data.version ?? 1,
      status: data.status ?? "Draft",
      description: data.description ?? null,
      phases: data.phases,
      sampleTasks: data.sampleTasks,
      uploadSource: data.uploadSource ?? "manual",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    memoryState.templates.push(template);
    return template.id;
  }

  const { templates } = await import("../drizzle/schema");
  const result = await db
    .insert(templates)
    .values({
      ...data,
      templateKey: normalizedKey,
      templateGroupKey,
      version: data.version ?? 1,
      status: data.status ?? "Draft",
      uploadSource: data.uploadSource ?? "manual",
    })
    .returning({ id: templates.id });
  return result[0]?.id || 0;
}

export async function updateTemplate(id: number, data: Partial<InsertTemplate>) {
  const db = await getDb();

  if (!db) {
    const index = memoryState.templates.findIndex((template) => template.id === id);
    if (index < 0) return;
    const current = memoryState.templates[index]!;
    const templateKey = data.templateKey ? normalizeTemplateKey(data.templateKey) : current.templateKey;
    const templateGroupKey = data.templateGroupKey
      ? getTemplateGroupKey(data.templateGroupKey)
      : current.templateGroupKey;

    memoryState.templates[index] = {
      ...current,
      ...data,
      templateKey,
      templateGroupKey,
      description: data.description ?? current.description,
      phases: data.phases ?? current.phases,
      sampleTasks: data.sampleTasks ?? current.sampleTasks,
      uploadSource: data.uploadSource ?? current.uploadSource,
      updatedAt: new Date(),
    };
    return;
  }

  const { templates } = await import("../drizzle/schema");
  const updateData: Partial<InsertTemplate> = { ...data };

  if (data.templateKey) {
    updateData.templateKey = normalizeTemplateKey(data.templateKey);
  }
  if (data.templateGroupKey) {
    updateData.templateGroupKey = getTemplateGroupKey(data.templateGroupKey);
  }

  await db.update(templates).set(updateData).where(eq(templates.id, id));
}

export async function archiveTemplate(id: number) {
  return updateTemplate(id, { status: "Archived" });
}

export async function publishTemplate(id: number) {
  const target = await getTemplateById(id);
  if (!target) throw new Error("Template not found");
  const groupKey = target.templateGroupKey;

  const db = await getDb();
  if (!db) {
    memoryState.templates = memoryState.templates.map((template) => {
      if (template.templateGroupKey !== groupKey) return template;
      if (template.id === id) {
        return {
          ...template,
          status: "Published",
          updatedAt: new Date(),
        };
      }
      if (template.status === "Published") {
        return {
          ...template,
          status: "Archived",
          updatedAt: new Date(),
        };
      }
      return template;
    });
    return;
  }

  const { templates } = await import("../drizzle/schema");

  await db
    .update(templates)
    .set({ status: "Archived" })
    .where(and(eq(templates.templateGroupKey, groupKey), eq(templates.status, "Published")));

  await db.update(templates).set({ status: "Published" }).where(eq(templates.id, id));
}

export async function createTemplateVersion(sourceTemplateId: number) {
  const source = await getTemplateById(sourceTemplateId);
  if (!source) throw new Error("Source template not found");

  const groupTemplates = await getAllTemplates({
    status: "All",
    includeArchived: true,
    templateGroupKey: source.templateGroupKey,
  });

  const maxVersion = groupTemplates.reduce((max, template) => Math.max(max, template.version), 0);
  const nextVersion = maxVersion + 1;

  const newKey = `${source.templateGroupKey}_v${nextVersion}`;

  return createTemplate({
    name: source.name,
    templateKey: newKey,
    templateGroupKey: source.templateGroupKey,
    version: nextVersion,
    status: "Draft",
    description: source.description ?? undefined,
    phases: source.phases,
    sampleTasks: source.sampleTasks,
    uploadSource: "version",
  });
}

// ============================================================================
// PROJECT QUERIES
// ============================================================================

export async function getAllProjects() {
  const db = await getDb();
  if (!db) {
    return [...memoryState.projects]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(copyProject);
  }

  const { projects } = await import("../drizzle/schema");
  return db.select().from(projects).orderBy(desc(projects.createdAt));
}

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) {
    const project = memoryState.projects.find((item) => item.id === id);
    return project ? copyProject(project) : undefined;
  }

  const { projects } = await import("../drizzle/schema");
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result[0];
}

export async function createProject(data: InsertProject) {
  const db = await getDb();
  if (!db) {
    const project: Project = {
      id: memoryState.nextProjectId++,
      name: data.name,
      description: data.description ?? null,
      templateId: data.templateId ?? null,
      templateType: data.templateType,
      projectManager: data.projectManager ?? null,
      startDate: data.startDate ?? null,
      targetCompletionDate: data.targetCompletionDate ?? null,
      budget: data.budget ?? null,
      actualBudget: data.actualBudget ?? null,
      status: data.status ?? "Planning",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    memoryState.projects.push(project);
    return project.id;
  }

  const { projects } = await import("../drizzle/schema");
  const result = await db.insert(projects).values(data).returning({ id: projects.id });
  return result[0]?.id || 0;
}

export async function updateProject(id: number, data: Partial<InsertProject>) {
  const db = await getDb();
  if (!db) {
    const index = memoryState.projects.findIndex((project) => project.id === id);
    if (index < 0) return;
    memoryState.projects[index] = {
      ...memoryState.projects[index],
      ...data,
      updatedAt: new Date(),
      description: data.description ?? memoryState.projects[index]!.description,
      templateId: data.templateId ?? memoryState.projects[index]!.templateId,
      projectManager: data.projectManager ?? memoryState.projects[index]!.projectManager,
      startDate: data.startDate ?? memoryState.projects[index]!.startDate,
      targetCompletionDate:
        data.targetCompletionDate ?? memoryState.projects[index]!.targetCompletionDate,
      budget: data.budget ?? memoryState.projects[index]!.budget,
      actualBudget: data.actualBudget ?? memoryState.projects[index]!.actualBudget,
    };
    return;
  }

  const { projects } = await import("../drizzle/schema");
  await db.update(projects).set(data).where(eq(projects.id, id));
}

export async function deleteProject(id: number) {
  const db = await getDb();
  if (!db) {
    memoryState.projects = memoryState.projects.filter((project) => project.id !== id);
    memoryState.tasks = memoryState.tasks.filter((task) => task.projectId !== id);
    return;
  }

  const { projects } = await import("../drizzle/schema");
  await db.delete(projects).where(eq(projects.id, id));
}

// ============================================================================
// TASK QUERIES
// ============================================================================

export async function getTasksByProjectId(projectId: number) {
  const db = await getDb();
  if (!db) {
    return memoryState.tasks
      .filter((task) => task.projectId === projectId)
      .sort((a, b) => a.taskId.localeCompare(b.taskId))
      .map(copyTask);
  }

  const { tasks } = await import("../drizzle/schema");
  return db.select().from(tasks).where(eq(tasks.projectId, projectId)).orderBy(tasks.taskId);
}

export async function getTaskById(id: number) {
  const db = await getDb();
  if (!db) {
    const task = memoryState.tasks.find((item) => item.id === id);
    return task ? copyTask(task) : undefined;
  }

  const { tasks } = await import("../drizzle/schema");
  const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return result[0];
}

export async function getTasksByIds(taskIds: number[]) {
  if (taskIds.length === 0) return [];
  const allTasks = await getAllTasks();
  const taskIdSet = new Set(taskIds);
  return allTasks.filter((task) => taskIdSet.has(task.id));
}

export async function validateTaskDependencies(projectId: number) {
  const tasks = await getTasksByProjectId(projectId);
  return buildDependencyIssues(tasks);
}

const estimateTaskDurationDays = (task: Task) => {
  if (task.durationDays && task.durationDays > 0) return task.durationDays;
  if (task.startDate && task.dueDate) {
    const msPerDay = 24 * 60 * 60 * 1000;
    const diff = Math.ceil(
      (task.dueDate.getTime() - task.startDate.getTime()) / msPerDay
    );
    return Math.max(1, diff);
  }
  return 1;
};

export async function getProjectCriticalPath(
  projectId: number
): Promise<CriticalPathSummary> {
  const tasks = await getTasksByProjectId(projectId);
  if (tasks.length === 0) {
    return {
      projectId,
      taskIds: [],
      taskCodes: [],
      totalDurationDays: 0,
      blockedByCycle: false,
    };
  }

  const taskByCode = new Map(tasks.map((task) => [task.taskId, task]));
  const dependencyMap = new Map<string, string[]>();
  for (const task of tasks) {
    const dependencies = parseDependencies(task.dependency).filter((dependencyCode) =>
      taskByCode.has(dependencyCode)
    );
    dependencyMap.set(task.taskId, dependencies);
  }

  const memo = new Map<string, { duration: number; path: string[] }>();
  const visiting = new Set<string>();
  let blockedByCycle = false;

  const longestEndingAt = (taskCode: string): { duration: number; path: string[] } => {
    const memoized = memo.get(taskCode);
    if (memoized) return memoized;

    if (visiting.has(taskCode)) {
      blockedByCycle = true;
      const cycleTask = taskByCode.get(taskCode);
      const fallback = {
        duration: cycleTask ? estimateTaskDurationDays(cycleTask) : 1,
        path: [taskCode],
      };
      memo.set(taskCode, fallback);
      return fallback;
    }

    const task = taskByCode.get(taskCode);
    if (!task) {
      const fallback = { duration: 1, path: [taskCode] };
      memo.set(taskCode, fallback);
      return fallback;
    }

    visiting.add(taskCode);
    let bestDependencyDuration = 0;
    let bestDependencyPath: string[] = [];

    for (const dependencyCode of dependencyMap.get(taskCode) ?? []) {
      const dependencyCandidate = longestEndingAt(dependencyCode);
      if (dependencyCandidate.duration > bestDependencyDuration) {
        bestDependencyDuration = dependencyCandidate.duration;
        bestDependencyPath = dependencyCandidate.path;
      }
    }
    visiting.delete(taskCode);

    const duration = estimateTaskDurationDays(task) + bestDependencyDuration;
    const result = {
      duration,
      path: [...bestDependencyPath, taskCode],
    };
    memo.set(taskCode, result);
    return result;
  };

  let best = { duration: 0, path: [] as string[] };
  for (const task of tasks) {
    const candidate = longestEndingAt(task.taskId);
    if (candidate.duration > best.duration) {
      best = candidate;
    }
  }

  return {
    projectId,
    taskIds: best.path
      .map((taskCode) => taskByCode.get(taskCode)?.id)
      .filter((id): id is number => typeof id === "number"),
    taskCodes: best.path,
    totalDurationDays: best.duration,
    blockedByCycle,
  };
}

export async function createTask(data: InsertTask) {
  const db = await getDb();
  if (!db) {
    const task: Task = {
      id: memoryState.nextTaskId++,
      projectId: data.projectId,
      taskId: data.taskId || getNextTaskCode(data.projectId),
      taskDescription: data.taskDescription,
      startDate: data.startDate ?? null,
      dueDate: data.dueDate ?? null,
      durationDays: data.durationDays ?? null,
      dependency: data.dependency ?? null,
      owner: data.owner ?? null,
      status: data.status ?? "Not Started",
      priority: data.priority ?? "Medium",
      phase: data.phase ?? null,
      milestone: data.milestone ?? null,
      budget: data.budget ?? null,
      actualBudget: data.actualBudget ?? null,
      approvalRequired: data.approvalRequired ?? "No",
      approver: data.approver ?? null,
      deliverableType: data.deliverableType ?? null,
      completionPercent: data.completionPercent ?? 0,
      notes: data.notes ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    memoryState.tasks.push(task);
    return task.id;
  }

  const { tasks } = await import("../drizzle/schema");

  if (!data.taskId) {
    const existingTasks = await db.select().from(tasks).where(eq(tasks.projectId, data.projectId));
    data.taskId = getNextTaskCodeFromIds(existingTasks.map((task) => task.taskId));
  }

  await db.insert(tasks).values(data);
  const result = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, data.projectId))
    .orderBy(desc(tasks.id))
    .limit(1);
  return result[0]?.id || 0;
}

export async function updateTask(id: number, data: Partial<InsertTask>) {
  const db = await getDb();
  if (!db) {
    const index = memoryState.tasks.findIndex((task) => task.id === id);
    if (index < 0) return;
    const current = memoryState.tasks[index]!;
    const pick = <T>(value: T | undefined, fallback: T) =>
      value === undefined ? fallback : value;
    memoryState.tasks[index] = {
      ...current,
      ...data,
      updatedAt: new Date(),
      startDate: pick(data.startDate, current.startDate),
      dueDate: pick(data.dueDate, current.dueDate),
      durationDays: pick(data.durationDays, current.durationDays),
      dependency: pick(data.dependency, current.dependency),
      owner: pick(data.owner, current.owner),
      phase: pick(data.phase, current.phase),
      budget: pick(data.budget, current.budget),
      actualBudget: pick(data.actualBudget, current.actualBudget),
      approver: pick(data.approver, current.approver),
      deliverableType: pick(data.deliverableType, current.deliverableType),
      notes: pick(data.notes, current.notes),
      completionPercent: pick(data.completionPercent, current.completionPercent),
    };
    return;
  }

  const { tasks } = await import("../drizzle/schema");
  await db.update(tasks).set(data).where(eq(tasks.id, id));
}

export async function bulkUpdateTasks(taskIds: number[], data: Partial<InsertTask>) {
  if (taskIds.length === 0) return 0;

  for (const taskId of taskIds) {
    await updateTask(taskId, data);
  }
  return taskIds.length;
}

export async function deleteTask(id: number) {
  const db = await getDb();
  if (!db) {
    memoryState.tasks = memoryState.tasks.filter((task) => task.id !== id);
    return;
  }

  const { tasks } = await import("../drizzle/schema");
  await db.delete(tasks).where(eq(tasks.id, id));
}

export async function getAllTasks() {
  const db = await getDb();
  if (!db) return memoryState.tasks.map(copyTask);

  const { tasks } = await import("../drizzle/schema");
  return db.select().from(tasks);
}

// ============================================================================
// DASHBOARD QUERIES
// ============================================================================

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) {
    return computeDashboardStats(memoryState.projects, memoryState.tasks);
  }

  const { projects, tasks } = await import("../drizzle/schema");
  const allProjects = await db.select().from(projects);
  const allTasks = await db.select().from(tasks);
  return computeDashboardStats(allProjects, allTasks);
}

export async function getPortfolioSummary() {
  const db = await getDb();
  if (!db) {
    return computePortfolioSummary(memoryState.projects, memoryState.tasks);
  }

  const { projects, tasks } = await import("../drizzle/schema");
  const allProjects = await db.select().from(projects);
  const allTasks = await db.select().from(tasks);
  return computePortfolioSummary(allProjects, allTasks);
}

// ============================================================================
// COLLABORATION QUERIES
// ============================================================================

export async function getProjectComments(projectId: number, taskId?: number) {
  const db = await getDb();
  if (!db) {
    return memoryState.projectComments
      .filter((comment) => {
        if (comment.projectId !== projectId) return false;
        if (taskId === undefined) return true;
        return comment.taskId === taskId;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(copyProjectComment);
  }

  const { projectComments } = await import("../drizzle/schema");
  if (taskId === undefined) {
    return db
      .select()
      .from(projectComments)
      .where(eq(projectComments.projectId, projectId))
      .orderBy(desc(projectComments.createdAt));
  }

  return db
    .select()
    .from(projectComments)
    .where(and(eq(projectComments.projectId, projectId), eq(projectComments.taskId, taskId)))
    .orderBy(desc(projectComments.createdAt));
}

export async function createProjectComment(
  data: Omit<InsertProjectComment, "mentions"> & { mentions?: string[] | null }
) {
  const serializedMentions = JSON.stringify(data.mentions ?? getMentionHandles(data.content));
  const db = await getDb();
  if (!db) {
    const comment: ProjectComment = {
      id: memoryState.nextProjectCommentId++,
      projectId: data.projectId,
      taskId: data.taskId ?? null,
      authorName: data.authorName,
      content: data.content,
      mentions: serializedMentions,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryState.projectComments.push(comment);
    return copyProjectComment(comment);
  }

  const { projectComments } = await import("../drizzle/schema");
  const result = await db
    .insert(projectComments)
    .values({
      ...data,
      mentions: serializedMentions,
    })
    .returning({ id: projectComments.id });
  const id = result[0]?.id;
  if (!id) throw new Error("Failed to create project comment");
  const created = await db
    .select()
    .from(projectComments)
    .where(eq(projectComments.id, id))
    .limit(1);
  if (!created[0]) throw new Error("Failed to fetch project comment");
  return created[0];
}

export async function getProjectActivities(projectId: number, limit = 100) {
  const boundedLimit = Math.max(1, Math.min(200, limit));
  const db = await getDb();
  if (!db) {
    return memoryState.projectActivities
      .filter((activity) => activity.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, boundedLimit)
      .map(copyProjectActivity);
  }

  const { projectActivities } = await import("../drizzle/schema");
  return db
    .select()
    .from(projectActivities)
    .where(eq(projectActivities.projectId, projectId))
    .orderBy(desc(projectActivities.createdAt))
    .limit(boundedLimit);
}

export async function createProjectActivity(data: InsertProjectActivity) {
  const db = await getDb();
  if (!db) {
    const activity: ProjectActivity = {
      id: memoryState.nextProjectActivityId++,
      projectId: data.projectId,
      taskId: data.taskId ?? null,
      actorName: data.actorName,
      eventType: data.eventType,
      summary: data.summary,
      metadata: data.metadata ?? null,
      createdAt: new Date(),
    };
    memoryState.projectActivities.push(activity);
    return copyProjectActivity(activity);
  }

  const { projectActivities } = await import("../drizzle/schema");
  const result = await db.insert(projectActivities).values(data).returning({ id: projectActivities.id });
  const id = result[0]?.id;
  if (!id) throw new Error("Failed to create project activity");
  const created = await db
    .select()
    .from(projectActivities)
    .where(eq(projectActivities.id, id))
    .limit(1);
  if (!created[0]) throw new Error("Failed to fetch project activity");
  return created[0];
}

// ============================================================================
// NOTIFICATION QUERIES
// ============================================================================

export async function getNotificationPreference(
  scopeType: NotificationScopeType = DEFAULT_NOTIFICATION_SCOPE.scopeType,
  scopeKey: string = DEFAULT_NOTIFICATION_SCOPE.scopeKey
) {
  const db = await getDb();
  if (!db) {
    const item = memoryState.notificationPreferences.find(
      (preference) =>
        preference.scopeType === scopeType && preference.scopeKey === scopeKey
    );
    return item ? copyNotificationPreference(item) : undefined;
  }

  const { notificationPreferences } = await import("../drizzle/schema");
  const result = await db
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.scopeType, scopeType),
        eq(notificationPreferences.scopeKey, scopeKey)
      )
    )
    .limit(1);
  return result[0];
}

export async function upsertNotificationPreference(
  scopeType: NotificationScopeType = DEFAULT_NOTIFICATION_SCOPE.scopeType,
  scopeKey: string = DEFAULT_NOTIFICATION_SCOPE.scopeKey,
  patch: NotificationPreferencesPatch = {}
) {
  const normalizedPatch: NotificationPreferencesPatch = {
    ...patch,
    webhookUrl: normalizeWebhookUrl(patch.webhookUrl),
  };
  const db = await getDb();

  if (!db) {
    const index = memoryState.notificationPreferences.findIndex(
      (preference) =>
        preference.scopeType === scopeType && preference.scopeKey === scopeKey
    );
    const now = new Date();

    if (index >= 0) {
      const current = memoryState.notificationPreferences[index]!;
      const next: NotificationPreference = {
        ...current,
        ...normalizedPatch,
        updatedAt: now,
      };
      memoryState.notificationPreferences[index] = next;
      return copyNotificationPreference(next);
    }

    const next: NotificationPreference = {
      id: memoryState.nextNotificationPreferenceId++,
      ...defaultNotificationPreference(scopeType, scopeKey),
      ...normalizedPatch,
      createdAt: now,
      updatedAt: now,
    };
    memoryState.notificationPreferences.push(next);
    return copyNotificationPreference(next);
  }

  const existing = await getNotificationPreference(scopeType, scopeKey);
  const { notificationPreferences } = await import("../drizzle/schema");

  if (existing) {
    await db
      .update(notificationPreferences)
      .set(normalizedPatch as Partial<InsertNotificationPreference>)
      .where(eq(notificationPreferences.id, existing.id));
    const updated = await getNotificationPreference(scopeType, scopeKey);
    if (!updated) throw new Error("Failed to update notification preference");
    return updated;
  }

  const result = await db
    .insert(notificationPreferences)
    .values({
      ...defaultNotificationPreference(scopeType, scopeKey),
      ...normalizedPatch,
    })
    .returning({ id: notificationPreferences.id });
  const id = result[0]?.id;
  if (!id) throw new Error("Failed to create notification preference");
  const created = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.id, id))
    .limit(1);
  if (!created[0]) throw new Error("Failed to fetch notification preference");
  return created[0];
}

export async function ensureNotificationPreference(
  scopeType: NotificationScopeType = DEFAULT_NOTIFICATION_SCOPE.scopeType,
  scopeKey: string = DEFAULT_NOTIFICATION_SCOPE.scopeKey
) {
  const existing = await getNotificationPreference(scopeType, scopeKey);
  if (existing) return existing;
  return upsertNotificationPreference(scopeType, scopeKey, {});
}

export async function listNotificationEvents(projectId: number, limit = 100) {
  const boundedLimit = Math.max(1, Math.min(200, limit));
  const db = await getDb();
  if (!db) {
    return memoryState.notificationEvents
      .filter((event) => event.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, boundedLimit)
      .map(copyNotificationEvent);
  }

  const { notificationEvents } = await import("../drizzle/schema");
  return db
    .select()
    .from(notificationEvents)
    .where(eq(notificationEvents.projectId, projectId))
    .orderBy(desc(notificationEvents.createdAt))
    .limit(boundedLimit);
}

export async function createNotificationEvent(data: InsertNotificationEvent) {
  const db = await getDb();
  if (!db) {
    const event: NotificationEvent = {
      id: memoryState.nextNotificationEventId++,
      projectId: data.projectId,
      taskId: data.taskId ?? null,
      eventType: data.eventType,
      title: data.title,
      message: data.message,
      channels: data.channels,
      metadata: data.metadata ?? null,
      createdAt: new Date(),
    };
    memoryState.notificationEvents.push(event);
    return copyNotificationEvent(event);
  }

  const { notificationEvents } = await import("../drizzle/schema");
  const result = await db.insert(notificationEvents).values(data).returning({ id: notificationEvents.id });
  const id = result[0]?.id;
  if (!id) throw new Error("Failed to create notification event");
  const created = await db
    .select()
    .from(notificationEvents)
    .where(eq(notificationEvents.id, id))
    .limit(1);
  if (!created[0]) throw new Error("Failed to fetch notification event");
  return created[0];
}

export async function recordTaskChangeActivityAndNotifications(args: {
  before: Task;
  after: Task;
  actorName: string;
  scopeType?: NotificationScopeType;
  scopeKey?: string;
}) {
  const activities: ProjectActivity[] = [];
  const notifications: NotificationEvent[] = [];
  const preference = await ensureNotificationPreference(
    args.scopeType ?? DEFAULT_NOTIFICATION_SCOPE.scopeType,
    args.scopeKey ?? DEFAULT_NOTIFICATION_SCOPE.scopeKey
  );
  const channels = getDeliveryChannels(preference);

  const ownerChanged = (args.before.owner ?? "") !== (args.after.owner ?? "");
  const statusChanged = args.before.status !== args.after.status;

  if (ownerChanged) {
    activities.push(
      await createProjectActivity({
        projectId: args.after.projectId,
        taskId: args.after.id,
        actorName: args.actorName,
        eventType: "task_assignment_changed",
        summary: `${args.actorName} reassigned ${args.after.taskId} to ${args.after.owner ?? "Unassigned"}.`,
        metadata: JSON.stringify({
          from: args.before.owner ?? null,
          to: args.after.owner ?? null,
        }),
      })
    );

    if (isEnabled(preference.assignmentEnabled) && channels.length > 0) {
      notifications.push(
        await createNotificationEvent({
          projectId: args.after.projectId,
          taskId: args.after.id,
          eventType: "assignment_changed",
          title: `${args.after.taskId} assignment changed`,
          message: `Task ${args.after.taskId} is now assigned to ${args.after.owner ?? "Unassigned"}.`,
          channels: JSON.stringify(channels),
          metadata: JSON.stringify({
            from: args.before.owner ?? null,
            to: args.after.owner ?? null,
          }),
        })
      );
    }
  }

  if (statusChanged) {
    activities.push(
      await createProjectActivity({
        projectId: args.after.projectId,
        taskId: args.after.id,
        actorName: args.actorName,
        eventType: "task_status_changed",
        summary: `${args.actorName} changed ${args.after.taskId} status to ${args.after.status}.`,
        metadata: JSON.stringify({
          from: args.before.status,
          to: args.after.status,
        }),
      })
    );

    if (isEnabled(preference.statusChangeEnabled) && channels.length > 0) {
      notifications.push(
        await createNotificationEvent({
          projectId: args.after.projectId,
          taskId: args.after.id,
          eventType: "status_changed",
          title: `${args.after.taskId} status changed`,
          message: `Task ${args.after.taskId} moved from ${args.before.status} to ${args.after.status}.`,
          channels: JSON.stringify(channels),
          metadata: JSON.stringify({
            from: args.before.status,
            to: args.after.status,
          }),
        })
      );
    }
  }

  return { activities, notifications };
}

export async function generateScheduleNotifications(
  projectId: number,
  actorName = "System",
  scopeType: NotificationScopeType = DEFAULT_NOTIFICATION_SCOPE.scopeType,
  scopeKey: string = DEFAULT_NOTIFICATION_SCOPE.scopeKey
) {
  const preference = await ensureNotificationPreference(scopeType, scopeKey);
  const channels = getDeliveryChannels(preference);
  if (channels.length === 0) {
    return {
      generatedCount: 0,
      notifications: [] as NotificationEvent[],
    };
  }

  const tasks = await getTasksByProjectId(projectId);
  const existingEvents = await listNotificationEvents(projectId, 200);
  const existingFingerprints = new Set<string>();
  for (const event of existingEvents) {
    const metadata = parseEventMetadata(event.metadata);
    const fingerprint = metadata.fingerprint;
    if (typeof fingerprint === "string") {
      existingFingerprints.add(fingerprint);
    }
  }

  const now = new Date();
  const dueSoonThreshold = new Date(
    now.getTime() + DUE_SOON_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );
  const created: NotificationEvent[] = [];

  for (const task of tasks) {
    if (!task.dueDate || task.status === "Complete") continue;

    let eventType: NotificationEventType | null = null;
    if (task.dueDate.getTime() < now.getTime() && isEnabled(preference.overdueEnabled)) {
      eventType = "overdue";
    } else if (
      task.dueDate.getTime() >= now.getTime() &&
      task.dueDate.getTime() <= dueSoonThreshold.getTime() &&
      isEnabled(preference.dueSoonEnabled)
    ) {
      eventType = "due_soon";
    }

    if (!eventType) continue;
    const fingerprint = toNotificationFingerprint(eventType, task.id, task.dueDate);
    if (existingFingerprints.has(fingerprint)) continue;
    existingFingerprints.add(fingerprint);

    const title =
      eventType === "overdue"
        ? `${task.taskId} is overdue`
        : `${task.taskId} is due soon`;
    const message =
      eventType === "overdue"
        ? `Task ${task.taskId} is overdue (due ${task.dueDate.toISOString().slice(0, 10)}).`
        : `Task ${task.taskId} is due soon (${task.dueDate.toISOString().slice(0, 10)}).`;

    const notification = await createNotificationEvent({
      projectId,
      taskId: task.id,
      eventType,
      title,
      message,
      channels: JSON.stringify(channels),
      metadata: JSON.stringify({
        fingerprint,
        dueDate: task.dueDate.toISOString(),
      }),
    });
    created.push(notification);

    await createProjectActivity({
      projectId,
      taskId: task.id,
      actorName,
      eventType: eventType === "overdue" ? "overdue" : "due_soon",
      summary: message,
      metadata: JSON.stringify({
        notificationEventId: notification.id,
      }),
    });
  }

  return {
    generatedCount: created.length,
    notifications: created,
  };
}

export function toNotificationPreferenceView(preference: NotificationPreference) {
  return {
    id: preference.id,
    scopeType: preference.scopeType,
    scopeKey: preference.scopeKey,
    channels: {
      inApp: isEnabled(preference.inAppEnabled),
      email: isEnabled(preference.emailEnabled),
      slack: isEnabled(preference.slackEnabled),
      webhook: isEnabled(preference.webhookEnabled),
      webhookUrl: preference.webhookUrl ?? "",
    },
    events: {
      overdue: isEnabled(preference.overdueEnabled),
      dueSoon: isEnabled(preference.dueSoonEnabled),
      assignmentChanged: isEnabled(preference.assignmentEnabled),
      statusChanged: isEnabled(preference.statusChangeEnabled),
    },
    createdAt: preference.createdAt,
    updatedAt: preference.updatedAt,
  };
}

export function toNotificationEventView(event: NotificationEvent) {
  return {
    ...event,
    channels: parseJsonArray(event.channels),
  };
}

// ============================================================================
// GOVERNANCE AND INTEGRATIONS
// ============================================================================

export async function createAuditLog(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) {
    const auditLog: AuditLog = {
      id: memoryState.nextAuditLogId++,
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
      actorOpenId: data.actorOpenId ?? null,
      actorName: data.actorName,
      details: data.details ?? null,
      createdAt: new Date(),
    };
    memoryState.auditLogs.push(auditLog);
    return copyAuditLog(auditLog);
  }

  const { auditLogs } = await import("../drizzle/schema");
  const result = await db.insert(auditLogs).values(data).returning({ id: auditLogs.id });
  const id = result[0]?.id;
  if (!id) throw new Error("Failed to create audit log");
  const created = await db.select().from(auditLogs).where(eq(auditLogs.id, id)).limit(1);
  if (!created[0]) throw new Error("Failed to fetch audit log");
  return created[0];
}

export async function listAuditLogs(options?: {
  limit?: number;
  entityType?: AuditEntityType;
}) {
  const limit = Math.max(1, Math.min(options?.limit ?? 200, 500));
  const db = await getDb();
  if (!db) {
    return memoryState.auditLogs
      .filter((item) =>
        options?.entityType ? item.entityType === options.entityType : true
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map(copyAuditLog);
  }

  const { auditLogs } = await import("../drizzle/schema");
  if (options?.entityType) {
    return db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityType, options.entityType))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

export async function listWebhookSubscriptions(options?: { includeInactive?: boolean }) {
  const includeInactive = options?.includeInactive ?? false;
  const db = await getDb();
  if (!db) {
    return memoryState.webhookSubscriptions
      .filter((webhook) => includeInactive || webhook.isActive === YES_NO_YES)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(copyWebhookSubscription);
  }

  const { webhookSubscriptions } = await import("../drizzle/schema");
  if (includeInactive) {
    return db.select().from(webhookSubscriptions).orderBy(webhookSubscriptions.name);
  }
  return db
    .select()
    .from(webhookSubscriptions)
    .where(eq(webhookSubscriptions.isActive, YES_NO_YES))
    .orderBy(webhookSubscriptions.name);
}

export async function createWebhookSubscription(data: {
  name: string;
  endpointUrl: string;
  events: WebhookEventName[];
  secret?: string | null;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) {
    const webhook: WebhookSubscription = {
      id: memoryState.nextWebhookSubscriptionId++,
      name: data.name,
      endpointUrl: data.endpointUrl,
      events: JSON.stringify(data.events),
      secret: data.secret ?? null,
      isActive: asYesNo(data.isActive ?? true),
      lastTriggeredAt: null,
      lastStatus: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryState.webhookSubscriptions.push(webhook);
    return copyWebhookSubscription(webhook);
  }

  const { webhookSubscriptions } = await import("../drizzle/schema");
  const result = await db
    .insert(webhookSubscriptions)
    .values({
      name: data.name,
      endpointUrl: data.endpointUrl,
      events: JSON.stringify(data.events),
      secret: data.secret ?? null,
      isActive: asYesNo(data.isActive ?? true),
    })
    .returning({ id: webhookSubscriptions.id });
  const id = result[0]?.id;
  if (!id) throw new Error("Failed to create webhook subscription");
  const created = await db
    .select()
    .from(webhookSubscriptions)
    .where(eq(webhookSubscriptions.id, id))
    .limit(1);
  if (!created[0]) throw new Error("Failed to fetch webhook subscription");
  return created[0];
}

export async function updateWebhookSubscription(
  id: number,
  patch: Partial<{
    name: string;
    endpointUrl: string;
    events: WebhookEventName[];
    secret: string | null;
    isActive: boolean;
    lastStatus: string | null;
    lastTriggeredAt: Date | null;
  }>
) {
  const db = await getDb();
  const normalizedPatch: Partial<InsertWebhookSubscription> = {};
  if (patch.name !== undefined) normalizedPatch.name = patch.name;
  if (patch.endpointUrl !== undefined) normalizedPatch.endpointUrl = patch.endpointUrl;
  if (patch.events !== undefined) normalizedPatch.events = JSON.stringify(patch.events);
  if (patch.secret !== undefined) normalizedPatch.secret = patch.secret;
  if (patch.isActive !== undefined) normalizedPatch.isActive = asYesNo(patch.isActive);
  if (patch.lastStatus !== undefined) normalizedPatch.lastStatus = patch.lastStatus;
  if (patch.lastTriggeredAt !== undefined) {
    normalizedPatch.lastTriggeredAt = patch.lastTriggeredAt;
  }

  if (!db) {
    const index = memoryState.webhookSubscriptions.findIndex((webhook) => webhook.id === id);
    if (index < 0) return undefined;
    const current = memoryState.webhookSubscriptions[index]!;
    const updated: WebhookSubscription = {
      ...current,
      ...normalizedPatch,
      updatedAt: new Date(),
    };
    memoryState.webhookSubscriptions[index] = updated;
    return copyWebhookSubscription(updated);
  }

  const { webhookSubscriptions } = await import("../drizzle/schema");
  await db.update(webhookSubscriptions).set(normalizedPatch).where(eq(webhookSubscriptions.id, id));
  const updated = await db
    .select()
    .from(webhookSubscriptions)
    .where(eq(webhookSubscriptions.id, id))
    .limit(1);
  return updated[0];
}

export async function deleteWebhookSubscription(id: number) {
  const db = await getDb();
  if (!db) {
    memoryState.webhookSubscriptions = memoryState.webhookSubscriptions.filter(
      (webhook) => webhook.id !== id
    );
    return;
  }
  const { webhookSubscriptions } = await import("../drizzle/schema");
  await db.delete(webhookSubscriptions).where(eq(webhookSubscriptions.id, id));
}

export async function dispatchWebhookEvent(args: {
  event: WebhookEventName;
  payload: Record<string, unknown>;
}) {
  const subscriptions = await listWebhookSubscriptions({ includeInactive: false });
  const eligible = subscriptions.filter((subscription) =>
    parseWebhookEvents(subscription.events).includes(args.event)
  );

  const deliveries: Array<{
    webhookId: number;
    success: boolean;
    status: number | null;
    error?: string;
  }> = [];

  for (const subscription of eligible) {
    try {
      const response = await fetch(subscription.endpointUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-rtc-event": args.event,
          ...(subscription.secret ? { "x-rtc-webhook-secret": subscription.secret } : {}),
        },
        body: JSON.stringify({
          event: args.event,
          occurredAt: new Date().toISOString(),
          payload: args.payload,
        }),
      });

      const success = response.ok;
      deliveries.push({
        webhookId: subscription.id,
        success,
        status: response.status,
      });
      await updateWebhookSubscription(subscription.id, {
        lastTriggeredAt: new Date(),
        lastStatus: success
          ? `ok:${response.status}`
          : `error:${response.status} ${response.statusText}`,
      });
    } catch (error) {
      deliveries.push({
        webhookId: subscription.id,
        success: false,
        status: null,
        error: error instanceof Error ? error.message : "unknown error",
      });
      await updateWebhookSubscription(subscription.id, {
        lastTriggeredAt: new Date(),
        lastStatus:
          error instanceof Error ? `error:${error.message}` : "error:unknown",
      });
    }
  }

  return {
    attempted: deliveries.length,
    delivered: deliveries.filter((delivery) => delivery.success).length,
    deliveries,
  };
}

export async function getUserAccessPolicy(openId: string) {
  const db = await getDb();
  if (!db) {
    const policy = memoryState.userAccessPolicies.find((item) => item.openId === openId);
    return policy ? copyUserAccessPolicy(policy) : undefined;
  }
  const { userAccessPolicies } = await import("../drizzle/schema");
  const result = await db
    .select()
    .from(userAccessPolicies)
    .where(eq(userAccessPolicies.openId, openId))
    .limit(1);
  return result[0];
}

export async function upsertUserAccessPolicy(args: {
  openId: string;
  accessRole: GovernanceRole;
  updatedBy?: string | null;
}) {
  const db = await getDb();
  if (!db) {
    const index = memoryState.userAccessPolicies.findIndex(
      (policy) => policy.openId === args.openId
    );
    if (index >= 0) {
      const current = memoryState.userAccessPolicies[index]!;
      const updated: UserAccessPolicy = {
        ...current,
        accessRole: args.accessRole,
        updatedBy: args.updatedBy ?? null,
        updatedAt: new Date(),
      };
      memoryState.userAccessPolicies[index] = updated;
      return copyUserAccessPolicy(updated);
    }

    const created: UserAccessPolicy = {
      id: memoryState.nextUserAccessPolicyId++,
      openId: args.openId,
      accessRole: args.accessRole,
      updatedBy: args.updatedBy ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryState.userAccessPolicies.push(created);
    return copyUserAccessPolicy(created);
  }

  const { userAccessPolicies } = await import("../drizzle/schema");
  const existing = await getUserAccessPolicy(args.openId);
  if (existing) {
    await db
      .update(userAccessPolicies)
      .set({
        accessRole: args.accessRole,
        updatedBy: args.updatedBy ?? null,
      })
      .where(eq(userAccessPolicies.id, existing.id));
  } else {
    await db.insert(userAccessPolicies).values({
      openId: args.openId,
      accessRole: args.accessRole,
      updatedBy: args.updatedBy ?? null,
    });
  }
  const policy = await getUserAccessPolicy(args.openId);
  if (!policy) throw new Error("Failed to upsert user access policy");
  return policy;
}

export async function listUserAccessPolicies(limit = 200) {
  const boundedLimit = Math.max(1, Math.min(limit, 500));
  const db = await getDb();
  if (!db) {
    return memoryState.userAccessPolicies
      .slice()
      .sort((a, b) => a.openId.localeCompare(b.openId))
      .slice(0, boundedLimit)
      .map(copyUserAccessPolicy);
  }
  const { userAccessPolicies } = await import("../drizzle/schema");
  return db
    .select()
    .from(userAccessPolicies)
    .orderBy(userAccessPolicies.openId)
    .limit(boundedLimit);
}

export async function resolveGovernanceRole(openId: string | null | undefined): Promise<GovernanceRole> {
  if (!openId) return "Viewer";

  const policy = await getUserAccessPolicy(openId);
  if (policy) return policy.accessRole;

  const user = await getUserByOpenId(openId);
  if (user?.role === "admin") return "Admin";
  if (user) return "Editor";
  return "Viewer";
}

// ============================================================================
// Project Risks
// ============================================================================

export async function listProjectRisks(projectId: number) {
  const db = await getDb();
  if (!db) {
    return memoryState.projectRisks
      .filter((r) => r.projectId === projectId)
      .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
      .map(copyProjectRisk);
  }

  const { projectRisks } = await import("../drizzle/schema");
  return db
    .select()
    .from(projectRisks)
    .where(eq(projectRisks.projectId, projectId))
    .orderBy(desc(projectRisks.riskScore));
}

export async function getProjectRisk(id: number) {
  const db = await getDb();
  if (!db) {
    const risk = memoryState.projectRisks.find((r) => r.id === id);
    return risk ? copyProjectRisk(risk) : null;
  }

  const { projectRisks } = await import("../drizzle/schema");
  const rows = await db.select().from(projectRisks).where(eq(projectRisks.id, id));
  return rows[0] ?? null;
}

export async function createProjectRisk(data: InsertProjectRisk) {
  // Auto-calculate riskScore
  const probability = data.probability ?? 3;
  const impact = data.impact ?? 3;
  const riskScore = probability * impact;

  const db = await getDb();
  if (!db) {
    const risk: ProjectRisk = {
      id: memoryState.nextProjectRiskId++,
      projectId: data.projectId,
      title: data.title,
      description: data.description ?? null,
      probability,
      impact,
      riskScore,
      status: data.status ?? "Open",
      mitigationPlan: data.mitigationPlan ?? null,
      owner: data.owner ?? null,
      linkedTaskId: data.linkedTaskId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryState.projectRisks.push(risk);
    return copyProjectRisk(risk);
  }

  const { projectRisks } = await import("../drizzle/schema");
  const result = await db
    .insert(projectRisks)
    .values({ ...data, probability, impact, riskScore })
    .returning();
  return result[0]!;
}

export async function updateProjectRisk(id: number, data: Partial<InsertProjectRisk>) {
  // Auto-recalculate riskScore if probability or impact changed
  const patch: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (data.probability !== undefined || data.impact !== undefined) {
    const existing = await getProjectRisk(id);
    if (existing) {
      const p = data.probability ?? existing.probability;
      const i = data.impact ?? existing.impact;
      patch.riskScore = p * i;
    }
  }

  const db = await getDb();
  if (!db) {
    const index = memoryState.projectRisks.findIndex((r) => r.id === id);
    if (index < 0) return null;
    memoryState.projectRisks[index] = {
      ...memoryState.projectRisks[index]!,
      ...(patch as Partial<ProjectRisk>),
    };
    return copyProjectRisk(memoryState.projectRisks[index]!);
  }

  const { projectRisks } = await import("../drizzle/schema");
  const result = await db
    .update(projectRisks)
    .set(patch)
    .where(eq(projectRisks.id, id))
    .returning();
  return result[0] ?? null;
}

export async function deleteProjectRisk(id: number) {
  const db = await getDb();
  if (!db) {
    memoryState.projectRisks = memoryState.projectRisks.filter((r) => r.id !== id);
    return;
  }

  const { projectRisks } = await import("../drizzle/schema");
  await db.delete(projectRisks).where(eq(projectRisks.id, id));
}

export async function getTopRisks(limit = 10) {
  const db = await getDb();
  if (!db) {
    return memoryState.projectRisks
      .filter((r) => r.status === "Open")
      .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
      .slice(0, limit)
      .map((risk) => {
        const project = memoryState.projects.find((p) => p.id === risk.projectId);
        return {
          ...copyProjectRisk(risk),
          projectName: project?.name ?? `Project #${risk.projectId}`,
        };
      });
  }

  const { projectRisks, projects } = await import("../drizzle/schema");
  return db
    .select({
      id: projectRisks.id,
      projectId: projectRisks.projectId,
      projectName: projects.name,
      title: projectRisks.title,
      description: projectRisks.description,
      probability: projectRisks.probability,
      impact: projectRisks.impact,
      riskScore: projectRisks.riskScore,
      status: projectRisks.status,
      mitigationPlan: projectRisks.mitigationPlan,
      owner: projectRisks.owner,
      linkedTaskId: projectRisks.linkedTaskId,
      createdAt: projectRisks.createdAt,
      updatedAt: projectRisks.updatedAt,
    })
    .from(projectRisks)
    .innerJoin(projects, eq(projectRisks.projectId, projects.id))
    .where(eq(projectRisks.status, "Open"))
    .orderBy(desc(projectRisks.riskScore))
    .limit(limit);
}

// ============================================================================
// Template Export / Import
// ============================================================================

export type TemplateExportPayload = {
  version: 1;
  exportedAt: string;
  template: {
    name: string;
    templateKey: string;
    description: string | null;
    phases: string[];
    sampleTasks: Array<{
      taskId: string;
      taskDescription: string;
      phase: string;
      priority: string;
      owner: string | null;
      dependency: string | null;
      approvalRequired: string;
    }>;
  };
};

export async function exportTemplate(templateId: number): Promise<TemplateExportPayload | null> {
  const template = await getTemplateById(templateId);
  if (!template) return null;

  const parseJson = (raw: string | null): unknown[] => {
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  };

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    template: {
      name: template.name,
      templateKey: template.templateKey,
      description: template.description,
      phases: parseJson(template.phases) as string[],
      sampleTasks: parseJson(template.sampleTasks) as TemplateExportPayload["template"]["sampleTasks"],
    },
  };
}

export async function importTemplate(
  payload: TemplateExportPayload,
  options: { createAsDraft?: boolean } = {}
): Promise<{ id: number; name: string }> {
  const { template: tmpl } = payload;
  const createAsDraft = options.createAsDraft ?? true;

  // Ensure unique key by appending timestamp suffix
  const uniqueKey = `${normalizeTemplateKey(tmpl.templateKey)}_imported_${Date.now()}`;
  const groupKey = getTemplateGroupKey(uniqueKey);

  const newId = await createTemplate({
    name: `${tmpl.name} (Imported)`,
    templateKey: uniqueKey,
    templateGroupKey: groupKey,
    description: tmpl.description,
    version: 1,
    status: createAsDraft ? "Draft" : "Published",
    phases: JSON.stringify(tmpl.phases),
    sampleTasks: JSON.stringify(tmpl.sampleTasks),
    uploadSource: "import",
  });

  return { id: newId, name: `${tmpl.name} (Imported)` };
}

// ============================================================================
// Project Tags
// ============================================================================

export async function listProjectTags(projectId: number) {
  const db = await getDb();
  if (!db) {
    return memoryState.projectTags.filter((t) => t.projectId === projectId).map(copyProjectTag);
  }
  const { projectTags } = await import("../drizzle/schema");
  return db.select().from(projectTags).where(eq(projectTags.projectId, projectId));
}

export async function getAllProjectTags() {
  const db = await getDb();
  if (!db) return memoryState.projectTags.map(copyProjectTag);
  const { projectTags } = await import("../drizzle/schema");
  return db.select().from(projectTags);
}

export async function addProjectTag(data: InsertProjectTag) {
  const db = await getDb();
  if (!db) {
    // Prevent duplicate label per project
    const exists = memoryState.projectTags.find(
      (t) => t.projectId === data.projectId && t.label === data.label
    );
    if (exists) return copyProjectTag(exists);

    const tag: ProjectTag = {
      id: memoryState.nextProjectTagId++,
      projectId: data.projectId,
      label: data.label,
      color: data.color ?? "#3b82f6",
      createdAt: new Date(),
    };
    memoryState.projectTags.push(tag);
    return copyProjectTag(tag);
  }
  const { projectTags } = await import("../drizzle/schema");
  const result = await db.insert(projectTags).values(data).returning();
  return result[0]!;
}

export async function removeProjectTag(id: number) {
  const db = await getDb();
  if (!db) {
    memoryState.projectTags = memoryState.projectTags.filter((t) => t.id !== id);
    return;
  }
  const { projectTags } = await import("../drizzle/schema");
  await db.delete(projectTags).where(eq(projectTags.id, id));
}

// ============================================================================
// Saved Views
// ============================================================================

export async function listSavedViews() {
  const db = await getDb();
  if (!db) return memoryState.savedViews.map(copySavedView);
  const { savedViews } = await import("../drizzle/schema");
  return db.select().from(savedViews).orderBy(desc(savedViews.createdAt));
}

export async function createSavedView(data: InsertSavedView) {
  const db = await getDb();
  if (!db) {
    const view: SavedView = {
      id: memoryState.nextSavedViewId++,
      name: data.name,
      description: data.description ?? null,
      filters: data.filters,
      createdBy: data.createdBy ?? "System",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryState.savedViews.push(view);
    return copySavedView(view);
  }
  const { savedViews } = await import("../drizzle/schema");
  const result = await db.insert(savedViews).values(data).returning();
  return result[0]!;
}

export async function updateSavedView(id: number, data: Partial<InsertSavedView>) {
  const db = await getDb();
  if (!db) {
    const index = memoryState.savedViews.findIndex((v) => v.id === id);
    if (index < 0) return null;
    memoryState.savedViews[index] = {
      ...memoryState.savedViews[index]!,
      ...data,
      updatedAt: new Date(),
    } as SavedView;
    return copySavedView(memoryState.savedViews[index]!);
  }
  const { savedViews } = await import("../drizzle/schema");
  const result = await db
    .update(savedViews)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(savedViews.id, id))
    .returning();
  return result[0] ?? null;
}

export async function deleteSavedView(id: number) {
  const db = await getDb();
  if (!db) {
    memoryState.savedViews = memoryState.savedViews.filter((v) => v.id !== id);
    return;
  }
  const { savedViews } = await import("../drizzle/schema");
  await db.delete(savedViews).where(eq(savedViews.id, id));
}

// ── Task Notes ────────────────────────────────────────────────────────

export async function listTaskNotes(taskId: number): Promise<TaskNote[]> {
  const db = await getDb();
  if (!db) {
    return memoryState.taskNotes
      .filter((n) => n.taskId === taskId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(copyTaskNote);
  }
  const { taskNotes } = await import("../drizzle/schema");
  return db.select().from(taskNotes).where(eq(taskNotes.taskId, taskId)).orderBy(desc(taskNotes.createdAt));
}

export async function listTaskNotesByProject(projectId: number): Promise<(TaskNote & { taskCode?: string })[]> {
  const db = await getDb();
  const projectTasks = db
    ? await (async () => {
      const { tasks: tasksTable } = await import("../drizzle/schema");
      return db.select().from(tasksTable).where(eq(tasksTable.projectId, projectId));
    })()
    : memoryState.tasks.filter((t) => t.projectId === projectId);
  const taskIds = new Set(projectTasks.map((t) => t.id));
  const taskCodeMap = new Map(projectTasks.map((t) => [t.id, t.taskId]));

  if (!db) {
    return memoryState.taskNotes
      .filter((n) => taskIds.has(n.taskId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((n) => ({ ...copyTaskNote(n), taskCode: taskCodeMap.get(n.taskId) }));
  }
  const { taskNotes } = await import("../drizzle/schema");
  const allNotes = await db.select().from(taskNotes).orderBy(desc(taskNotes.createdAt));
  return allNotes
    .filter((n) => taskIds.has(n.taskId))
    .map((n) => ({ ...n, taskCode: taskCodeMap.get(n.taskId) }));
}

export async function createTaskNote(data: { taskId: number; authorName?: string; content: string }): Promise<TaskNote> {
  const db = await getDb();
  if (!db) {
    const note: TaskNote = {
      id: memoryState.nextTaskNoteId++,
      taskId: data.taskId,
      authorName: data.authorName || "System",
      content: data.content,
      createdAt: new Date(),
    };
    memoryState.taskNotes.push(note);
    return copyTaskNote(note);
  }
  const { taskNotes } = await import("../drizzle/schema");
  const result = await db.insert(taskNotes).values({
    taskId: data.taskId,
    authorName: data.authorName || "System",
    content: data.content,
  }).returning();
  return result[0]!;
}

// ── Project Notes ─────────────────────────────────────────────────────

export async function listProjectNotes(projectId: number): Promise<ProjectNote[]> {
  const db = await getDb();
  if (!db) {
    return memoryState.projectNotes
      .filter((n) => n.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(copyProjectNote);
  }
  const { projectNotes } = await import("../drizzle/schema");
  return db.select().from(projectNotes).where(eq(projectNotes.projectId, projectId)).orderBy(desc(projectNotes.createdAt));
}

export async function createProjectNote(data: { projectId: number; authorName?: string; content: string }): Promise<ProjectNote> {
  const db = await getDb();
  if (!db) {
    const note: ProjectNote = {
      id: memoryState.nextProjectNoteId++,
      projectId: data.projectId,
      authorName: data.authorName || "System",
      content: data.content,
      createdAt: new Date(),
    };
    memoryState.projectNotes.push(note);
    return copyProjectNote(note);
  }
  const { projectNotes } = await import("../drizzle/schema");
  const result = await db.insert(projectNotes).values({
    projectId: data.projectId,
    authorName: data.authorName || "System",
    content: data.content,
  }).returning();
  return result[0]!;
}

// ── Branding ────────────────────────────────────────────────────────────────

export type BrandingData = {
  appName: string;
  logoUrl: string | null;
};

const DEFAULT_BRANDING: BrandingData = { appName: "Darwin TaskLine", logoUrl: null };

function getSettingValue(key: string): string | undefined {
  const row = memoryState.appSettings.find((s) => s.settingKey === key);
  return row ? row.value : undefined;
}

export async function getBranding(): Promise<BrandingData> {
  const db = await getDb();
  if (!db) {
    const nameRaw = getSettingValue("branding.appName");
    const logoRaw = getSettingValue("branding.logoUrl");
    return {
      appName: nameRaw ? JSON.parse(nameRaw) : DEFAULT_BRANDING.appName,
      logoUrl: logoRaw ? JSON.parse(logoRaw) : DEFAULT_BRANDING.logoUrl,
    };
  }
  const { appSettings } = await import("../drizzle/schema");
  const rows = await db.select().from(appSettings).where(eq(appSettings.category, "branding"));
  const map = new Map(rows.map((r) => [r.settingKey, r.value]));
  return {
    appName: map.has("branding.appName") ? JSON.parse(map.get("branding.appName")!) : DEFAULT_BRANDING.appName,
    logoUrl: map.has("branding.logoUrl") ? JSON.parse(map.get("branding.logoUrl")!) : DEFAULT_BRANDING.logoUrl,
  };
}

export async function updateBranding(data: Partial<BrandingData>): Promise<BrandingData> {
  const db = await getDb();
  const now = new Date();

  if (!db) {
    if (data.appName !== undefined) {
      upsertMemorySetting("branding.appName", JSON.stringify(data.appName), now);
    }
    if (data.logoUrl !== undefined) {
      upsertMemorySetting("branding.logoUrl", JSON.stringify(data.logoUrl), now);
    }
    return getBranding();
  }

  const { appSettings } = await import("../drizzle/schema");
  if (data.appName !== undefined) {
    await upsertDbSetting(db, appSettings, "branding", "branding.appName", JSON.stringify(data.appName));
  }
  if (data.logoUrl !== undefined) {
    await upsertDbSetting(db, appSettings, "branding", "branding.logoUrl", JSON.stringify(data.logoUrl));
  }
  return getBranding();
}

function upsertMemorySetting(key: string, value: string, now: Date) {
  const existing = memoryState.appSettings.find((s) => s.settingKey === key);
  if (existing) {
    existing.value = value;
    existing.updatedAt = now;
  } else {
    memoryState.appSettings.push({
      id: memoryState.nextAppSettingId++,
      category: "branding",
      settingKey: key,
      value,
      updatedBy: null,
      createdAt: now,
      updatedAt: now,
    });
  }
}

async function upsertDbSetting(db: any, table: any, category: string, key: string, value: string) {
  const existing = await db.select().from(table).where(eq(table.settingKey, key));
  if (existing.length > 0) {
    await db.update(table).set({ value, updatedAt: new Date() }).where(eq(table.settingKey, key));
  } else {
    await db.insert(table).values({ category, settingKey: key, value, updatedBy: "Admin" });
  }
}

